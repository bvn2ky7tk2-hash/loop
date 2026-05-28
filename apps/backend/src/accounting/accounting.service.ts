import { Injectable, Logger, OnModuleInit, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FinanceEventBus } from './finance-event-bus.service';
import { paginate } from '../common/dto/pagination.dto';
import { CreateJournalDto } from './dto/create-journal.dto';
import { FilterJournalDto } from './dto/filter-journal.dto';
import { AccountType } from '../generated/prisma';

// Tài khoản TT200 dùng cho auto-journal
const ACC = {
  CASH:         '1111',
  AR:           '1311',
  REVENUE:      '5111',
  AP:           '3311',
  PAYABLE_EMP:  '3341',
  EXPENSE:      '6421',
  SALARY:       '6411',
};

@Injectable()
export class AccountingService implements OnModuleInit {
  private readonly logger = new Logger(AccountingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bus: FinanceEventBus,
  ) {}

  onModuleInit() {
    this.bus.on('invoice.paid', (e) => this.handleInvoicePaid(e.refId, e.amount, e.userId));
    this.bus.on('expense.approved', (e) => this.handleExpenseApproved(e.refId, e.amount, e.userId));
    this.bus.on('payroll.approved', (e) => this.handlePayrollApproved(e.refId, e.amount, e.userId));
  }

  private async createAutoEntry(
    date: Date,
    description: string,
    reference: string,
    lines: Array<{ accountCode: string; debit: number; credit: number }>,
    userId: string,
  ) {
    // Chỉ tạo nếu tài khoản tồn tại
    const codes = [...new Set(lines.map(l => l.accountCode))];
    const existing = await this.prisma.chartOfAccount.findMany({
      where: { code: { in: codes }, isActive: true },
      select: { code: true },
    });
    if (existing.length !== codes.length) return; // skip nếu thiếu tài khoản

    await this.prisma.journalEntry.create({
      data: {
        date, description, reference,
        createdById: userId,
        lines: {
          create: lines.map(l => ({
            accountCode: l.accountCode,
            debit: l.debit,
            credit: l.credit,
          })),
        },
      },
    });
  }

  private async handleInvoicePaid(invoiceId: string, amount: number, userId: string) {
    try {
      const inv = await this.prisma.invoice.findUnique({ where: { id: invoiceId }, select: { code: true, paidAt: true } });
      if (!inv) return;
      await this.createAutoEntry(
        inv.paidAt ?? new Date(),
        `Thu tiền hóa đơn ${inv.code}`,
        `INV:${inv.code}`,
        [
          { accountCode: ACC.CASH, debit: amount, credit: 0 },
          { accountCode: ACC.REVENUE, debit: 0, credit: amount },
        ],
        userId,
      );
    } catch (err) {
      this.logger.error(`Auto-journal invoice.paid failed: ${err}`);
    }
  }

  private async handleExpenseApproved(expenseId: string, amount: number, userId: string) {
    try {
      const exp = await this.prisma.expense.findUnique({ where: { id: expenseId }, select: { title: true, approvedAt: true } });
      if (!exp) return;
      await this.createAutoEntry(
        exp.approvedAt ?? new Date(),
        `Chi phí phê duyệt: ${exp.title}`,
        `EXP:${expenseId.slice(-8)}`,
        [
          { accountCode: ACC.EXPENSE, debit: amount, credit: 0 },
          { accountCode: ACC.AP, debit: 0, credit: amount },
        ],
        userId,
      );
    } catch (err) {
      this.logger.error(`Auto-journal expense.approved failed: ${err}`);
    }
  }

  private async handlePayrollApproved(periodId: string, amount: number, userId: string) {
    try {
      const period = await this.prisma.payrollPeriod.findUnique({ where: { id: periodId }, select: { name: true, endDate: true } });
      if (!period) return;
      await this.createAutoEntry(
        period.endDate,
        `Lương kỳ ${period.name}`,
        `PAY:${periodId}`,
        [
          { accountCode: ACC.SALARY, debit: amount, credit: 0 },
          { accountCode: ACC.PAYABLE_EMP, debit: 0, credit: amount },
        ],
        userId,
      );
    } catch (err) {
      this.logger.error(`Auto-journal payroll.approved failed: ${err}`);
    }
  }

  // ── Chart of Accounts ────────────────────────────────────────────────────────

  async listAccounts(type?: AccountType) {
    return this.prisma.chartOfAccount.findMany({
      where: type ? { type } : undefined,
      orderBy: { code: 'asc' },
    });
  }

  async getAccount(code: string) {
    const acc = await this.prisma.chartOfAccount.findUnique({ where: { code } });
    if (!acc) throw new NotFoundException('Tài khoản kế toán không tìm thấy');
    return acc;
  }

  // ── Journal Entries ──────────────────────────────────────────────────────────

  async listJournal(dto: FilterJournalDto) {
    const { page = 1, limit = 50, dateFrom, dateTo, accountCode, reference } = dto;

    // Lọc theo accountCode yêu cầu join qua lines
    if (accountCode) {
      const entries = await this.prisma.journalEntry.findMany({
        where: {
          date: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo   ? { lte: new Date(dateTo) }   : {}),
          },
          ...(reference ? { reference: { contains: reference, mode: 'insensitive' } } : {}),
          lines: { some: { accountCode } },
        },
        include: { lines: { include: { account: { select: { code: true, name: true } } } } },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      });
      const total = await this.prisma.journalEntry.count({ where: { lines: { some: { accountCode } } } });
      return paginate(entries, total, page, limit);
    }

    const where = {
      date: {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo   ? { lte: new Date(dateTo) }   : {}),
      },
      ...(reference ? { reference: { contains: reference, mode: 'insensitive' as const } } : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.journalEntry.findMany({
        where, skip: (page - 1) * limit, take: limit,
        include: { lines: { include: { account: { select: { code: true, name: true } } } } },
        orderBy: { date: 'desc' },
      }),
      this.prisma.journalEntry.count({ where }),
    ]);
    return paginate(data, total, page, limit);
  }

  async createJournal(dto: CreateJournalDto, userId: string) {
    const debitSum  = dto.lines.reduce((s, l) => s + l.debit,  0);
    const creditSum = dto.lines.reduce((s, l) => s + l.credit, 0);
    if (Math.abs(debitSum - creditSum) > 0.01) {
      throw new UnprocessableEntityException('Tổng Nợ phải bằng tổng Có');
    }

    const codes = dto.lines.map(l => l.accountCode);
    const existing = await this.prisma.chartOfAccount.findMany({
      where: { code: { in: codes }, isActive: true },
      select: { code: true },
    });
    const missing = codes.filter(c => !existing.some(e => e.code === c));
    if (missing.length) throw new NotFoundException(`Tài khoản không tồn tại: ${missing.join(', ')}`);

    return this.prisma.journalEntry.create({
      data: {
        date: new Date(dto.date),
        description: dto.description,
        reference: dto.reference,
        createdById: userId,
        lines: { create: dto.lines },
      },
      include: { lines: { include: { account: { select: { code: true, name: true } } } } },
    });
  }
}
