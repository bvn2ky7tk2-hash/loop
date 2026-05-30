import { Module } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { EmployeesController } from './employees.controller';
import { HrAnalyticsService } from './hr-analytics.service';
import { HrAnalyticsController } from './hr-analytics.controller';

@Module({
  providers: [EmployeesService, HrAnalyticsService],
  controllers: [EmployeesController, HrAnalyticsController],
  exports: [EmployeesService],
})
export class EmployeesModule {}
