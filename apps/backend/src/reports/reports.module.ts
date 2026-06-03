import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportsAnalyticsProvider } from './providers/reports-analytics.provider';
import { ReportGeneratorProvider } from './providers/report-generator.provider';
import { ReportBuilderProvider } from './providers/report-builder.provider';

@Module({
  controllers: [ReportsController],
  providers: [
    ReportsService,
    ReportsAnalyticsProvider,
    ReportGeneratorProvider,
    ReportBuilderProvider,
  ],
})
export class ReportsModule {}
