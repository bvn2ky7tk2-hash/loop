import { Module } from '@nestjs/common';
import { TimesheetService } from './timesheet.service';
import { TimesheetController } from './timesheet.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkShiftsModule } from '../work-shifts/work-shifts.module';
import { TimesheetAttendanceProvider } from './providers/timesheet-attendance.provider';
import { TimesheetPeriodProvider } from './providers/timesheet-period.provider';
import { TimesheetApprovalProvider } from './providers/timesheet-approval.provider';

@Module({
  imports: [PrismaModule, WorkShiftsModule],
  providers: [
    TimesheetService,
    TimesheetAttendanceProvider,
    TimesheetPeriodProvider,
    TimesheetApprovalProvider,
  ],
  controllers: [TimesheetController],
  exports: [TimesheetService],
})
export class TimesheetModule {}
