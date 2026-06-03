import { Injectable, ForbiddenException, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Taxonomy module ĐỒNG BỘ với menu FE (apps/web/src/config/modules.config.tsx).
// Core (workspace, admin) luôn bật, không thể tắt. moduleId khớp ModuleDefinition.id ở FE.
export const MODULE_DEFAULTS = [
  { moduleId: 'workspace',  displayName: 'Workspace',        description: 'Việc của tôi, hộp thư, đơn từ và lịch cá nhân',   isCore: true,  isEnabled: true },
  { moduleId: 'projects',   displayName: 'Dự án',            description: 'Quản lý dự án, công việc, lỗi và tri thức nội bộ', isCore: false, isEnabled: true },
  { moduleId: 'people',     displayName: 'Nhân sự',          description: 'Hồ sơ nhân viên, tổ chức và phát triển nhân lực', isCore: false, isEnabled: true },
  { moduleId: 'attendance', displayName: 'Chấm công & Lương', description: 'Bảng công, nghỉ phép, OT, ca làm và bảng lương',  isCore: false, isEnabled: true },
  { moduleId: 'recruit',    displayName: 'Tuyển dụng',       description: 'Phễu tuyển dụng, ứng viên, phỏng vấn và vị trí',  isCore: false, isEnabled: true },
  { moduleId: 'finance',    displayName: 'Tài chính',        description: 'Chi phí, ngân sách, hóa đơn và kế toán',          isCore: false, isEnabled: true },
  { moduleId: 'crm',        displayName: 'Khách hàng',       description: 'Khách hàng, tiềm năng, cơ hội bán hàng',          isCore: false, isEnabled: true },
  { moduleId: 'asset',      displayName: 'Tài sản',          description: 'Quản lý tài sản, bảo trì và mua sắm',            isCore: false, isEnabled: true },
  { moduleId: 'admin',      displayName: 'Quản trị',         description: 'Hệ thống, quy trình BPM và công cụ quản trị',     isCore: true,  isEnabled: true },
  { moduleId: 'analytics',  displayName: 'Phân tích',        description: 'Trung tâm báo cáo và phân tích toàn doanh nghiệp', isCore: false, isEnabled: true },
] as const;

// Prefix API thuộc từng module nghiệp vụ (toggle được). Dùng cho ModuleEnabledGuard.
// Tắt module = TẤT CẢ chức năng của nó tắt, KỂ CẢ self-service (vd tắt attendance →
// chặn cả /leaves, /overtime, /payroll). Workspace/admin (core) không bao giờ tắt.
// Lưu ý: /timesheets dùng chung giữa projects (timesheet dự án) và attendance
// (chấm công cá nhân) → để NGOÀI map, tránh chặn nhầm; FE ẩn menu theo từng mục.
export const MODULE_API_PREFIXES: Record<string, string[]> = {
  projects:   ['api/v1/projects', 'api/v1/tasks', 'api/v1/bugs', 'api/v1/kb'],
  people:     ['api/v1/employees', 'api/v1/job-titles', 'api/v1/positions', 'api/v1/hr-decisions', 'api/v1/hr-profile', 'api/v1/skills', 'api/v1/hr/performance', 'api/v1/hr/training'],
  attendance: ['api/v1/hr-attendance', 'api/v1/work-shifts', 'api/v1/leave-policies', 'api/v1/hr-holidays', 'api/v1/hr-insurance', 'api/v1/leaves', 'api/v1/overtime', 'api/v1/payroll'],
  recruit:    ['api/v1/recruit'],
  finance:    ['api/v1/expenses', 'api/v1/invoices', 'api/v1/accounting', 'api/v1/finance'],
  crm:        ['api/v1/crm'],
  asset:      ['api/v1/assets', 'api/v1/procurement', 'api/v1/vehicle-booking'],
  analytics:  ['api/v1/analytics', 'api/v1/reports'],
};

@Injectable()
export class ModuleConfigService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  // Cache trạng thái enabled per (tenant, module) cho ModuleEnabledGuard (TTL 30s).
  private enabledCache = new Map<string, { enabled: boolean; exp: number }>();

  async isModuleEnabled(tenantId: string, moduleId: string): Promise<boolean> {
    const key = `${tenantId}:${moduleId}`;
    const c = this.enabledCache.get(key);
    if (c && c.exp > Date.now()) return c.enabled;
    // Raw SQL có tenant_id tường minh (guard chạy trước khi CLS được set).
    const rows = await this.prisma.$queryRaw<{ is_enabled: boolean }[]>`
      SELECT is_enabled FROM module_configs WHERE tenant_id = ${tenantId} AND module_id = ${moduleId} LIMIT 1`;
    const enabled = rows.length === 0 ? true : rows[0].is_enabled; // chưa cấu hình → mặc định bật
    this.enabledCache.set(key, { enabled, exp: Date.now() + 30_000 });
    return enabled;
  }

  /** Xóa cache enabled (gọi sau khi toggle để hiệu lực ngay). */
  clearEnabledCache(): void {
    this.enabledCache.clear();
  }

  async onModuleInit() {
    // Seed defaults silently on startup if not yet seeded
    await this.seedDefaults().catch(() => null);
  }

  async seedDefaults(): Promise<void> {
    for (const mod of MODULE_DEFAULTS) {
      const _e = await this.prisma.moduleConfig.findFirst({ where: { moduleId: mod.moduleId } });
      if (_e) {
        await this.prisma.moduleConfig.update({ where: { id: _e.id }, data: {} });
      } else {
        await this.prisma.moduleConfig.create({ data: mod });
      }
    }
  }

  async listModules() {
    return this.prisma.moduleConfig.findMany({
      orderBy: [
        { updatedAt: 'desc' },
        { isCore: 'desc' },
        { displayName: 'asc' },
      ],
    });
  }

  async toggleModule(moduleId: string, isEnabled: boolean) {
    const mod = await this.prisma.moduleConfig.findFirst({ where: { moduleId } });
    if (!mod) throw new NotFoundException(`Module '${moduleId}' không tồn tại`);

    // Core modules cannot be disabled — protect system integrity
    if (mod.isCore && !isEnabled) {
      throw new ForbiddenException('Module core không thể bị tắt');
    }

    const updated = await this.prisma.moduleConfig.update({
      where: { id: mod.id },
      data: { isEnabled },
    });
    this.clearEnabledCache();
    return updated;
  }

  async getModuleStatus(moduleId: string): Promise<{ isEnabled: boolean }> {
    const mod = await this.prisma.moduleConfig.findFirst({
      where: { moduleId },
      select: { isEnabled: true },
    });
    if (!mod) return { isEnabled: true }; // default to enabled if unknown module
    return { isEnabled: mod.isEnabled };
  }
}
