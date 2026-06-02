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
import { TenantAwareService } from '../../common/services/tenant-aware.service';
import { paginate, PaginatedResult } from '../../common/dto/pagination.dto';
import {
  ActivityType,
  SurveyFrequency,
} from '../../generated/prisma';
import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsEnum,
  IsOptional,
  IsDateString,
} from 'class-validator';

export class CreateSurveyScheduleDto {
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @IsEnum(SurveyFrequency)
  frequency: SurveyFrequency;

  @IsDateString()
  nextDueAt: string;

  @IsOptional()
  @IsString()
  templateContent?: string;

  @IsString()
  @IsNotEmpty()
  assigneeId: string;
}

@Injectable({ scope: Scope.REQUEST })
export class CustomerSurveyService extends TenantAwareService {
  private readonly logger = new Logger(CustomerSurveyService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REQUEST) req?: any,
  ) {
    super(req);
  }

  async create(dto: CreateSurveyScheduleDto) {
    return this.prisma.customerSurveySchedule.create({
      data: {
        customerId:      dto.customerId,
        frequency:       dto.frequency,
        nextDueAt:       new Date(dto.nextDueAt),
        templateContent: dto.templateContent ?? null,
        assigneeId:      dto.assigneeId,
        tenantId:        this.getTenantId() ?? null,
        isActive:        true,
      },
      include: {
        customer: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
      },
    });
  }

  async list(customerId?: string, page = 1, limit = 20): Promise<PaginatedResult<any>> {
    const where: any = {};
    if (customerId) where.customerId = customerId;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.customerSurveySchedule.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true } },
          assignee: { select: { id: true, name: true } },
        },
        orderBy: { nextDueAt: 'asc' },
        skip:    (page - 1) * limit,
        take:    limit,
      }),
      this.prisma.customerSurveySchedule.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async deactivate(id: string) {
    const schedule = await this.prisma.customerSurveySchedule.findUnique({ where: { id } });
    if (!schedule) throw new NotFoundException('Không tìm thấy lịch khảo sát');
    return this.prisma.customerSurveySchedule.update({
      where: { id },
      data:  { isActive: false },
    });
  }

  /**
   * Cron 9:00 daily — kiểm tra CustomerSurveySchedule có nextDueAt = hôm nay.
   * Nếu match → tạo CrmActivity type=SURVEY → update lastSentAt + tính nextDueAt mới.
   */
  // Cron tách ra CustomerSurveyTask (DEFAULT scope) — service này REQUEST scope
  async dailySurveyCron() {
    this.logger.log('CustomerSurvey daily cron started');
    try {
      const today    = new Date();
      const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const tomorrow  = new Date(todayDate);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const dueSchedules = await this.prisma.customerSurveySchedule.findMany({
        where: {
          isActive:  true,
          nextDueAt: { gte: todayDate, lt: tomorrow },
        },
        include: {
          customer: { select: { id: true, name: true } },
        },
        take: 200,
      });

      for (const schedule of dueSchedules) {
        // Tạo CrmActivity type SURVEY
        await this.prisma.crmActivity.create({
          data: {
            type:       ActivityType.SURVEY,
            subject:    `Khảo sát khách hàng: ${schedule.customer.name}`,
            content:    schedule.templateContent ?? `Khảo sát định kỳ ${schedule.frequency}`,
            customerId: schedule.customerId,
            createdById: schedule.assigneeId,
            tenantId:   schedule.tenantId ?? null,
          },
        });

        // Tính nextDueAt mới theo frequency
        const nextDueAt = this.calcNextDueAt(todayDate, schedule.frequency);

        await this.prisma.customerSurveySchedule.update({
          where: { id: schedule.id },
          data:  {
            lastSentAt: todayDate,
            nextDueAt,
          },
        });
      }

      this.logger.log(`CustomerSurvey cron: ${dueSchedules.length} surveys triggered`);
    } catch (err) {
      this.logger.error('CustomerSurvey cron failed', err);
    }
  }

  /** Tính ngày gửi tiếp theo dựa vào frequency */
  private calcNextDueAt(from: Date, frequency: SurveyFrequency): Date {
    const next = new Date(from);
    switch (frequency) {
      case SurveyFrequency.MONTHLY:
        next.setMonth(next.getMonth() + 1);
        break;
      case SurveyFrequency.QUARTERLY:
        next.setMonth(next.getMonth() + 3);
        break;
      case SurveyFrequency.YEARLY:
        next.setFullYear(next.getFullYear() + 1);
        break;
    }
    return next;
  }
}
