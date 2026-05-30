import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'E24.2 — Payroll Analytics: chi phí lương tháng hiện tại' })
  getSummary() {
    return this.service.getSummary();
  }

  @Get('salary-trend')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @RequirePermission(PERMISSIONS.PAYROLL_READ)
  @ApiOperation({ summary: 'E24.2 — Xu hướng lương 12 tháng (baseSalary/allowances/bonus/OT)' })
  getSalaryTrend() {
    return this.service.getSalaryTrend();
  }

  @Get('ot-by-dept')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @RequirePermission(PERMISSIONS.PAYROLL_READ)
  @ApiOperation({ summary: 'E24.2 — OT theo phòng ban (giờ & chi phí tháng hiện tại)' })
  getOtByDept() {
    return this.service.getOtByDept();
  }
}
