import { Module } from '@nestjs/common';
import { TimesheetService } from './timesheet.service';
import { TimesheetController } from './timesheet.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkShiftsModule } from '../work-shifts/work-shifts.module';

@Module({
  imports: [PrismaModule, WorkShiftsModule],
  providers: [TimesheetService],
  controllers: [TimesheetController],
  exports: [TimesheetService],
})
export class TimesheetModule {}
