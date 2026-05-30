import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ContractType,
  ContractStatus,
  PayrollStatus,
  ResidencyStatus,
  SalaryColumnSource,
  SalaryColumnType,
} from '../generated/prisma';

// E16 — OtDayType dùng cho tính OT từ nguồn thật
const OtDayTypeValues = {
  WEEKDAY: 'WEEKDAY',
  WEEKEND: 'WEEKEND',
  HOLIDAY: 'HOLIDAY',
} as const;
type OtDayType = (typeof OtDayTypeValues)[keyof typeof OtDayTypeValues];

interface BracketItem {
  from: number;
  to: number | null;
  rate: number;
}

@Injectable()
export class PayrollEngineService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Main entry point ────────────────────────────────────────────────────────

  async processPayrollPeriod(periodId: string): Promise<{ periodId: string; processed: number }> {
    const period = await this.prisma.payrollPeriod.findUnique({ where: { id: periodId } });
    if (!period) throw new NotFoundException(`Kỳ lương ${periodId} không tìm thấy`);
    if (period.status === PayrollStatus.APPROVED || period.status === PayrollStatus.PAID) {
      throw new BadRequestException('Không thể tính lại kỳ lương đã duyệt hoặc đã trả');
    }

    const [insuranceConfig, taxBracket, taxDeduction, salaryColumns] = await Promise.all([
      this.findInsuranceConfig(period.endDate),
      this.findTaxBracket(period.endDate),
      this.findTaxDeduction(period.endDate),
      this.prisma.salaryColumn.findMany({
        where: { isActive: true },
        include: { allowanceType: true },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      }),
    ]);

    const configSnapshot = {
      insuranceConfigId: insuranceConfig?.id ?? null,
      taxBracketId: taxBracket?.id ?? null,
      taxDeductionId: taxDeduction?.id ?? null,
      capturedAt: new Date().toISOString(),
    };

    const employees = await this.prisma.employee.findMany({
      where: { isActive: true },
      select: { id: true, userId: true },
    });

    let processed = 0;

    for (const emp of employees) {
      const contract = await this.prisma.contract.findFirst({
        where: {
          employeeId: emp.id,
          status: ContractStatus.ACTIVE,
          startDate: { lte: period.endDate },
          OR: [{ endDate: null }, { endDate: { gte: period.startDate } }],
        },
        orderBy: { startDate: 'desc' },
      });
      if (!contract) continue;

      const timesheet = emp.userId
        ? await this.prisma.timesheetRecord.findFirst({
            where: {
              userId: emp.userId,
              periodStart: { lte: period.endDate },
              periodEnd: { gte: period.startDate },
            },
            orderBy: { periodStart: 'desc' },
          })
        : null;

      const taxProfile = await this.prisma.employeeTaxProfile.findUnique({
        where: { employeeId: emp.id },
        include: { dependents: true },
      });

      const existingRecord = await this.prisma.payrollRecord.findUnique({
        where: { periodId_employeeId: { periodId, employeeId: emp.id } },
        include: { employeeAllowances: true },
      });

      // E16.1 — Tổng hợp giờ OT từ OvertimeRequest APPROVED (nguồn thật)
      const otBreakdown = await this.computeOtFromRequests(emp.id, period.startDate, period.endDate);

      // E16.2 — Tính ngày nghỉ không lương từ LeaveRequest APPROVED
      const unpaidLeaveFromRequests = await this.computeUnpaidLeaveFromRequests(
        emp.id,
        period.startDate,
        period.endDate,
      );

      const recordData = this.computeRecord({
        contract,
        timesheet,
        taxProfile,
        existingAllowances: existingRecord?.employeeAllowances ?? [],
        insuranceConfig,
        taxBracket,
        taxDeduction,
        salaryColumns,
        period,
        configSnapshot,
        otBreakdown,
        unpaidLeaveFromRequests,
      });

      await this.prisma.payrollRecord.upsert({
        where: { periodId_employeeId: { periodId, employeeId: emp.id } },
        create: { periodId, employeeId: emp.id, ...recordData },
        update: recordData,
      });

      processed++;
    }

    await this.prisma.payrollPeriod.update({
      where: { id: periodId },
      data: { status: PayrollStatus.PROCESSING },
    });

    return { periodId, processed };
  }

  // ─── YTD update — gọi sau khi kỳ lương được APPROVED ────────────────────────

  async updateYtdAfterApproval(periodId: string): Promise<void> {
    const records = await this.prisma.payrollRecord.findMany({
      where: { periodId },
      include: { period: { select: { endDate: true } } },
    });

    for (const r of records) {
      const year = r.period.endDate.getFullYear();
      await this.prisma.employeeYearlyTaxSummary.upsert({
        where: { employeeId_year: { employeeId: r.employeeId, year } },
        create: {
          employeeId: r.employeeId,
          year,
          ytdGross: Number(r.grossSalary),
          ytdTaxableIncome: Number(r.taxableIncome),
          ytdPitPaid: Number(r.pitAmount),
          ytdBhxhEmployee: Number(r.bhxhEmployee),
        },
        update: {
          ytdGross: { increment: Number(r.grossSalary) },
          ytdTaxableIncome: { increment: Number(r.taxableIncome) },
          ytdPitPaid: { increment: Number(r.pitAmount) },
          ytdBhxhEmployee: { increment: Number(r.bhxhEmployee) },
        },
      });
    }
  }

  // ─── Core record computation ─────────────────────────────────────────────────

  private computeRecord(ctx: {
    contract: any;
    timesheet: any;
    taxProfile: any;
    existingAllowances: any[];
    insuranceConfig: any;
    taxBracket: any;
    taxDeduction: any;
    salaryColumns: any[];
    period: any;
    configSnapshot: any;
    // E16 — nguồn thật từ OvertimeRequest và LeaveRequest
    otBreakdown?: { weekdayHours: number; weekendHours: number; holidayHours: number };
    unpaidLeaveFromRequests?: number;
  }) {
    const {
      contract, timesheet, taxProfile, existingAllowances,
      insuranceConfig, taxBracket, taxDeduction, salaryColumns, period, configSnapshot,
      otBreakdown, unpaidLeaveFromRequests,
    } = ctx;

    const contractType: ContractType = contract.type;
    const rawSalary = Number(contract.salaryMonthly);
    // Điều 25 Luật Lao động: thử việc chỉ hưởng 85% lương HĐLĐ
    const contractSalary = contractType === ContractType.PROBATION ? rawSalary * 0.85 : rawSalary;

    const workDays = timesheet ? Number(timesheet.workingDays) : 0;
    const standardDays = timesheet ? Math.max(Number(timesheet.standardDays), 1) : 26;

    // E16.1 — Ưu tiên giờ OT từ OvertimeRequest APPROVED; fallback sang timesheet nếu chưa có request
    const otWeekdayHours = otBreakdown ? otBreakdown.weekdayHours
      : (timesheet ? Number(timesheet.otWeekdayHours) : 0);
    const otWeekendHours = otBreakdown ? otBreakdown.weekendHours
      : (timesheet ? Number(timesheet.otWeekendHours) : 0);
    const otHolidayHours = otBreakdown ? otBreakdown.holidayHours
      : (timesheet ? Number(timesheet.otHolidayHours) : 0);
    const totalOtHours = otWeekdayHours + otWeekendHours + otHolidayHours;

    // E16.2 — Ưu tiên ngày nghỉ không lương từ LeaveRequest; fallback sang timesheet
    const unpaidLeaveDays = unpaidLeaveFromRequests !== undefined
      ? unpaidLeaveFromRequests
      : (timesheet ? Number(timesheet.unpaidLeaveDays) : 0);
    const leaveDays = timesheet ? Number(timesheet.leaveDays) : 0;
    const paidLeaveDays = Math.max(leaveDays - unpaidLeaveDays, 0);

    const vars: Record<string, number> = {
      contractSalary,
      workDays,
      standardDays,
      overtimeHours: totalOtHours,
      otWeekday: otWeekdayHours,
      otWeekend: otWeekendHours,
      otHoliday: otHolidayHours,
    };

    // Build allowance override map: allowanceTypeId → amount
    const allowanceOverrideMap = new Map<string, number>(
      existingAllowances.map((a: any) => [a.allowanceTypeId, Number(a.amount)]),
    );

    let grossEarnings = 0;
    let grossDeductions = 0;
    let allowancesTotal = 0;
    let overtimePay = 0;
    const columnBreakdown: Record<string, number> = {};

    for (const col of salaryColumns) {
      let amount = 0;

      switch (col.source as SalaryColumnSource) {
        case SalaryColumnSource.CONTRACT_SALARY:
          // Lương cơ bản theo công thực tế = lương tháng / số ngày chuẩn * ngày công
          amount = (contractSalary / standardDays) * workDays;
          break;

        case SalaryColumnSource.ALLOWANCE_TYPE:
          if (col.allowanceTypeId) {
            const override = allowanceOverrideMap.get(col.allowanceTypeId);
            const baseAmount = override !== undefined
              ? override
              : Number(col.allowanceType?.defaultAmount ?? 0);
            // PER_WORK_DAY: tính theo ngày công thực tế = amount / standardDays * workDays
            const calcMode = (col.allowanceType as any)?.calculationMode ?? 'FIXED';
            amount = calcMode === 'PER_WORK_DAY'
              ? (baseAmount / standardDays) * workDays
              : baseAmount;
          }
          allowancesTotal += amount;
          break;

        case SalaryColumnSource.FIXED_VALUE:
          amount = Number(col.fixedValue ?? 0);
          break;

        case SalaryColumnSource.FORMULA:
          amount = this.evalFormula(col.formula ?? '', vars);
          // Cột OT nếu formula tham chiếu giờ OT
          if (col.formula && /otWeekday|otWeekend|otHoliday|overtimeHours/.test(col.formula)) {
            overtimePay += amount;
          }
          break;
      }

      columnBreakdown[col.name] = Math.round(amount);

      if (col.type === SalaryColumnType.EARNING) {
        grossEarnings += amount;
      } else {
        grossDeductions += amount;
      }
    }

    const grossSalary = Math.max(grossEarnings - grossDeductions, 0);
    const baseSalary = (contractSalary / standardDays) * workDays;

    // ── BHXH / BHYT / BHTN (NĐ 115/2015: làm tròn lên 100đ) ────────────────
    let bhxhEmployee = 0, bhytEmployee = 0, bhtnEmployee = 0;
    let bhxhEmployer = 0, bhytEmployer = 0, bhtnEmployer = 0, tnldEmployer = 0;

    // FREELANCE không đóng BHXH; unpaidLeaveDays >= 14 được miễn BHXH tháng đó
    if (contractType !== ContractType.PART_TIME && insuranceConfig && unpaidLeaveDays < 14) {
      const ceiling = Number(insuranceConfig.wageBase) * insuranceConfig.bhxhCeilingMultiple;
      // BHXH base = contractSalary (không phải grossSalary), giới hạn ceiling
      const bhxhBase = Math.min(contractSalary, ceiling);

      bhxhEmployee = this.roundUp100(bhxhBase * Number(insuranceConfig.bhxhEmployeeRate));
      bhytEmployee = this.roundUp100(bhxhBase * Number(insuranceConfig.bhytEmployeeRate));
      bhtnEmployee = this.roundUp100(bhxhBase * Number(insuranceConfig.bhtnEmployeeRate));
      bhxhEmployer = this.roundUp100(bhxhBase * Number(insuranceConfig.bhxhEmployerRate));
      bhytEmployer = this.roundUp100(bhxhBase * Number(insuranceConfig.bhytEmployerRate));
      bhtnEmployer = this.roundUp100(bhxhBase * Number(insuranceConfig.bhtnEmployerRate));
      tnldEmployer = this.roundUp100(bhxhBase * Number(insuranceConfig.tnldRate));
    }

    const totalInsuranceEmployee = bhxhEmployee + bhytEmployee + bhtnEmployee;

    // ── PIT (Thuế TNCN) ──────────────────────────────────────────────────────
    const residencyStatus: ResidencyStatus = taxProfile?.residencyStatus ?? ResidencyStatus.RESIDENT;

    // Người phụ thuộc hoạt động tại thời điểm kỳ lương
    const dependentCount = ((taxProfile?.dependents ?? []) as any[]).filter((d) => {
      const from = new Date(d.registeredFrom);
      const to = d.registeredTo ? new Date(d.registeredTo) : null;
      return from <= period.endDate && (to === null || to >= period.startDate);
    }).length;

    let pitAmount = 0;
    let taxableIncome = 0;
    let selfDeductionAmt = 0;
    let dependentDeductionAmt = 0;

    if (contractType === ContractType.PART_TIME) {
      // Nhà thầu cá nhân: thuế khoán 10% nếu thanh toán >= 2,000,000đ (TT 111/2013)
      if (grossSalary >= 2_000_000) {
        taxableIncome = grossSalary;
        pitAmount = Math.floor(grossSalary * 0.1);
      }
    } else if (residencyStatus === ResidencyStatus.NON_RESIDENT) {
      // Người không cư trú: 20% tổng thu nhập (Điều 18 Luật Thuế TNCN)
      taxableIncome = grossSalary;
      pitAmount = Math.floor(grossSalary * 0.2);
    } else if (taxBracket && taxDeduction) {
      // Cư trú: thuế lũy tiến theo biểu thuế hiện hành
      selfDeductionAmt = Number(taxDeduction.selfDeduction);
      dependentDeductionAmt = Number(taxDeduction.dependentDeduction) * dependentCount;
      taxableIncome = Math.max(
        grossSalary - totalInsuranceEmployee - selfDeductionAmt - dependentDeductionAmt,
        0,
      );
      if (taxableIncome > 0) {
        pitAmount = this.calcProgressivePIT(
          taxableIncome,
          taxBracket.brackets as BracketItem[],
        );
      }
    }

    // E16.2 — Khấu trừ ngày nghỉ không lương từ LeaveRequest: unpaidLeaveDays * (monthlySalary / 26)
    // Chỉ áp dụng khi nguồn từ LeaveRequest (unpaidLeaveFromRequests > 0); timesheet đã tính riêng
    const unpaidLeaveDeduction = unpaidLeaveFromRequests !== undefined && unpaidLeaveFromRequests > 0
      ? Math.round(unpaidLeaveFromRequests * (contractSalary / 26))
      : 0;

    const totalDeductions = grossDeductions + unpaidLeaveDeduction;
    const netSalary = Math.max(grossSalary - unpaidLeaveDeduction - totalInsuranceEmployee - pitAmount, 0);
    const totalLaborCost =
      grossSalary + bhxhEmployer + bhytEmployer + bhtnEmployer + tnldEmployer;

    return {
      workDays,
      leaveDays,
      paidLeaveDays,
      unpaidLeaveDays,
      overtimeHours: totalOtHours,
      overtimePayBreakdown: {
        weekdayHours: otWeekdayHours,
        weekendHours: otWeekendHours,
        holidayHours: otHolidayHours,
        // E16 metadata — lưu nguồn dữ liệu để audit
        source: otBreakdown ? 'overtime_request' : 'timesheet',
      },
      baseSalary: Math.round(baseSalary),
      grossSalary: Math.round(grossSalary),
      overtimePay: Math.round(overtimePay),
      allowances: Math.round(allowancesTotal),
      deductions: Math.round(totalDeductions),
      bonus: 0,
      bhxhEmployee,
      bhytEmployee,
      bhtnEmployee,
      bhxhEmployer,
      bhytEmployer,
      bhtnEmployer,
      tnldEmployer,
      taxableIncome: Math.round(taxableIncome),
      selfDeduction: Math.round(selfDeductionAmt),
      dependentDeduction: Math.round(dependentDeductionAmt),
      dependentCount,
      pitAmount,
      netSalary: Math.round(netSalary),
      totalLaborCost: Math.round(totalLaborCost),
      configSnapshot: { ...configSnapshot, columnBreakdown },
    };
  }

  // ─── E16.1 — Tổng hợp giờ OT theo loại ngày từ OvertimeRequest APPROVED ──────

  private async computeOtFromRequests(
    employeeId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{ weekdayHours: number; weekendHours: number; holidayHours: number }> {
    // Dùng raw query để tránh phụ thuộc generated type chưa cập nhật dayType
    const rows = await this.prisma.$queryRaw<
      { day_type: OtDayType; total_hours: string }[]
    >`
      SELECT day_type, SUM(hours) AS total_hours
      FROM overtime_requests
      WHERE employee_id = ${employeeId}
        AND status = 'APPROVED'
        AND date >= ${startDate}
        AND date <= ${endDate}
      GROUP BY day_type
    `;

    let weekdayHours = 0;
    let weekendHours = 0;
    let holidayHours = 0;

    for (const row of rows) {
      const h = Number(row.total_hours);
      if (row.day_type === OtDayTypeValues.WEEKDAY) weekdayHours = h;
      else if (row.day_type === OtDayTypeValues.WEEKEND) weekendHours = h;
      else if (row.day_type === OtDayTypeValues.HOLIDAY) holidayHours = h;
    }

    return { weekdayHours, weekendHours, holidayHours };
  }

  // ─── E16.2 — Tính ngày nghỉ không lương từ LeaveRequest APPROVED ─────────────

  private async computeUnpaidLeaveFromRequests(
    employeeId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<number> {
    // Query các LeaveRequest APPROVED overlap với kỳ lương, isPaid = false
    const requests = await this.prisma.leaveRequest.findMany({
      where: {
        employeeId,
        status: 'APPROVED' as any,
        leaveType: { isPaid: false },
        // Overlap: request.startDate <= periodEnd AND request.endDate >= periodStart
        startDate: { lte: periodEnd },
        endDate: { gte: periodStart },
      },
      select: { days: true },
      take: 200,
    });

    return requests.reduce((sum, r) => sum + Number(r.days), 0);
  }

  // ─── E16.3 — Quyết toán nghỉ phép cuối năm ───────────────────────────────────

  async yearEndLeaveSettlement(tenantId?: string): Promise<{ processed: number; payoutTotal: number }> {
    const currentYear = new Date().getFullYear();

    // Lấy tất cả LeaveBalance active có leaveType.isPaid = true
    const balances = await this.prisma.leaveBalance.findMany({
      where: {
        year: currentYear,
        ...(tenantId ? { tenantId } : {}),
        leaveType: { isPaid: true, isActive: true },
      },
      include: {
        leaveType: true,
        employee: {
          select: { id: true, tenantId: true },
        },
      },
      take: 5000,
    });

    let processed = 0;
    let payoutTotal = 0;

    for (const balance of balances) {
      const remainingDays = Number(balance.totalDays) - Number(balance.usedDays);
      if (remainingDays <= 0) continue;

      // maxCarryOver từ LeaveType; fallback 0 nếu chưa có field
      const maxCarryOver = (balance.leaveType as any).maxCarryOver ?? 0;
      const carryOverDays = Math.min(remainingDays, maxCarryOver);
      const payoutDays = remainingDays - carryOverDays;

      if (payoutDays > 0) {
        // Tìm payroll record gần nhất của employee để gắn bonus
        const latestRecord = await this.prisma.payrollRecord.findFirst({
          where: { employeeId: balance.employeeId },
          orderBy: { period: { endDate: 'desc' } },
          select: { id: true },
        });

        if (latestRecord) {
          // Tìm BonusType LEAVE_PAYOUT hoặc tạo nếu chưa có
          let bonusType = await this.prisma.bonusType.findFirst({
            where: { name: 'LEAVE_PAYOUT' },
          });

          if (!bonusType) {
            bonusType = await this.prisma.bonusType.create({
              data: { name: 'LEAVE_PAYOUT', isBhxhExempt: true },
            });
          }

          // Tìm hợp đồng active để tính lương ngày
          const contract = await this.prisma.contract.findFirst({
            where: {
              employeeId: balance.employeeId,
              status: ContractStatus.ACTIVE,
            },
            orderBy: { startDate: 'desc' },
          });

          const dailySalary = contract
            ? Math.round(Number(contract.salaryMonthly) / 26)
            : 0;
          const payoutAmount = payoutDays * dailySalary;

          if (payoutAmount > 0) {
            // Upsert EmployeeBonus — tránh duplicate nếu chạy lại
            await this.prisma.employeeBonus.upsert({
              where: {
                payrollRecordId_bonusTypeId: {
                  payrollRecordId: latestRecord.id,
                  bonusTypeId: bonusType.id,
                },
              },
              create: {
                payrollRecordId: latestRecord.id,
                bonusTypeId: bonusType.id,
                amount: payoutAmount,
                note: `Quyết toán phép năm ${currentYear}: ${payoutDays} ngày x ${dailySalary.toLocaleString('vi-VN')}đ`,
              },
              update: {
                amount: payoutAmount,
                note: `Quyết toán phép năm ${currentYear}: ${payoutDays} ngày x ${dailySalary.toLocaleString('vi-VN')}đ`,
              },
            });
            payoutTotal += payoutAmount;
          }
        }
      }

      // Reset LeaveBalance: carryOverDays + annualDays từ LeaveType cho năm mới
      const annualDays = (balance.leaveType as any).annualDays ?? 0;
      const newBalance = carryOverDays + annualDays;

      await this.prisma.leaveBalance.update({
        where: { id: balance.id },
        data: {
          year: currentYear + 1,
          totalDays: newBalance,
          usedDays: 0,
        },
      });

      processed++;
    }

    return { processed, payoutTotal };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private evalFormula(formula: string, vars: Record<string, number>): number {
    if (!formula) return 0;
    let expr = formula;
    for (const [key, val] of Object.entries(vars)) {
      expr = expr.replace(new RegExp(`\\{${key}\\}`, 'g'), String(val));
    }
    // Chỉ cho phép số học thuần — phòng injection
    if (!/^[0-9+\-*/.()\s]+$/.test(expr)) return 0;
    try {
      // eslint-disable-next-line no-new-func
      return Number(new Function(`return (${expr})`)()) || 0;
    } catch {
      return 0;
    }
  }

  // Thuế lũy tiến — làm tròn xuống đến đồng (TT 111/2013)
  private calcProgressivePIT(taxableIncome: number, brackets: BracketItem[]): number {
    let pit = 0;
    for (const bracket of brackets) {
      if (taxableIncome <= bracket.from) break;
      const upper = bracket.to !== null ? bracket.to : Infinity;
      const slice = Math.min(taxableIncome, upper) - bracket.from;
      pit += slice * bracket.rate;
    }
    return Math.floor(pit);
  }

  // NĐ 115/2015: BHXH làm tròn lên bội số 100đ
  private roundUp100(amount: number): number {
    return Math.ceil(amount / 100) * 100;
  }

  private async findInsuranceConfig(date: Date) {
    return this.prisma.insuranceConfig.findFirst({
      where: { effectiveFrom: { lte: date } },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  private async findTaxBracket(date: Date) {
    return this.prisma.taxBracket.findFirst({
      where: { effectiveFrom: { lte: date } },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  private async findTaxDeduction(date: Date) {
    return this.prisma.taxDeductionConfig.findFirst({
      where: { effectiveFrom: { lte: date } },
      orderBy: { effectiveFrom: 'desc' },
    });
  }
}
