import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { HrInsuranceController } from './hr-insurance.controller';
import { HrInsuranceService } from './hr-insurance.service';

@Module({
  imports: [PrismaModule],
  controllers: [HrInsuranceController],
  providers: [HrInsuranceService],
  exports: [HrInsuranceService],
})
export class HrInsuranceModule {}
