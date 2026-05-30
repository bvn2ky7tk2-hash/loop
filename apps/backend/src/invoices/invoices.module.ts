import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { FinanceAnalyticsService } from './finance-analytics.service';
import { FinanceAnalyticsController } from './finance-analytics.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [PrismaModule, ScheduleModule.forRoot(), AccountingModule],
  controllers: [InvoicesController, FinanceAnalyticsController],
  providers: [InvoicesService, FinanceAnalyticsService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
