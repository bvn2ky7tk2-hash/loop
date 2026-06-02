import { Injectable, ForbiddenException, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const MODULE_DEFAULTS = [
  { moduleId: 'work',    displayName: 'Công việc',   description: 'Task, Bug, Timesheet cá nhân, BPM Inbox', isCore: true,  isEnabled: true },
  { moduleId: 'people',  displayName: 'Nhân sự',     description: 'Quản lý nhân viên, payroll, nghỉ phép',   isCore: false, isEnabled: true },
  { moduleId: 'finance', displayName: 'Tài chính',   description: 'Chi phí, hóa đơn, kế toán, ngân sách',   isCore: false, isEnabled: true },
  { moduleId: 'crm',     displayName: 'Khách hàng',  description: 'Leads, deals, contacts, pipeline',        isCore: false, isEnabled: true },
  { moduleId: 'asset',   displayName: 'Tài sản',     description: 'Hardware, phần mềm, license',             isCore: false, isEnabled: true },
  { moduleId: 'ops',     displayName: 'Vận hành',    description: 'Hợp đồng, mua hàng, vận hành',           isCore: false, isEnabled: true },
  { moduleId: 'me',      displayName: 'Của tôi',     description: 'Dashboard cá nhân, task của tôi',         isCore: true,  isEnabled: true },
  { moduleId: 'admin',   displayName: 'Quản trị',    description: 'Cấu hình hệ thống, phân quyền, audit',   isCore: true,  isEnabled: true },
] as const;

@Injectable()
export class ModuleConfigService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    // Seed defaults silently on startup if not yet seeded
    await this.seedDefaults().catch(() => null);
  }

  async seedDefaults(): Promise<void> {
    for (const mod of MODULE_DEFAULTS) {
      await this.prisma.moduleConfig.upsert({
        where: { moduleId: mod.moduleId },
        update: {},
        create: mod,
      });
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
    const mod = await this.prisma.moduleConfig.findUnique({ where: { moduleId } });
    if (!mod) throw new NotFoundException(`Module '${moduleId}' không tồn tại`);

    // Core modules cannot be disabled — protect system integrity
    if (mod.isCore && !isEnabled) {
      throw new ForbiddenException('Module core không thể bị tắt');
    }

    return this.prisma.moduleConfig.update({
      where: { moduleId },
      data: { isEnabled },
    });
  }

  async getModuleStatus(moduleId: string): Promise<{ isEnabled: boolean }> {
    const mod = await this.prisma.moduleConfig.findUnique({
      where: { moduleId },
      select: { isEnabled: true },
    });
    if (!mod) return { isEnabled: true }; // default to enabled if unknown module
    return { isEnabled: mod.isEnabled };
  }
}
