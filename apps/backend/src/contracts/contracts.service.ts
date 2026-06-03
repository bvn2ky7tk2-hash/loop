import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Scope } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantAwareService } from '../common/services/tenant-aware.service';
import { getEmployeeIdsInOrgSubtree } from '../common/utils/org-subtree';
import { PaginatedResult, paginate } from '../common/dto/pagination.dto';
import { CreateContractDto, RenewContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { ContractType } from '../generated/prisma';
import { ProcessStarterService } from '../processes/process-starter.service';

const CONTRACT_INCLUDE = {
  employee: {
    select: {
      id: true, fullName: true, code: true, level: true,
      orgUnit:  { select: { id: true, name: true, code: true } },
      position: { include: { jobTitle: { select: { id: true, name: true } } } },
    },
  },
  signedBy: { select: { id: true, fullName: true } },
  allowances: {
    include: { allowanceType: { select: { id: true, name: true } } },
    orderBy: { amount: 'desc' as const },
  },
  previousContract: { select: { id: true, type: true, startDate: true, endDate: true } },
} as const;

/**
 * Tự động tính endDate dựa vào loại HĐ và startDate (theo BLLĐ 2019).
 * Trả về undefined nếu loại HĐ không có thời hạn cố định.
 */
function calcEndDate(type: ContractType, startDate: Date): Date | undefined {
  switch (type) {
    case ContractType.PROBATION:
      // Mặc định 60 ngày (phổ thông); caller có thể override bằng endDate tường minh
      return addDays(startDate, 60);
    case ContractType.FIXED_12:
      return addMonths(startDate, 12);
    case ContractType.FIXED_24:
      return addMonths(startDate, 24);
    case ContractType.FIXED_36:
      return addMonths(startDate, 36);
    case ContractType.INDEFINITE:
    case ContractType.PART_TIME:
    case ContractType.SEASONAL:
      return undefined; // Người dùng nhập thủ công hoặc để trống
  }
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  // Xử lý cuối tháng (vd 31/01 + 1 tháng → 28/02, không phải 03/03)
  if (d.getDate() !== date.getDate()) d.setDate(0);
  return d;
}

@Injectable({ scope: Scope.REQUEST })
export class ContractsService extends TenantAwareService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly processStarter: ProcessStarterService,
    @Inject(REQUEST) req: any,
  ) {
    super(req);
  }

  async findAll(
    employeeId?: string,
    orgUnitId?: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResult<any>> {
    const where = this.tenantWhere({ deletedAt: null, ...(employeeId ? { employeeId } : {}) });
    if (orgUnitId) {
      const empIds = await getEmployeeIdsInOrgSubtree(this.prisma, orgUnitId);
      (where as any).employeeId = { in: empIds };
    }

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

  // Self-service: resolve employeeId từ user đang đăng nhập, không nhận id tùy ý.
  async findMine(userId: string, page = 1, limit = 20): Promise<PaginatedResult<any>> {
    const employee = await this.prisma.employee.findFirst({
      where: { userId },
      select: { id: true },
    });
    if (!employee) return paginate([], 0, page, limit);
    return this.findAll(employee.id, undefined, page, limit);
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
    const startDate = new Date(dto.startDate);
    // Tự động tính endDate nếu không được truyền vào
    const endDate = dto.endDate
      ? new Date(dto.endDate)
      : calcEndDate(dto.type as ContractType, startDate);

    const contract = await this.prisma.contract.create({
      data: {
        employeeId:    dto.employeeId,
        type:          dto.type,
        startDate,
        endDate,
        salaryMonthly: dto.salaryMonthly,
        insuranceSalary: dto.insuranceSalary ?? null,
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
    const { startDate, endDate, signedAt, employeeId, allowances, type, ...rest } = raw;

    // Nếu đổi loại HĐ hoặc ngày bắt đầu → tính lại endDate tự động
    const existing = await this.prisma.contract.findUnique({ where: { id } });
    const newType = (type ?? existing?.type) as ContractType;
    const newStart = startDate ? new Date(startDate) : existing!.startDate;

    let resolvedEndDate: Date | null | undefined;
    if (endDate !== undefined) {
      resolvedEndDate = endDate ? new Date(endDate as string) : null;
    } else if (type || startDate) {
      // Loại HĐ hoặc ngày bắt đầu thay đổi → tính lại
      resolvedEndDate = calcEndDate(newType, newStart) ?? null;
    }

    await this.prisma.contract.update({
      where: { id },
      data: {
        ...rest,
        ...(type !== undefined ? { type } : {}),
        ...(startDate !== undefined ? { startDate: newStart } : {}),
        ...(resolvedEndDate !== undefined ? { endDate: resolvedEndDate } : {}),
        ...(signedAt !== undefined ? { signedAt: signedAt ? new Date(signedAt as string) : null } : {}),
      },
    });

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

  /**
   * Gia hạn hợp đồng: đánh dấu HĐ cũ là EXPIRED, tạo HĐ mới kế thừa thông tin.
   * Theo BLLĐ 2019 Điều 20: chỉ ký tối đa 2 lần FIXED_*, lần tiếp theo phải là INDEFINITE.
   */
  async renew(id: string, dto: RenewContractDto) {
    const current = await this.findOne(id);

    if (current.status === 'TERMINATED') {
      throw new BadRequestException('Không thể gia hạn hợp đồng đã chấm dứt');
    }

    // Cảnh báo vi phạm BLLĐ: sau 2 lần HĐ có thời hạn phải chuyển INDEFINITE
    const fixedTypes: ContractType[] = [
      ContractType.FIXED_12,
      ContractType.FIXED_24,
      ContractType.FIXED_36,
    ];
    if (
      current.renewalCount >= 2 &&
      fixedTypes.includes(dto.type as ContractType)
    ) {
      throw new BadRequestException(
        'Theo BLLĐ 2019, sau 2 lần ký HĐ có thời hạn, phải ký HĐ không xác định thời hạn (INDEFINITE).',
      );
    }

    const startDate = new Date(dto.startDate);
    const endDate = dto.endDate
      ? new Date(dto.endDate)
      : calcEndDate(dto.type as ContractType, startDate);

    // Lấy phụ cấp từ HĐ cũ nếu không truyền
    const allowancesToCopy = dto.allowances
      ?? current.allowances.map(a => ({
          allowanceTypeId: a.allowanceTypeId,
          amount:          Number(a.amount),
          note:            a.note ?? undefined,
        }));

    // Đánh dấu HĐ cũ là EXPIRED
    await this.prisma.contract.update({
      where: { id },
      data: { status: 'EXPIRED' },
    });

    // Tạo HĐ mới
    const newContract = await this.prisma.contract.create({
      data: {
        employeeId:         current.employeeId,
        type:               dto.type,
        startDate,
        endDate,
        salaryMonthly:      dto.salaryMonthly ?? current.salaryMonthly,
        insuranceSalary:    current.insuranceSalary,
        currency:           current.currency,
        note:               dto.note,
        signedAt:           dto.signedAt ? new Date(dto.signedAt) : undefined,
        ...(dto.signedById ? { signedById: dto.signedById } : {}),
        previousContractId: id,
        renewalCount:       current.renewalCount + 1,
        tenantId:           this.getTenantId(),
      },
      include: CONTRACT_INCLUDE,
    });

    // Khởi tạo quy trình đánh giá & gia hạn hợp đồng (BPM) nếu đã cấu hình
    await this.processStarter.startForEntity({
      definitionKey: 'contract-renewal',
      entityType: 'CONTRACT',
      entityId: newContract.id,
      startedByUserId: this._req?.user?.id ?? this._req?.user?.sub,
      variables: { employeeId: current.employeeId, renewalCount: newContract.renewalCount, previousContractId: id },
      taskName: 'Đánh giá & gia hạn hợp đồng',
    });

    if (allowancesToCopy.length > 0) {
      await this.prisma.contractAllowance.createMany({
        data: allowancesToCopy.map(a => ({
          contractId:      newContract.id,
          allowanceTypeId: a.allowanceTypeId,
          amount:          a.amount,
          note:            a.note,
        })),
        skipDuplicates: true,
      });
      return this.findOne(newContract.id);
    }

    return newContract;
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
