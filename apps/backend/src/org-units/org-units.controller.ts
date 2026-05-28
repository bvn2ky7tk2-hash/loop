import {
  Controller, Get, Post, Put, Delete, Body, Param, HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { OrgUnitsService } from './org-units.service';
import { CreateOrgUnitDto } from './dto/create-org-unit.dto';
import { UpdateOrgUnitDto } from './dto/update-org-unit.dto';
import { Role } from '../generated/prisma';
import { PERMISSIONS } from '../permissions/permissions.constants';

@ApiTags('org-units')
@ApiBearerAuth()
@Controller('api/v1/org-units')
export class OrgUnitsController {
  constructor(private readonly service: OrgUnitsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.LEADERSHIP)
  @RequirePermission(PERMISSIONS.ADMIN_ORG)
  @ApiOperation({ summary: 'Tạo đơn vị tổ chức mới' })
  create(@Body() dto: CreateOrgUnitDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy toàn bộ cây tổ chức' })
  findAll() {
    return this.service.findAll();
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.LEADERSHIP)
  @RequirePermission(PERMISSIONS.ADMIN_ORG)
  @ApiOperation({ summary: 'Cập nhật đơn vị tổ chức' })
  update(@Param('id') id: string, @Body() dto: UpdateOrgUnitDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.LEADERSHIP)
  @RequirePermission(PERMISSIONS.ADMIN_ORG)
  @HttpCode(204)
  @ApiOperation({ summary: 'Xoá đơn vị tổ chức' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
