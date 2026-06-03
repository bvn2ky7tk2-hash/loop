import { Injectable, ForbiddenException } from '@nestjs/common';
import { ClsServiceManager } from 'nestjs-cls';
import { PrismaService } from '../../prisma/prisma.service';
import { CLS_TENANT_ID } from '../cls/cls-keys';

/**
 * Quota per-tenant — CHẶN CỨNG khi vượt giới hạn (platform admin đặt trên Tenant).
 * null = không giới hạn. Đếm bằng Prisma model API (đã scoped tenant qua extension);
 * truyền tenantId tường minh cho count để chắc chắn đúng tenant đang xét.
 */
@Injectable()
export class QuotaService {
  constructor(private readonly prisma: PrismaService) {}

  private resolveTenantId(tenantId?: string): string | undefined {
    if (tenantId) return tenantId;
    const cls = ClsServiceManager.getClsService();
    return cls?.isActive() ? cls.get<string>(CLS_TENANT_ID) : undefined;
  }

  private async getLimits(tenantId: string) {
    return this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { maxUsers: true, maxStorageMb: true, maxProjects: true, maxEmployees: true, storageUsedBytes: true },
    });
  }

  private deny(resource: string, limit: number): never {
    throw new ForbiddenException(
      `Đã đạt giới hạn gói (${resource}: tối đa ${limit}). Vui lòng nâng cấp gói dịch vụ.`,
    );
  }

  async assertCanAddUser(tenantId?: string): Promise<void> {
    const tid = this.resolveTenantId(tenantId);
    if (!tid) return;
    const t = await this.getLimits(tid);
    if (t?.maxUsers == null) return;
    const count = await this.prisma.user.count({ where: { tenantId: tid } });
    if (count >= t.maxUsers) this.deny('số người dùng', t.maxUsers);
  }

  async assertCanAddProject(tenantId?: string): Promise<void> {
    const tid = this.resolveTenantId(tenantId);
    if (!tid) return;
    const t = await this.getLimits(tid);
    if (t?.maxProjects == null) return;
    const count = await this.prisma.project.count({ where: { tenantId: tid } });
    if (count >= t.maxProjects) this.deny('số dự án', t.maxProjects);
  }

  async assertCanAddEmployee(tenantId?: string): Promise<void> {
    const tid = this.resolveTenantId(tenantId);
    if (!tid) return;
    const t = await this.getLimits(tid);
    if (t?.maxEmployees == null) return;
    const count = await this.prisma.employee.count({ where: { tenantId: tid } });
    if (count >= t.maxEmployees) this.deny('số nhân viên', t.maxEmployees);
  }

  /** Kiểm trước khi upload (dùng bộ đếm storageUsedBytes + size sắp thêm). */
  async assertCanUpload(bytes: number, tenantId?: string): Promise<void> {
    const tid = this.resolveTenantId(tenantId);
    if (!tid) return;
    const t = await this.getLimits(tid);
    if (t?.maxStorageMb == null) return;
    const used = Number(t.storageUsedBytes ?? 0);
    const limitBytes = t.maxStorageMb * 1024 * 1024;
    if (used + bytes > limitBytes) this.deny('dung lượng (MB)', t.maxStorageMb);
  }

  /** Cộng dồn dung lượng đã dùng sau khi upload thành công (atomic). */
  async addStorage(bytes: number, tenantId?: string): Promise<void> {
    const tid = this.resolveTenantId(tenantId);
    if (!tid || !bytes) return;
    await this.prisma.tenant
      .update({ where: { id: tid }, data: { storageUsedBytes: { increment: bytes } } })
      .catch(() => {});
  }
}
