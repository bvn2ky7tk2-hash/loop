import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginatedResult, paginate } from '../common/dto/pagination.dto';
import { CreatePositionDto, UpdatePositionDto, PositionQueryDto } from './dto/position.dto';

@Injectable()
export class PositionsService {
  constructor(private readonly prisma: PrismaService) {}

  private computeStatus(headcount: number, activeCount: number): string {
    if (activeCount === 0 && headcount > 0) return 'VACANT';
    if (activeCount >= headcount) return 'OVER_CAPACITY';
    return 'FILLED';
  }

  async list(query: PositionQueryDto): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (query.search) {
      where['OR'] = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { jobTitle: { name: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    if (query.orgUnitId) {
      where['orgUnitId'] = query.orgUnitId;
    }

    if (query.jobTitleId) {
      where['jobTitleId'] = query.jobTitleId;
    }

    if (query.isActive !== undefined) {
      where['isActive'] = query.isActive;
    }

    const [positions, total] = await this.prisma.$transaction([
      this.prisma.position.findMany({
        where,
        skip,
        take: limit,
        orderBy: { code: 'asc' },
        include: {
          jobTitle: { select: { id: true, name: true, band: true } },
          orgUnit: { select: { id: true, name: true } },
          _count: { select: { employees: true } },
        },
      }),
      this.prisma.position.count({ where }),
    ]);

    const data = positions.map((pos) => ({
      ...pos,
      status: this.computeStatus(pos.headcount, pos._count.employees),
    }));

    return paginate(data, total, page, limit);
  }

  async findOne(id: string) {
    const position = await this.prisma.position.findUnique({
      where: { id },
      include: {
        jobTitle: { select: { id: true, name: true, band: true, code: true } },
        orgUnit: { select: { id: true, name: true } },
        employees: {
          where: { isActive: true },
          select: {
            id: true,
            code: true,
            fullName: true,
            level: true,
            email: true,
          },
          orderBy: { fullName: 'asc' },
        },
        histories: {
          include: {
            employee: { select: { id: true, code: true, fullName: true } },
          },
          orderBy: { startDate: 'desc' },
          take: 5,
        },
        _count: { select: { employees: true } },
      },
    });

    if (!position) throw new NotFoundException('Không tìm thấy vị trí biên chế');

    return {
      ...position,
      status: this.computeStatus(position.headcount, position._count.employees),
    };
  }

  async create(dto: CreatePositionDto) {
    // Kiểm tra jobTitle và orgUnit tồn tại
    const [jobTitle, orgUnit] = await Promise.all([
      this.prisma.jobTitle.findUnique({ where: { id: dto.jobTitleId } }),
      this.prisma.orgUnit.findUnique({ where: { id: dto.orgUnitId } }),
    ]);

    if (!jobTitle) throw new NotFoundException('Không tìm thấy chức danh');
    if (!orgUnit) throw new NotFoundException('Không tìm thấy đơn vị tổ chức');

    return this.prisma.position.create({
      data: {
        code: dto.code,
        jobTitleId: dto.jobTitleId,
        orgUnitId: dto.orgUnitId,
        headcount: dto.headcount ?? 1,
        description: dto.description,
      },
      include: {
        jobTitle: { select: { id: true, name: true } },
        orgUnit: { select: { id: true, name: true } },
      },
    });
  }

  async update(id: string, dto: UpdatePositionDto) {
    await this.findOne(id);

    if (dto.jobTitleId) {
      const jobTitle = await this.prisma.jobTitle.findUnique({ where: { id: dto.jobTitleId } });
      if (!jobTitle) throw new NotFoundException('Không tìm thấy chức danh');
    }

    if (dto.orgUnitId) {
      const orgUnit = await this.prisma.orgUnit.findUnique({ where: { id: dto.orgUnitId } });
      if (!orgUnit) throw new NotFoundException('Không tìm thấy đơn vị tổ chức');
    }

    const position = await this.prisma.position.findUnique({ where: { id }, select: { orgUnitId: true } });

    return this.prisma.$transaction(async (tx) => {
      // Khi đặt vị trí này là đứng đầu → bỏ is_head của các vị trí khác trong cùng đơn vị
      if (dto.isHead === true && position) {
        await tx.position.updateMany({
          where: { orgUnitId: position.orgUnitId, isHead: true, id: { not: id } },
          data: { isHead: false },
        });
      }

      return tx.position.update({
        where: { id },
        data: {
          ...(dto.jobTitleId !== undefined && { jobTitleId: dto.jobTitleId }),
          ...(dto.orgUnitId !== undefined && { orgUnitId: dto.orgUnitId }),
          ...(dto.headcount !== undefined && { headcount: dto.headcount }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
          ...(dto.isHead !== undefined && { isHead: dto.isHead }),
        },
        include: {
          jobTitle: { select: { id: true, name: true } },
          orgUnit: { select: { id: true, name: true } },
        },
      });
    });
  }

  async getVacant(orgUnitId?: string) {
    const positions = await this.prisma.position.findMany({
      where: {
        isActive: true,
        ...(orgUnitId && { orgUnitId }),
      },
      include: {
        jobTitle: { select: { id: true, name: true, band: true } },
        orgUnit: { select: { id: true, name: true } },
        _count: { select: { employees: true } },
      },
      orderBy: { code: 'asc' },
    });

    // Lọc những vị trí VACANT hoặc OVER_CAPACITY
    return positions
      .map((pos) => ({
        ...pos,
        status: this.computeStatus(pos.headcount, pos._count.employees),
      }))
      .filter((pos) => pos.status === 'VACANT' || pos.status === 'OVER_CAPACITY');
  }
}
