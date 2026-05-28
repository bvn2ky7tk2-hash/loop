import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginatedResult, paginate } from '../common/dto/pagination.dto';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';

const CONTRACT_INCLUDE = {
  employee: { select: { id: true, fullName: true, code: true, level: true } },
} as const;

@Injectable()
export class ContractsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    employeeId?: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResult<any>> {
    const where: any = {};
    if (employeeId) where.employeeId = employeeId;

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
    return this.prisma.contract.create({
      data: {
        employeeId:    dto.employeeId,
        type:          dto.type,
        startDate:     new Date(dto.startDate),
        endDate:       dto.endDate ? new Date(dto.endDate) : undefined,
        salaryMonthly: dto.salaryMonthly,
        currency:      dto.currency,
        note:          dto.note,
        signedAt:      dto.signedAt ? new Date(dto.signedAt) : undefined,
      },
      include: CONTRACT_INCLUDE,
    });
  }

  async update(id: string, dto: UpdateContractDto) {
    await this.findOne(id);

    const raw = dto as Record<string, any>;
    const { startDate, endDate, signedAt, employeeId, ...rest } = raw;

    return this.prisma.contract.update({
      where: { id },
      data: {
        ...rest,
        ...(startDate !== undefined ? { startDate: new Date(startDate as string) } : {}),
        ...(endDate !== undefined ? { endDate: endDate ? new Date(endDate as string) : null } : {}),
        ...(signedAt !== undefined ? { signedAt: signedAt ? new Date(signedAt as string) : null } : {}),
      },
      include: CONTRACT_INCLUDE,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.contract.delete({ where: { id } });
  }
}
