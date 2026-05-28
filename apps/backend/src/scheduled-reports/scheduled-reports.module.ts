import { Module } from '@nestjs/common';
import { ScheduledReportsController } from './scheduled-reports.controller';
import { ScheduledReportsService } from './scheduled-reports.service';
import { ScheduledReportsProcessor } from './scheduled-reports.processor';
import { ScheduledReportsScheduler } from './scheduled-reports.scheduler';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [ScheduledReportsController],
  providers: [
    ScheduledReportsService,
    ScheduledReportsProcessor,
    ScheduledReportsScheduler,
  ],
  exports: [ScheduledReportsService],
})
export class ScheduledReportsModule {}
