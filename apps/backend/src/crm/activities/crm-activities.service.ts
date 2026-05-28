import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate, PaginatedResult } from '../../common/dto/pagination.dto';
import { CreateActivityDto, UpdateActivityDto } from './dto/crm-activity.dto';

const ACTIVITY_INCLUDE = {
  customer: { select: { id: true, code: true, name: true } },
  createdBy: { select: { id: true, name: true, email: true } },
} as const;

@Injectable()
export class CrmActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    customerId?: string,
    dealId?: string,
    leadId?: string,
    type?: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResult<any>> {
    const where: any = {};
    if (customerId) where.customerId = customerId;
    if (dealId) where.dealId = dealId;
    if (leadId) where.leadId = leadId;
    if (type) where.type = type;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.crmActivity.findMany({
        where,
        include: ACTIVITY_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.crmActivity.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findOne(id: string) {
    const activity = await this.prisma.crmActivity.findUnique({
      where: { id },
      include: ACTIVITY_INCLUDE,
    });
    if (!activity) throw new NotFoundException('Không tìm thấy hoạt động');
    return activity;
  }

  async create(dto: CreateActivityDto, createdById: string) {
    return this.prisma.crmActivity.create({
      data: {
        type: dto.type,
        subject: dto.subject,
        content: dto.content,
        customerId: dto.customerId,
        dealId: dto.dealId,
        contactId: dto.contactId,
        leadId: dto.leadId,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        completedAt: dto.completedAt ? new Date(dto.completedAt) : undefined,
        duration: dto.duration,
        outcome: dto.outcome,
        nextAction: dto.nextAction,
        nextActionDueAt: dto.nextActionDueAt
          ? new Date(dto.nextActionDueAt)
          : undefined,
        createdById,
      },
      include: ACTIVITY_INCLUDE,
    });
  }

  async update(id: string, dto: UpdateActivityDto) {
    await this.findOne(id);
    const d = dto as any;
    return this.prisma.crmActivity.update({
      where: { id },
      data: {
        ...d,
        scheduledAt: d.scheduledAt ? new Date(d.scheduledAt) : undefined,
        completedAt: d.completedAt ? new Date(d.completedAt) : undefined,
        nextActionDueAt: d.nextActionDueAt
          ? new Date(d.nextActionDueAt)
          : undefined,
      },
      include: ACTIVITY_INCLUDE,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.crmActivity.delete({ where: { id } });
  }

  async stats() {
    const [total, byType] = await this.prisma.$transaction([
      this.prisma.crmActivity.count(),
      this.prisma.$queryRaw<{ type: string; cnt: bigint }[]>`
        SELECT type, COUNT(*) as cnt FROM crm_activities GROUP BY type
      `,
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayDue = await this.prisma.crmActivity.count({
      where: { nextActionDueAt: { gte: today, lt: tomorrow } },
    });

    return {
      total,
      byType: Object.fromEntries(byType.map((r: { type: string; cnt: bigint }) => [r.type, Number(r.cnt)])),
      todayDue,
    };
  }
}
