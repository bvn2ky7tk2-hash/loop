import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../../notifications/notifications.module';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { LeadFollowUpService } from './lead-followup.service';
import { LeadFollowUpController } from './lead-followup.controller';
import { LeadFollowUpTask } from './lead-followup.task';

@Module({
  imports: [PrismaModule, NotificationsModule, ScheduleModule.forRoot()],
  providers: [LeadsService, LeadFollowUpService, LeadFollowUpTask],
  controllers: [LeadsController, LeadFollowUpController],
  exports: [LeadsService, LeadFollowUpService],
})
export class LeadsModule {}
