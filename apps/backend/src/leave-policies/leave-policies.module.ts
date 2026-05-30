import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { LeavePoliciesController } from './leave-policies.controller';
import { LeavePoliciesService } from './leave-policies.service';
import { LeaveAccrualTask } from './leave-accrual.task';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule],
  controllers: [LeavePoliciesController],
  providers: [LeavePoliciesService, LeaveAccrualTask],
  exports: [LeavePoliciesService],
})
export class LeavePoliciesModule {}
