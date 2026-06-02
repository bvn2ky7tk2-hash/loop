import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import type { Response } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../generated/prisma';
import type { JwtUser } from '../../common/types/jwt-user.type';
import { PermissionAuditService } from './permission-audit.service';

@ApiTags('admin-permissions')
@ApiBearerAuth()
@Controller('api/v1/admin/permissions')
@Roles(Role.ADMIN)
export class PermissionAuditController {
  constructor(private readonly service: PermissionAuditService) {}

  @Get('audit')
  @ApiOperation({ summary: 'Permission matrix: tất cả user active + quyền của họ' })
  getAudit(@CurrentUser() user: JwtUser) {
    return this.service.getAuditMatrix(user.tenantId);
  }

  @Get('search')
  @ApiOperation({ summary: 'Tìm ai có quyền X' })
  @ApiQuery({ name: 'action', required: true, description: 'Permission code cần tìm' })
  search(@Query('action') action: string, @CurrentUser() user: JwtUser) {
    return this.service.searchByPermission(action, user.tenantId);
  }

  @Get('audit/export')
  @ApiOperation({ summary: 'Export permission matrix ra Excel' })
  async exportExcel(@CurrentUser() user: JwtUser, @Res() res: Response) {
    const buffer = await this.service.exportToExcel(user.tenantId);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="permission-audit-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}
