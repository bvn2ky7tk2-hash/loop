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
  async getKpiSummary(@Query('tenantId') tenantId?: string) {
    return this.svc.getKpiSummary(tenantId);
  }

  @Post('kpi-aggregate')
  @ApiOperation({ summary: 'Kích hoạt aggregate KPI thủ công (không chờ cron)' })
  @ApiQuery({ name: 'tenantId', required: false })
  async triggerAggregate(@Query('tenantId') tenantId?: string) {
    return this.svc.aggregateDealKpis(tenantId);
  }
}
