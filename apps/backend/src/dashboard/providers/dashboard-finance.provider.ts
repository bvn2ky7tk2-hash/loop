import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/** Finance domain: Finance dashboard + Finance summary (6 tháng). */
@Injectable()
export class DashboardFinanceProvider {
  constructor(private readonly prisma: PrismaService) {}

  async calcFinance() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [
      pendingExpenses,
      outstandingInvoices,
      monthlyPayrollAgg,
      outstandingInvoicesValue,
    ] = await Promise.all([
      this.prisma.expense.count({ where: { status: 'PENDING' } }),
      this.prisma.invoice.count({ where: { status: { in: ['SENT', 'OVERDUE'] } } }),
      this.prisma.payrollRecord.aggregate({
        where: {
          period: { startDate: { gte: monthStart }, endDate: { lte: monthEnd } },
        },
        _sum: { netSalary: true },
      }),
      this.prisma.invoice.aggregate({
        where: { status: { in: ['SENT', 'OVERDUE'] } },
        _sum: { totalAmount: true },
      }),
    ]);

    return {
      pendingExpenses,
      outstandingInvoices,
      outstandingInvoicesValue: Number(outstandingInvoicesValue._sum.totalAmount ?? 0),
      monthlyPayroll: Number(monthlyPayrollAgg._sum.netSalary ?? 0),
      budgetUtilization: 0,
    };
  }

  async calcFinanceSummary() {
    const results: { month: string; revenue: number; expense: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const date  = new Date();
      date.setMonth(date.getMonth() - i);
      const year  = date.getFullYear();
      const month = date.getMonth();
      const start = new Date(year, month, 1);
      const end   = new Date(year, month + 1, 0, 23, 59, 59);
      const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

      const [revenue, expense] = await Promise.all([
        this.prisma.invoice.aggregate({
          where: { type: 'SALES', status: 'PAID', createdAt: { gte: start, lte: end }, deletedAt: null },
          _sum: { totalAmount: true },
        }),
        this.prisma.expense.aggregate({
          where: { createdAt: { gte: start, lte: end } },
          _sum: { totalAmount: true },
        }),
      ]);

      results.push({
        month: monthStr,
        revenue: Number(revenue._sum.totalAmount ?? 0),
        expense: Number(expense._sum.totalAmount ?? 0),
      });
    }

    return results;
  }
}
