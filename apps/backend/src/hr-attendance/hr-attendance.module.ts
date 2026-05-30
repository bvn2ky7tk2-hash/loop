import { Module } from '@nestjs/common';
import { HrAttendanceController } from './hr-attendance.controller';
import { HrAttendanceService } from './hr-attendance.service';
import { AttendanceExplanationService } from './attendance-explanation.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkShiftsModule } from '../work-shifts/work-shifts.module';

@Module({
  imports: [PrismaModule, WorkShiftsModule],
  controllers: [HrAttendanceController],
  providers: [HrAttendanceService, AttendanceExplanationService],
  exports: [HrAttendanceService, AttendanceExplanationService],
})
export class HrAttendanceModule {}
