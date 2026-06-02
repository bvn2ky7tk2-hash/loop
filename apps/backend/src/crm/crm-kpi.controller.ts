import { Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CrmKpiService } from './crm-kpi.service';

@ApiTags('CRM — KPI Analytics')
@ApiBearerAuth()
@Controller('api/v1/crm/analytics')
export class CrmKpiController {
  constructor(private readonly svc: CrmKpiService) {}

  @Get('kpi-summary')
  @ApiOperation({ summary: 'Tổng hợp KPI pipeline: weighted_pipeline, win_rate, avg_deal_size' })
  @ApiQuery({ name: 'tenantId', required: false, description: 'Filter theo tenant (bỏ trống = global)' })
  getKpiSummary(@Query('tenantId') tenantId?: string) {
    return this.svc.getKpiSummary(tenantId);
  }

  @Post('kpi-aggregate')
  @ApiOperation({ summary: 'Kích hoạt aggregate KPI thủ công (không chờ cron)' })
  @ApiQuery({ name: 'tenantId', required: false })
  triggerAggregate(@Query('tenantId') tenantId?: string) {
    return this.svc.aggregateDealKpis(tenantId);
  }
}

/** E22.2 — /crm/kpi/summary: winRate + avgCycleTime + actualRevenue + pipeline */
@ApiTags('CRM — KPI Analytics')
@ApiBearerAuth()
@Controller('api/v1/crm/kpi')
export class CrmKpiExtController {
  constructor(private readonly svc: CrmKpiService) {}

  @Get('summary')
  @ApiOperation({ summary: 'E22.2 — Win rate, avg cycle time, actual revenue, weighted pipeline' })
  @ApiQuery({ name: 'tenantId', required: false })
  getSummary(@Query('tenantId') tenantId?: string) {
    return this.svc.getExtendedKpiSummary(tenantId);
  }

  @Get('win-rate')
  @ApiOperation({ summary: 'E22.2 — Win rate: số deal WON / tổng đã đóng' })
  @ApiQuery({ name: 'tenantId', required: false })
  getWinRate(@Query('tenantId') tenantId?: string) {
    return this.svc.getWinRate(tenantId);
  }

  @Get('avg-cycle-time')
  @ApiOperation({ summary: 'E22.2 — Avg cycle time: số ngày trung bình chốt deal' })
  @ApiQuery({ name: 'tenantId', required: false })
  getAvgCycleTime(@Query('tenantId') tenantId?: string) {
    return this.svc.getAvgCycleTime(tenantId);
  }

  @Get('actual-revenue')
  @ApiOperation({ summary: 'E22.2 — Actual revenue: tổng doanh thu từ WON deals' })
  @ApiQuery({ name: 'tenantId', required: false })
  getActualRevenue(@Query('tenantId') tenantId?: string) {
    return this.svc.getActualRevenue(tenantId);
  }
}
