import { Injectable, Inject, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { TenantAwareService } from '../common/services/tenant-aware.service';
import { ReportsAnalyticsProvider } from './providers/reports-analytics.provider';
import { ReportGeneratorProvider } from './providers/report-generator.provider';
import { ReportBuilderProvider } from './providers/report-builder.provider';

export type ReportType =
  | 'PROJECT_COST'
  | 'PERSONNEL_ALLOCATION'
  | 'TASK_PROGRESS'
  | 'ALERT_HISTORY'
  | 'TIMESHEET_SUMMARY';

export interface GenerateReportDto {
  reportType: ReportType;
  startDate: string;
  endDate: string;
  projectIds?: string[];
  employeeIds?: string[];
}

// ── Builder types ─────────────────────────────────────────────────────────────

export type BuilderEntityKey = 'Employee' | 'Project' | 'Invoice' | 'Leave' | 'Expense' | 'Payroll';

export interface BuilderColumnDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'status';
}

export interface BuilderFilter {
  field: string;
  op: '=' | '>' | '<' | 'contains';
  value: string;
}

export interface BuilderPreviewDto {
  entity: BuilderEntityKey;
  columns: string[];
  filters?: BuilderFilter[];
}

/**
 * Facade mỏng cho module Reports.
 * Giữ nguyên API public + chữ ký method; DELEGATE sang 3 provider theo trách nhiệm:
 *   - ReportsAnalyticsProvider  : analytics reads
 *   - ReportGeneratorProvider   : Excel export + parameterised report generator
 *   - ReportBuilderProvider     : dynamic report builder
 */
@Injectable({ scope: Scope.REQUEST })
export class ReportsService extends TenantAwareService {
  constructor(
    private readonly analytics: ReportsAnalyticsProvider,
    private readonly generator: ReportGeneratorProvider,
    private readonly builder: ReportBuilderProvider,
    @Inject(REQUEST) req?: any,
  ) {
    super(req);
  }

  // ── Analytics reads ────────────────────────────────────────────────────────

  getTopEmployeesByHours(limit = 10) {
    return this.analytics.getTopEmployeesByHours(limit);
  }

  getProjectBurndown(projectId: string) {
    return this.analytics.getProjectBurndown(projectId);
  }

  getOrgUnitSummary() {
    return this.analytics.getOrgUnitSummary();
  }

  getMonthlyTimeLogs(months = 6) {
    return this.analytics.getMonthlyTimeLogs(months);
  }

  getBugStats() {
    return this.analytics.getBugStats();
  }

  getHrStats() {
    return this.analytics.getHrStats();
  }

  getTurnoverRate(year: number) {
    return this.analytics.getTurnoverRate(year);
  }

  getHeadcountTrend(months = 6) {
    return this.analytics.getHeadcountTrend(months);
  }

  getUtilization(period: string, departmentId?: string) {
    return this.analytics.getUtilization(period, departmentId);
  }

  getSummary(period: string, comparePeriod?: string) {
    return this.analytics.getSummary(period, comparePeriod);
  }

  // ── Excel export + report generator ─────────────────────────────────────────

  exportTopEmployeesExcel(limit = 50): Promise<Buffer> {
    return this.generator.exportTopEmployeesExcel(limit);
  }

  exportMonthlyHoursExcel(months = 6): Promise<Buffer> {
    return this.generator.exportMonthlyHoursExcel(months);
  }

  generateReport(dto: GenerateReportDto): Promise<{ buffer: Buffer; filename: string }> {
    return this.generator.generateReport(dto);
  }

  // ── Report builder ───────────────────────────────────────────────────────────

  getBuilderEntities(): Record<BuilderEntityKey, BuilderColumnDef[]> {
    return this.builder.getBuilderEntities();
  }

  builderPreview(dto: BuilderPreviewDto): Promise<{ rows: Record<string, unknown>[]; total: number }> {
    return this.builder.builderPreview(dto);
  }

  builderExport(dto: BuilderPreviewDto): Promise<Buffer> {
    return this.builder.builderExport(dto);
  }
}
