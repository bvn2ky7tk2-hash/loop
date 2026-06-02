import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';
import { CreateAnnouncementDto, UpdateAnnouncementDto } from './dto/announcement.dto';

@Injectable()
export class AnnouncementsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string | null, pagination: PaginationDto) {
    const { page = 1, limit = 50 } = pagination;
    const where = tenantId ? { tenantId } : {};
    const [data, total] = await this.prisma.$transaction([
      this.prisma.systemAnnouncement.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.systemAnnouncement.count({ where }),
    ]);
    return paginate(data, total, page, limit);
  }

  async create(dto: CreateAnnouncementDto, tenantId: string | null, createdById: string) {
    return this.prisma.systemAnnouncement.create({
      data: {
        message: dto.message,
        type: dto.type ?? 'INFO',
        targetRole: dto.targetRole ?? null,
        startAt: new Date(dto.startAt),
        endAt: dto.endAt ? new Date(dto.endAt) : null,
        tenantId: tenantId ?? null,
        createdById,
      },
    });
  }

  async update(id: string, dto: UpdateAnnouncementDto) {
    const existing = await this.prisma.systemAnnouncement.findFirst({ where: { id } });
    if (!existing) throw new NotFoundException('Thông báo không tồn tại');

    return this.prisma.systemAnnouncement.update({
      where: { id },
      data: {
        ...(dto.message !== undefined && { message: dto.message }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.targetRole !== undefined && { targetRole: dto.targetRole }),
        ...(dto.startAt !== undefined && { startAt: new Date(dto.startAt) }),
        ...(dto.endAt !== undefined && { endAt: dto.endAt ? new Date(dto.endAt) : null }),
      },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.systemAnnouncement.findFirst({ where: { id } });
    if (!existing) throw new NotFoundException('Thông báo không tồn tại');
    return this.prisma.systemAnnouncement.delete({ where: { id } });
  }

  // Public endpoint — lấy announcement đang active cho tenant
  async getActive(tenantId: string | null) {
    const now = new Date();
    return this.prisma.systemAnnouncement.findMany({
      where: {
        ...(tenantId ? { tenantId } : {}),
        startAt: { lte: now },
        OR: [{ endAt: null }, { endAt: { gte: now } }],
      },
      orderBy: [{ type: 'desc' }, { createdAt: 'desc' }],
      take: 10,
    });
  }
}
