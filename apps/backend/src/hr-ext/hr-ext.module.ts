import { Module } from '@nestjs/common';
import { TrainingService } from './training.service';
import { TrainingController } from './training.controller';
import { PerformanceService } from './performance.service';
import { PerformanceController } from './performance.controller';
import { PerformanceBonusService } from './performance-bonus.service';
import { PerformanceBonusController } from './performance-bonus.controller';
import { SalaryReviewService } from './salary-review.service';
import { SalaryReviewController } from './salary-review.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [
    TrainingController,
    PerformanceController,
    PerformanceBonusController,
    SalaryReviewController,
  ],
  providers: [
    TrainingService,
    PerformanceService,
    PerformanceBonusService,
    SalaryReviewService,
  ],
  exports: [TrainingService, PerformanceService, PerformanceBonusService, SalaryReviewService],
})
export class HrExtModule {}
