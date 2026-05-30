import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
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
}
