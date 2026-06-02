import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { isTenantEnforced } from '../config/tenant.config';

const ROOT_DOMAIN = process.env.ROOT_DOMAIN ?? 'loop.vn';

/**
 * Resolve tenant theo SUBDOMAIN (acme.loop.vn) hoặc customDomain (full host),
 * đặt vào req.__tenantId. TenantGuard/TenantClsInterceptor ưu tiên req.user.tenantId
 * (đã đăng nhập) rồi mới đến giá trị này. Cache slug→tenantId 60s.
 */
@Injectable()
export class TenantResolverMiddleware implements NestMiddleware {
  private static cache = new Map<string, { id: string | null; exp: number }>();

  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    if (!isTenantEnforced()) return next();

    const host = ((req.headers['x-forwarded-host'] as string) ?? req.headers.host ?? '').split(',')[0].trim();
    if (!host) return next();

    const id = await this.resolve(host);
    if (id) (req as any).__tenantId = id;
    next();
  }

  private async resolve(host: string): Promise<string | null> {
    const bare = host.split(':')[0].toLowerCase();
    const cached = TenantResolverMiddleware.cache.get(bare);
    if (cached && cached.exp > Date.now()) return cached.id;

    const where: any[] = [{ customDomain: bare }];
    if (bare.endsWith(`.${ROOT_DOMAIN}`)) {
      const sub = bare.slice(0, -(ROOT_DOMAIN.length + 1));
      if (sub && sub !== 'www' && sub !== 'api') where.push({ slug: sub });
    }

    // Tenant ∈ GLOBAL allowlist → query này không bị tenant-extension inject.
    const tenant = await this.prisma.tenant.findFirst({
      where: { isActive: true, OR: where },
      select: { id: true },
    });
    const id = tenant?.id ?? null;
    TenantResolverMiddleware.cache.set(bare, { id, exp: Date.now() + 60_000 });
    return id;
  }
}
