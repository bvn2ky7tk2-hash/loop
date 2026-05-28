import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionsService } from '../permissions/permissions.service';
import { OrgScopeService } from '../common/services/org-scope.service';
import type { CreateUserGroupDto, UpdateUserGroupDto, SetGroupPermissionsDto, SetGroupOrgAccessDto } from './dto/user-groups.dto';

@Injectable()
export class UserGroupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionsService: PermissionsService,
    private readonly orgScopeService: OrgScopeService,
  ) {}

  async findAll() {
    return this.prisma.userGroup.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { members: true, permissions: true } },
        orgAccess: { select: { orgUnitId: true, includeChildren: true } },
      },
    });
  }

  async findOne(id: string) {
    const group = await this.prisma.userGroup.findUnique({
      where: { id },
      include: {
        permissions: { select: { permCode: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true, orgUnitId: true } },
          },
        },
        orgAccess: {
          include: {
            orgUnit: { select: { id: true, name: true, code: true } },
          },
        },
      },
    });
    if (!group) throw new NotFoundException('Không tìm thấy nhóm người dùng');
    return group;
  }

  async create(dto: CreateUserGroupDto) {
    const exists = await this.prisma.userGroup.findUnique({ where: { name: dto.name } });
    if (exists) throw new ConflictException('Tên nhóm đã tồn tại');
    return this.prisma.userGroup.create({ data: dto });
  }

  async update(id: string, dto: UpdateUserGroupDto) {
    await this.findOne(id);
    return this.prisma.userGroup.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.userGroup.delete({ where: { id } });
  }

  // ── Permissions ────────────────────────────────────────────────────────────

  async setPermissions(id: string, dto: SetGroupPermissionsDto) {
    await this.findOne(id);
    await this.prisma.$transaction([
      this.prisma.groupPermission.deleteMany({ where: { groupId: id } }),
      this.prisma.groupPermission.createMany({
        data: dto.permCodes.map(code => ({ groupId: id, permCode: code })),
        skipDuplicates: true,
      }),
    ]);
    // Invalidate perm cache cho tất cả thành viên
    await this.invalidateMemberPermCache(id);
    return { permCodes: dto.permCodes };
  }

  async getPermissions(id: string): Promise<string[]> {
    const rows = await this.prisma.groupPermission.findMany({
      where: { groupId: id },
      select: { permCode: true },
    });
    return rows.map(r => r.permCode);
  }

  // ── Members ────────────────────────────────────────────────────────────────

  async addMember(id: string, userId: string) {
    await this.findOne(id);
    await this.prisma.groupMembership.upsert({
      where: { userId_groupId: { userId, groupId: id } },
      create: { userId, groupId: id },
      update: {},
    });
    await Promise.all([
      this.permissionsService.invalidateUser(userId),
      this.orgScopeService.invalidateUser(userId),
    ]);
  }

  async removeMember(id: string, userId: string) {
    await this.prisma.groupMembership.deleteMany({
      where: { groupId: id, userId },
    });
    await Promise.all([
      this.permissionsService.invalidateUser(userId),
      this.orgScopeService.invalidateUser(userId),
    ]);
  }

  // ── Org Access ─────────────────────────────────────────────────────────────

  async setOrgAccess(id: string, dto: SetGroupOrgAccessDto) {
    await this.findOne(id);
    await this.prisma.$transaction([
      this.prisma.groupOrgAccess.deleteMany({ where: { groupId: id } }),
      this.prisma.groupOrgAccess.createMany({
        data: dto.orgAccess.map(a => ({
          groupId: id,
          orgUnitId: a.orgUnitId,
          includeChildren: a.includeChildren,
        })),
        skipDuplicates: true,
      }),
    ]);
    // Invalidate orgscope cache cho tất cả thành viên
    await this.invalidateMemberOrgScopeCache(id);
    return dto.orgAccess;
  }

  // ── User group lookup (dùng trong PermissionsService) ─────────────────────

  async getGroupsForUser(userId: string) {
    const memberships = await this.prisma.groupMembership.findMany({
      where: { userId },
      include: {
        group: {
          include: {
            permissions: { select: { permCode: true } },
            orgAccess: { select: { orgUnitId: true, includeChildren: true } },
          },
        },
      },
    });
    return memberships.map(m => m.group);
  }

  // ── Cache invalidation helpers ─────────────────────────────────────────────

  private async getMemberIds(groupId: string): Promise<string[]> {
    const rows = await this.prisma.groupMembership.findMany({
      where: { groupId },
      select: { userId: true },
    });
    return rows.map(r => r.userId);
  }

  private async invalidateMemberPermCache(groupId: string): Promise<void> {
    const userIds = await this.getMemberIds(groupId);
    await Promise.all(userIds.map(id => this.permissionsService.invalidateUser(id)));
  }

  private async invalidateMemberOrgScopeCache(groupId: string): Promise<void> {
    const userIds = await this.getMemberIds(groupId);
    await Promise.all(userIds.map(id => this.orgScopeService.invalidateUser(id)));
  }
}
