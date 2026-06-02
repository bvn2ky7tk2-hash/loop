import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { paginate, PaginatedResult } from '../common/dto/pagination.dto';
import { randomBytes, createHash } from 'crypto';

const KEY_PREFIX_LENGTH = 8;

@Injectable()
export class ApiKeysService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreateApiKeyDto,
    userId: string,
    tenantId?: string,
  ): Promise<{ key: string; record: object }> {
    // Generate key: lp_ + 32 random hex chars
    const raw    = `lp_${randomBytes(24).toString('hex')}`;
    const prefix = raw.slice(0, KEY_PREFIX_LENGTH + 3); // "lp_XXXXXXXX"
    const hash   = createHash('sha256').update(raw).digest('hex');

    const record = await this.prisma.apiKey.create({
      data: {
        name:        dto.name,
        keyPrefix:   prefix,
        keyHash:     hash,
        scopes:      dto.scopes,
        expiresAt:   dto.expiresAt ? new Date(dto.expiresAt) : null,
        isActive:    true,
        createdById: userId,
        tenantId:    tenantId ?? null,
      },
    });

    return { key: raw, record };
  }

  async list(tenantId?: string, page = 1, limit = 50): Promise<PaginatedResult<object>> {
    const where: any = {};
    if (tenantId) where.tenantId = tenantId;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.apiKey.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id:          true,
          name:        true,
          keyPrefix:   true,
          scopes:      true,
          expiresAt:   true,
          lastUsedAt:  true,
          isActive:    true,
          createdAt:   true,
          createdBy:   { select: { id: true } },
        },
      }),
      this.prisma.apiKey.count({ where }),
    ]);
    return paginate(data, total, page, limit);
  }

  async revoke(id: string, tenantId?: string): Promise<void> {
    const key = await this.prisma.apiKey.findUnique({ where: { id } });
    if (!key) throw new NotFoundException('API Key không tìm thấy');
    if (tenantId && key.tenantId !== tenantId) {
      throw new ForbiddenException('Không có quyền xóa key này');
    }
    await this.prisma.apiKey.update({ where: { id }, data: { isActive: false } });
  }

  async delete(id: string, tenantId?: string): Promise<void> {
    const key = await this.prisma.apiKey.findUnique({ where: { id } });
    if (!key) throw new NotFoundException('API Key không tìm thấy');
    if (tenantId && key.tenantId !== tenantId) {
      throw new ForbiddenException('Không có quyền xóa key này');
    }
    await this.prisma.apiKey.delete({ where: { id } });
  }
}
