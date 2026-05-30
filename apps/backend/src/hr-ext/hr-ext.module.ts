import { Module } from '@nestjs/common';
import { TrainingService } from './training.service';
import { TrainingController } from './training.controller';
import { PerformanceService } from './performance.service';
import { PerformanceController } from './performance.controller';
import { PerformanceBonusService } from './performance-bonus.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TrainingController, PerformanceController],
  providers: [TrainingService, PerformanceService, PerformanceBonusService],
  exports: [TrainingService, PerformanceService, PerformanceBonusService],
})
export class HrExtModule {}
