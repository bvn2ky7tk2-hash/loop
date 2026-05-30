import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BudgetService } from './budget.service';
import { BudgetController } from './budget.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { BudgetAlertTask } from './budget-alert.task';

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule],
  controllers: [BudgetController],
  providers: [BudgetService, BudgetAlertTask],
  exports: [BudgetService],
})
export class BudgetModule {}
