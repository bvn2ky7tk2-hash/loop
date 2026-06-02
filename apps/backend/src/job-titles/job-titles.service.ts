import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginatedResult, paginate } from '../common/dto/pagination.dto';
import { CreateJobTitleDto, UpdateJobTitleDto, JobTitleQueryDto } from './dto/job-title.dto';

@Injectable()
export class JobTitlesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: JobTitleQueryDto): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (query.search) {
      where['OR'] = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.isActive !== undefined) {
      where['isActive'] = query.isActive;
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.jobTitle.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { positions: true } },
          leavePolicy: { select: { id: true, name: true, baseAnnualDays: true, accrualMode: true } },
        },
      }),
      this.prisma.jobTitle.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findOne(id: string) {
    const jobTitle = await this.prisma.jobTitle.findUnique({
      where: { id },
      include: {
        _count: { select: { positions: true } },
      },
    });

    if (!jobTitle) throw new NotFoundException('Không tìm thấy chức danh');

    return jobTitle;
  }

  async create(dto: CreateJobTitleDto) {
    return this.prisma.jobTitle.create({
      data: {
        code: dto.code,
        name: dto.name,
        band: dto.band,
        description: dto.description,
        leavePolicyId: dto.leavePolicyId ?? null,
      },
    });
  }

  async update(id: string, dto: UpdateJobTitleDto) {
    await this.findOne(id);

    return this.prisma.jobTitle.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.band !== undefined && { band: dto.band }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.leavePolicyId !== undefined && { leavePolicyId: dto.leavePolicyId || null }),
      },
    });
  }

  async deactivate(id: string) {
    await this.findOne(id);

    return this.prisma.jobTitle.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
