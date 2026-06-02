import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BudgetService } from '../budget/budget.service';
import { ProcessStarterService } from '../processes/process-starter.service';
import { FinanceEventBus } from '../accounting/finance-event-bus.service';
import { PaginationDto, paginate } from '../common/dto/pagination.dto';
import { CreateVendorDto, UpdateVendorDto } from './dto/vendor.dto';
import { CreatePoDto, UpdatePoStatusDto, ReceiveItemDto } from './dto/purchase-order.dto';

@Injectable()
export class ProcurementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly budgetService: BudgetService,
    private readonly processStarter: ProcessStarterService,
    private readonly financeEventBus: FinanceEventBus,
  ) {}

  // ─── Vendors ───────────────────────────────────────────────────────────────

  async listVendors(query: PaginationDto & { status?: string; category?: string; search?: string }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 50;
    const { status, category, search } = query;
    const where: any = {};
    if (status)   where.status = status;
    if (category) where.category = category;
    if (search)   where.OR = [
      { name:    { contains: search, mode: 'insensitive' } },
      { code:    { contains: search, mode: 'insensitive' } },
      { email:   { contains: search, mode: 'insensitive' } },
    ];

    const [data, total] = await this.prisma.$transaction([
      this.prisma.vendor.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { purchaseOrders: true } } },
      }),
      this.prisma.vendor.count({ where }),
    ]);
    return paginate(data, total, page, limit);
  }

  async getVendor(id: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id },
      include: {
        purchaseOrders: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { requester: { select: { id: true, name: true } } },
        },
      },
    });
    if (!vendor) throw new NotFoundException('Nhà cung cấp không tồn tại');
    return vendor;
  }

  async createVendor(dto: CreateVendorDto) {
    const exists = await this.prisma.vendor.findFirst({ where: { code: dto.code } });
    if (exists) throw new BadRequestException('Mã nhà cung cấp đã tồn tại');
    return this.prisma.vendor.create({ data: dto as any });
  }

  async updateVendor(id: string, dto: UpdateVendorDto) {
    await this.getVendor(id);
    return this.prisma.vendor.update({ where: { id }, data: dto as any });
  }

  async deleteVendor(id: string) {
    await this.getVendor(id);
    const hasPos = await this.prisma.purchaseOrder.count({ where: { vendorId: id } });
    if (hasPos > 0) throw new BadRequestException('Nhà cung cấp đã có đơn mua hàng, không thể xóa');
    return this.prisma.vendor.delete({ where: { id } });
  }

  // ─── Purchase Orders ────────────────────────────────────────────────────────

  async listPos(query: PaginationDto & { status?: string; vendorId?: string; search?: string }) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 50);
    const { status, vendorId, search } = query;
    const where: any = {};
    if (status)   where.status = status;
    if (vendorId) where.vendorId = vendorId;
    if (search)   where.poNumber = { contains: search, mode: 'insensitive' };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.purchaseOrder.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          vendor:    { select: { id: true, name: true, code: true } },
          requester: { select: { id: true, name: true } },
          approver:  { select: { id: true, name: true } },
          _count:    { select: { items: true } },
        },
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);
    return paginate(data, total, page, limit);
  }

  async getPo(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        vendor:    { select: { id: true, name: true, code: true, email: true, phone: true, bankAccount: true, bankName: true } },
        requester: { select: { id: true, name: true } },
        approver:  { select: { id: true, name: true } },
        items:     true,
      },
    });
    if (!po) throw new NotFoundException('Đơn mua hàng không tồn tại');
    return po;
  }

  async createPo(dto: CreatePoDto, requesterId: string) {
    const vendor = await this.prisma.vendor.findUnique({ where: { id: dto.vendorId } });
    if (!vendor) throw new NotFoundException('Nhà cung cấp không tồn tại');

    const poNumber = await this.generatePoNumber();
    const items = dto.items.map(i => ({
      description: i.description,
      unit:        i.unit,
      quantity:    i.quantity,
      unitPrice:   i.unitPrice,
      totalPrice:  i.quantity * i.unitPrice,
    }));
    const totalAmount = items.reduce((sum, i) => sum + i.totalPrice, 0);

    // Kiểm tra ngân sách dựa trên orgUnit của người tạo PO
    const requester = await this.prisma.user.findUnique({
      where: { id: requesterId },
      select: { orgUnitId: true },
    });
    if (requester?.orgUnitId) {
      const fiscalYear = new Date().getFullYear();
      const budgetResult = await this.budgetService.checkBudget(
        requester.orgUnitId,
        'OPERATION',
        fiscalYear,
        totalAmount,
      );
      if (!budgetResult.allowed) {
        throw new ForbiddenException(
          `Ngân sách không đủ: còn lại ${budgetResult.remaining.toLocaleString('vi-VN')} ₫, cần ${totalAmount.toLocaleString('vi-VN')} ₫`,
        );
      }
    }

    const po = await this.prisma.purchaseOrder.create({
      data: {
        poNumber,
        vendorId:    dto.vendorId,
        requesterId,
        currency:    dto.currency ?? 'VND',
        totalAmount,
        notes:       dto.notes,
        deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : undefined,
        items: { create: items },
      },
      include: {
        vendor:    { select: { id: true, name: true } },
        requester: { select: { id: true, name: true } },
        items: true,
      },
    });

    // Tự khởi tạo quy trình duyệt mua hàng (BPM) nếu đã cấu hình
    await this.processStarter.startForEntity({
      definitionKey: 'purchase-approval',
      entityType: 'PURCHASE_ORDER',
      entityId: po.id,
      startedByUserId: requesterId,
      variables: { poNumber: po.poNumber, vendor: vendor.name, totalAmount },
      taskName: `Duyệt mua hàng: ${po.poNumber}`,
    });

    return po;
  }

  async updatePoStatus(id: string, dto: UpdatePoStatusDto, userId: string) {
    const po = await this.getPo(id);
    const data: any = { status: dto.status };
    if (dto.status === 'APPROVED') {
      data.approverId = userId;
      data.approvedAt = new Date();
    }
    if (dto.status === 'RECEIVED') {
      data.receivedAt = new Date();
    }
    if (dto.status === 'PAID') {
      data.paidAt = new Date();
    }

    const updated = await this.prisma.purchaseOrder.update({ where: { id }, data });

    // Ghi budget transaction theo trạng thái PO
    const poRequester = await this.prisma.user.findUnique({
      where: { id: po.requesterId },
      select: { orgUnitId: true },
    });
    if (poRequester?.orgUnitId) {
      const fiscalYear = new Date(po.createdAt).getFullYear();
      const amount = Number(po.totalAmount);
      const budgetCheck = await this.budgetService.checkBudget(
        poRequester.orgUnitId,
        'OPERATION',
        fiscalYear,
        0, // chỉ lấy lineId, không check limit
      );
      const lineId = budgetCheck.lineId;

      if (lineId) {
        if (dto.status === 'SUBMITTED') {
          // Cam kết ngân sách khi PO được nộp
          await this.budgetService.recordTransaction(lineId, 'PO', id, amount, 'COMMITTED');
        } else if (dto.status === 'RECEIVED') {
          // Chuyển committed → actual khi nhận hàng
          await this.budgetService.recordTransaction(lineId, 'PO', id, amount, 'ACTUAL');
          await this.budgetService.recordTransaction(lineId, 'PO', `${id}_release`, -amount, 'COMMITTED');
        } else if (dto.status === 'CANCELLED') {
          // Giải phóng committed khi hủy
          await this.budgetService.recordTransaction(lineId, 'PO', `${id}_cancel`, -amount, 'COMMITTED');
        }
      }
    }

    // E21.2: Emit finance events → AccountingService xử lý auto-journal qua FinanceEventBus
    if (dto.status === 'RECEIVED' && !po.journalEntryId) {
      await this.financeEventBus.emit({
        type:   'po.received',
        refId:  po.id,
        amount: Number(po.totalAmount),
        userId,
      });
    } else if (dto.status === 'PAID') {
      await this.financeEventBus.emit({
        type:   'po.paid',
        refId:  po.id,
        amount: Number(po.totalAmount),
        userId,
      });
    }

    return updated;
  }

  async receiveItems(poId: string, items: ReceiveItemDto[]) {
    const po = await this.getPo(poId);
    if (!['ORDERED', 'PARTIALLY_RECEIVED'].includes(po.status)) {
      throw new BadRequestException('Chỉ có thể nhận hàng khi đơn ở trạng thái ORDERED hoặc PARTIALLY_RECEIVED');
    }

    await this.prisma.$transaction(
      items.map(i =>
        this.prisma.purchaseOrderItem.update({
          where: { id: i.itemId },
          data: {
            receivedQty: { increment: i.receivedQty },
            status: 'RECEIVED',
          },
        })
      )
    );

    // Auto-update PO status
    const updatedItems = await this.prisma.purchaseOrderItem.findMany({ where: { poId } });
    const allReceived = updatedItems.every(i => Number(i.receivedQty) >= Number(i.quantity));
    const anyReceived = updatedItems.some(i => Number(i.receivedQty) > 0);
    const newStatus = allReceived ? 'RECEIVED' : anyReceived ? 'PARTIALLY_RECEIVED' : po.status;
    if (newStatus !== po.status) {
      await this.prisma.purchaseOrder.update({
        where: { id: poId },
        data: { status: newStatus as any, ...(allReceived ? { receivedAt: new Date() } : {}) },
      });
    }

    return this.getPo(poId);
  }

  async deletePo(id: string) {
    const po = await this.getPo(id);
    if (!['DRAFT', 'REJECTED', 'CANCELLED'].includes(po.status)) {
      throw new BadRequestException('Chỉ có thể xóa đơn ở trạng thái DRAFT, REJECTED hoặc CANCELLED');
    }
    return this.prisma.purchaseOrder.delete({ where: { id } });
  }

  async getStats() {
    const [totalVendors, activeVendors, totalPos, pendingPos, totalSpend] = await Promise.all([
      this.prisma.vendor.count(),
      this.prisma.vendor.count({ where: { status: 'ACTIVE' } }),
      this.prisma.purchaseOrder.count(),
      this.prisma.purchaseOrder.count({ where: { status: { in: ['SUBMITTED', 'APPROVED', 'ORDERED'] } } }),
      this.prisma.purchaseOrder.aggregate({
        where: { status: { in: ['RECEIVED', 'PARTIALLY_RECEIVED', 'ORDERED'] } },
        _sum: { totalAmount: true },
      }),
    ]);
    return {
      totalVendors,
      activeVendors,
      totalPos,
      pendingPos,
      totalSpend: Number(totalSpend._sum.totalAmount ?? 0),
    };
  }

  private async generatePoNumber(): Promise<string> {
    const year  = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const count = await this.prisma.purchaseOrder.count();
    return `PO-${year}${month}-${String(count + 1).padStart(4, '0')}`;
  }
}
