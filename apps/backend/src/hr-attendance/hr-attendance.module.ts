import { Module } from '@nestjs/common';
import { HrAttendanceController } from './hr-attendance.controller';
import { HrAttendanceService } from './hr-attendance.service';
import { AttendanceExplanationService } from './attendance-explanation.service';
import { AttendanceExplanationProcessHandlerService } from './attendance-explanation-process-handler.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkShiftsModule } from '../work-shifts/work-shifts.module';
import { ProcessesModule } from '../processes/processes.module';

@Module({
  imports: [PrismaModule, WorkShiftsModule, ProcessesModule],
  controllers: [HrAttendanceController],
  providers: [
    HrAttendanceService,
    AttendanceExplanationService,
    AttendanceExplanationProcessHandlerService,
  ],
  exports: [HrAttendanceService, AttendanceExplanationService],
})
export class HrAttendanceModule {}
