import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionsService } from './permissions.service';
import { Role } from '../generated/prisma';
import {
  SetRolePermissionsDto,
  UpsertUserPermissionDto,
  AssignModuleRoleDto,
  CreateModuleRoleDto,
  SetModuleRolePermissionsDto,
} from './dto/permissions-admin.dto';

@Injectable()
export class PermissionsAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionsService,
  ) {}

  // ── All permissions ──────────────────────────────────────────────────────────

  async listAll() {
    return this.prisma.permission.findMany({ orderBy: [{ module: 'asc' }, { action: 'asc' }] });
  }

  // ── System Role permissions ──────────────────────────────────────────────────

  async getRolePermissions(role: Role) {
    const rows = await this.prisma.rolePermission.findMany({
      where: { role },
      select: { permissionCode: true },
    });
    return rows.map((r) => r.permissionCode);
  }

  async setRolePermissions(role: Role, dto: SetRolePermissionsDto) {
    await this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { role } });
      if (dto.codes.length) {
        await tx.rolePermission.createMany({
          data: dto.codes.map((code) => ({ role, permissionCode: code })),
          skipDuplicates: true,
        });
      }
    });
    await this.permissions.invalidateAll();
    return this.getRolePermissions(role);
  }

  // ── Module roles ─────────────────────────────────────────────────────────────

  async listModuleRoles() {
    return this.prisma.moduleRole.findMany({
      orderBy: [{ domain: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { permissions: true, userRoles: true } } },
    });
  }

  async createModuleRole(dto: CreateModuleRoleDto) {
    return this.prisma.moduleRole.create({ data: { ...dto, isSystem: false } });
  }

  async getModuleRolePermissions(roleCode: string) {
    const rows = await this.prisma.moduleRolePermission.findMany({
      where: { roleCode },
      select: { permissionCode: true },
    });
    return rows.map((r) => r.permissionCode);
  }

  async setModuleRolePermissions(roleCode: string, dto: SetModuleRolePermissionsDto) {
    const role = await this.prisma.moduleRole.findUnique({ where: { code: roleCode } });
    if (!role) throw new NotFoundException(`Module role '${roleCode}' không tồn tại`);

    await this.prisma.$transaction(async (tx) => {
      await tx.moduleRolePermission.deleteMany({ where: { roleCode } });
      if (dto.codes.length) {
        await tx.moduleRolePermission.createMany({
          data: dto.codes.map((code) => ({ roleCode, permissionCode: code })),
          skipDuplicates: true,
        });
      }
    });
    await this.permissions.invalidateAll();
    return this.getModuleRolePermissions(roleCode);
  }

  async deleteModuleRole(roleCode: string) {
    const role = await this.prisma.moduleRole.findUnique({ where: { code: roleCode } });
    if (!role) throw new NotFoundException(`Module role '${roleCode}' không tồn tại`);
    if (role.isSystem) throw new BadRequestException('Không thể xoá system module role');
    await this.prisma.moduleRole.delete({ where: { code: roleCode } });
    await this.permissions.invalidateAll();
  }

  // ── User module role assignment ───────────────────────────────────────────────

  async getUserModuleRoles(userId: string) {
    const rows = await this.prisma.userModuleRole.findMany({
      where: { userId },
      include: { role: { select: { code: true, name: true, domain: true } } },
    });
    return rows.map((r) => r.role);
  }

  async assignModuleRole(userId: string, dto: AssignModuleRoleDto) {
    await this.prisma.userModuleRole.upsert({
      where: { userId_roleCode: { userId, roleCode: dto.roleCode } },
      update: {},
      create: { userId, roleCode: dto.roleCode },
    });
    await this.permissions.invalidateUser(userId);
  }

  async removeModuleRole(userId: string, roleCode: string) {
    await this.prisma.userModuleRole.deleteMany({ where: { userId, roleCode } });
    await this.permissions.invalidateUser(userId);
  }

  // ── User permission overrides ─────────────────────────────────────────────────

  async getUserOverrides(userId: string) {
    return this.prisma.userPermission.findMany({
      where: { userId },
      select: { permissionCode: true, granted: true },
    });
  }

  async upsertUserOverride(userId: string, dto: UpsertUserPermissionDto) {
    await this.prisma.userPermission.upsert({
      where: { userId_permissionCode: { userId, permissionCode: dto.permissionCode } },
      update: { granted: dto.granted },
      create: { userId, permissionCode: dto.permissionCode, granted: dto.granted },
    });
    await this.permissions.invalidateUser(userId);
  }

  async deleteUserOverride(userId: string, permissionCode: string) {
    await this.prisma.userPermission.deleteMany({ where: { userId, permissionCode } });
    await this.permissions.invalidateUser(userId);
  }

  // ── User effective permissions ─────────────────────────────────────────────────

  async getUserEffectivePermissions(userId: string) {
    const perms = await this.permissions.getEffectivePermissions(userId);
    return Array.from(perms);
  }
}
