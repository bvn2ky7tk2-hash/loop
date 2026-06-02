import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmployeeStatus } from '../generated/prisma';

/**
 * E16F.5 — processMonthlyAccrual: cộng tích lũy phép hàng tháng cho MONTHLY_ACCRUAL
 * E16F.6 — initNewYearLeaveBalance: khởi tạo số dư phép năm mới + carry-over
 * E16F.7 — processCarryOverExpiry: xử lý hết hạn phép tích lũy (CLEAR / PAY_OUT)
 *
 * Singleton-safe — không inject REQUEST-scoped service.
 */
@Injectable()
export class LeaveAccrualTask {
  private readonly logger = new Logger(LeaveAccrualTask.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── E16F.5 — Mùng 1 hàng tháng 00:00: cộng 1/12 entitlement cho MONTHLY_ACCRUAL ──
  @Cron('0 0 1 * *')
  async processMonthlyAccrual(): Promise<void> {
    this.logger.log('[LeaveAccrualTask] Bắt đầu tích lũy phép hàng tháng...');

    const currentYear = new Date().getFullYear();

    // Lấy tất cả employee có leavePolicy với accrualMode = MONTHLY_ACCRUAL
    const employees = await this.prisma.employee.findMany({
      where: {
        leavePolicyId: { not: null },
        leavePolicy: { accrualMode: 'MONTHLY_ACCRUAL', isActive: true },
        employeeStatus: { not: EmployeeStatus.TERMINATED },
      },
      include: {
        leavePolicy: true,
      },
      take: 2000,
    });

    let processed = 0;

    for (const emp of employees) {
      if (!emp.leavePolicy) continue;

      const policy = emp.leavePolicy;
      const seniorityBonus = (policy.seniorityBonus as any[] ?? []);

      // Tính thâm niên
      const startDate = emp.startDate ? new Date(emp.startDate) : null;
      const yearsOfService = startDate
        ? Math.floor((Date.now() - startDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : 0;

      const bonus = seniorityBonus
        .filter((item: any) => item.yearsFrom <= yearsOfService)
        .reduce((sum: number, item: any) => sum + item.bonus, 0);

      const annualEntitlement = policy.baseAnnualDays + bonus;
      // Mỗi tháng cộng 1/12 entitlement
      const monthlyAmount = parseFloat((annualEntitlement / 12).toFixed(2));

      // Tìm tất cả LeaveBalance năm nay của nhân viên này
      const balances = await this.prisma.leaveBalance.findMany({
        where: { employeeId: emp.id, year: currentYear },
        take: 50,
      });

      for (const balance of balances) {
        await this.prisma.leaveBalance.update({
          where: { id: balance.id },
          data: {
            totalDays: { increment: monthlyAmount },
          },
        });
      }

      // Nếu chưa có balance năm nay thì upsert theo từng LeaveType active
      if (balances.length === 0) {
        const leaveTypes = await this.prisma.leaveType.findMany({
          where: { isActive: true },
          take: 20,
        });

        for (const lt of leaveTypes) {
          await this.prisma.leaveBalance.upsert({
            where: {
              employeeId_leaveTypeId_year: {
                employeeId: emp.id,
                leaveTypeId: lt.id,
                year: currentYear,
              },
            },
            update: { totalDays: { increment: monthlyAmount } },
            create: {
              employeeId: emp.id,
              leaveTypeId: lt.id,
              year: currentYear,
              totalDays: monthlyAmount,
              usedDays: 0,
              entitlementDays: annualEntitlement,
            },
          });
        }
      }

      processed++;
    }

    this.logger.log(`[LeaveAccrualTask] Tích lũy tháng: đã xử lý ${processed} nhân viên.`);
  }

  // ─── E16F.6 — Mùng 1 tháng 1 01:00: khởi tạo số dư phép năm mới + carry-over ──
  @Cron('0 1 1 1 *')
  async initNewYearLeaveBalance(): Promise<void> {
    this.logger.log('[LeaveAccrualTask] Bắt đầu khởi tạo số dư phép năm mới...');

    const newYear = new Date().getFullYear();
    const prevYear = newYear - 1;

    // Lấy tất cả employee có leavePolicyId
    const employees = await this.prisma.employee.findMany({
      where: {
        leavePolicyId: { not: null },
        leavePolicy: { isActive: true },
        employeeStatus: { not: EmployeeStatus.TERMINATED },
      },
      include: { leavePolicy: true },
      take: 5000,
    });

    const leaveTypes = await this.prisma.leaveType.findMany({
      where: { isActive: true },
      take: 20,
    });

    let processed = 0;

    for (const emp of employees) {
      if (!emp.leavePolicy) continue;

      const policy = emp.leavePolicy;
      const seniorityBonus = (policy.seniorityBonus as any[] ?? []);

      // Tính thâm niên
      const startDate = emp.startDate ? new Date(emp.startDate) : null;
      const yearsOfService = startDate
        ? Math.floor((Date.now() - startDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : 0;

      const bonus = seniorityBonus
        .filter((item: any) => item.yearsFrom <= yearsOfService)
        .reduce((sum: number, item: any) => sum + item.bonus, 0);

      const annualEntitlement = policy.baseAnnualDays + bonus;

      for (const lt of leaveTypes) {
        // Tính carry-over từ năm trước
        const prevBalance = await this.prisma.leaveBalance.findUnique({
          where: {
            employeeId_leaveTypeId_year: {
              employeeId: emp.id,
              leaveTypeId: lt.id,
              year: prevYear,
            },
          },
        });

        let carryOverDays = 0;
        if (prevBalance) {
          const remaining = Math.max(
            0,
            parseFloat(prevBalance.totalDays.toString()) -
              parseFloat(prevBalance.usedDays.toString()),
          );
          // Carry-over tối đa maxCarryOver ngày
          carryOverDays = Math.min(remaining, policy.maxCarryOver);
        }

        const newTotalDays = annualEntitlement + carryOverDays;

        await this.prisma.leaveBalance.upsert({
          where: {
            employeeId_leaveTypeId_year: {
              employeeId: emp.id,
              leaveTypeId: lt.id,
              year: newYear,
            },
          },
          update: {
            totalDays: newTotalDays,
            entitlementDays: annualEntitlement,
          },
          create: {
            employeeId: emp.id,
            leaveTypeId: lt.id,
            year: newYear,
            totalDays: newTotalDays,
            usedDays: 0,
            entitlementDays: annualEntitlement,
          },
        });
      }

      processed++;
    }

    this.logger.log(`[LeaveAccrualTask] Năm mới ${newYear}: đã khởi tạo số dư cho ${processed} nhân viên.`);
  }

  // ─── E16F.7 — Mỗi ngày 02:00: xử lý hết hạn carry-over ──────────────────────
  @Cron('0 2 * * *')
  async processCarryOverExpiry(): Promise<void> {
    this.logger.log('[LeaveAccrualTask] Kiểm tra hết hạn carry-over...');

    const today = new Date();
    const todayMM = String(today.getMonth() + 1).padStart(2, '0');
    const todayDD = String(today.getDate()).padStart(2, '0');
    const todayMMDD = `${todayMM}-${todayDD}`; // vd "03-31"

    const currentYear = today.getFullYear();

    // Lấy tất cả policy có carryOverExpiry khớp hôm nay (định dạng MM-DD)
    const policiesWithExpiry = await this.prisma.leavePolicy.findMany({
      where: {
        carryOverExpiry: todayMMDD,
        isActive: true,
      },
      take: 100,
    });

    if (policiesWithExpiry.length === 0) {
      this.logger.log('[LeaveAccrualTask] Không có policy nào hết hạn carry-over hôm nay.');
      return;
    }

    let clearCount = 0;
    let payOutCount = 0;

    for (const policy of policiesWithExpiry) {
      // Lấy tất cả employee dùng policy này
      const employees = await this.prisma.employee.findMany({
        where: {
          leavePolicyId: policy.id,
          employeeStatus: { not: EmployeeStatus.TERMINATED },
        },
        include: {
          contracts: {
            where: { status: 'ACTIVE' as any },
            orderBy: { startDate: 'desc' },
            take: 1,
          },
        },
        take: 2000,
      });

      const leaveTypes = await this.prisma.leaveType.findMany({
        where: { isActive: true },
        take: 20,
      });

      for (const emp of employees) {
        for (const lt of leaveTypes) {
          const balance = await this.prisma.leaveBalance.findUnique({
            where: {
              employeeId_leaveTypeId_year: {
                employeeId: emp.id,
                leaveTypeId: lt.id,
                year: currentYear,
              },
            },
          });

          if (!balance) continue;

          const entitlement = balance.entitlementDays
            ? parseFloat(balance.entitlementDays.toString())
            : policy.baseAnnualDays;

          const totalDays = parseFloat(balance.totalDays.toString());
          const usedDays = parseFloat(balance.usedDays.toString());

          // Phần carry-over = totalDays vượt quá entitlement (= phần được mang sang từ năm cũ)
          const carriedDays = Math.max(0, totalDays - entitlement);

          if (carriedDays <= 0) continue;

          if (policy.carryOverExpiryAction === 'CLEAR') {
            // Giảm totalDays = xóa phần carry-over
            const newTotal = Math.max(usedDays, totalDays - carriedDays);
            await this.prisma.leaveBalance.update({
              where: { id: balance.id },
              data: { totalDays: newTotal },
            });
            clearCount++;
          } else if (policy.carryOverExpiryAction === 'PAY_OUT') {
            // Tính lương ngày theo hợp đồng hiện tại
            const activeContract = emp.contracts?.[0];
            const monthlySalary = activeContract
              ? parseFloat((activeContract as any).salaryMonthly?.toString() ?? '0')
              : 0;
            const dailySalary = monthlySalary > 0 ? monthlySalary / 26 : 0;
            const payoutAmount = carriedDays * dailySalary;

            // Giảm carry-over trong balance
            const newTotal = Math.max(usedDays, totalDays - carriedDays);
            await this.prisma.leaveBalance.update({
              where: { id: balance.id },
              data: { totalDays: newTotal },
            });

            // Thông báo HR/admin về khoản thanh toán
            const adminUsers = await this.prisma.user.findMany({
              where: { role: 'ADMIN', isActive: true },
              select: { id: true },
              take: 10,
            });

            const notifyTitle = `Thanh toán carry-over: ${emp.fullName}`;
            const notifyBody = `Carry-over ${carriedDays} ngày nghỉ đã hết hạn hôm nay. Khoản thanh toán: ${payoutAmount.toLocaleString('vi-VN')} đ (${carriedDays} ngày × ${dailySalary.toLocaleString('vi-VN')} đ/ngày).`;

            for (const admin of adminUsers) {
              await this.prisma.notification.create({
                data: {
                  userId: admin.id,
                  type: 'SYSTEM' as any,
                  title: notifyTitle,
                  body: notifyBody,
                  link: `/hr/leaves`,
                  entityType: 'LeaveBalance',
                  entityId: balance.id,
                },
              });
            }

            payOutCount++;
          }
        }
      }
    }

    this.logger.log(
      `[LeaveAccrualTask] Carry-over expiry: CLEAR=${clearCount}, PAY_OUT=${payOutCount}.`,
    );
  }
}
