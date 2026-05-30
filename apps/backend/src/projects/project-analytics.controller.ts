import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ProjectAnalyticsService, RevenueVsCostQueryDto } from './project-analytics.service';
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
  @ApiOperation({ summary: 'E24.3 — Portfolio view: projects với margin/revenue/duration' })
  getPortfolio() {
    return this.service.getPortfolio();
  }

  @Get('revenue-vs-cost')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @RequirePermission(PERMISSIONS.PROJECTS_READ)
  @ApiQuery({ name: 'months', required: false, type: Number, description: 'Số tháng (1–24, mặc định 12)' })
  @ApiOperation({ summary: 'E24.3 — Revenue vs Cost theo tháng (grouped bar)' })
  getRevenueVsCost(@Query() q: RevenueVsCostQueryDto) {
    return this.service.getRevenueVsCost(q.months ?? 12);
  }

  @Get('utilization')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @RequirePermission(PERMISSIONS.PROJECTS_READ)
  @ApiOperation({ summary: 'E24.3 — Utilization per employee (top 20 theo laborCost)' })
  getUtilization() {
    return this.service.getUtilization();
  }
}
