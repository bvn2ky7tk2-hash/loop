import { Module } from '@nestjs/common';
import { ProcurementController } from './procurement.controller';
import { ProcurementService } from './procurement.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AccountingModule } from '../accounting/accounting.module';
import { BudgetModule } from '../budget/budget.module';
import { ProcessStarterModule } from '../processes/process-starter.module';

@Module({
  imports: [PrismaModule, AccountingModule, BudgetModule, ProcessStarterModule],
  controllers: [ProcurementController],
  providers: [ProcurementService],
})
export class ProcurementModule {}
