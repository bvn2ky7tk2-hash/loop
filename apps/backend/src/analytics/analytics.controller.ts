import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { SavedReportsService } from './saved-reports.service';
import { CreateSavedReportDto, UpdateSavedReportDto } from './dto/saved-report.dto';

@ApiTags('analytics')
@ApiBearerAuth()
@Controller('api/v1/analytics')
export class AnalyticsController {
  constructor(
    private readonly analytics: AnalyticsService,
    private readonly savedReports: SavedReportsService,
  ) {}

  // ─── Executive Overview ────────────────────────────────────────────────────

  @Get('overview')
  @ApiOperation({ summary: 'Tổng hợp KPI toàn doanh nghiệp cho lãnh đạo' })
  getOverview(@Request() req: any) {
    const tenantId: string | undefined = req.user?.tenantId ?? undefined;
    return this.analytics.getOverview(tenantId);
  }

  @Get('revenue-trend')
  @ApiOperation({ summary: 'Xu hướng doanh thu 6 tháng gần nhất (triệu đồng)' })
  getRevenueTrend(@Request() req: any) {
    const tenantId: string | undefined = req.user?.tenantId ?? undefined;
    return this.analytics.getRevenueTrend(tenantId);
  }

  @Get('headcount-by-dept')
  @ApiOperation({ summary: 'Headcount theo phòng ban (top 10)' })
  getHeadcountByDept(@Request() req: any) {
    const tenantId: string | undefined = req.user?.tenantId ?? undefined;
    return this.analytics.getHeadcountByDept(tenantId);
  }

  // ─── Saved Reports ─────────────────────────────────────────────────────────

  @Get('saved-reports')
  @ApiOperation({ summary: 'Danh sách báo cáo đã lưu của user' })
  listSaved(@Request() req: any) {
    const userId: string = req.user?.sub ?? req.user?.id ?? '';
    const tenantId: string | undefined = req.user?.tenantId ?? undefined;
    return this.savedReports.list(userId, tenantId);
  }

  @Post('saved-reports')
  @ApiOperation({ summary: 'Tạo báo cáo mới' })
  createSaved(@Body() dto: CreateSavedReportDto, @Request() req: any) {
    const userId: string = req.user?.sub ?? req.user?.id ?? '';
    const tenantId: string | undefined = req.user?.tenantId ?? undefined;
    return this.savedReports.create(dto, userId, tenantId);
  }

  @Patch('saved-reports/:id')
  @ApiOperation({ summary: 'Cập nhật báo cáo đã lưu' })
  updateSaved(@Param('id') id: string, @Body() dto: UpdateSavedReportDto, @Request() req: any) {
    const userId: string = req.user?.sub ?? req.user?.id ?? '';
    return this.savedReports.update(id, dto, userId);
  }

  @Delete('saved-reports/:id')
  @ApiOperation({ summary: 'Xóa báo cáo đã lưu' })
  removeSaved(@Param('id') id: string, @Request() req: any) {
    const userId: string = req.user?.sub ?? req.user?.id ?? '';
    return this.savedReports.remove(id, userId);
  }
}
