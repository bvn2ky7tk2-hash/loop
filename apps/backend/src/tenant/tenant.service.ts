import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../generated/prisma';
import { MODULE_DEFAULTS } from '../module-config/module-config.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { ProvisionTenantDto } from './dto/provision-tenant.dto';

@Injectable()
export class TenantService {
  constructor(private prisma: PrismaService) {}

  /**
   * Provision tenant mới (platform admin): tạo tenant + cấu hình bật/tắt module
   * + cấp admin tenant — TẤT CẢ atomic trong 1 transaction.
   * tenantId tường minh trong data ghi đè CLS injection của tenant-extension.
   */
  async provision(dto: ProvisionTenantDto) {
    const { adminEmail, adminName, adminPassword, enabledModules, ...tenantFields } = dto;

    const existingUser = await this.prisma.user.findUnique({ where: { email: adminEmail } });
    if (existingUser) throw new ConflictException('Email admin đã tồn tại');

    const passwordHash = await bcrypt.hash(adminPassword, 10);

    return this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({ data: tenantFields });

      // Module config: core LUÔN bật; module không-core bật theo enabledModules
      // (bỏ trống = bật tất cả). Truyền tenantId tường minh cho tenant mới.
      const modules = MODULE_DEFAULTS.map((m) => ({
        tenantId: tenant.id,
        moduleId: m.moduleId,
        displayName: m.displayName,
        description: m.description,
        isCore: m.isCore,
        isEnabled: m.isCore ? true : enabledModules ? enabledModules.includes(m.moduleId) : m.isEnabled,
      }));
      await tx.moduleConfig.createMany({ data: modules });

      const admin = await tx.user.create({
        data: {
          email: adminEmail,
          name: adminName,
          passwordHash,
          role: Role.ADMIN,
          tenantId: tenant.id,
        },
      });

      return {
        tenant,
        admin: { id: admin.id, email: admin.email, name: admin.name },
        modules: modules.map((m) => ({ moduleId: m.moduleId, isEnabled: m.isEnabled })),
      };
    });
  }

  // Hệ thống không có super-admin: ADMIN chỉ thao tác trên CHÍNH tenant của mình.
  private assertSameTenant(id: string, currentTenantId: string | null) {
    if (!currentTenantId || id !== currentTenantId) {
      throw new ForbiddenException('Không có quyền trên tenant khác');
    }
  }

  // ADMIN tenant chỉ thấy tenant hiện hành (không liệt kê mọi tenant).
  async findAll(currentTenantId: string | null) {
    if (!currentTenantId) throw new ForbiddenException('Không có quyền trên tenant khác');
    const t = await this.prisma.tenant.findUnique({ where: { id: currentTenantId } });
    return t ? [t] : [];
  }

  async findOne(id: string, currentTenantId: string | null) {
    this.assertSameTenant(id, currentTenantId);
    const t = await this.prisma.tenant.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Tenant không tồn tại');
    return t;
  }

  async create(dto: CreateTenantDto) {
    return this.prisma.tenant.create({ data: dto });
  }

  async deactivate(id: string, currentTenantId: string | null) {
    this.assertSameTenant(id, currentTenantId);
    const t = await this.prisma.tenant.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Tenant không tồn tại');
    return this.prisma.tenant.update({ where: { id }, data: { isActive: false } });
  }

  async getDefault() {
    let tenant = await this.prisma.tenant.findFirst({ where: { isDefault: true } });
    if (!tenant) tenant = await this.prisma.tenant.findFirst({ orderBy: { createdAt: 'asc' } });
    if (!tenant) throw new NotFoundException('Chưa có tenant nào được cấu hình');
    return tenant;
  }

  async getBySlug(slug: string) {
    const t = await this.prisma.tenant.findUnique({ where: { slug } });
    if (!t) throw new NotFoundException(`Tenant "${slug}" không tồn tại`);
    return t;
  }

  async update(id: string, dto: UpdateTenantDto, currentTenantId: string | null) {
    this.assertSameTenant(id, currentTenantId);
    const t = await this.prisma.tenant.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Tenant không tồn tại');
    return this.prisma.tenant.update({ where: { id }, data: dto });
  }
}
