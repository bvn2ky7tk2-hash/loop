import { Injectable, Logger, OnModuleInit, NotFoundException, UnprocessableEntityException, Inject, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';
import { TenantAwareService } from '../common/services/tenant-aware.service';
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
  INVENTORY:    '1561', // Hàng hóa (dùng khi nhận hàng PO)
  PAYABLE_EMP:  '3341',
  EXPENSE:      '6421',
  SALARY:       '6411',
};

@Injectable()
export class AccountingService extends TenantAwareService implements OnModuleInit {
  private readonly logger = new Logger(AccountingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bus: FinanceEventBus,
  ) {
    super(); // AccountingService là singleton (onModuleInit cần chạy khi khởi động)
  }

  onModuleInit() {
    this.bus.on('invoice.paid',      (e) => this.handleInvoicePaid(e.refId, e.amount, e.userId));
    this.bus.on('expense.approved',  (e) => this.handleExpenseApproved(e.refId, e.amount, e.userId));
    this.bus.on('payroll.approved',  (e) => this.handlePayrollApproved(e.refId, e.amount, e.userId));
    this.bus.on('po.received',       (e) => this.handlePoReceived(e.refId, e.amount, e.userId));
    this.bus.on('po.paid',           (e) => this.handlePoPaid(e.refId, e.amount, e.userId));
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
    if (existing.length !== codes.length) return null; // skip nếu thiếu tài khoản

    return this.prisma.journalEntry.create({
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
      select: { id: true },
    });
  }

  private async handleInvoicePaid(invoiceId: string, amount: number, userId: string) {
    try {
      const inv = await this.prisma.invoice.findUnique({
        where: { id: invoiceId },
        select: { id: true, code: true, type: true, taxAmount: true, paidAt: true, journalEntryId: true },
      });
      if (!inv) return;
      // Bỏ qua nếu đã có journal entry (tránh tạo duplicate)
      if (inv.journalEntryId) return;

      // E21.1: Tra InvoiceAccountMapping nếu có, fallback về ACC mặc định
      const mapping = await this.prisma.invoiceAccountMapping.findFirst({
        where: { invoiceType: inv.type },
        include: {
          debitAccount: { select: { code: true } },
          creditAccount: { select: { code: true } },
          vatAccount: { select: { code: true } },
        },
      });

      // Fallback TT200: Nợ 131 (Phải thu khách hàng) / Có 511 (Doanh thu BH&CCDV)
      const debitAcc  = mapping?.debitAccount?.code  ?? ACC.AR;
      const creditAcc = mapping?.creditAccount?.code ?? ACC.REVENUE;
      const vatAcc    = mapping?.vatAccount?.code;

      const taxAmount = Number(inv.taxAmount ?? 0);
      const netAmount = amount - taxAmount;

      const lines: Array<{ accountCode: string; debit: number; credit: number }> = [
        { accountCode: debitAcc, debit: amount, credit: 0 },
        { accountCode: creditAcc, debit: 0, credit: netAmount },
      ];
      if (vatAcc && taxAmount > 0) {
        lines.push({ accountCode: vatAcc, debit: 0, credit: taxAmount });
      }

      const entry = await this.createAutoEntry(
        inv.paidAt ?? new Date(),
        `Ghi nhận doanh thu hóa đơn ${inv.code}`,
        `INV:${inv.code}`,
        lines,
        userId,
      );

      // Gắn journalEntryId vào invoice nếu tạo thành công
      if (entry) {
        await this.prisma.invoice.update({
          where: { id: invoiceId },
          data: { journalEntryId: entry.id },
        }).catch(() => {/* skip nếu không có cột */});
      }
    } catch (err) {
      this.logger.error(`Auto-journal invoice.paid failed: ${err}`);
    }
  }

