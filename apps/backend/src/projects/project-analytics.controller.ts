import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ProjectAnalyticsService } from './project-analytics.service';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { PERMISSIONS } from '../permissions/permissions.constants';

@ApiTags('project-analytics')
@ApiBearerAuth()
@Controller('api/v1/projects/analytics')
export class ProjectAnalyticsController {
  constructor(private readonly service: ProjectAnalyticsService) {}

  @Get('summary')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @RequirePermission(PERMISSIONS.PROJECTS_READ)
  @ApiOperation({ summary: 'E24.3 — Project Analytics: active/completed, revenue, margin, utilization' })
  getSummary() {
    return this.service.getSummary();
  }

  @Get('portfolio')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @RequirePermission(PERMISSIONS.PROJECTS_READ)
  @ApiOperation({ summary: 'E24.3 — Portfolio view: projects với margin/revenue/duration (bubble chart)' })
  getPortfolio() {
    return this.service.getPortfolio();
  }
}
