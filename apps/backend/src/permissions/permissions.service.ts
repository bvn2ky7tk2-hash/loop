import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../common/services/redis.service';
import type { User } from '../generated/prisma';

const PERM_TTL = 300; // 5 minutes

@Injectable()
export class PermissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Returns the effective permission codes for a user.
   * Combines: system role perms + module role perms + user-level overrides.
   * ADMIN always gets all permissions via role seeding — no special-case needed here.
   */
  async getEffectivePermissions(userId: string): Promise<Set<string>> {
    const cacheKey = `perm:${userId}`;
    const cached = await this.redis.get(cacheKey).catch(() => null);
    if (cached) return new Set<string>(JSON.parse(cached) as string[]);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!user) return new Set();

    // Track 1: system role permissions
    const rolePerms = await this.prisma.rolePermission.findMany({
      where: { role: user.role },
      select: { permissionCode: true },
    });

    // Track 2: module role permissions
    const modulePerms = await this.prisma.moduleRolePermission.findMany({
      where: {
        role: { userRoles: { some: { userId } } },
      },
      select: { permissionCode: true },
    });

    // Track 2b: user group permissions
    const groupPerms = await this.prisma.groupPermission.findMany({
      where: { group: { members: { some: { userId } } } },
      select: { permCode: true },
    });

    // Merge track 1 + 2 + 2b
    const effective = new Set<string>([
      ...rolePerms.map((r) => r.permissionCode),
      ...modulePerms.map((r) => r.permissionCode),
      ...groupPerms.map((r) => r.permCode),
    ]);

    // Track 3: user-level overrides (granted=true adds, granted=false removes)
    const overrides = await this.prisma.userPermission.findMany({
      where: { userId },
      select: { permissionCode: true, granted: true },
    });
    for (const o of overrides) {
      if (o.granted) effective.add(o.permissionCode);
      else effective.delete(o.permissionCode);
    }

    const arr = Array.from(effective);
    await this.redis.setex(cacheKey, PERM_TTL, JSON.stringify(arr)).catch(() => {});
    return effective;
  }

  async userHasPermission(userId: string, code: string): Promise<boolean> {
    const perms = await this.getEffectivePermissions(userId);
    return perms.has(code);
  }

  async invalidateUser(userId: string): Promise<void> {
    await this.redis.del(`perm:${userId}`).catch(() => {});
  }

  async invalidateAll(): Promise<void> {
    await this.redis.delPattern('perm:*').catch(() => {});
  }

  async getUserModuleRoleCodes(userId: string): Promise<string[]> {
    const rows = await this.prisma.userModuleRole.findMany({
      where: { userId },
      select: { roleCode: true },
    });
    return rows.map((r) => r.roleCode);
  }
}