  // E21.2: PO RECEIVED → debit 156 (Hàng hóa), credit 331 (Phải trả NCC)
  private async handlePoReceived(poId: string, amount: number, userId: string) {
    try {
      const po = await this.prisma.purchaseOrder.findUnique({
        where: { id: poId },
        select: { id: true, poNumber: true, receivedAt: true },
      });
      if (!po) return;
      const entry = await this.createAutoEntry(
        po.receivedAt ?? new Date(),
        `Nhận hàng PO ${po.poNumber}`,
        `PO:${po.poNumber}`,
        [
          { accountCode: ACC.INVENTORY, debit: amount, credit: 0 },
          { accountCode: ACC.AP,        debit: 0,      credit: amount },
        ],
        userId,
      );
      if (entry) {
        await this.prisma.purchaseOrder.update({
          where: { id: poId },
          data: { journalEntryId: entry.id },
        }).catch(() => {});
      }
    } catch (err) {
      this.logger.error(`Auto-journal po.received failed: ${err}`);
    }
  }

  // E21.2: PO PAID → debit 331 (Phải trả NCC), credit 111 (Tiền mặt)
  private async handlePoPaid(poId: string, amount: number, userId: string) {
    try {
      const po = await this.prisma.purchaseOrder.findUnique({
        where: { id: poId },
        select: { id: true, poNumber: true, paidAt: true },
      });
      if (!po) return;
      const entry = await this.createAutoEntry(
        po.paidAt ?? new Date(),
        `Thanh toán PO ${po.poNumber}`,
        `PO-PAY:${po.poNumber}`,
        [
          { accountCode: ACC.AP,   debit: amount, credit: 0 },
          { accountCode: ACC.CASH, debit: 0,      credit: amount },
        ],
        userId,
      );
      if (entry) {
        await this.prisma.purchaseOrder.update({
          where: { id: poId },
          data: { journalEntryId: entry.id },
        }).catch(() => {});
      }
    } catch (err) {
      this.logger.error(`Auto-journal po.paid failed: ${err}`);
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
    const acc = await this.prisma.chartOfAccount.findFirst({ where: { code } });
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

  // ── Financial Reports ────────────────────────────────────────────────────────

  async getProfitLoss(startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end   = new Date(endDate);

    const rows = await this.prisma.$queryRaw<Array<{ code: string; name: string; type: string; balance: number }>>`
      SELECT ca.code, ca.name, ca.type::text,
             COALESCE(SUM(CAST(jl.debit AS NUMERIC) - CAST(jl.credit AS NUMERIC)), 0) AS balance
      FROM chart_of_accounts ca
      LEFT JOIN journal_lines jl ON jl.account_code = ca.code
      LEFT JOIN journal_entries je ON je.id = jl.entry_id
        AND je.date >= ${start} AND je.date <= ${end}
      WHERE ca.type IN ('REVENUE','EXPENSE')
      GROUP BY ca.code, ca.name, ca.type
      ORDER BY ca.code
    `;

    const revenue: typeof rows = [];
    const expenses: typeof rows = [];
    let totalRevenue = 0;
    let totalExpenses = 0;

    for (const r of rows) {
      const balance = Number(r.balance);
      if (r.type === 'REVENUE') {
        // Revenue: credit > debit → balance negative in our calc → negate
        const amount = -balance;
        revenue.push({ ...r, balance: amount });
        totalRevenue += amount;
      } else {
        expenses.push({ ...r, balance });
        totalExpenses += balance;
      }
    }

    return {
      startDate, endDate,
      revenue, totalRevenue,
      expenses, totalExpenses,
      netIncome: totalRevenue - totalExpenses,
    };
  }

  async getBalanceSheet(asOfDate: string) {
    const asOf = new Date(asOfDate);

    const rows = await this.prisma.$queryRaw<Array<{ code: string; name: string; type: string; balance: number }>>`
      SELECT ca.code, ca.name, ca.type::text,
             COALESCE(SUM(CAST(jl.debit AS NUMERIC) - CAST(jl.credit AS NUMERIC)), 0) AS balance
      FROM chart_of_accounts ca
      LEFT JOIN journal_lines jl ON jl.account_code = ca.code
      LEFT JOIN journal_entries je ON je.id = jl.entry_id
        AND je.date <= ${asOf}
      WHERE ca.type IN ('ASSET','LIABILITY','EQUITY')
      GROUP BY ca.code, ca.name, ca.type
      ORDER BY ca.code
    `;

    const assets: typeof rows      = [];
    const liabilities: typeof rows = [];
    const equity: typeof rows      = [];
    let totalAssets = 0, totalLiabilities = 0, totalEquity = 0;

    for (const r of rows) {
      const balance = Number(r.balance);
      if (r.type === 'ASSET') {
        assets.push(r);
        totalAssets += balance;
      } else if (r.type === 'LIABILITY') {
        const amount = -balance; // liability: credit > debit
        liabilities.push({ ...r, balance: amount });
        totalLiabilities += amount;
      } else {
        const amount = -balance; // equity: credit > debit
        equity.push({ ...r, balance: amount });
        totalEquity += amount;
      }
    }

    return {
      asOfDate,
      assets, totalAssets,
      liabilities, totalLiabilities,
      equity, totalEquity,
      totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
    };
  }

  // ── TT200: Báo cáo KQKD (Income Statement) ────────────────────────────────────

  async getIncomeStatement(fromDate: string, toDate: string) {
    const from = new Date(fromDate);
    const to   = new Date(toDate);

    // Lấy số dư tài khoản doanh thu & chi phí trong kỳ
    const rows = await this.prisma.$queryRaw<Array<{ code: string; name: string; net: number }>>`
      SELECT ca.code, ca.name,
             COALESCE(SUM(CAST(jl.credit AS NUMERIC) - CAST(jl.debit AS NUMERIC)), 0) AS net
      FROM chart_of_accounts ca
      LEFT JOIN journal_lines jl ON jl.account_code = ca.code
      LEFT JOIN journal_entries je ON je.id = jl.entry_id
        AND je.date >= ${from} AND je.date <= ${to}
      WHERE ca.code ~ '^[56789]'
      GROUP BY ca.code, ca.name
      ORDER BY ca.code
    `;

    const byCode = new Map(rows.map(r => [r.code, Number(r.net)]));
    const get = (...codes: string[]) => codes.reduce((s, c) => s + (byCode.get(c) ?? 0), 0);

    // Doanh thu thuần (511, 512, 515)
    const revenue511 = get('5111', '5112', '511');
    const revenue512 = get('5121', '5122', '512');
    const revenue515 = get('5151', '5152', '515');
    const totalRevenue = revenue511 + revenue512 + revenue515;

    // Giá vốn hàng bán (632)
    const cogs = get('6321', '6322', '632');
    // Gross profit
    const grossProfit = totalRevenue - cogs;

    // Chi phí bán hàng (641) & QLDN (642)
    const sellingExp = get('6411', '6412', '6413', '6414', '6415', '6416', '6417', '6418', '641');
    const adminExp   = get('6421', '6422', '6423', '6424', '6425', '6426', '6427', '6428', '642');
    const operatingProfit = grossProfit - sellingExp - adminExp;

    // Thu nhập TC (515) & Chi phí TC (635)
    const financeIncome  = get('5151', '5152', '515');
    const financeExpense = get('6351', '6352', '635');

    // Thu nhập khác (711) & Chi phí khác (811)
    const otherIncome  = get('7111', '711');
    const otherExpense = get('8111', '811');

    const ebt = operatingProfit + financeIncome - financeExpense + otherIncome - otherExpense;
    // Thuế TNDN (821) — giả định 20%
    const tax = Math.max(0, ebt * 0.20);
    const netIncome = ebt - tax;

    const lineItems = [
      { code: '01', name: 'Doanh thu bán hàng và cung cấp dịch vụ', amount: totalRevenue, isSubtotal: false },
      { code: '02', name: '  Trong đó: Doanh thu dịch vụ (511)', amount: revenue511, isSubtotal: false },
      { code: '10', name: 'Giá vốn hàng bán (632)', amount: cogs, isSubtotal: false },
      { code: '20', name: 'LỢI NHUẬN GỘP (01 - 10)', amount: grossProfit, isSubtotal: true },
      { code: '21', name: 'Chi phí bán hàng (641)', amount: sellingExp, isSubtotal: false },
      { code: '22', name: 'Chi phí quản lý doanh nghiệp (642)', amount: adminExp, isSubtotal: false },
      { code: '30', name: 'LỢI NHUẬN THUẦN TỪ HĐKD (20 - 21 - 22)', amount: operatingProfit, isSubtotal: true },
      { code: '31', name: 'Thu nhập tài chính (515)', amount: financeIncome, isSubtotal: false },
      { code: '32', name: 'Chi phí tài chính (635)', amount: financeExpense, isSubtotal: false },
      { code: '40', name: 'Thu nhập khác (711)', amount: otherIncome, isSubtotal: false },
      { code: '41', name: 'Chi phí khác (811)', amount: otherExpense, isSubtotal: false },
      { code: '50', name: 'LỢI NHUẬN TRƯỚC THUẾ (EBT)', amount: ebt, isSubtotal: true },
      { code: '51', name: 'Thuế thu nhập doanh nghiệp (821) — 20%', amount: tax, isSubtotal: false },
      { code: '60', name: 'LỢI NHUẬN SAU THUẾ (LNST)', amount: netIncome, isSubtotal: true },
    ];

    return { fromDate, toDate, lineItems, totalRevenue, grossProfit, operatingProfit, ebt, netIncome };
  }

  // ── TT200: Lưu chuyển tiền tệ (Cash Flow — indirect method) ──────────────────

  async getCashFlowStatement(fromDate: string, toDate: string) {
    const from = new Date(fromDate);
    const to   = new Date(toDate);

    // Phát sinh thuần từng tài khoản trong kỳ (debit - credit = dòng tiền ra, credit - debit = dòng tiền vào)
    const rows = await this.prisma.$queryRaw<Array<{ code: string; debit: number; credit: number }>>`
      SELECT ca.code,
             COALESCE(SUM(CAST(jl.debit AS NUMERIC)), 0)  AS debit,
             COALESCE(SUM(CAST(jl.credit AS NUMERIC)), 0) AS credit
      FROM chart_of_accounts ca
      LEFT JOIN journal_lines jl ON jl.account_code = ca.code
      LEFT JOIN journal_entries je ON je.id = jl.entry_id
        AND je.date >= ${from} AND je.date <= ${to}
      GROUP BY ca.code
      ORDER BY ca.code
    `;

    const netFlow = new Map(rows.map(r => [r.code, Number(r.credit) - Number(r.debit)]));
    const get = (...codes: string[]) => codes.reduce((s, c) => s + (netFlow.get(c) ?? 0), 0);

    // I. Hoạt động kinh doanh (gián tiếp)
    const netIncome      = get('5111', '5112', '511', '5121', '5122', '512') - get('6421', '642', '6411', '641', '6321', '632');
    const changeAR       = get('1311', '1312', '131', '1321', '132');  // Tăng AR → âm
    const changeInventory= get('1521', '1522', '1561', '155', '156');
    const changeAP       = get('3311', '3312', '331');
    const depreciationAdj= get('2141', '2142', '214'); // khấu hao — non-cash, cộng lại
    const operatingCF    = netIncome - changeAR - changeInventory + changeAP + Math.abs(depreciationAdj);

    // II. Hoạt động đầu tư
    const buyFixedAsset  = get('2111', '2112', '211', '2121', '213');
    const sellFixedAsset = 0; // không có dữ liệu
    const investingCF    = -Math.abs(buyFixedAsset) + sellFixedAsset;

    // III. Hoạt động tài chính
    const borrowings    = get('3411', '3412', '341', '3421', '342');
    const repayments    = 0;
    const capitalIncrease = get('4111', '411');
    const dividends     = 0;
    const financingCF   = borrowings - repayments + capitalIncrease - dividends;

    const netCashChange = operatingCF + investingCF + financingCF;

    const sections = [
      {
        key: 'operating',
        title: 'I. Lưu chuyển tiền từ hoạt động kinh doanh',
        items: [
          { code: '01', name: 'Lợi nhuận kế toán trước thuế', amount: netIncome },
          { code: '02', name: 'Điều chỉnh: Khấu hao TSCĐ', amount: Math.abs(depreciationAdj) },
          { code: '03', name: 'Tăng/giảm các khoản phải thu', amount: -changeAR },
          { code: '04', name: 'Tăng/giảm hàng tồn kho', amount: -changeInventory },
          { code: '05', name: 'Tăng/giảm phải trả người bán', amount: changeAP },
        ],
        subtotal: operatingCF,
      },
      {
        key: 'investing',
        title: 'II. Lưu chuyển tiền từ hoạt động đầu tư',
        items: [
          { code: '21', name: 'Mua sắm TSCĐ và đầu tư dài hạn', amount: -Math.abs(buyFixedAsset) },
          { code: '22', name: 'Tiền thu từ thanh lý TSCĐ', amount: sellFixedAsset },
        ],
        subtotal: investingCF,
      },
      {
        key: 'financing',
        title: 'III. Lưu chuyển tiền từ hoạt động tài chính',
        items: [
          { code: '31', name: 'Tiền vay ngắn/dài hạn nhận được', amount: borrowings },
          { code: '32', name: 'Tiền trả nợ gốc vay', amount: -repayments },
          { code: '33', name: 'Vốn góp từ chủ sở hữu', amount: capitalIncrease },
          { code: '34', name: 'Cổ tức, lợi nhuận đã trả', amount: -dividends },
        ],
        subtotal: financingCF,
      },
    ];

    return {
      fromDate, toDate,
      sections,
      netCashChange,
      operatingCF, investingCF, financingCF,
    };
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

  // ── L-07: Export báo cáo lãi lỗ sang Excel ───────────────────────────────

  async exportProfitLoss(startDate: string, endDate: string): Promise<Buffer> {
    const data = await this.getProfitLoss(startDate, endDate);

    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet('Báo cáo lãi lỗ');

    sheet.columns = [
      { header: 'Khoản mục',     key: 'name',    width: 40 },
      { header: 'Mã tài khoản',  key: 'code',    width: 16 },
      { header: 'Số tiền (VNĐ)', key: 'amount',  width: 22 },
    ];
    sheet.getRow(1).font = { bold: true };

    // Phần Doanh thu
    sheet.addRow({ name: '=== DOANH THU ===', code: '', amount: '' });
    for (const r of data.revenue) {
      sheet.addRow({ name: r.name, code: r.code, amount: r.balance });
    }
    sheet.addRow({ name: 'Tổng doanh thu', code: '', amount: data.totalRevenue });
    sheet.addRow({});

    // Phần Chi phí
    sheet.addRow({ name: '=== CHI PHÍ ===', code: '', amount: '' });
    for (const r of data.expenses) {
      sheet.addRow({ name: r.name, code: r.code, amount: r.balance });
    }
    sheet.addRow({ name: 'Tổng chi phí', code: '', amount: data.totalExpenses });
    sheet.addRow({});

    // Lợi nhuận thuần
    sheet.addRow({ name: 'LỢI NHUẬN THUẦN', code: '', amount: data.netIncome });
    const lastRow = sheet.lastRow;
    if (lastRow) lastRow.font = { bold: true };

    return wb.xlsx.writeBuffer() as unknown as Promise<Buffer>;
  }

  // ── Export bảng cân đối kế toán sang Excel ────────────────────────────────

  async exportBalanceSheet(asOfDate: string): Promise<Buffer> {
    const data = await this.getBalanceSheet(asOfDate);
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet('Bảng cân đối kế toán');

    sheet.columns = [
      { header: 'Khoản mục', key: 'name', width: 45 },
      { header: 'Mã', key: 'code', width: 14 },
      { header: 'Cuối kỳ (VNĐ)', key: 'balance', width: 22 },
    ];
    sheet.getRow(1).font = { bold: true };

    // Phần A: Tài sản
    sheet.addRow({ name: 'A. TÀI SẢN', code: '', balance: '' });
    for (const r of data.assets) {
      sheet.addRow({ name: r.name, code: r.code, balance: r.balance });
    }
    const totalAssetsRow = sheet.addRow({ name: 'Tổng tài sản', code: '', balance: data.totalAssets });
    totalAssetsRow.font = { bold: true };
    sheet.addRow({});

    // Phần B: Nợ phải trả
    sheet.addRow({ name: 'B. NỢ PHẢI TRẢ', code: '', balance: '' });
    for (const r of data.liabilities) {
      sheet.addRow({ name: r.name, code: r.code, balance: r.balance });
    }
    const totalLiabRow = sheet.addRow({ name: 'Tổng nợ phải trả', code: '', balance: data.totalLiabilities });
    totalLiabRow.font = { bold: true };
    sheet.addRow({});

    // Phần C: Vốn chủ sở hữu
    sheet.addRow({ name: 'C. VỐN CHỦ SỞ HỮU', code: '', balance: '' });
    for (const r of data.equity) {
      sheet.addRow({ name: r.name, code: r.code, balance: r.balance });
    }
    const totalEquityRow = sheet.addRow({ name: 'Tổng vốn chủ sở hữu', code: '', balance: data.totalEquity });
    totalEquityRow.font = { bold: true };
    sheet.addRow({});

    const totalSourceRow = sheet.addRow({ name: 'TỔNG NGUỒN VỐN (B + C)', code: '', balance: data.totalLiabilitiesAndEquity });
    totalSourceRow.font = { bold: true };

    return wb.xlsx.writeBuffer() as unknown as Promise<Buffer>;
  }

  // ── Export báo cáo KQKD sang Excel ──────────────────────────────────────────

  async exportIncomeStatement(fromDate: string, toDate: string): Promise<Buffer> {
    const data = await this.getIncomeStatement(fromDate, toDate);
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet('Báo cáo KQKD');

    sheet.columns = [
      { header: 'Mã', key: 'code', width: 10 },
      { header: 'Chỉ tiêu', key: 'name', width: 50 },
      { header: 'Kỳ này (VNĐ)', key: 'amount', width: 22 },
    ];
    sheet.getRow(1).font = { bold: true };

    for (const item of data.lineItems) {
      const row = sheet.addRow({ code: item.code, name: item.name, amount: item.amount });
      if (item.isSubtotal) row.font = { bold: true };
    }

    return wb.xlsx.writeBuffer() as unknown as Promise<Buffer>;
  }

  // ── Export lưu chuyển tiền tệ sang Excel ─────────────────────────────────────

  async exportCashFlowStatement(fromDate: string, toDate: string): Promise<Buffer> {
    const data = await this.getCashFlowStatement(fromDate, toDate);
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet('Lưu chuyển tiền tệ');

    sheet.columns = [
      { header: 'Mã', key: 'code', width: 10 },
      { header: 'Chỉ tiêu', key: 'name', width: 50 },
      { header: 'Kỳ này (VNĐ)', key: 'amount', width: 22 },
    ];
    sheet.getRow(1).font = { bold: true };

    for (const section of data.sections) {
      // Tiêu đề section
      const titleRow = sheet.addRow({ code: '', name: section.title, amount: '' });
      titleRow.font = { bold: true };

      // Các dòng trong section
      for (const item of section.items) {
        sheet.addRow({ code: item.code, name: item.name, amount: item.amount });
      }

      // Tổng của section
      const subtotalRow = sheet.addRow({ code: '', name: `Lưu chuyển tiền thuần — ${section.title}`, amount: section.subtotal });
      subtotalRow.font = { bold: true };
      sheet.addRow({});
    }

    // Dòng tổng cuối cùng
    const netRow = sheet.addRow({ code: '', name: 'TĂNG/GIẢM TIỀN THUẦN TRONG KỲ', amount: data.netCashChange });
    netRow.font = { bold: true };

    return wb.xlsx.writeBuffer() as unknown as Promise<Buffer>;
  }
}
