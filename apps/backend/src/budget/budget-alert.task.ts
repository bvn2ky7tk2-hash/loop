import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

/**
 * E17.5 — Cron daily 9:00 — cảnh báo BudgetLine utilization cao.
 *
 * Không inject BudgetService trực tiếp vì có thể REQUEST-scoped.
 * Dùng PrismaService trực tiếp (singleton-safe).
 *
 * Logic:
 *  - utilization = usedAmount / allocatedAmount
 *  - WARNING  : 80% <= utilization < 100%  → type BUDGET_NEAR_LIMIT
 *  - CRITICAL : utilization >= 100%         → type BUDGET_EXCEEDED
 *  - Bỏ qua nếu đã có notification cùng loại cho BudgetLine đó trong 7 ngày qua
 *  - Gửi cho: createdById của BudgetPlan + users có role PM/ADMIN thuộc orgUnit
 */
@Injectable()
export class BudgetAlertTask {
  private readonly logger = new Logger(BudgetAlertTask.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron('0 9 * * *')
  async checkBudgetUtilization(): Promise<void> {
    this.logger.log('[BudgetAlertTask] Kiểm tra budget utilization...');

    // Lấy tất cả BudgetLine thuộc plan chưa CLOSED, có allocatedAmount > 0
    const lines = await this.prisma.budgetLine.findMany({
      where: {
        plan: { status: { not: 'CLOSED' } },
        allocatedAmount: { gt: 0 },
      },
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            createdById: true,
            orgUnitId: true,
          },
        },
      },
      take: 1000,
    });

    if (lines.length === 0) {
      this.logger.log('[BudgetAlertTask] Không có BudgetLine nào cần kiểm tra.');
      return;
    }

    // Xác định orgUnitId tổng hợp để tìm PM/ADMIN
    const orgUnitIds = [
      ...new Set(lines.map(l => l.plan.orgUnitId).filter((id): id is string => !!id)),
    ];

    // Tìm users role PM/ADMIN trong các orgUnit liên quan
    const pmAdminUsers = orgUnitIds.length > 0
      ? await this.prisma.user.findMany({
          where: {
            role: { in: ['PM', 'ADMIN'] },
            isActive: true,
            orgUnitId: { in: orgUnitIds },
          },
          select: { id: true, orgUnitId: true },
          take: 500,
        })
      : [];

    // Tìm thêm ADMIN global (không gắn orgUnit cụ thể)
    const globalAdmins = await this.prisma.user.findMany({
      where: {
        role: 'ADMIN',
        isActive: true,
        orgUnitId: null,
      },
      select: { id: true },
      take: 100,
    });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    let warningCount = 0;
    let criticalCount = 0;

    for (const line of lines) {
      const allocated = Number(line.allocatedAmount);
      if (allocated <= 0) continue;

      const used = Number(line.usedAmount);
      const utilization = used / allocated;

      // Bỏ qua nếu chưa đạt ngưỡng cảnh báo
      if (utilization < 0.8) continue;

      const isCritical = utilization >= 1.0;
      const notifType = isCritical ? 'BUDGET_EXCEEDED' : 'BUDGET_NEAR_LIMIT';
      const utilizationPct = Math.round(utilization * 100);

      // Kiểm tra đã gửi notification cùng loại trong 7 ngày chưa
      const recentExists = await this.prisma.notification.findFirst({
        where: {
          type: notifType as any,
          entityType: 'BudgetLine',
          entityId: line.id,
          createdAt: { gte: sevenDaysAgo },
        },
        select: { id: true },
      });

      if (recentExists) continue;

      const title = isCritical
        ? `Ngân sách vượt mức — ${line.category}`
        : `Ngân sách sắp cạn — ${line.category} (${utilizationPct}%)`;

      const body = isCritical
        ? `Hạng mục "${line.category}" trong kế hoạch "${line.plan.name}" đã sử dụng ${utilizationPct}% ngân sách (vượt mức 100%).`
        : `Hạng mục "${line.category}" trong kế hoạch "${line.plan.name}" đã sử dụng ${utilizationPct}% ngân sách (ngưỡng cảnh báo ${line.alertThreshold}%).`;

      const payload = {
        budgetLineId: line.id,
        budgetPlanId: line.planId,
        category: line.category,
        utilization: utilizationPct,
        usedAmount: used,
        allocatedAmount: allocated,
        level: isCritical ? 'CRITICAL' : 'WARNING',
      };

      const link = `/finance/budget/${line.planId}`;

      // Tập hợp userId nhận notification (không trùng)
      const recipientIds = new Set<string>();

      // createdById của BudgetPlan
      if (line.plan.createdById) {
        recipientIds.add(line.plan.createdById);
      }

      // PM/ADMIN trong cùng orgUnit với plan
      if (line.plan.orgUnitId) {
        for (const u of pmAdminUsers) {
          if (u.orgUnitId === line.plan.orgUnitId) {
            recipientIds.add(u.id);
          }
        }
      }

      // ADMIN global
      for (const u of globalAdmins) {
        recipientIds.add(u.id);
      }

      if (recipientIds.size === 0) continue;

      // Tạo notifications trong 1 transaction
      await this.prisma.$transaction(
        [...recipientIds].map(userId =>
          this.prisma.notification.create({
            data: {
              userId,
              type: notifType as any,
              title,
              body,
              link,
              entityType: 'BudgetLine',
              entityId: line.id,
              payload,
            },
          }),
        ),
      );

      if (isCritical) criticalCount++;
      else warningCount++;

      this.logger.warn(
        `[BudgetAlertTask] ${notifType} — ${line.category} (${utilizationPct}%) → ${recipientIds.size} người nhận`,
      );
    }

    this.logger.log(
      `[BudgetAlertTask] Hoàn tất. WARNING=${warningCount}, CRITICAL=${criticalCount}`,
    );
  }
}
