import {
  Injectable, NotFoundException, UnprocessableEntityException, Logger, Inject,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/dto/pagination.dto';
import { InvoiceStatus } from '../generated/prisma';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { FilterInvoiceDto } from './dto/filter-invoice.dto';
import { FinanceEventBus } from '../accounting/finance-event-bus.service';

// Transitions hợp lệ
const VALID_TRANSITIONS: Partial<Record<InvoiceStatus, InvoiceStatus[]>> = {
  DRAFT:  ['SENT', 'CANCELLED'],
  SENT:   ['PAID', 'CANCELLED', 'OVERDUE'],
  OVERDUE:['PAID', 'CANCELLED'],
};

// INV-YYYYMM-NNNN
async function generateCode(prisma: PrismaService): Promise<string> {
  const now   = new Date();
  const ym    = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prefix = `INV-${ym}-`;
  const last  = await prisma.invoice.findFirst({
    where: { code: { startsWith: prefix } },
    orderBy: { code: 'desc' },
    select: { code: true },
  });
  const seq = last ? parseInt(last.code.split('-')[2], 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

function calcTotals(items: { quantity: number; unitPrice: number; taxRate?: number }[]) {
  let subtotal  = 0;
  let taxAmount = 0;
  for (const item of items) {
    const amount = item.quantity * item.unitPrice;
    subtotal  += amount;
    taxAmount += amount * ((item.taxRate ?? 0) / 100);
  }
  return { subtotal, taxAmount, totalAmount: subtotal + taxAmount };
}

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly financeEventBus: FinanceEventBus,
    @Inject(REQUEST) private readonly request: any,
  ) {}

  private getTenantId(): string | undefined {
    return this.request?.user?.tenantId ?? this.request?.__tenantId ?? process.env.DEFAULT_TENANT_ID;
  }

  async create(dto: CreateInvoiceDto, userId: string) {
    const code   = await generateCode(this.prisma);
    const totals = calcTotals(dto.items);

    return this.prisma.invoice.create({
      data: {
        code,
        type:        dto.type,
        customerId:  dto.customerId,
        projectId:   dto.projectId,
        issueDate:   new Date(dto.issueDate),
        dueDate:     new Date(dto.dueDate),
        currency:    dto.currency ?? 'VND',
        notes:       dto.notes,
        subtotal:    totals.subtotal,
        taxAmount:   totals.taxAmount,
        totalAmount: totals.totalAmount,
        createdById: userId,
        tenantId:    this.getTenantId(),
        items: {
          create: dto.items.map(item => ({
            description: item.description,
            quantity:    item.quantity,
            unitPrice:   item.unitPrice,
            amount:      item.quantity * item.unitPrice,
            taxRate:     item.taxRate ?? 0,
          })),
        },
      },
      include: { items: true, customer: { select: { id: true, name: true } } },
    });
  }

  async findAll(dto: FilterInvoiceDto) {
    const page  = dto.page  ?? 1;
    const limit = dto.limit ?? 50;
    const skip  = (page - 1) * limit;

    const tenantId = this.getTenantId();
    const where: Record<string, unknown> = { deletedAt: null };
    if (tenantId)       where.tenantId   = tenantId;
    if (dto.type)       where.type       = dto.type;
    if (dto.status)     where.status     = dto.status;
    if (dto.customerId) where.customerId = dto.customerId;
    if (dto.projectId)  where.projectId  = dto.projectId;
    if (dto.dateFrom || dto.dateTo) {
      where.issueDate = {
        ...(dto.dateFrom ? { gte: new Date(dto.dateFrom) } : {}),
        ...(dto.dateTo   ? { lte: new Date(dto.dateTo)   } : {}),
      };
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.invoice.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items:    true,
          customer: { select: { id: true, name: true } },
        },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findOne(id: string) {
    // Dùng findFirst để lọc cả deletedAt — không trả về hóa đơn đã xóa mềm
    const inv = await this.prisma.invoice.findFirst({
      where: { id, deletedAt: null },
      include: {
        items:    true,
        customer: { select: { id: true, name: true } },
      },
    });
    if (!inv) throw new NotFoundException('Không tìm thấy hóa đơn');
    return inv;
  }

  async update(id: string, dto: UpdateInvoiceDto) {
    const inv = await this.findOne(id);
    if (inv.status !== 'DRAFT') {
      throw new UnprocessableEntityException('Không thể sửa hóa đơn đã gửi');
    }

    const items  = dto.items ?? inv.items.map(i => ({
      description: i.description,
      quantity:    Number(i.quantity),
      unitPrice:   Number(i.unitPrice),
      taxRate:     Number(i.taxRate),
    }));
    const totals = calcTotals(items);

    return this.prisma.$transaction(async (tx) => {
      if (dto.items) {
        await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
        await tx.invoiceItem.createMany({
          data: dto.items.map(item => ({
            invoiceId:   id,
            description: item.description,
            quantity:    item.quantity,
            unitPrice:   item.unitPrice,
            amount:      item.quantity * item.unitPrice,
            taxRate:     item.taxRate ?? 0,
          })),
        });
      }
      return tx.invoice.update({
        where: { id },
        data: {
          customerId:  dto.customerId,
          projectId:   dto.projectId,
          issueDate:   dto.issueDate ? new Date(dto.issueDate) : undefined,
          dueDate:     dto.dueDate   ? new Date(dto.dueDate)   : undefined,
          currency:    dto.currency,
          notes:       dto.notes,
          subtotal:    totals.subtotal,
          taxAmount:   totals.taxAmount,
          totalAmount: totals.totalAmount,
        },
        include: { items: true, customer: { select: { id: true, name: true } } },
      });
    });
  }

  async changeStatus(id: string, toStatus: InvoiceStatus) {
    const inv = await this.findOne(id);
    const allowed = VALID_TRANSITIONS[inv.status as InvoiceStatus] ?? [];
    if (!allowed.includes(toStatus)) {
      throw new UnprocessableEntityException(
        `Không thể chuyển từ ${inv.status} sang ${toStatus}`,
      );
    }
    const updated = await this.prisma.invoice.update({
      where: { id },
      data: {
        status: toStatus,
        ...(toStatus === 'PAID' ? { paidAt: new Date() } : {}),
      },
      include: { items: true, customer: { select: { id: true, name: true } } },
    });

    if (toStatus === 'PAID') {
      this.financeEventBus.emit({
        type: 'invoice.paid',
        refId: id,
        amount: Number(updated.totalAmount),
        currency: updated.currency,
        userId: updated.createdById,
      });
    }
    return updated;
  }

  async remove(id: string) {
    const inv = await this.findOne(id);
    if (!['DRAFT', 'CANCELLED'].includes(inv.status)) {
      throw new UnprocessableEntityException('Chỉ có thể xoá hóa đơn DRAFT hoặc CANCELLED');
    }
    return this.prisma.invoice.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async restore(id: string) {
    // restore cần tìm cả record đã bị xóa mềm nên không lọc deletedAt
    const inv = await this.prisma.invoice.findUnique({ where: { id } });
    if (!inv) throw new NotFoundException('Không tìm thấy hóa đơn');
    return this.prisma.invoice.update({ where: { id }, data: { deletedAt: null } });
  }

  async getSummary() {
    const now   = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);

    // Thêm deletedAt: null để loại hóa đơn đã xóa mềm khỏi thống kê
    const [draft, sent, overdue, paidThisMonth] = await Promise.all([
      this.prisma.invoice.aggregate({ where: { status: 'DRAFT',   deletedAt: null }, _count: true, _sum: { totalAmount: true } }),
      this.prisma.invoice.aggregate({ where: { status: 'SENT',    deletedAt: null }, _count: true, _sum: { totalAmount: true } }),
      this.prisma.invoice.aggregate({ where: { status: 'OVERDUE', deletedAt: null }, _count: true, _sum: { totalAmount: true } }),
      this.prisma.invoice.aggregate({
        where: { status: 'PAID', paidAt: { gte: start }, deletedAt: null },
        _count: true, _sum: { totalAmount: true },
      }),
    ]);

    return {
      draft:         { count: draft._count,         total: Number(draft._sum.totalAmount         ?? 0) },
      sent:          { count: sent._count,           total: Number(sent._sum.totalAmount           ?? 0) },
      overdue:       { count: overdue._count,        total: Number(overdue._sum.totalAmount        ?? 0) },
      paidThisMonth: { count: paidThisMonth._count,  total: Number(paidThisMonth._sum.totalAmount  ?? 0) },
    };
  }

  // Cron hàng ngày 8:00 — đánh dấu quá hạn (bỏ qua hóa đơn đã xóa mềm)
  @Cron('0 8 * * *')
  async markOverdueInvoices() {
    const result = await this.prisma.invoice.updateMany({
      where: { status: 'SENT', dueDate: { lt: new Date() }, deletedAt: null },
      data:  { status: 'OVERDUE' },
    });
    if (result.count > 0) {
      this.logger.log(`Marked ${result.count} invoice(s) as OVERDUE`);
    }
  }

  // ── L-04: Danh sách hóa đơn quá hạn ─────────────────────────────────────

  async getOverdue() {
    return this.prisma.invoice.findMany({
      where: {
        status: { not: 'PAID' as any },
        dueDate: { lt: new Date() },
        deletedAt: null,
      },
      include: { customer: { select: { id: true, name: true } } },
      take: 100,
      orderBy: { dueDate: 'asc' },
    });
  }
}
