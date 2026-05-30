import { Injectable, Inject } from '@nestjs/common';
import { Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { TenantAwareService } from '../common/services/tenant-aware.service';
import { InvoiceType, InvoiceStatus } from '../generated/prisma';

@Injectable({ scope: Scope.REQUEST })
export class FinanceAnalyticsService extends TenantAwareService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REQUEST) req?: any,
  ) {
    super(req);
  }

  async getSummary() {
    const now       = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const [
      revenueYTD,
      arOutstanding,
      apOutstanding,
      arPaidAgg,
      arTotalAgg,
    ] = await Promise.all([
      // Doanh thu YTD (SALES, PAID)
      this.prisma.invoice.aggregate({
        where: this.tenantWhere({
          type:     InvoiceType.SALES,
          status:   InvoiceStatus.PAID,
          paidAt:   { gte: yearStart },
          deletedAt: null,
        }),
        _sum: { totalAmount: true },
      }),
      // AR Outstanding (SALES, chưa thanh toán — SENT hoặc OVERDUE)
      this.prisma.invoice.aggregate({
        where: this.tenantWhere({
          type:   InvoiceType.SALES,
          status: { in: [InvoiceStatus.SENT, InvoiceStatus.OVERDUE] },
          deletedAt: null,
        }),
        _sum: { totalAmount: true },
      }),
      // AP Outstanding (PURCHASE, chưa thanh toán)
      this.prisma.invoice.aggregate({
        where: this.tenantWhere({
          type:   InvoiceType.PURCHASE,
          status: { in: [InvoiceStatus.SENT, InvoiceStatus.OVERDUE] },
          deletedAt: null,
        }),
        _sum: { totalAmount: true },
      }),
      // AR paid YTD (để tính cash collection rate)
      this.prisma.invoice.aggregate({
        where: this.tenantWhere({
          type:     InvoiceType.SALES,
          status:   InvoiceStatus.PAID,
          paidAt:   { gte: yearStart },
          deletedAt: null,
        }),
        _sum: { totalAmount: true },
      }),
      // AR total invoiced YTD
      this.prisma.invoice.aggregate({
        where: this.tenantWhere({
          type:      InvoiceType.SALES,
          status:    { not: InvoiceStatus.CANCELLED },
          issueDate: { gte: yearStart },
          deletedAt: null,
        }),
        _sum: { totalAmount: true },
      }),
    ]);

    const arPaid    = Number(arPaidAgg._sum.totalAmount    ?? 0);
    const arTotal   = Number(arTotalAgg._sum.totalAmount   ?? 0);
    const cashCollectionRate = arTotal > 0 ? Math.round((arPaid / arTotal) * 100 * 10) / 10 : 0;

    // Avg days to pay (từ issue_date → paid_at cho PAID invoices trong năm)
    const paidInvoices = await this.prisma.invoice.findMany({
      where: this.tenantWhere({
        type:     InvoiceType.SALES,
        status:   InvoiceStatus.PAID,
        paidAt:   { gte: yearStart },
        deletedAt: null,
      }),
      select: { issueDate: true, paidAt: true },
      take: 1000,
    });

    let avgDaysToPay = 0;
    if (paidInvoices.length > 0) {
      const totalDays = paidInvoices.reduce((sum, inv) => {
        if (!inv.paidAt) return sum;
        const diff = (inv.paidAt.getTime() - inv.issueDate.getTime()) / (1000 * 60 * 60 * 24);
        return sum + diff;
      }, 0);
      avgDaysToPay = Math.round(totalDays / paidInvoices.length);
    }

    return {
      revenueYTD:           Number(revenueYTD._sum.totalAmount  ?? 0),
      arOutstanding:        Number(arOutstanding._sum.totalAmount ?? 0),
      apOutstanding:        Number(apOutstanding._sum.totalAmount ?? 0),
      cashCollectionRate,
      avgDaysToPay,
    };
  }

  async getArAging() {
    const now = new Date();

    const overdueInvoices = await this.prisma.invoice.findMany({
      where: this.tenantWhere({
        type:   InvoiceType.SALES,
        status: { in: [InvoiceStatus.SENT, InvoiceStatus.OVERDUE] },
        deletedAt: null,
      }),
      select: { dueDate: true, totalAmount: true },
      take: 2000,
    });

    const buckets: Record<string, { count: number; amount: number }> = {
      '0-30':  { count: 0, amount: 0 },
      '31-60': { count: 0, amount: 0 },
      '61-90': { count: 0, amount: 0 },
      '90+':   { count: 0, amount: 0 },
    };

    for (const inv of overdueInvoices) {
      const daysPastDue = Math.floor(
        (now.getTime() - inv.dueDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      const amount = Number(inv.totalAmount);
      let bucket: string;
      if (daysPastDue <= 30)       bucket = '0-30';
      else if (daysPastDue <= 60)  bucket = '31-60';
      else if (daysPastDue <= 90)  bucket = '61-90';
      else                         bucket = '90+';

      buckets[bucket].count  += 1;
      buckets[bucket].amount += amount;
    }

    return Object.entries(buckets).map(([bucket, data]) => ({
      bucket,
      count:  data.count,
      amount: Math.round(data.amount),
    }));
  }

  /**
   * E24.4 — Budget vs Actual: tổng hợp theo category từ BudgetLine ACTIVE.
   * Group by category, sum allocatedAmount và usedAmount.
   */
  async getBudgetVsActual() {
    const tid = this.getTenantId();
    const lines = await this.prisma.budgetLine.findMany({
      where: {
        plan: {
          status: 'ACTIVE',
          // BudgetPlan không có tenantId trực tiếp — filter qua orgUnit nếu có tenantId
          ...(tid
            ? { orgUnit: { tenantId: tid } }
            : {}),
        },
      },
      select: {
        category:        true,
        allocatedAmount: true,
        usedAmount:      true,
      },
      take: 500,
    });

    // Group by category
    const categoryMap = new Map<string, { allocated: number; used: number }>();
    for (const line of lines) {
      const cat = line.category;
      const existing = categoryMap.get(cat);
      const allocated = Number(line.allocatedAmount);
      const used      = Number(line.usedAmount);
      if (existing) {
        existing.allocated += allocated;
        existing.used      += used;
      } else {
        categoryMap.set(cat, { allocated, used });
      }
    }

    return Array.from(categoryMap.entries())
      .map(([name, data]) => ({
        name,
        allocated:   Math.round(data.allocated),
        used:        Math.round(data.used),
        utilization: data.allocated > 0
          ? Math.round((data.used / data.allocated) * 100 * 10) / 10
          : 0,
      }))
      .sort((a, b) => b.allocated - a.allocated);
  }

  async getMonthlyPL() {
    const results: {
      month: string;
      revenue: number;
      cost: number;
      netMargin: number;
    }[] = [];

    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const year     = d.getFullYear();
      const month    = d.getMonth();
      const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
      const start    = new Date(year, month, 1);
      const end      = new Date(year, month + 1, 0, 23, 59, 59);

      const [revenueAgg, costAgg] = await Promise.all([
        this.prisma.invoice.aggregate({
          where: this.tenantWhere({
            type:     InvoiceType.SALES,
            status:   InvoiceStatus.PAID,
            paidAt:   { gte: start, lte: end },
            deletedAt: null,
          }),
          _sum: { totalAmount: true },
        }),
        // Cost = purchase invoices paid trong tháng
        this.prisma.invoice.aggregate({
          where: this.tenantWhere({
            type:     InvoiceType.PURCHASE,
            status:   InvoiceStatus.PAID,
            paidAt:   { gte: start, lte: end },
            deletedAt: null,
          }),
          _sum: { totalAmount: true },
        }),
      ]);

      const revenue = Number(revenueAgg._sum.totalAmount ?? 0);
      const cost    = Number(costAgg._sum.totalAmount    ?? 0);
      const netMargin = revenue > 0 ? Math.round(((revenue - cost) / revenue) * 100 * 10) / 10 : 0;

      results.push({ month: monthStr, revenue, cost, netMargin });
    }

    return results;
  }
}
