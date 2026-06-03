import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Rate-limit THEO TENANT (không chỉ theo IP) — chống noisy-neighbor: một tenant
 * (hoặc nhiều tenant sau cùng IP NAT) không nuốt hết hạn mức của tenant khác.
 * Tracker = "<tenantId>:<ip>" khi có tenant; fallback IP cho request vô danh.
 */
@Injectable()
export class TenantThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const tenantId = req.user?.tenantId ?? req.__tenantId;
    const ip = req.ips?.length ? req.ips[0] : req.ip;
    return tenantId ? `${tenantId}:${ip}` : `${ip}`;
  }
}
