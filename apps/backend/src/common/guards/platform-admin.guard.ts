import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

/**
 * Chỉ cho phép PLATFORM ADMIN (chủ nền tảng, tách biệt khỏi tenant ADMIN).
 * Dùng cho thao tác xuyên-tenant / global: quản lý tenant, RBAC system,
 * master-data dùng chung, demo/reset. Áp bằng @UseGuards(PlatformAdminGuard).
 */
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    if (!req.user?.isPlatformAdmin) {
      throw new ForbiddenException('Chỉ quản trị nền tảng (platform admin) mới được thực hiện');
    }
    return true;
  }
}
