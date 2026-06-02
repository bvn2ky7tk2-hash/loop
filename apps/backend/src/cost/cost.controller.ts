import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CostService } from './cost.service';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { PERMISSIONS } from '../permissions/permissions.constants';

@ApiTags('cost')
@ApiBearerAuth()
@Controller('api/v1/projects/:projectId/cost')
export class CostController {
  constructor(private readonly service: CostService) {}

  @Get()
  @RequirePermission(PERMISSIONS.REPORTS_READ)
  @ApiOperation({ summary: 'Tổng chi phí dự án' })
  getProjectCost(@Param('projectId') projectId: string) {
    return this.service.getProjectCost(projectId);
  }

  @Get('time-logs')
  @RequirePermission(PERMISSIONS.REPORTS_READ)
  @ApiOperation({ summary: 'Danh sách time log của dự án' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  getTimeLogs(
    @Param('projectId') projectId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.getTimeLogs(projectId, from, to);
  }
}
