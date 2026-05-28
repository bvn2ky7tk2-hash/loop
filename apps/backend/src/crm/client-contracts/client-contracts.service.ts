import { Injectable, NotFoundException } from '@nestjs/common';
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

@Injectable()
export class ClientContractsService {
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
    return this.prisma.contractMilestone.update({
      where: { id: milestoneId },
      data: {
        ...dto,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        paidAt:  dto.paidAt  ? new Date(dto.paidAt)  : undefined,
      },
    });
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
