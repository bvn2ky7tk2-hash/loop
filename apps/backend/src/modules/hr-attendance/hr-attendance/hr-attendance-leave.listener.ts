import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TimesheetStatus } from '../generated/prisma';
import { HrEventBus, LeaveApprovedPayload } from '../common/events/hr-event-bus.service';

/**
 * Singleton listener — E16F.4.
 * Lắng nghe event leave.approved qua HrEventBus (BullMQ) và cập nhật
 * leaveDays / unpaidLeaveDays trong TimesheetRecord tương ứng.
 *
 * Phải là singleton (không có scope REQUEST) vì BullMQ Worker chỉ có thể
 * được đăng ký một lần trong vòng đời module.
 */
@Injectable()
export class HrAttendanceLeaveListener implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hrEventBus: HrEventBus,
  ) {}

  onModuleInit() {
    this.hrEventBus.on('leave.approved', async (event) => {
      const payload = event.metadata as unknown as LeaveApprovedPayload;
      if (!payload?.employeeId || !payload?.startDate || !payload?.days) return;

      // Map employeeId → userId
      const employee = await this.prisma.employee.findUnique({
        where: { id: payload.employeeId },
        select: { userId: true },
      });
      if (!employee?.userId) return;

      const leaveStart = new Date(payload.startDate);
      // TimesheetRecord có periodStart = ngày 1 của tháng
      const periodStart = new Date(leaveStart.getFullYear(), leaveStart.getMonth(), 1);

      // Tăng leaveDays hoặc unpaidLeaveDays tương ứng
      await this.prisma.timesheetRecord.updateMany({
        where: {
          userId: employee.userId,
          periodStart,
          // Chỉ cập nhật bản ghi chưa bị khóa (DRAFT/SUBMITTED)
          status: { notIn: [TimesheetStatus.APPROVED] },
        },
        data: payload.isPaid
          ? { leaveDays: { increment: payload.days } }
          : { unpaidLeaveDays: { increment: payload.days } },
      });
    });
  }
}
