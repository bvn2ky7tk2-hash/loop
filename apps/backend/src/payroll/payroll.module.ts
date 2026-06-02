import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PayrollService } from './payroll.service';
import { PayrollController } from './payroll.controller';
import { PayrollConfigService } from './payroll-config.service';
import { PayrollConfigController } from './payroll-config.controller';
import { PayrollEmployeeService } from './payroll-employee.service';
import { PayrollEmployeeController } from './payroll-employee.controller';
import { PayrollEngineService } from './payroll-engine.service';
import { PayslipGeneratorService } from './payslip-generator.service';
import { PayslipQueueService } from './payslip-queue.service';
import { TaxReportService } from './tax-report.service';
import { TaxReportController } from './tax-report.controller';
import { PayrollAnalyticsService } from './payroll-analytics.service';
import { PayrollAnalyticsController } from './payroll-analytics.controller';
import { PayrollYearendTask } from './payroll-yearend.task';
import { PrismaModule } from '../prisma/prisma.module';
import { AccountingModule } from '../accounting/accounting.module';
import { StorageModule } from '../storage/storage.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule, AccountingModule, StorageModule, NotificationsModule],
  controllers: [
    PayrollController,
    PayrollConfigController,
    PayrollEmployeeController,
    TaxReportController,
    PayrollAnalyticsController,
  ],
  providers: [
    PayrollService,
    PayrollConfigService,
    PayrollEmployeeService,
    PayrollEngineService,
    PayslipGeneratorService,
    PayslipQueueService,
    TaxReportService,
    PayrollAnalyticsService,
    PayrollYearendTask,
  ],
  exports: [
    PayrollService,
    PayrollConfigService,
    PayrollEmployeeService,
    PayrollEngineService,
    TaxReportService,
  ],
})
export class PayrollModule {}
