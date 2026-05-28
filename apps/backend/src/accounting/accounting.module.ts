import { Module } from '@nestjs/common';
import { AccountingService } from './accounting.service';
import { AccountingController } from './accounting.controller';
import { FinanceEventBus } from './finance-event-bus.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AccountingController],
  providers: [AccountingService, FinanceEventBus],
  exports: [AccountingService, FinanceEventBus],
})
export class AccountingModule {}
