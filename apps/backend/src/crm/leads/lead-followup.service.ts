import {
  Injectable,
  Logger,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { TenantAwareService } from '../../common/services/tenant-aware.service';
import { paginate, PaginatedResult } from '../../common/dto/pagination.dto';
import {
  ActivityType,
  FollowUpStatus,
  NotificationType,
} from '../../generated/prisma';
import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsDateString,
  IsEnum,
  IsOptional,
} from 'class-validator';

export class CreateFollowUpDto {
  @IsOptional()
  @IsUUID()
  leadId?: string;

  @IsOptional()
  @IsUUID()
  dealId?: string;

  @IsDateString()
  scheduledDate: string;

  @IsEnum(ActivityType)
  type: ActivityType;

  @IsOptional()
  @IsString()
  note?: string;

  @IsString()
  @IsNotEmpty()
  assigneeId: string;
}

@Injectable({ scope: Scope.REQUEST })
export class LeadFollowUpService extends TenantAwareService {
  private readonly logger = new Logger(LeadFollowUpService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    @Inject(REQUEST) req?: any,
  ) {
    super(req);
  }

  async create(dto: CreateFollowUpDto) {
    return this.prisma.leadFollowUpSchedule.create({
      data: {
        leadId:        dto.leadId ?? null,
        dealId:        dto.dealId ?? null,
        scheduledDate: new Date(dto.scheduledDate),
        type:          dto.type,
        note:          dto.note ?? null,
        assigneeId:    dto.assigneeId,
        tenantId:      this.getTenantId() ?? null,
        status:        FollowUpStatus.PENDING,
      },
      include: {
        lead:     { select: { id: true, title: true } },
        deal:     { select: { id: true, title: true } },
        assignee: { select: { id: true, name: true } },
      },
    });
  }

  async list(
    leadId?: string,
    dealId?: string,
    status?: FollowUpStatus,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResult<any>> {
    const where: any = {};
    if (leadId) where.leadId = leadId;
    if (dealId) where.dealId = dealId;
    if (status) where.status = status;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.leadFollowUpSchedule.findMany({
        where,
        include: {
          lead:     { select: { id: true, title: true } },
          deal:     { select: { id: true, title: true } },
          assignee: { select: { id: true, name: true } },
        },
        orderBy: { scheduledDate: 'asc' },
        skip:    (page - 1) * limit,
        take:    limit,
      }),
      this.prisma.leadFollowUpSchedule.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async markDone(id: string) {
    const followUp = await this.prisma.leadFollowUpSchedule.findUnique({ where: { id } });
    if (!followUp) throw new NotFoundException('Không tìm thấy lịch follow-up');
    return this.prisma.leadFollowUpSchedule.update({
      where: { id },
      data:  { status: FollowUpStatus.DONE },
    });
  }

  async markSkipped(id: string) {
    const followUp = await this.prisma.leadFollowUpSchedule.findUnique({ where: { id } });
    if (!followUp) throw new NotFoundException('Không tìm thấy lịch follow-up');
    return this.prisma.leadFollowUpSchedule.update({
      where: { id },
      data:  { status: FollowUpStatus.SKIPPED },
    });
  }

  /**
   * Cron 8:00 daily — notify assignee về các follow-up đến hạn hôm nay.
   */
  @Cron('0 8 * * *')
  async dailyFollowUpNotification() {
    this.logger.log('LeadFollowUp daily notify cron started');
    try {
      const today     = new Date();
      const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const tomorrow  = new Date(todayDate);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const dueToday = await this.prisma.leadFollowUpSchedule.findMany({
        where: {
          status:        FollowUpStatus.PENDING,
          scheduledDate: { gte: todayDate, lt: tomorrow },
        },
        include: {
          lead:     { select: { title: true } },
          deal:     { select: { title: true } },
          assignee: { select: { id: true, name: true } },
        },
        take: 500,
      });

      for (const fu of dueToday) {
        const entityTitle = fu.lead?.title ?? fu.deal?.title ?? 'Không rõ';
        await this.notifications.createInApp(fu.assignee.id, {
          type:       NotificationType.TASK_DUE_TODAY,
          title:      'Follow-up đến hạn hôm nay',
          body:       `Nhắc nhở: follow-up "${fu.type}" cho "${entityTitle}"`,
          link:       fu.leadId ? `/crm/leads/${fu.leadId}` : `/crm/deals/${fu.dealId}`,
          entityType: 'LeadFollowUp',
          entityId:   fu.id,
        });
      }

      this.logger.log(`LeadFollowUp notify: ${dueToday.length} lịch đến hạn`);
    } catch (err) {
      this.logger.error('LeadFollowUp cron failed', err);
    }
  }
}
