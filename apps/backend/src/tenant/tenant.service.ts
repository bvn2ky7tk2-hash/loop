import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { CreateTenantDto } from './dto/create-tenant.dto';

@Injectable()
export class TenantService {
  constructor(private prisma: PrismaService) {}

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
