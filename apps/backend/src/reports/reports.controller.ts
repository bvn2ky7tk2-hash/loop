import { Controller, Get, Post, Param, Query, Res, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import type { Response } from 'express';
import { ReportsService, type GenerateReportDto } from './reports.service';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { PERMISSIONS } from '../permissions/permissions.constants';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('api/v1/reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('top-employees')
  @RequirePermission(PERMISSIONS.REPORTS_READ)
  @ApiOperation({ summary: 'Top nhân sự theo giờ làm' })
  @ApiQuery({ name: 'limit', required: false })
  getTopEmployees(@Query('limit') limit?: string) {
    return this.service.getTopEmployeesByHours(limit ? Number(limit) : 10);
  }

  @Get('project-burndown/:projectId')
  @RequirePermission(PERMISSIONS.REPORTS_READ)
  @ApiOperation({ summary: 'Burndown chart dự án' })
  getProjectBurndown(@Param('projectId') projectId: string) {
    return this.service.getProjectBurndown(projectId);
  }

  @Get('org-summary')
  @RequirePermission(PERMISSIONS.REPORTS_READ)
  @ApiOperation({ summary: 'Tóm tắt theo đơn vị' })
  getOrgSummary() {
    return this.service.getOrgUnitSummary();
  }

  @Get('monthly-hours')
  @RequirePermission(PERMISSIONS.REPORTS_READ)
  @ApiOperation({ summary: 'Giờ làm theo tháng' })
  @ApiQuery({ name: 'months', required: false })
  getMonthlyHours(@Query('months') months?: string) {
    return this.service.getMonthlyTimeLogs(months ? Number(months) : 6);
  }

  @Get('export/top-employees')
  @RequirePermission(PERMISSIONS.REPORTS_EXPORT)
  @ApiOperation({ summary: 'Xuất Excel top nhân sự' })
  @ApiQuery({ name: 'limit', required: false })
  async exportTopEmployees(@Res() res: Response, @Query('limit') limit?: string) {
    const buffer = await this.service.exportTopEmployeesExcel(limit ? Number(limit) : 50);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="top-employees.xlsx"',
    });
    res.send(buffer);
  }

  @Get('export/monthly-hours')
  @RequirePermission(PERMISSIONS.REPORTS_EXPORT)
  @ApiOperation({ summary: 'Xuất Excel giờ theo tháng' })
  @ApiQuery({ name: 'months', required: false })
  async exportMonthlyHours(@Res() res: Response, @Query('months') months?: string) {
    const buffer = await this.service.exportMonthlyHoursExcel(months ? Number(months) : 6);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="monthly-hours.xlsx"',
    });
    res.send(buffer);
  }

  @Get('bug-stats')
  @RequirePermission(PERMISSIONS.REPORTS_READ)
  @ApiOperation({ summary: 'Thống kê bugs theo status/severity/project' })
  getBugStats() {
    return this.service.getBugStats();
  }

  @Get('hr-stats')
  @RequirePermission(PERMISSIONS.REPORTS_READ)
  @ApiOperation({ summary: 'Thống kê Leave và Expense' })
  getHrStats() {
    return this.service.getHrStats();
  }

  @Post('generate')
  @RequirePermission(PERMISSIONS.REPORTS_EXPORT)
  @ApiOperation({ summary: 'Tạo báo cáo tham số (Story 8.3) — trả về file xlsx' })
  async generateReport(@Body() dto: GenerateReportDto, @Res() res: Response) {
    const { buffer, filename } = await this.service.generateReport(dto);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(buffer);
  }
}
