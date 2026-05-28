import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/dto/pagination.dto';
import { CreatePerformanceReviewDto, UpdatePerformanceReviewDto, FilterPerformanceDto } from './dto/performance.dto';
import { ReviewStatus } from '../generated/prisma';

const INCLUDE = {
  employee: { select: { id: true, fullName: true, code: true } },
  reviewer: { select: { id: true, fullName: true, code: true } },
} as const;

@Injectable()
export class PerformanceService {
  constructor(private readonly prisma: PrismaService) {}

  async list(dto: FilterPerformanceDto) {
    const { page = 1, limit = 50, employeeId, reviewerId, period, status } = dto;
    const where = {
      ...(employeeId ? { employeeId } : {}),
      ...(reviewerId ? { reviewerId } : {}),
      ...(period     ? { period } : {}),
      ...(status     ? { status: status as ReviewStatus } : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.performanceReview.findMany({
        where, skip: (page - 1) * limit, take: limit,
        include: INCLUDE,
        orderBy: [{ period: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.performanceReview.count({ where }),
    ]);
    return paginate(data, total, page, limit);
  }

  async findOne(id: string) {
    const r = await this.prisma.performanceReview.findUnique({ where: { id }, include: INCLUDE });
    if (!r) throw new NotFoundException('Không tìm thấy đánh giá');
    return r;
  }

  async create(dto: CreatePerformanceReviewDto) {
    const exists = await this.prisma.performanceReview.findUnique({
      where: { employeeId_period: { employeeId: dto.employeeId, period: dto.period } },
    });
    if (exists) throw new ConflictException(`Đã có đánh giá kỳ ${dto.period} cho nhân viên này`);

    return this.prisma.performanceReview.create({
      data: {
        employeeId:  dto.employeeId,
        reviewerId:  dto.reviewerId,
        period:      dto.period,
        score:       dto.score,
        strengths:   dto.strengths,
        improvements: dto.improvements,
        goals:       dto.goals,
      },
      include: INCLUDE,
    });
  }

  async update(id: string, dto: UpdatePerformanceReviewDto) {
    const review = await this.findOne(id);

    if (review.status === 'APPROVED' && dto.status !== 'APPROVED') {
      throw new BadRequestException('Không thể chỉnh sửa đánh giá đã APPROVED');
    }

    const data: Record<string, unknown> = {};
    if (dto.score       !== undefined) data['score']       = dto.score;
    if (dto.strengths   !== undefined) data['strengths']   = dto.strengths;
    if (dto.improvements !== undefined) data['improvements'] = dto.improvements;
    if (dto.goals       !== undefined) data['goals']       = dto.goals;
    if (dto.status) {
      data['status'] = dto.status as ReviewStatus;
      if (dto.status === 'SUBMITTED') data['submittedAt'] = new Date();
      if (dto.status === 'APPROVED')  data['approvedAt']  = new Date();
    }

    return this.prisma.performanceReview.update({ where: { id }, data, include: INCLUDE });
  }

  async getStats(period?: string) {
    const where = period ? { period } : {};
    const [byStatus, avgScore] = await Promise.all([
      this.prisma.performanceReview.groupBy({ by: ['status'], where, _count: true }),
      this.prisma.performanceReview.aggregate({ where: { ...where, score: { not: null } }, _avg: { score: true } }),
    ]);
    return { byStatus, avgScore: Number(avgScore._avg.score ?? 0) };
  }
}
