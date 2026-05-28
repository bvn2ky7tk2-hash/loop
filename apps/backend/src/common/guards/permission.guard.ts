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

    const requiredCode = this.reflector.getAllAndOverride<string | undefined>(PERMISSION_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!requiredCode) return true;

    const user = ctx.switchToHttp().getRequest<{ user?: User }>().user;
    if (!user) return false;

    // ADMIN bypasses all permission checks
    if (user.role === 'ADMIN') return true;

    const allowed = await this.permissions.userHasPermission(user.id, requiredCode);
    if (!allowed) throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này');
    return true;
  }
}
