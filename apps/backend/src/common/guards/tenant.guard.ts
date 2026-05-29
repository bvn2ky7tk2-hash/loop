import { CanActivate, ExecutionContext, Injectable, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { isTenantEnforced, getDefaultTenantId } from '../config/tenant.config';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(@Inject(REQUEST) private readonly request: any) {}

  canActivate(_context: ExecutionContext): boolean {
    const user = this.request?.user;

    if (!isTenantEnforced()) {
      // Single-tenant / on-prem: dùng DEFAULT_TENANT_ID, không chặn
      return true;
    }

    const tenantId = user?.tenantId ?? getDefaultTenantId();
    // Gắn tenantId lên request để các service có thể lấy qua @Inject(REQUEST)
    this.request.__tenantId = tenantId;
    return true;
  }
}
