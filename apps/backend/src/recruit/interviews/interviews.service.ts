import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { CreateInterviewDto } from './dto/create-interview.dto';
import { UpdateInterviewResultDto } from './dto/update-interview-result.dto';
import { Interview, InterviewResult, NotificationType } from '../../generated/prisma';
import { paginate, PaginatedResult } from '../../common/dto/pagination.dto';

@Injectable()
export class InterviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateInterviewDto): Promise<Interview> {
    const scheduledAt = new Date(dto.scheduledAt);
    if (scheduledAt <= new Date()) {
      throw new BadRequestException('scheduledAt phải là thời điểm trong tương lai');
    }

    const candidate = await this.prisma.candidate.findUnique({
      where: { id: dto.candidateId },
    });
    if (!candidate) throw new NotFoundException('Không tìm thấy ứng viên');

    const interview = await this.prisma.interview.create({
      data: {
        candidateId: dto.candidateId,
        type: dto.type,
        scheduledAt,
        location: dto.location,
        meetingUrl: dto.meetingUrl,
        interviewers: dto.interviewers ?? [],
        notes: dto.notes,
      },
    });

    await this.notifyInterviewers(
      dto.interviewers ?? [],
      candidate.name,
      scheduledAt,
      interview.id,
    );

    return interview;
  }

  async findAll(page: number, limit: number): Promise<PaginatedResult<Interview>> {
    const include = {
      candidate: { select: { id: true, name: true, jobOpening: { select: { title: true } } } },
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.interview.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { scheduledAt: 'desc' },
        include,
      }),
      this.prisma.interview.count(),
    ]);
    return paginate(data, total, page, limit);
  }

  async findByCandidateId(candidateId: string): Promise<Interview[]> {
    return this.prisma.interview.findMany({
      where: { candidateId },
      orderBy: { scheduledAt: 'asc' },
      include: {
        candidate: { select: { id: true, name: true, jobOpening: { select: { title: true } } } },
      },
    });
  }

  async updateResult(id: string, dto: UpdateInterviewResultDto): Promise<Interview> {
    const interview = await this.prisma.interview.findUnique({
      where: { id },
      include: { candidate: true },
    });
    if (!interview) throw new NotFoundException('Không tìm thấy lịch phỏng vấn');

    const updated = await this.prisma.interview.update({
      where: { id },
      data: {
        result: dto.result,
        score: dto.score,
        notes: dto.notes,
      },
    });

    if (dto.result === InterviewResult.PASS) {
      await this.checkAllPassAndNotify(interview.candidateId, interview.candidate.name, interview.candidate.assigneeId);
    }

    return updated;
  }

  private async checkAllPassAndNotify(
    candidateId: string,
    candidateName: string,
    assigneeId: string | null,
  ): Promise<void> {
    const allInterviews = await this.prisma.interview.findMany({
      where: { candidateId },
    });

    const allPassed = allInterviews.every(
      (i) => i.result === InterviewResult.PASS,
    );

    if (allPassed && assigneeId) {
      await this.notificationsService.createAndDeliver(
        assigneeId,
        NotificationType.TASK_APPROVED,
        'Tất cả interviews đã PASS',
        `Tất cả interviews PASS — cân nhắc chuyển ứng viên ${candidateName} sang OFFER`,
        { candidateId },
        'Candidate',
        candidateId,
      );
    }
  }

  private async notifyInterviewers(
    interviewerIds: string[],
    candidateName: string,
    scheduledAt: Date,
    interviewId: string,
  ): Promise<void> {
    const dateStr = scheduledAt.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

    await Promise.allSettled(
      interviewerIds.map((userId) =>
        this.notificationsService.createAndDeliver(
          userId,
          NotificationType.PROCESS_TASK_ASSIGNED,
          'Lịch phỏng vấn mới',
          `Bạn được mời phỏng vấn ứng viên ${candidateName} vào ${dateStr}`,
          { interviewId },
          'Interview',
          interviewId,
        ),
      ),
    );
  }
}
