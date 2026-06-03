import {
  Controller, Get, Post, Put, Delete, Body, Param, HttpCode, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { PlatformAdminGuard } from '../common/guards/platform-admin.guard';
import { Role } from '../generated/prisma';
import { PERMISSIONS } from './permissions.constants';
import { PermissionsAdminService } from './permissions-admin.service';
import {
  SetRolePermissionsDto,
  UpsertUserPermissionDto,
  AssignModuleRoleDto,
  CreateModuleRoleDto,
  SetModuleRolePermissionsDto,
} from './dto/permissions-admin.dto';

@ApiTags('permissions')
@ApiBearerAuth()
@RequirePermission(PERMISSIONS.ADMIN_PERMISSIONS)
@Controller('api/v1/admin/permissions')
export class PermissionsController {
  constructor(private readonly service: PermissionsAdminService) {}

  // ── All permission codes ──────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Danh sách tất cả permission codes' })
  listAll() {
    return this.service.listAll();
  }

  // ── System role permissions ───────────────────────────────────────────────────

  @Get('roles/:role')
  @ApiOperation({ summary: 'Permission codes của một system role' })
  getRolePermissions(@Param('role') role: Role) {
    return this.service.getRolePermissions(role);
  }

  @Put('roles/:role')
  @UseGuards(PlatformAdminGuard)
  @ApiOperation({ summary: 'Gán lại toàn bộ permissions cho system role' })
  setRolePermissions(@Param('role') role: Role, @Body() dto: SetRolePermissionsDto) {
    return this.service.setRolePermissions(role, dto);
  }

  // ── Module roles ──────────────────────────────────────────────────────────────

  @Get('module-roles')
  @ApiOperation({ summary: 'Danh sách module roles' })
  listModuleRoles() {
    return this.service.listModuleRoles();
  }

  @Post('module-roles')
  @UseGuards(PlatformAdminGuard)
  @ApiOperation({ summary: 'Tạo module role mới' })
  createModuleRole(@Body() dto: CreateModuleRoleDto) {
    return this.service.createModuleRole(dto);
  }

  @Get('module-roles/:roleCode/permissions')
  @ApiOperation({ summary: 'Permissions của module role' })
  getModuleRolePermissions(@Param('roleCode') roleCode: string) {
    return this.service.getModuleRolePermissions(roleCode);
  }

  @Put('module-roles/:roleCode/permissions')
  @UseGuards(PlatformAdminGuard)
  @ApiOperation({ summary: 'Gán lại permissions cho module role' })
  setModuleRolePermissions(
    @Param('roleCode') roleCode: string,
    @Body() dto: SetModuleRolePermissionsDto,
  ) {
    return this.service.setModuleRolePermissions(roleCode, dto);
  }

  @Delete('module-roles/:roleCode')
  @UseGuards(PlatformAdminGuard)
  @HttpCode(204)
  @ApiOperation({ summary: 'Xoá module role (không phải system role)' })
  deleteModuleRole(@Param('roleCode') roleCode: string) {
    return this.service.deleteModuleRole(roleCode);
  }

  // ── User: module role assignment ──────────────────────────────────────────────

  @Get('users/:userId/module-roles')
  @ApiOperation({ summary: 'Module roles đang gán cho user' })
  getUserModuleRoles(@Param('userId') userId: string) {
    return this.service.getUserModuleRoles(userId);
  }

  @Post('users/:userId/module-roles')
  @ApiOperation({ summary: 'Gán module role cho user' })
  assignModuleRole(@Param('userId') userId: string, @Body() dto: AssignModuleRoleDto) {
    return this.service.assignModuleRole(userId, dto);
  }

  @Delete('users/:userId/module-roles/:roleCode')
  @HttpCode(204)
  @ApiOperation({ summary: 'Xoá module role khỏi user' })
  removeModuleRole(@Param('userId') userId: string, @Param('roleCode') roleCode: string) {
    return this.service.removeModuleRole(userId, roleCode);
  }

  // ── User: permission overrides ────────────────────────────────────────────────

  @Get('users/:userId/overrides')
  @ApiOperation({ summary: 'Override permissions của user' })
  getUserOverrides(@Param('userId') userId: string) {
    return this.service.getUserOverrides(userId);
  }

  @Put('users/:userId/overrides')
  @ApiOperation({ summary: 'Thêm/cập nhật override permission cho user' })
  upsertUserOverride(@Param('userId') userId: string, @Body() dto: UpsertUserPermissionDto) {
    return this.service.upsertUserOverride(userId, dto);
  }

  @Delete('users/:userId/overrides/:permissionCode')
  @HttpCode(204)
  @ApiOperation({ summary: 'Xoá override permission của user' })
  deleteUserOverride(
    @Param('userId') userId: string,
    @Param('permissionCode') permissionCode: string,
  ) {
    return this.service.deleteUserOverride(userId, permissionCode);
  }

  // ── User: effective permissions ────────────────────────────────────────────────

  @Get('users/:userId/effective')
  @ApiOperation({ summary: 'Effective permissions của user (merged từ 3 nguồn)' })
  getUserEffective(@Param('userId') userId: string) {
    return this.service.getUserEffectivePermissions(userId);
  }
}
