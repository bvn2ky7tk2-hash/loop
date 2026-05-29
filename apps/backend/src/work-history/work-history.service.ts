import { Injectable, NotFoundException, Inject, Optional } from '@nestjs/common';
import { Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { PaginatedResult, paginate } from '../common/dto/pagination.dto';
import { WorkHistoryEventType } from '../generated/prisma';
import { CreateWorkHistoryDto } from './dto/work-history.dto';
import { TenantAwareService } from '../common/services/tenant-aware.service';

@Injectable({ scope: Scope.REQUEST })
export class WorkHistoryService extends TenantAwareService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() @Inject(REQUEST) req?: any,
  ) {
    super(req);
  }

  private getTenantFilter() {
    const tid = this.getTenantId();
    return tid ? { employee: { tenantId: tid } } : {};
  }

  async findByEmployee(
    employeeId: string,
    page = 1,
    limit = 50,
    eventType?: WorkHistoryEventType,
  ): Promise<PaginatedResult<unknown>> {
    const skip = (page - 1) * limit;
    const tenantFilter = this.getTenantFilter();
    const where: Record<string, unknown> = { employeeId, ...tenantFilter };
    if (eventType) where['eventType'] = eventType;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.workHistory.findMany({
        where,
        skip,
        take: limit,
        orderBy: { eventDate: 'desc' },
      }),
      this.prisma.workHistory.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async create(dto: CreateWorkHistoryDto) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: dto.employeeId },
      select: { id: true },
    });
    if (!employee) throw new NotFoundException('Không tìm thấy nhân viên');

    return this.prisma.workHistory.create({
      data: {
        employeeId: dto.employeeId,
        eventType: dto.eventType,
        eventDate: new Date(dto.eventDate),
        title: dto.title,
        description: dto.description,
      },
    });
  }
}
