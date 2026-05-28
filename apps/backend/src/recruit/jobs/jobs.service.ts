import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate, PaginatedResult } from '../../common/dto/pagination.dto';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { FilterJobDto } from './dto/filter-job.dto';
import { JobOpening, JobStatus } from '../../generated/prisma';

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateJobDto): Promise<JobOpening> {
    const existing = await this.prisma.jobOpening.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictException(`Mã vị trí "${dto.code}" đã tồn tại`);
    }

    return this.prisma.jobOpening.create({
      data: {
        code: dto.code,
        title: dto.title,
        orgUnitId: dto.orgUnitId,
        level: dto.level,
        headcount: dto.headcount,
        status: dto.status ?? JobStatus.OPEN,
        requirements: dto.requirements,
        salaryFrom: dto.salaryFrom,
        salaryTo: dto.salaryTo,
        closedAt: dto.closedAt ? new Date(dto.closedAt) : undefined,
      },
    });
  }

  async findAll(filter: FilterJobDto): Promise<PaginatedResult<JobOpening>> {
    const { page = 1, limit = 50, status, orgUnitId, level } = filter;

    const where = {
      ...(status ? { status } : {}),
      ...(orgUnitId ? { orgUnitId } : {}),
      ...(level ? { level } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.jobOpening.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.jobOpening.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findOne(id: string): Promise<JobOpening & { _count: { candidates: number } }> {
    const job = await this.prisma.jobOpening.findUnique({
      where: { id },
      include: { _count: { select: { candidates: true } } },
    });
    if (!job) throw new NotFoundException('Không tìm thấy vị trí tuyển dụng');
    return job;
  }

  async update(id: string, dto: UpdateJobDto): Promise<JobOpening> {
    await this.findOne(id);

    return this.prisma.jobOpening.update({
      where: { id },
      data: {
        ...dto,
        closedAt: dto.closedAt ? new Date(dto.closedAt) : undefined,
      },
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.jobOpening.delete({ where: { id } });
  }

  async close(id: string): Promise<JobOpening> {
    await this.findOne(id);

    return this.prisma.jobOpening.update({
      where: { id },
      data: {
        status: JobStatus.CLOSED,
        closedAt: new Date(),
      },
    });
  }
}
