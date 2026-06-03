import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ModuleConfigService, MODULE_API_PREFIXES } from '../../module-config/module-config.service';

/**
 * Chặn request tới API của module ĐÃ BỊ TẮT cho tenant hiện tại.
 * Chạy SAU TenantGuard (đã set req.__tenantId) — KHÔNG dựa vào CLS (interceptor set sau guards).
 * Fail-open: path không thuộc module toggle nào, hoặc thiếu tenant context → cho qua.
 */
@Injectable()
export class ModuleEnabledGuard implements CanActivate {
  constructor(private readonly moduleConfig: ModuleConfigService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (ctx.getType() !== 'http') return true;
    const req = ctx.switchToHttp().getRequest();
    const path: string = (req.originalUrl ?? req.url ?? '').split('?')[0].replace(/^\/+/, '');

    let owner: string | null = null;
    for (const [moduleId, prefixes] of Object.entries(MODULE_API_PREFIXES)) {
      if (prefixes.some((p) => path === p || path.startsWith(`${p}/`))) {
        owner = moduleId;
        break;
      }
    }
    if (!owner) return true; // không thuộc module nghiệp vụ toggle được

    const tenantId: string | undefined = req?.user?.tenantId ?? req?.__tenantId;
    if (!tenantId) return true; // chưa xác định tenant → để tầng khác xử lý

    const enabled = await this.moduleConfig.isModuleEnabled(tenantId, owner);
    if (!enabled) {
      throw new ForbiddenException(`Phân hệ '${owner}' đã bị tắt cho tổ chức này`);
    }
    return true;
  }
}
