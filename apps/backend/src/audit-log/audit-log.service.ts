import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { paginate, PaginatedResult } from '../common/dto/pagination.dto';

export interface AuditLogEntry {
  userId?: string;
  action: string;
  module?: string;
  entity: string;
  entityId?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  oldValues?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLogFilter {
  userId?: string;
  module?: string;
  action?: string;
  entity?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditLogEntry): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId:    entry.userId,
        action:    entry.action,
        module:    entry.module,
        entity:    entry.entity,
        entityId:  entry.entityId,
        oldValues: entry.oldValues ?? undefined,
        newValues: entry.newValues ?? undefined,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
      },
    });
  }

  async findByEntity(entity: string, entityId: string) {
    return this.prisma.auditLog.findMany({
      where: { entity, entityId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async listLogs(filter: AuditLogFilter): Promise<PaginatedResult<any>> {
    const page  = filter.page  ?? 1;
    const limit = Math.min(filter.limit ?? 50, 100);

    const where: any = {};
    if (filter.userId) where.userId = filter.userId;
    if (filter.module) where.module = filter.module;
    if (filter.action) where.action = filter.action;
    if (filter.entity) where.entity = { contains: filter.entity, mode: 'insensitive' };
    if (filter.dateFrom || filter.dateTo) {
      where.createdAt = {};
      if (filter.dateFrom) where.createdAt.gte = new Date(filter.dateFrom);
      if (filter.dateTo)   where.createdAt.lte = new Date(filter.dateTo);
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip:  (page - 1) * limit,
        take:  limit,
        include: {
          user: { select: { id: true, name: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async getLogsForExport(filter: AuditLogFilter): Promise<any[]> {
    const where: any = {};
    if (filter.userId) where.userId = filter.userId;
    if (filter.module) where.module = filter.module;
    if (filter.action) where.action = filter.action;
    if (filter.entity) where.entity = { contains: filter.entity, mode: 'insensitive' };
    if (filter.dateFrom || filter.dateTo) {
      where.createdAt = {};
      if (filter.dateFrom) where.createdAt.gte = new Date(filter.dateFrom);
      if (filter.dateTo)   where.createdAt.lte = new Date(filter.dateTo);
    }

    return this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 5000,
      include: { user: { select: { id: true, name: true } } },
    });
  }
}
