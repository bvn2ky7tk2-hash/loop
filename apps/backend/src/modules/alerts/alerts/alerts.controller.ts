import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { Role } from '../generated/prisma';
import { AlertsService } from './alerts.service';
import { CreateAlertDto } from './dto/create-alert.dto';
import { PERMISSIONS } from '../permissions/permissions.constants';

@ApiTags('alerts')
@ApiBearerAuth()
@Controller('api/v1/projects/:projectId/alerts')
export class AlertsController {
  constructor(private readonly service: AlertsService) {}

  @Get()
  @RequirePermission(PERMISSIONS.ALERTS_READ)
  @ApiOperation({ summary: 'Cấu hình cảnh báo của dự án' })
  getAll(@Param('projectId') projectId: string) {
    return this.service.getForProject(projectId);
  }

  @Post()
  @Roles(Role.ADMIN, Role.PM)
  @RequirePermission(PERMISSIONS.ALERTS_CONFIGURE)
  @ApiOperation({ summary: 'Tạo / cập nhật cảnh báo' })
  upsert(@Param('projectId') projectId: string, @Body() dto: CreateAlertDto) {
    return this.service.upsert(projectId, dto);
  }

  @Delete(':alertId')
  @Roles(Role.ADMIN, Role.PM)
  @RequirePermission(PERMISSIONS.ALERTS_CONFIGURE)
  @ApiOperation({ summary: 'Xoá cảnh báo' })
  remove(@Param('projectId') projectId: string, @Param('alertId') alertId: string) {
    return this.service.remove(projectId, alertId);
  }
}
