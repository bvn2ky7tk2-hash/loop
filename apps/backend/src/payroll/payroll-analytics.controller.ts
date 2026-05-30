import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { PayrollAnalyticsService } from './payroll-analytics.service';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { PERMISSIONS } from '../permissions/permissions.constants';

@ApiTags('payroll-analytics')
@ApiBearerAuth()
@Controller('api/v1/payroll/analytics')
export class PayrollAnalyticsController {
  constructor(private readonly service: PayrollAnalyticsService) {}

  @Get('summary')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @RequirePermission(PERMISSIONS.PAYROLL_READ)
  @ApiOperation({ summary: 'E24.2 — Payroll Analytics: totalGross, totalNet, totalEmployerCost, avgNetSalary' })
  getSummary() {
    return this.service.getSummary();
  }

  @Get('salary-trend')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @RequirePermission(PERMISSIONS.PAYROLL_READ)
  @ApiOperation({ summary: 'E24.2 — Xu hướng lương N tháng (baseSalary/allowances/bonus/OT)' })
  @ApiQuery({ name: 'months', required: false, type: Number, example: 12 })
  getSalaryTrend(@Query('months') months?: string) {
    return this.service.getSalaryTrend(months ? Math.min(parseInt(months, 10), 24) : 12);
  }

  @Get('ot-by-dept')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @RequirePermission(PERMISSIONS.PAYROLL_READ)
  @ApiOperation({ summary: 'E24.2 — OT theo phòng ban (otHours & otPay tháng hiện tại)' })
  getOtByDept() {
    return this.service.getOtByDept();
  }

  @Get('top-earners')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @RequirePermission(PERMISSIONS.PAYROLL_READ)
  @ApiOperation({ summary: 'E24.2 — Top N nhân viên có gross salary cao nhất kỳ gần nhất' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  getTopEarners(@Query('limit') limit?: string) {
    return this.service.getTopEarners(limit ? Math.min(parseInt(limit, 10), 50) : 10);
  }
}
