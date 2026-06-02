import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { Observable } from 'rxjs';
import { CLS_TENANT_ID } from '../cls/cls-keys';
import { getDefaultTenantId } from '../config/tenant.config';

/**
 * Chạy SAU guards (APP_INTERCEPTOR) → lúc này req.user (JWT) và req.__tenantId
 * (TenantGuard / TenantResolverMiddleware) đã có. Bơm tenantId vào CLS để
 * Prisma tenant-extension scope mọi query.
 */
@Injectable()
export class TenantClsInterceptor implements NestInterceptor {
  constructor(private readonly cls: ClsService) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (ctx.getType() !== 'http') return next.handle();

    const req = ctx.switchToHttp().getRequest();
    const tenantId = req?.user?.tenantId ?? req?.__tenantId ?? getDefaultTenantId();
    if (tenantId) this.cls.set(CLS_TENANT_ID, tenantId);

    return next.handle();
  }
}
