import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AlertsService } from './alerts.service';
import { AlertsController } from './alerts.controller';
import { AlertSchedulerService } from './alert-scheduler.service';
import { AlertSchedulerTask } from './alert-scheduler.task';
import { TimesheetModule } from '../timesheet/timesheet.module';
import { TelegramModule } from '../integrations/telegram/telegram.module';

@Module({
  imports: [ScheduleModule.forRoot(), TimesheetModule, TelegramModule],
  providers: [AlertsService, AlertSchedulerService, AlertSchedulerTask],
  controllers: [AlertsController],
  exports: [AlertsService],
})
export class AlertsModule {}

