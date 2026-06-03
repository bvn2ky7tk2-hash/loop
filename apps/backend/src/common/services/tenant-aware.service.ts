import { ForbiddenException } from '@nestjs/common';
import { ClsServiceManager } from 'nestjs-cls';
import { CLS_TENANT_ID } from '../cls/cls-keys';
import { isTenantEnforced } from '../config/tenant.config';

export interface TenantUser {
  id: string;
  tenantId?: string | null;
  role: string;
  orgUnitId?: string | null;
}

/**
 * Base class cho tất cả service có data access theo tenant.
 * Child class truyền `req` vào super(req) từ constructor của mình.
 * KHÔNG dùng @Inject(REQUEST) ở đây để tránh metadata conflict với child classes.
 */
export abstract class TenantAwareService {
  constructor(protected readonly _req?: any) {}

  /**
   * Lấy tenantId hiện hành. FAIL-CLOSED: khi multi-tenant enforcement bật mà
   * không xác định được tenant → THROW (không bao giờ chạy raw query / tenantWhere
   * thiếu lọc tenant → tránh rò chéo tenant). On-prem (không enforce) trả default.
   * Nguồn: req (HTTP) → CLS (worker/cron đã set ở Cụm 2) → default (on-prem).
   */
  protected getTenantId(): string | undefined {
    const fromReq = this._req?.user?.tenantId ?? this._req?.__tenantId;
    if (fromReq) return fromReq;

    const cls = ClsServiceManager.getClsService();
    const fromCls = cls?.isActive() ? cls.get<string>(CLS_TENANT_ID) : undefined;
    if (fromCls) return fromCls;

    if (!isTenantEnforced()) return process.env.DEFAULT_TENANT_ID ?? undefined;
    throw new ForbiddenException('Thiếu tenant context — thao tác bị từ chối (fail-closed)');
  }

  protected tenantWhere<T extends object>(extra?: T): T & { tenantId?: string } {
    const tid = this.getTenantId();
    return tid ? { tenantId: tid, ...(extra ?? {}) } as any : { ...(extra ?? {}) } as any;
  }
}
