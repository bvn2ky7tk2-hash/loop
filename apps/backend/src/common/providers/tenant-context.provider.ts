import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { CLS_TENANT_ID } from '../cls/cls-keys';

/**
 * Truy cập tenantId hiện hành qua CLS. KHÔNG còn Scope.REQUEST nên dùng được
 * trong cả HTTP request lẫn cron/BullMQ worker (đã bọc cls.run).
 */
@Injectable()
export class TenantContext {
  constructor(private readonly cls: ClsService) {}

  setTenantId(id: string | undefined) {
    if (id && this.cls.isActive()) this.cls.set(CLS_TENANT_ID, id);
  }

  getCurrentTenantId(): string | undefined {
    return this.cls.isActive() ? this.cls.get<string>(CLS_TENANT_ID) ?? undefined : undefined;
  }
}
