import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SalaryRecordsController } from './salary-records.controller';
import { SalaryRecordsService } from './salary-records.service';

@Module({
  imports: [PrismaModule],
  controllers: [SalaryRecordsController],
  providers: [SalaryRecordsService],
  exports: [SalaryRecordsService],
})
export class SalaryRecordsModule {}
