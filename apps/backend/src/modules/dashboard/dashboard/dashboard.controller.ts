import { Controller, Get, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { PERMISSIONS } from '../permissions/permissions.constants';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('api/v1/dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get()
  @RequirePermission(PERMISSIONS.DASHBOARD_READ)
  @ApiOperation({ summary: 'Tổng quan hệ thống' })
  getSummary(@Request() req: any) {
    const tenantId: string | undefined = req.user?.tenantId ?? undefined;
    return this.service.getSummary(tenantId);
  }
}
