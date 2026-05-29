import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantService {
  constructor(private prisma: PrismaService) {}

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

  async update(id: string, dto: UpdateTenantDto) {
    return this.prisma.tenant.update({ where: { id }, data: dto });
  }
}
