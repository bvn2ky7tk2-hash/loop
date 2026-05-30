import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../prisma/prisma.module';
import { ContractsService } from './contracts.service';
import { ContractsController } from './contracts.controller';
import { ContractExpiryTask } from './contract-expiry.task';

@Module({
  imports: [PrismaModule, ScheduleModule.forRoot()],
  providers: [ContractsService, ContractExpiryTask],
  controllers: [ContractsController],
  exports: [ContractsService],
})
export class ContractsModule {}
