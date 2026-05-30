import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'E24.1 — HR Analytics: headcount, attrition, expiring contracts' })
  getSummary() {
    return this.service.getSummary();
  }

  @Get('headcount-trend')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @RequirePermission(PERMISSIONS.EMPLOYEES_READ)
  @ApiOperation({ summary: 'E24.1 — Xu hướng headcount 12 tháng (hire/resign per month)' })
  getHeadcountTrend() {
    return this.service.getHeadcountTrend();
  }

  @Get('attrition-by-dept')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @RequirePermission(PERMISSIONS.EMPLOYEES_READ)
  @ApiOperation({ summary: 'E24.1 — Tỷ lệ nghỉ việc theo phòng ban' })
  getAttritionByDept() {
    return this.service.getAttritionByDept();
  }
}
