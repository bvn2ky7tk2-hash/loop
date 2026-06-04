import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../generated/prisma';
import { MODULE_DEFAULTS } from '../module-config/module-config.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { ProvisionTenantDto } from './dto/provision-tenant.dto';
import { StorageService } from '../storage/storage.service';
import type { JwtUser } from '../common/types/jwt-user.type';

@Injectable()
export class TenantService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  // logoUrl lưu dạng storagePath (object key); khi trả cho client thì presign để hiển thị.
  private async withPresignedLogo<T extends { logoUrl?: string | null }>(t: T): Promise<T> {
    if (t.logoUrl && !/^https?:\/\//.test(t.logoUrl)) {
      try {
        return { ...t, logoUrl: await this.storage.presignedUrl(t.logoUrl) };
      } catch {
        return t; // không chặn load branding nếu presign lỗi
      }
    }
    return t;
  }

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

  // Platform admin thao tác mọi tenant; ADMIN thường chỉ thao tác trên CHÍNH tenant của mình.
  private assertCanAccess(id: string, user: JwtUser | null) {
    if (user?.isPlatformAdmin) return;
    if (!user?.tenantId || id !== user.tenantId) {
      throw new ForbiddenException('Không có quyền trên tenant khác');
    }
  }

  // Platform admin thấy mọi tenant; ADMIN thường chỉ thấy tenant hiện hành.
  async findAll(user: JwtUser | null) {
    if (user?.isPlatformAdmin) {
      return this.prisma.tenant.findMany({ orderBy: { createdAt: 'asc' } });
    }
    if (!user?.tenantId) throw new ForbiddenException('Không có quyền trên tenant khác');
    const t = await this.prisma.tenant.findUnique({ where: { id: user.tenantId } });
    return t ? [t] : [];
  }

  async findOne(id: string, user: JwtUser | null) {
    this.assertCanAccess(id, user);
    const t = await this.prisma.tenant.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Tenant không tồn tại');
    return t;
  }

  // Mức sử dụng hiện tại so với quota của tenant. Raw SQL có tenant_id tường minh
  // (bỏ qua tenant-extension) để platform admin xem được usage của tenant KHÁC.
  async getUsage(id: string, user: JwtUser | null) {
    this.assertCanAccess(id, user);
    const t = await this.prisma.tenant.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Tenant không tồn tại');

    const [u, p, e] = await Promise.all([
      this.prisma.$queryRaw<{ c: number }[]>`SELECT count(*)::int AS c FROM users WHERE tenant_id = ${id}`,
      this.prisma.$queryRaw<{ c: number }[]>`SELECT count(*)::int AS c FROM projects WHERE tenant_id = ${id}`,
      this.prisma.$queryRaw<{ c: number }[]>`SELECT count(*)::int AS c FROM employees WHERE tenant_id = ${id}`,
    ]);

    return {
      users: { used: u[0]?.c ?? 0, max: t.maxUsers ?? null },
      projects: { used: p[0]?.c ?? 0, max: t.maxProjects ?? null },
      employees: { used: e[0]?.c ?? 0, max: t.maxEmployees ?? null },
      storage: { usedBytes: Number(t.storageUsedBytes ?? 0), maxMb: t.maxStorageMb ?? null },
    };
  }

  // Danh sách module + trạng thái của MỘT tenant cụ thể. Raw SQL có tenant_id
  // tường minh để platform admin cấu hình tenant KHÁC (bỏ qua tenant-extension).
  async getModules(id: string, user: JwtUser | null) {
    this.assertCanAccess(id, user);
    const t = await this.prisma.tenant.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Tenant không tồn tại');

    // Đảm bảo đủ hàng cho mọi module mặc định (tenant cũ thiếu module mới vẫn đủ).
    for (const m of MODULE_DEFAULTS) {
      await this.prisma.$executeRaw`
        INSERT INTO module_configs (id, tenant_id, module_id, is_enabled, display_name, description, is_core, updated_at)
        VALUES (${randomUUID()}, ${id}, ${m.moduleId}, ${m.isEnabled}, ${m.displayName}, ${m.description}, ${m.isCore}, now())
        ON CONFLICT (tenant_id, module_id) DO NOTHING`;
    }

    return this.prisma.$queryRaw<
      Array<{ moduleId: string; isEnabled: boolean; displayName: string; description: string | null; isCore: boolean }>
    >`
      SELECT module_id AS "moduleId", is_enabled AS "isEnabled", display_name AS "displayName",
             description, is_core AS "isCore"
      FROM module_configs WHERE tenant_id = ${id}
      ORDER BY is_core DESC, display_name ASC`;
  }

  // Bật/tắt một module cho MỘT tenant cụ thể. Module core không được tắt.
  async setModule(id: string, moduleId: string, isEnabled: boolean, user: JwtUser | null) {
    this.assertCanAccess(id, user);
    const def = MODULE_DEFAULTS.find((m) => m.moduleId === moduleId);
    if (!def) throw new NotFoundException(`Module '${moduleId}' không tồn tại`);
    if (def.isCore && !isEnabled) throw new ForbiddenException('Module core không thể bị tắt');
    const t = await this.prisma.tenant.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Tenant không tồn tại');

    await this.prisma.$executeRaw`
      INSERT INTO module_configs (id, tenant_id, module_id, is_enabled, display_name, description, is_core, updated_at)
      VALUES (${randomUUID()}, ${id}, ${moduleId}, ${isEnabled}, ${def.displayName}, ${def.description}, ${def.isCore}, now())
      ON CONFLICT (tenant_id, module_id) DO UPDATE SET is_enabled = ${isEnabled}, updated_at = now()`;

    return { moduleId, isEnabled };
  }

  async create(dto: CreateTenantDto) {
    return this.prisma.tenant.create({ data: dto });
  }

  async deactivate(id: string, user: JwtUser | null) {
    this.assertCanAccess(id, user);
    const t = await this.prisma.tenant.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Tenant không tồn tại');
    return this.prisma.tenant.update({ where: { id }, data: { isActive: false } });
  }

  async getDefault() {
    // orderBy để xác định khi (lỗi dữ liệu) có >1 tenant isDefault=true → tránh trả khác nhau giữa các request.
    let tenant = await this.prisma.tenant.findFirst({ where: { isDefault: true }, orderBy: { createdAt: 'asc' } });
    if (!tenant) tenant = await this.prisma.tenant.findFirst({ orderBy: { createdAt: 'asc' } });
    if (!tenant) throw new NotFoundException('Chưa có tenant nào được cấu hình');
    return this.withPresignedLogo(tenant);
  }

  async getBySlug(slug: string) {
    const t = await this.prisma.tenant.findUnique({ where: { slug } });
    if (!t) throw new NotFoundException(`Tenant "${slug}" không tồn tại`);
    return this.withPresignedLogo(t);
  }

  async update(id: string, dto: UpdateTenantDto, user: JwtUser | null) {
    this.assertCanAccess(id, user);
    const t = await this.prisma.tenant.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Tenant không tồn tại');
    const updated = await this.prisma.tenant.update({ where: { id }, data: dto });
    return this.withPresignedLogo(updated);
  }

  // Upload logo công ty → lưu storagePath vào logoUrl, trả URL hiển thị (presigned).
  async uploadLogo(file: { buffer: Buffer; mimetype: string; size: number; originalname: string }, user: JwtUser | null) {
    const tenant = await this.getDefault();
    this.assertCanAccess(tenant.id, user);
    const { storagePath } = await this.storage.upload({
      folder: 'branding',
      filename: file.originalname || 'logo.png',
      buffer: file.buffer,
      size: file.size,
      mimeType: file.mimetype,
      tenantId: tenant.id,
    });
    await this.prisma.tenant.update({ where: { id: tenant.id }, data: { logoUrl: storagePath } });
    return { logoUrl: await this.storage.presignedUrl(storagePath) };
  }
}
