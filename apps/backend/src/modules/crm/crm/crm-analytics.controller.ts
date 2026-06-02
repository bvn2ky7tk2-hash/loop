import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CrmAnalyticsService } from './crm-analytics.service';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { PERMISSIONS } from '../permissions/permissions.constants';

@ApiTags('crm-analytics')
@ApiBearerAuth()
@Controller('api/v1/crm/analytics')
export class CrmAnalyticsController {
  constructor(private readonly service: CrmAnalyticsService) {}

  @Get('summary')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @RequirePermission(PERMISSIONS.CRM_READ)
  @ApiOperation({ summary: 'E24.5 — CRM KPI: deals, win rate, pipeline value, avg deal size' })
  getSummary() {
    return this.service.getSummary();
  }

  // ─── E22.3: Analytics endpoints ──────────────────────────────────────────

  @Get('pipeline-by-stage')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @RequirePermission(PERMISSIONS.CRM_READ)
  @ApiOperation({ summary: 'E22.3 — Pipeline phân theo stage (count + value)' })
  getPipelineByStage() {
    return this.service.getPipelineByStage();
  }

  @Get('win-loss-monthly')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @RequirePermission(PERMISSIONS.CRM_READ)
  @ApiOperation({ summary: 'E22.3 — Win/Loss theo tháng (N tháng gần nhất)' })
  @ApiQuery({ name: 'months', required: false, description: 'Số tháng, mặc định 6' })
  getWinLossMonthly(@Query('months') months?: string) {
    return this.service.getWinLossMonthly(months ? parseInt(months, 10) : 6);
  }

  @Get('top-customers')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @RequirePermission(PERMISSIONS.CRM_READ)
  @ApiOperation({ summary: 'E22.3 — Top khách hàng theo doanh thu Won deals' })
  @ApiQuery({ name: 'limit', required: false, description: 'Số khách hàng, mặc định 5' })
  getTopCustomers(@Query('limit') limit?: string) {
    return this.service.getTopCustomers(limit ? parseInt(limit, 10) : 5);
  }

  @Get('aging')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @RequirePermission(PERMISSIONS.CRM_READ)
  @ApiOperation({ summary: 'E24.5 — Deals không có hoạt động trong N ngày (stale deals)' })
  @ApiQuery({ name: 'minDays', required: false, description: 'Số ngày tối thiểu, mặc định 14' })
  getDealAging(@Query('minDays') minDays?: string) {
    return this.service.getDealAging(minDays ? parseInt(minDays, 10) : 14);
  }
}
