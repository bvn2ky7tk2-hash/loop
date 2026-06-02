import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { FinanceAnalyticsService } from './finance-analytics.service';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { PERMISSIONS } from '../permissions/permissions.constants';

@ApiTags('finance-analytics')
@ApiBearerAuth()
@Controller('api/v1/finance/analytics')
export class FinanceAnalyticsController {
  constructor(private readonly service: FinanceAnalyticsService) {}

  @Get('summary')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @RequirePermission(PERMISSIONS.FINANCE_READ)
  @ApiOperation({ summary: 'E24.4 — Finance Analytics: revenueYTD, AR/AP, cash collection rate' })
  getSummary() {
    return this.service.getSummary();
  }

  @Get('ar-aging')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @RequirePermission(PERMISSIONS.FINANCE_READ)
  @ApiOperation({ summary: 'E24.4 — AR Aging: phân loại công nợ (0-30/31-60/61-90/90+ ngày)' })
  getArAging() {
    return this.service.getArAging();
  }

  @Get('monthly-pl')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @RequirePermission(PERMISSIONS.FINANCE_READ)
  @ApiOperation({ summary: 'E24.4 — P&L tháng (12 tháng gần nhất: revenue/cost/netMargin)' })
  getMonthlyPL() {
    return this.service.getMonthlyPL();
  }

  @Get('budget-vs-actual')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @RequirePermission(PERMISSIONS.FINANCE_READ)
  @ApiOperation({ summary: 'E24.4 — Budget vs Actual: group by category từ BudgetLine ACTIVE' })
  getBudgetVsActual() {
    return this.service.getBudgetVsActual();
  }
}
