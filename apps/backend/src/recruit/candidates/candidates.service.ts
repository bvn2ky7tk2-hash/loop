import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate, PaginatedResult } from '../../common/dto/pagination.dto';
import { EmployeesService } from '../../employees/employees.service';
import { StorageService } from '../../storage/storage.service';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { UpdateCandidateDto } from './dto/update-candidate.dto';
import { FilterCandidateDto } from './dto/filter-candidate.dto';
import { HireCandidateDto } from './dto/hire-candidate.dto';
import { Candidate, CandidateStage } from '../../generated/prisma';

const ALLOWED_TRANSITIONS: Record<CandidateStage, CandidateStage[]> = {
  [CandidateStage.APPLIED]:    [CandidateStage.SCREENING, CandidateStage.REJECTED],
  [CandidateStage.SCREENING]:  [CandidateStage.INTERVIEW, CandidateStage.REJECTED],
  [CandidateStage.INTERVIEW]:  [CandidateStage.OFFER, CandidateStage.REJECTED],
  [CandidateStage.OFFER]:      [CandidateStage.HIRED, CandidateStage.REJECTED],
  [CandidateStage.HIRED]:      [],
  [CandidateStage.REJECTED]:   [],
};

const ALLOWED_CV_MIMES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const CV_MAX_SIZE = 10 * 1024 * 1024;

@Injectable()
export class CandidatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly employeesService: EmployeesService,
    private readonly storageService: StorageService,
  ) {}

  async create(dto: CreateCandidateDto): Promise<Candidate> {
    await this.ensureJobExists(dto.jobOpeningId);
    return this.prisma.candidate.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        jobOpeningId: dto.jobOpeningId,
        stage: dto.stage ?? CandidateStage.APPLIED,
        assigneeId: dto.assigneeId,
        source: dto.source,
        expectedSalary: dto.expectedSalary,
        notes: dto.notes,
      },
    });
  }

  async findAll(filter: FilterCandidateDto): Promise<PaginatedResult<Candidate>> {
    const { page = 1, limit = 50, jobOpeningId, stage, assigneeId } = filter;

    const where = {
      ...(jobOpeningId ? { jobOpeningId } : {}),
      ...(stage ? { stage } : {}),
      ...(assigneeId ? { assigneeId } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.candidate.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.candidate.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findOne(id: string) {
    const candidate = await this.prisma.candidate.findUnique({
      where: { id },
      include: {
        jobOpening: true,
        interviews: { orderBy: { scheduledAt: 'asc' } },
      },
    });
    if (!candidate) throw new NotFoundException('Không tìm thấy ứng viên');
    return candidate;
  }

  async update(id: string, dto: UpdateCandidateDto): Promise<Candidate> {
    await this.findOne(id);
    return this.prisma.candidate.update({ where: { id }, data: dto });
  }

  async remove(id: string): Promise<void> {
    const candidate = await this.findOne(id);
    if (candidate.stage !== CandidateStage.APPLIED) {
      throw new BadRequestException('Chỉ có thể xoá ứng viên ở stage APPLIED');
    }
    await this.prisma.candidate.delete({ where: { id } });
  }

  async updateStage(id: string, newStage: CandidateStage): Promise<Candidate> {
    const candidate = await this.findOne(id);

    const allowed = ALLOWED_TRANSITIONS[candidate.stage];
    if (!allowed.includes(newStage)) {
      throw new UnprocessableEntityException(
        `Không thể chuyển từ ${candidate.stage} sang ${newStage}`,
      );
    }

    return this.prisma.candidate.update({
      where: { id },
      data: { stage: newStage },
    });
  }

  async hire(id: string, dto: HireCandidateDto): Promise<Candidate> {
    const candidate = await this.findOne(id);

    if (candidate.stage !== CandidateStage.OFFER) {
      throw new UnprocessableEntityException(
        'Ứng viên phải ở stage OFFER để thực hiện onboard',
      );
    }

    const job = await this.prisma.jobOpening.findUnique({
      where: { id: candidate.jobOpeningId },
    });

    const employee = await this.employeesService.create({
      code: dto.employeeCode,
      fullName: candidate.name,
      orgUnitId: dto.orgUnitId,
      level: job!.level!,
      startDate: dto.startDate,
      email: candidate.email ?? undefined,
    });

    try {
      await this.employeesService.addRate(employee.id, {
        effectiveDate: dto.startDate,
        ratePerDay: dto.ratePerDay,
      });

      return await this.prisma.candidate.update({
        where: { id },
        data: {
          stage: CandidateStage.HIRED,
          employeeId: employee.id,
        },
      });
    } catch (err) {
      await this.prisma.employee.delete({ where: { id: employee.id } }).catch(() => null);
      throw err;
    }
  }

  async uploadCv(
    id: string,
    file: Express.Multer.File,
  ): Promise<Candidate> {
    await this.findOne(id);

    if (!ALLOWED_CV_MIMES.includes(file.mimetype)) {
      throw new BadRequestException('Chỉ chấp nhận file PDF, DOC, DOCX');
    }
    if (file.size > CV_MAX_SIZE) {
      throw new BadRequestException('File CV không được vượt quá 10MB');
    }

    const ext = file.originalname.split('.').pop() ?? 'pdf';
    const filename = `${id}-${randomUUID()}.${ext}`;

    const { storagePath } = await this.storageService.upload({
      bucket: 'loop-hr-files',
      folder: 'cv',
      filename,
      buffer: file.buffer,
      size: file.size,
      mimeType: file.mimetype,
    });

    return this.prisma.candidate.update({
      where: { id },
      data: { cvStoragePath: storagePath },
    });
  }

  async getCvUrl(id: string): Promise<{ url: string }> {
    const candidate = await this.findOne(id);

    if (!candidate.cvStoragePath) {
      throw new NotFoundException('Ứng viên chưa có CV');
    }

    const url = await this.storageService.presignedUrl(candidate.cvStoragePath, undefined, 3600);
    return { url };
  }

  private async ensureJobExists(jobOpeningId: string): Promise<void> {
    const job = await this.prisma.jobOpening.findUnique({ where: { id: jobOpeningId } });
    if (!job) throw new NotFoundException('Không tìm thấy vị trí tuyển dụng');
  }
}
