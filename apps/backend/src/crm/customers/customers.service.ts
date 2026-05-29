import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate, PaginatedResult } from '../../common/dto/pagination.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REQUEST) private readonly request: any,
  ) {}

  private getTenantId(): string | undefined {
    return this.request?.user?.tenantId ?? this.request?.__tenantId ?? process.env.DEFAULT_TENANT_ID;
  }

  async findAll(page = 1, limit = 50): Promise<PaginatedResult<any>> {
    const tenantId = this.getTenantId();
    const where: any = {
      deletedAt: null,
      ...(tenantId ? { tenantId } : {}),
    };
    const skip = (page - 1) * limit;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { contacts: true, deals: true },
          },
        },
      }),
      this.prisma.customer.count({ where }),
    ]);
    return paginate(data, total, page, limit);
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        contacts: true,
        deals: {
          select: { id: true, title: true, stage: true },
        },
      },
    });
    if (!customer) {
      throw new NotFoundException(`Không tìm thấy khách hàng #${id}`);
    }
    return customer;
  }

  async create(dto: CreateCustomerDto) {
    try {
      return await this.prisma.customer.create({
        data: { ...dto, tenantId: this.getTenantId() },
      });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new ConflictException(
          `Mã khách hàng "${dto.code}" đã tồn tại`,
        );
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateCustomerDto) {
    await this.findOne(id);
    return this.prisma.customer.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.customer.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async restore(id: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) throw new NotFoundException(`Không tìm thấy khách hàng #${id}`);
    return this.prisma.customer.update({ where: { id }, data: { deletedAt: null } });
  }

  // ── L-02: Customer Revenue & Projects ─────────────────────────────────────

  async getRevenue(customerId: string) {
    await this.findOne(customerId); // 404 nếu không tồn tại
    const invoices = await this.prisma.invoice.findMany({
      where: { customerId, type: 'SALES', deletedAt: null },
      select: { id: true, totalAmount: true, status: true, createdAt: true, code: true, dueDate: true },
      take: 200,
      orderBy: { createdAt: 'desc' },
    });
    const totalRevenue = invoices
      .filter((i) => i.status === 'PAID')
      .reduce((s, i) => s + Number(i.totalAmount ?? 0), 0);
    return { invoices, totalRevenue, invoiceCount: invoices.length };
  }

  async getProjects(customerId: string) {
    await this.findOne(customerId);
    return this.prisma.project.findMany({
      where: { customerId, deletedAt: null },
      select: { id: true, name: true, code: true, status: true, startDate: true, endDate: true },
      take: 50,
      orderBy: { startDate: 'desc' },
    });
  }
}
