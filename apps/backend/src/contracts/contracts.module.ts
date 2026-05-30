import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../prisma/prisma.module';
import { EventsModule } from '../common/events/events.module';
import { ContractsService } from './contracts.service';
import { ContractsController } from './contracts.controller';
import { ContractExpiryTask } from './contract-expiry.task';
import { ContractLifecycleHandlerService } from './contract-lifecycle-handler.service';

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule, EventsModule],
  providers: [ContractsService, ContractExpiryTask, ContractLifecycleHandlerService],
  controllers: [ContractsController],
  exports: [ContractsService],
})
export class ContractsModule {}
