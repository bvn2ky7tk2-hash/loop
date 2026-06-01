import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { HrAnalyticsService } from './hr-analytics.service';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { PERMISSIONS } from '../permissions/permissions.constants';

@ApiTags('hr-analytics')
@ApiBearerAuth()
@Controller('api/v1/hr/analytics')
export class HrAnalyticsController {
  constructor(private readonly service: HrAnalyticsService) {}

  @Get('summary')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @RequirePermission(PERMISSIONS.EMPLOYEES_READ)
  @ApiOperation({ summary: 'E24.1 — HR Analytics: headcount, newHires, attrition, expiring contracts, openPositions, avgSalaryPerHead' })
  getSummary() {
    return this.service.getSummary();
  }

  @Get('headcount-trend')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @RequirePermission(PERMISSIONS.EMPLOYEES_READ)
  @ApiOperation({ summary: 'E24.1 — Xu hướng headcount N tháng (total/newHires/resigns per month)' })
  @ApiQuery({ name: 'months', required: false, type: Number, example: 12 })
  getHeadcountTrend(@Query('months') months?: string) {
    return this.service.getHeadcountTrend(months ? Math.min(parseInt(months, 10), 24) : 12);
  }

  @Get('attrition-by-dept')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @RequirePermission(PERMISSIONS.EMPLOYEES_READ)
  @ApiOperation({ summary: 'E24.1 — Tỷ lệ nghỉ việc theo phòng ban' })
  getAttritionByDept() {
    return this.service.getAttritionByDept();
  }

  @Get('salary-distribution')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @RequirePermission(PERMISSIONS.EMPLOYEES_READ)
  @ApiOperation({ summary: 'E24.1 — Phân bố lương theo dải: <10M, 10-15M, ..., >30M' })
  getSalaryDistribution() {
    return this.service.getSalaryDistribution();
  }

  @Get('contract-expiry')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @RequirePermission(PERMISSIONS.EMPLOYEES_READ)
  @ApiOperation({ summary: 'E24.1 — Hợp đồng sắp hết hạn trong N ngày' })
  @ApiQuery({ name: 'days', required: false, type: Number, example: 60 })
  getContractExpiry(@Query('days') days?: string) {
    return this.service.getContractExpiry(days ? parseInt(days, 10) : 60);
  }
}
