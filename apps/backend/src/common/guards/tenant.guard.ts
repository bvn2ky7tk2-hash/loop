import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { isTenantEnforced, getDefaultTenantId } from '../config/tenant.config';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (!isTenantEnforced()) {
      return true;
    }

    const req = context.switchToHttp().getRequest();
    const tenantId = req?.user?.tenantId ?? getDefaultTenantId();
    req.__tenantId = tenantId;
    return true;
  }
}
