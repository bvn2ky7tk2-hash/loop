import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  BonusStatus,
  ContractType,
  ContractStatus,
  PayrollStatus,
  ResidencyStatus,
  SalaryColumnSource,
  SalaryColumnType,
} from '../generated/prisma';

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

    // E16G.3: Query tất cả PerformanceBonus APPROVED trong period một lần, group theo employeeId
    const approvedBonuses = await this.prisma.performanceBonus.findMany({
      where: {
        status: BonusStatus.APPROVED,
        approvedAt: { gte: period.startDate, lte: period.endDate },
      },
      select: { employeeId: true, bonusAmount: true },
      take: 10000,
    });
    const bonusByEmployee = new Map<string, number>();
    for (const b of approvedBonuses) {
      const prev = bonusByEmployee.get(b.employeeId) ?? 0;
      bonusByEmployee.set(b.employeeId, prev + Number(b.bonusAmount));
    }

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

      // E16G.6: Query SalaryRecord trong period để tính weighted avg salary
      const salaryRecordsInPeriod = await this.prisma.salaryRecord.findMany({
        where: {
          employeeId: emp.id,
          effectiveDate: { gt: period.startDate, lte: period.endDate },
        },
        orderBy: { effectiveDate: 'asc' },
        take: 50,
      });

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
        performanceBonus: bonusByEmployee.get(emp.id) ?? 0,
        salaryRecordsInPeriod,
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
    performanceBonus: number;
    salaryRecordsInPeriod: any[];
  }) {
    const {
      contract, timesheet, taxProfile, existingAllowances,
      insuranceConfig, taxBracket, taxDeduction, salaryColumns, period, configSnapshot,
      performanceBonus, salaryRecordsInPeriod,
    } = ctx;

    const contractType: ContractType = contract.type;
    const rawSalary = Number(contract.salaryMonthly);

    // E16G.6: Weighted average salary nếu có thay đổi lương giữa kỳ
    // rawSalary = contract.salaryMonthly (cuối kỳ) — dùng cho BHXH; computeWeightedSalary áp 85% probation nội bộ
    const contractSalary = this.computeWeightedSalary(rawSalary, salaryRecordsInPeriod, period, contractType);

    const workDays = timesheet ? Number(timesheet.workingDays) : 0;
    const standardDays = timesheet ? Math.max(Number(timesheet.standardDays), 1) : 26;
    const otWeekdayHours = timesheet ? Number(timesheet.otWeekdayHours) : 0;
    const otWeekendHours = timesheet ? Number(timesheet.otWeekendHours) : 0;
    const otHolidayHours = timesheet ? Number(timesheet.otHolidayHours) : 0;
    const totalOtHours = otWeekdayHours + otWeekendHours + otHolidayHours;
    const unpaidLeaveDays = timesheet ? Number(timesheet.unpaidLeaveDays) : 0;
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

    // E16G.2: Tính OT pay theo hệ số chuẩn Luật Lao động trước khi đưa vào grossEarnings
    const hourlyRate = contractSalary / (26 * 8);
    const otPayFixed =
      otWeekdayHours * hourlyRate * 1.5 +
      otWeekendHours * hourlyRate * 2.0 +
      otHolidayHours * hourlyRate * 3.0;

    let grossEarnings = 0;
    let grossDeductions = 0;
    let allowancesTotal = 0;
    // Cộng OT tính sẵn vào tổng; các cột FORMULA OT override nếu có sẽ cộng thêm bên dưới
    let overtimePay = otPayFixed;
    // E16G.1: Track tổng khoản được miễn thuế TNCN từ các cột salary
    let pitExemptTotal = 0;
    const columnBreakdown: Record<string, number> = {};

    // Cộng OT vào breakdown và grossEarnings ngay từ đầu
    grossEarnings += otPayFixed;
    columnBreakdown['__OT_base__'] = Math.round(otPayFixed);

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
          // Cột FORMULA OT — nếu có thì ghi đè otPayFixed, không cộng thêm
          if (col.formula && /otWeekday|otWeekend|otHoliday|overtimeHours/.test(col.formula)) {
            // Trừ otPayFixed đã cộng trước, thay bằng giá trị từ formula
            grossEarnings -= otPayFixed;
            overtimePay = amount;
          }
          break;
      }

      // E16G.1: Track khoản PIT-exempt
      if (col.isPitExempt && col.type === SalaryColumnType.EARNING) {
        const ceiling = col.pitExemptCeiling ? Number(col.pitExemptCeiling) : null;
        pitExemptTotal += ceiling !== null ? Math.min(amount, ceiling) : amount;
      }

      columnBreakdown[col.name] = Math.round(amount);

      if (col.type === SalaryColumnType.EARNING) {
        grossEarnings += amount;
      } else {
        grossDeductions += amount;
      }
    }

    // E16G.3: Cộng performance bonus vào grossEarnings
    grossEarnings += performanceBonus;
    columnBreakdown['__performanceBonus__'] = Math.round(performanceBonus);

    const grossSalary = Math.max(grossEarnings - grossDeductions, 0);
    const baseSalary = (contractSalary / standardDays) * workDays;

    // ── BHXH / BHYT / BHTN (NĐ 115/2015: làm tròn lên 100đ) ────────────────
    let bhxhEmployee = 0, bhytEmployee = 0, bhtnEmployee = 0;
    let bhxhEmployer = 0, bhytEmployer = 0, bhtnEmployer = 0, tnldEmployer = 0;
    let bhxhBase = 0;

    // E16G.4: Skip BHXH nếu PART_TIME, hoặc PROBATION với bhxhExemptForProbation=true, hoặc nghỉ không lương >= 14 ngày
    const bhxhExempt =
      contractType === ContractType.PART_TIME ||
      unpaidLeaveDays >= 14 ||
      (contractType === ContractType.PROBATION && insuranceConfig?.bhxhExemptForProbation === true);

    if (!bhxhExempt && insuranceConfig) {
      const ceiling = Number(insuranceConfig.wageBase) * insuranceConfig.bhxhCeilingMultiple;
      // BHXH base = rawSalary (contract.salaryMonthly hiện tại, cuối kỳ), không phải weighted avg
      bhxhBase = Math.min(rawSalary, ceiling);

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
      // E16G.1: Trừ thêm phần được miễn thuế TNCN từ các khoản isPitExempt
      taxableIncome = Math.max(
        grossSalary - totalInsuranceEmployee - selfDeductionAmt - dependentDeductionAmt - pitExemptTotal,
        0,
      );
      if (taxableIncome > 0) {
        pitAmount = this.calcProgressivePIT(
          taxableIncome,
          taxBracket.brackets as BracketItem[],
        );
      }
    }

    const netSalary = Math.max(grossSalary - totalInsuranceEmployee - pitAmount, 0);
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
      },
      baseSalary: Math.round(baseSalary),
      grossSalary: Math.round(grossSalary),
      overtimePay: Math.round(overtimePay),
      allowances: Math.round(allowancesTotal),
      deductions: Math.round(grossDeductions),
      bonus: Math.round(performanceBonus),
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
      configSnapshot: {
        ...configSnapshot,
        columnBreakdown,
        contractSalary: Math.round(contractSalary),
        standardDays,
        bhxhBase: Math.round(bhxhBase),
      },
    };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  // E16G.6: Tính lương weighted average khi có thay đổi lương giữa kỳ
  // salaryRecords: các bản ghi đổi lương trong period (effectiveDate > startDate, <= endDate)
  // contractSalaryEndOfPeriod: mức lương hiện tại (cuối kỳ) từ contract
  private computeWeightedSalary(
    contractSalaryEndOfPeriod: number,
    salaryRecords: any[],
    period: { startDate: Date; endDate: Date },
    contractType: ContractType,
  ): number {
    // Không có thay đổi lương giữa kỳ → dùng nguyên mức hợp đồng
    if (!salaryRecords || salaryRecords.length === 0) return contractSalaryEndOfPeriod;

    const periodStart = new Date(period.startDate);
    const periodEnd = new Date(period.endDate);
    // Số ngày calendar tổng của kỳ (inclusive)
    const totalDays = Math.round((periodEnd.getTime() - periodStart.getTime()) / 86_400_000) + 1;

    // Xây dựng các đoạn lương: [segStart, segEnd, salaryRate]
    // Sắp xếp theo effectiveDate tăng dần (đã query sẵn)
    const segments: Array<{ from: Date; to: Date; salary: number }> = [];

    // Đoạn đầu: từ startDate đến ngày trước bản ghi đầu tiên
    // Mức lương đoạn đầu = bản ghi cũ nhất trừ 1 hoặc mức hợp đồng nếu không có bản ghi trước đó
    // Vì không lưu history đầy đủ, ta dùng contractSalaryEndOfPeriod cho đoạn CUỐI (sau record cuối)
    // và truy ngược để suy ra mức trước đó — không đủ dữ liệu → dùng basicSalary từ record đầu tiên
    let prevSalary = Number(salaryRecords[0].basicSalary); // mức lương đầu kỳ (trước thay đổi đầu)
    let segStart = new Date(periodStart);

    for (const rec of salaryRecords) {
      const effDate = new Date(rec.effectiveDate);
      // Đoạn trước effective date của record này
      const segEnd = new Date(effDate);
      segEnd.setDate(segEnd.getDate() - 1);
      if (segEnd >= segStart) {
        segments.push({ from: segStart, to: segEnd, salary: prevSalary });
      }
      prevSalary = Number(rec.basicSalary);
      segStart = new Date(effDate);
    }

    // Đoạn cuối: từ effectiveDate của record cuối đến periodEnd — dùng contractSalaryEndOfPeriod
    segments.push({ from: segStart, to: periodEnd, salary: contractSalaryEndOfPeriod });

    // Tính weighted average
    let weightedSum = 0;
    for (const seg of segments) {
      const days = Math.round((seg.to.getTime() - seg.from.getTime()) / 86_400_000) + 1;
      weightedSum += seg.salary * days;
    }

    const weighted = weightedSum / totalDays;
    // Thử việc vẫn hưởng 85% lương weighted
    return contractType === ContractType.PROBATION ? weighted * 0.85 : weighted;
  }

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

  // ─── Year-end leave settlement ────────────────────────────────────────────────

  /**
   * Chạy cuối năm (25/12): reset số dư nghỉ phép về 0 hoặc chuyển sang năm mới
   * theo chính sách carry-forward của từng loại nghỉ phép.
   * - maxCarryOver > 0: số dư được cộng sang năm mới (không vượt maxCarryOver)
   * - maxCarryOver = 0: xóa số dư (đặt totalDays về usedDays)
   */
  async yearEndLeaveSettlement(): Promise<{ processed: number }> {
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;

    const leaveBalances = await this.prisma.leaveBalance.findMany({
      where: { year: currentYear },
      include: { leaveType: true },
      take: 5000,
    });

    let processed = 0;

    for (const balance of leaveBalances) {
      // remaining = totalDays - usedDays
      const remaining = Number(balance.totalDays) - Number(balance.usedDays);
      if (remaining <= 0) continue;

      const maxCarryOver = balance.leaveType.maxCarryOver ?? 0;

      if (maxCarryOver <= 0) {
        // Không cho carry — reset totalDays về usedDays (số dư = 0)
        await this.prisma.leaveBalance.update({
          where: { id: balance.id },
          data: { totalDays: balance.usedDays },
        });
      } else {
        // Carry forward — cộng vào balance năm mới (tạo mới nếu chưa có)
        const carryDays = Math.min(remaining, maxCarryOver);

        const existing = await this.prisma.leaveBalance.findFirst({
          where: {
            employeeId: balance.employeeId,
            leaveTypeId: balance.leaveTypeId,
            year: nextYear,
          },
        });

        if (existing) {
          await this.prisma.leaveBalance.update({
            where: { id: existing.id },
            data: {
              totalDays: Number(existing.totalDays) + carryDays,
            },
          });
        } else {
          await this.prisma.leaveBalance.create({
            data: {
              employeeId: balance.employeeId,
              leaveTypeId: balance.leaveTypeId,
              year: nextYear,
              totalDays: carryDays,
              usedDays: 0,
              ...(balance.tenantId ? { tenantId: balance.tenantId } : {}),
            },
          });
        }

        // Reset năm hiện tại: totalDays về usedDays (số dư = 0)
        await this.prisma.leaveBalance.update({
          where: { id: balance.id },
          data: { totalDays: balance.usedDays },
        });
      }

      processed++;
    }

    return { processed };
  }
}
