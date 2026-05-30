import { Module } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { ExpensesController } from './expenses.controller';
import { ExpenseProcessHandlerService } from './expense-process-handler.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ProcessesModule } from '../processes/processes.module';
import { AccountingModule } from '../accounting/accounting.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { BudgetModule } from '../budget/budget.module';

@Module({
  imports: [PrismaModule, ProcessesModule, AccountingModule, NotificationsModule, BudgetModule],
  controllers: [ExpensesController],
  providers: [ExpensesService, ExpenseProcessHandlerService],
  exports: [ExpensesService],
})
export class ExpensesModule {}
