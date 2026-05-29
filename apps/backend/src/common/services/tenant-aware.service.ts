import { Inject, Optional } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';

export interface TenantUser {
  id: string;
  tenantId?: string | null;
  role: string;
  orgUnitId?: string | null;
}

/**
 * Base class cho tất cả service có data access theo tenant.
 * Extends class này → tự động có getTenantId() và tenantWhere().
 * Không cần @Inject(REQUEST) thủ công trong mỗi service.
 */
export abstract class TenantAwareService {
  constructor(
    @Optional() @Inject(REQUEST) protected readonly _req?: any,
  ) {}

  /**
   * Lấy tenantId từ JWT (qua request context).
   * Fallback về DEFAULT_TENANT_ID khi chạy on-prem.
   */
  protected getTenantId(): string | undefined {
    return (
      this._req?.user?.tenantId ??
      this._req?.__tenantId ??
      process.env.DEFAULT_TENANT_ID ??
      undefined
    );
  }

  /**
   * Trả về where clause có tenantId kèm điều kiện thêm.
   * Nếu tenantId là undefined (on-prem / admin global), trả về chỉ extra.
   */
  protected tenantWhere<T extends object>(extra?: T): T & { tenantId?: string } {
    const tid = this.getTenantId();
    return tid ? { tenantId: tid, ...(extra ?? {}) } as any : { ...(extra ?? {}) } as any;
  }
}
