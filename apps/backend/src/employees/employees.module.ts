import { Module } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { EmployeesController } from './employees.controller';
import { HrAnalyticsService } from './hr-analytics.service';
import { HrAnalyticsController } from './hr-analytics.controller';
import { EmployeeOnboardingHandlerService } from './employee-onboarding-handler.service';
import { EventsModule } from '../common/events/events.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [EventsModule, PrismaModule],
  providers: [EmployeesService, HrAnalyticsService, EmployeeOnboardingHandlerService],
  controllers: [EmployeesController, HrAnalyticsController],
  exports: [EmployeesService],
})
export class EmployeesModule {}
