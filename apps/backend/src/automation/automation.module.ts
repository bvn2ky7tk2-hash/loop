import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AutomationController } from './automation.controller';
import { AutomationService } from './automation.service';
import { AutomationScheduler } from './automation.scheduler';
import { AutomationCronTask } from './automation-cron.task';

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule, NotificationsModule],
  controllers: [AutomationController],
  providers: [AutomationService, AutomationScheduler, AutomationCronTask],
})
export class AutomationModule {}
