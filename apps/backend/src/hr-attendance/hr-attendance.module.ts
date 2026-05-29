import { Module } from '@nestjs/common';
import { HrAttendanceController } from './hr-attendance.controller';
import { HrAttendanceService } from './hr-attendance.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkShiftsModule } from '../work-shifts/work-shifts.module';

@Module({
  imports: [PrismaModule, WorkShiftsModule],
  controllers: [HrAttendanceController],
  providers: [HrAttendanceService],
  exports: [HrAttendanceService],
})
export class HrAttendanceModule {}
