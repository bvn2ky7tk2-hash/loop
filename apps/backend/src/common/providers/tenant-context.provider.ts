import { Injectable, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.REQUEST })
export class TenantContext {
  private tenantId?: string;

  setTenantId(id: string | undefined) { this.tenantId = id; }
  getCurrentTenantId(): string | undefined { return this.tenantId; }
}
