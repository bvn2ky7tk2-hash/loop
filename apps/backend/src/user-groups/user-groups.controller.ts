import {
  Controller, Get, Post, Put, Delete, Patch, Body, Param,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { UserGroupsService } from './user-groups.service';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { PERMISSIONS } from '../permissions/permissions.constants';
import type {
  CreateUserGroupDto,
  UpdateUserGroupDto,
  SetGroupPermissionsDto,
  AddGroupMemberDto,
  SetGroupOrgAccessDto,
} from './dto/user-groups.dto';

@ApiTags('user-groups')
@Controller('api/v1/admin/user-groups')
@RequirePermission(PERMISSIONS.ADMIN_PERMISSIONS)
export class UserGroupsController {
  constructor(private readonly svc: UserGroupsService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách nhóm người dùng' })
  findAll() { return this.svc.findAll(); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateUserGroupDto) { return this.svc.create(dto); }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserGroupDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) { return this.svc.remove(id); }

  // ── Permissions ─────────────────────────────────────────────────────────────

  @Get(':id/permissions')
  getPermissions(@Param('id') id: string) { return this.svc.getPermissions(id); }

  @Put(':id/permissions')
  setPermissions(@Param('id') id: string, @Body() dto: SetGroupPermissionsDto) {
    return this.svc.setPermissions(id, dto);
  }

  // ── Members ──────────────────────────────────────────────────────────────────

  @Post(':id/members')
  @HttpCode(HttpStatus.CREATED)
  addMember(@Param('id') id: string, @Body() dto: AddGroupMemberDto) {
    return this.svc.addMember(id, dto.userId);
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(@Param('id') id: string, @Param('userId') userId: string) {
    return this.svc.removeMember(id, userId);
  }

  // ── Org Access ───────────────────────────────────────────────────────────────

  @Put(':id/org-access')
  setOrgAccess(@Param('id') id: string, @Body() dto: SetGroupOrgAccessDto) {
    return this.svc.setOrgAccess(id, dto);
  }
}
