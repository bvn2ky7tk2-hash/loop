import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { User } from '../../generated/prisma';
import { PermissionsService } from '../../permissions/permissions.service';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissions: PermissionsService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const requiredCodes = this.reflector.getAllAndOverride<string[] | undefined>(PERMISSION_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!requiredCodes || requiredCodes.length === 0) return true;

    const user = ctx.switchToHttp().getRequest<{ user?: User }>().user;
    if (!user) return false;

    // ADMIN bypasses all permission checks
    if (user.role === 'ADMIN') return true;

    // OR logic — user needs at least one of the required codes
    const results = await Promise.all(
      requiredCodes.map(code => this.permissions.userHasPermission(user.id, code)),
    );
    const allowed = results.some(Boolean);
    if (!allowed) throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này');
    return true;
  }
}
