import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate, PaginatedResult } from '../../common/dto/pagination.dto';
import {
  CreateClientContractDto, UpdateClientContractDto,
  CreateMilestoneDto, UpdateMilestoneDto,
} from './dto/client-contract.dto';

const CONTRACT_INCLUDE = {
  customer: { select: { id: true, code: true, name: true } },
  milestones: { orderBy: { dueDate: 'asc' as const } },
} as const;

// INV-YYYYMM-NNNN (dùng lại cùng pattern với InvoicesService)
async function generateInvoiceCode(prisma: PrismaService): Promise<string> {
  const now = new Date();
  const ym  = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prefix = `INV-${ym}-`;
  const last = await prisma.invoice.findFirst({
    where: { code: { startsWith: prefix } },
    orderBy: { code: 'desc' },
    select: { code: true },
  });
  const seq = last ? parseInt(last.code.split('-')[2], 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

@Injectable()
export class ClientContractsService {
  private readonly logger = new Logger(ClientContractsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    customerId?: string,
    status?: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResult<any>> {
    const where: any = {};
    if (customerId) where.customerId = customerId;
    if (status)     where.status = status;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.clientContract.findMany({
        where,
        include: CONTRACT_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.clientContract.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findOne(id: string) {
    const contract = await this.prisma.clientContract.findUnique({
      where: { id },
      include: CONTRACT_INCLUDE,
    });
    if (!contract) throw new NotFoundException('Không tìm thấy hợp đồng');
    return contract;
  }

  async create(dto: CreateClientContractDto) {
    return this.prisma.clientContract.create({
      data: {
        contractNo: dto.contractNo,
        title:      dto.title,
        customerId: dto.customerId,
        dealId:     dto.dealId,
        type:       dto.type,
        value:      dto.value,
        currency:   dto.currency ?? 'VND',
        startDate:  new Date(dto.startDate),
        endDate:    dto.endDate ? new Date(dto.endDate) : undefined,
        signedAt:   dto.signedAt ? new Date(dto.signedAt) : undefined,
        status:     dto.status ?? 'DRAFT',
        notes:      dto.notes,
      },
      include: CONTRACT_INCLUDE,
    });
  }

  async update(id: string, dto: UpdateClientContractDto) {
    await this.findOne(id);
    return this.prisma.clientContract.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate:   dto.endDate   ? new Date(dto.endDate)   : undefined,
        signedAt:  dto.signedAt  ? new Date(dto.signedAt)  : undefined,
      },
      include: CONTRACT_INCLUDE,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.clientContract.delete({ where: { id } });
  }

  // ── Milestones ──────────────────────────────────────────────────────────────

  async addMilestone(contractId: string, dto: CreateMilestoneDto) {
    await this.findOne(contractId);
    return this.prisma.contractMilestone.create({
      data: {
        contractId,
        name:    dto.name,
        dueDate: new Date(dto.dueDate),
        amount:  dto.amount,
        status:  dto.status ?? 'PENDING',
        notes:   dto.notes,
      },
    });
  }

  async updateMilestone(contractId: string, milestoneId: string, dto: UpdateMilestoneDto) {
    const milestone = await this.prisma.contractMilestone.findFirst({
      where: { id: milestoneId, contractId },
    });
    if (!milestone) throw new NotFoundException('Không tìm thấy milestone');

    const updated = await this.prisma.contractMilestone.update({
      where: { id: milestoneId },
      data: {
        ...dto,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        paidAt:  dto.paidAt  ? new Date(dto.paidAt)  : undefined,
      },
    });

    // E20.2: Khi milestone → PAID (invoiced+paid), tự động tạo Invoice DRAFT
    // MilestoneStatus: PENDING → INVOICED → PAID (không có COMPLETED)
    if (dto.status === 'INVOICED' && milestone.status !== 'INVOICED' && !milestone.invoiceId) {
      try {
        await this.autoCreateMilestoneInvoice(contractId, milestoneId, milestone.name, Number(milestone.amount));
      } catch (err) {
        // Ghi log nhưng không fail request chính
        this.logger.error(`Auto-draft invoice for milestone ${milestoneId} failed: ${err}`);
      }
    }

    return updated;
  }

  private async autoCreateMilestoneInvoice(
    contractId: string,
    milestoneId: string,
    milestoneName: string,
    amount: number,
  ) {
    const contract = await this.prisma.clientContract.findUnique({
      where: { id: contractId },
      select: { customerId: true },
    });
    if (!contract) return;

    const code = await generateInvoiceCode(this.prisma);
    const today = new Date();
    // Mặc định 30 ngày — ClientContract chưa có paymentTermsDays
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + 30);

    // Tìm admin để gán createdById
    const adminUser = await this.prisma.user.findFirst({
      where: { role: 'ADMIN' },
      select: { id: true },
    });
    const createdById = adminUser?.id ?? 'system';

    const invoice = await this.prisma.invoice.create({
      data: {
        code,
        type:        'SALES', // InvoiceType: SALES | PURCHASE (không có MILESTONE)
        customerId:  contract.customerId,
        issueDate:   today,
        dueDate,
        currency:    'VND',
        notes:       `Tự động tạo từ milestone: ${milestoneName}`,
        subtotal:    amount,
        taxAmount:   0,
        totalAmount: amount,
        createdById,
        items: {
          create: [{
            description: milestoneName,
            quantity:    1,
            unitPrice:   amount,
            amount:      amount,
            taxRate:     0,
          }],
        },
      },
    });

    // Gán invoiceId cho milestone
    await this.prisma.contractMilestone.update({
      where: { id: milestoneId },
      data: { invoiceId: invoice.id },
    });

    this.logger.log(`Auto-drafted Invoice ${invoice.code} for milestone ${milestoneId}`);
  }

  async deleteMilestone(contractId: string, milestoneId: string) {
    const milestone = await this.prisma.contractMilestone.findFirst({
      where: { id: milestoneId, contractId },
    });
    if (!milestone) throw new NotFoundException('Không tìm thấy milestone');
    return this.prisma.contractMilestone.delete({ where: { id: milestoneId } });
  }

  async stats() {
    const [total, totalValue] = await this.prisma.$transaction([
      this.prisma.clientContract.count(),
      this.prisma.clientContract.aggregate({ _sum: { value: true }, where: { status: { in: ['ACTIVE', 'COMPLETED'] } } }),
    ]);
    const raw = await this.prisma.$queryRaw<{ status: string; cnt: bigint }[]>`
      SELECT status, COUNT(*) as cnt FROM client_contracts GROUP BY status
    `;
    const byStatus = Object.fromEntries(raw.map((r) => [r.status, Number(r.cnt)]));
    return { total, byStatus, activeValue: Number(totalValue._sum.value ?? 0) };
  }
}
