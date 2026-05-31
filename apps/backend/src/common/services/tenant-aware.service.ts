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

  protected getTenantId(): string | undefined {
    return (
      this._req?.user?.tenantId ??
      this._req?.__tenantId ??
      process.env.DEFAULT_TENANT_ID ??
      undefined
    );
  }

  protected tenantWhere<T extends object>(extra?: T): T & { tenantId?: string } {
    const tid = this.getTenantId();
    return tid ? { tenantId: tid, ...(extra ?? {}) } as any : { ...(extra ?? {}) } as any;
  }
}
