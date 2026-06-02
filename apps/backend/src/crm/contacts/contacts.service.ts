import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate, PaginatedResult } from '../../common/dto/pagination.dto';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { TenantAwareService } from '../../common/services/tenant-aware.service';

@Injectable({ scope: Scope.REQUEST })
export class ContactsService extends TenantAwareService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REQUEST) req: any,
  ) {
    super(req);
  }

  async findAll(
    customerId?: string,
    page = 1,
    limit = 50,
  ): Promise<PaginatedResult<any>> {
    const where = this.tenantWhere(customerId ? { customerId } : {});
    const skip = (page - 1) * limit;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.contact.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: { id: true, name: true, code: true },
          },
        },
      }),
      this.prisma.contact.count({ where }),
    ]);
    return paginate(data, total, page, limit);
  }

  async findOne(id: string) {
    const contact = await this.prisma.contact.findUnique({
      where: { id },
      include: {
        customer: {
          select: { id: true, name: true, code: true },
        },
      },
    });
    if (!contact) {
      throw new NotFoundException(`Không tìm thấy liên hệ #${id}`);
    }
    return contact;
  }

  async create(dto: CreateContactDto) {
    return this.prisma.contact.create({ data: { ...dto, tenantId: this.getTenantId() ?? null } });
  }

  async update(id: string, dto: UpdateContactDto) {
    await this.findOne(id);
    return this.prisma.contact.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.contact.delete({ where: { id } });
  }
}
