import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { isTenantEnforced, getDefaultTenantId } from '../config/tenant.config';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (!isTenantEnforced()) {
      return true;
    }

    const req = context.switchToHttp().getRequest();
    // Ưu tiên tenant đã đăng nhập, rồi tới tenant resolver middleware đã resolve
    // theo subdomain/customDomain — KHÔNG ghi đè bằng default khi đã có giá trị.
    const tenantId = req?.user?.tenantId ?? req?.__tenantId ?? getDefaultTenantId();
    req.__tenantId = tenantId;
    return true;
  }
}
