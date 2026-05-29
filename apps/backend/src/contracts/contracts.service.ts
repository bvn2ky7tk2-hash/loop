import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { PaginatedResult, paginate } from '../common/dto/pagination.dto';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';

const CONTRACT_INCLUDE = {
  employee: { select: { id: true, fullName: true, code: true, level: true } },
  signedBy: { select: { id: true, fullName: true } },
  allowances: {
    include: { allowanceType: { select: { id: true, name: true } } },
    orderBy: { amount: 'desc' as const },
  },
} as const;

@Injectable()
export class ContractsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REQUEST) private readonly request: any,
  ) {}

  private getTenantId(): string | undefined {
    return this.request?.user?.tenantId ?? this.request?.__tenantId ?? process.env.DEFAULT_TENANT_ID;
  }

  async findAll(
    employeeId?: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResult<any>> {
    const tenantId = this.getTenantId();
    const where: any = { deletedAt: null };
    if (employeeId) where.employeeId = employeeId;
    if (tenantId) where.tenantId = tenantId;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.contract.findMany({
        where,
        include: CONTRACT_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.contract.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findOne(id: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { id },
      include: CONTRACT_INCLUDE,
    });
    if (!contract) throw new NotFoundException(`Hợp đồng ${id} không tìm thấy`);
    return contract;
  }

  async create(dto: CreateContractDto) {
    const contract = await this.prisma.contract.create({
      data: {
        employeeId:    dto.employeeId,
        type:          dto.type,
        startDate:     new Date(dto.startDate),
        endDate:       dto.endDate ? new Date(dto.endDate) : undefined,
        salaryMonthly: dto.salaryMonthly,
        currency:      dto.currency,
        note:          dto.note,
        signedAt:      dto.signedAt ? new Date(dto.signedAt) : undefined,
        ...(dto.signedById ? { signedById: dto.signedById } : {}),
        tenantId:      this.getTenantId(),
      },
      include: CONTRACT_INCLUDE,
    });

    if (dto.allowances?.length) {
      await this.prisma.contractAllowance.createMany({
        data: dto.allowances.map(a => ({
          contractId:      contract.id,
          allowanceTypeId: a.allowanceTypeId,
          amount:          a.amount,
          note:            a.note,
        })),
        skipDuplicates: true,
      });
      return this.findOne(contract.id);
    }

    return contract;
  }

  async update(id: string, dto: UpdateContractDto) {
    await this.findOne(id);

    const raw = dto as Record<string, any>;
    const { startDate, endDate, signedAt, employeeId, allowances, ...rest } = raw;

    await this.prisma.contract.update({
      where: { id },
      data: {
        ...rest,
        ...(startDate !== undefined ? { startDate: new Date(startDate as string) } : {}),
        ...(endDate !== undefined ? { endDate: endDate ? new Date(endDate as string) : null } : {}),
        ...(signedAt !== undefined ? { signedAt: signedAt ? new Date(signedAt as string) : null } : {}),
      },
    });

    // Nếu allowances được truyền vào → replace toàn bộ
    if (Array.isArray(allowances)) {
      await this.prisma.contractAllowance.deleteMany({ where: { contractId: id } });
      if (allowances.length > 0) {
        await this.prisma.contractAllowance.createMany({
          data: allowances.map((a: any) => ({
            contractId:      id,
            allowanceTypeId: a.allowanceTypeId,
            amount:          a.amount,
            note:            a.note,
          })),
          skipDuplicates: true,
        });
      }
    }

    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.contract.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async restore(id: string) {
    const contract = await this.prisma.contract.findUnique({ where: { id } });
    if (!contract) throw new NotFoundException(`Hợp đồng ${id} không tìm thấy`);
    return this.prisma.contract.update({ where: { id }, data: { deletedAt: null } });
  }
}
