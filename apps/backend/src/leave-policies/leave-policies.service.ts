import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  PaginatedResult,
  paginate,
} from '../common/dto/pagination.dto';
import { CreateLeavePolicyDto, UpdateLeavePolicyDto, AssignPolicyDto } from './dto/leave-policy.dto';

export interface SeniorityBonusItem {
  yearsFrom: number;
  bonus: number;
}

@Injectable()
export class LeavePoliciesService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── 1. List tất cả chính sách với employee count ───────────────────────────
  async list(page = 1, limit = 50): Promise<PaginatedResult<any>> {
    const [policies, total] = await this.prisma.$transaction([
      this.prisma.leavePolicy.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { employees: true } },
        },
      }),
      this.prisma.leavePolicy.count(),
    ]);

    const data = policies.map((p) => ({
      ...p,
      employeeCount: p._count.employees,
      seniorityBonus: p.seniorityBonus as unknown as SeniorityBonusItem[],
      _count: undefined,
    }));

    return paginate(data, total, page, limit);
  }

  // ─── 2. Chi tiết một chính sách ─────────────────────────────────────────────
  async findOne(id: string) {
    const policy = await this.prisma.leavePolicy.findUnique({
      where: { id },
      include: {
        _count: { select: { employees: true } },
      },
    });
    if (!policy) throw new NotFoundException('Không tìm thấy chính sách phép');

    return {
      ...policy,
      employeeCount: policy._count.employees,
      seniorityBonus: policy.seniorityBonus as unknown as SeniorityBonusItem[],
      _count: undefined,
    };
  }

  // ─── 3. Tạo mới chính sách ──────────────────────────────────────────────────
  async create(dto: CreateLeavePolicyDto) {
    return this.prisma.leavePolicy.create({
      data: {
        name: dto.name,
        baseAnnualDays: dto.baseAnnualDays,
        seniorityBonus: (dto.seniorityBonus ?? []) as any,
        maxCarryOver: dto.maxCarryOver ?? 0,
        carryOverExpiry: dto.carryOverExpiry ?? null,
        carryOverExpiryAction: dto.carryOverExpiryAction ?? 'CLEAR',
        isActive: true,
      },
    });
  }

  // ─── 4. Cập nhật chính sách ─────────────────────────────────────────────────
  async update(id: string, dto: UpdateLeavePolicyDto) {
    await this.findOne(id);

    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.baseAnnualDays !== undefined) updateData.baseAnnualDays = dto.baseAnnualDays;
    if (dto.seniorityBonus !== undefined) updateData.seniorityBonus = dto.seniorityBonus as any;
    if (dto.maxCarryOver !== undefined) updateData.maxCarryOver = dto.maxCarryOver;
    if (dto.carryOverExpiry !== undefined) updateData.carryOverExpiry = dto.carryOverExpiry;
    if (dto.carryOverExpiryAction !== undefined) updateData.carryOverExpiryAction = dto.carryOverExpiryAction;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    return this.prisma.leavePolicy.update({ where: { id }, data: updateData });
  }

  // ─── 5. Gán chính sách cho nhân viên ────────────────────────────────────────
  async assignToEmployee(dto: AssignPolicyDto) {
    const [employee, policy] = await Promise.all([
      this.prisma.employee.findUnique({ where: { id: dto.employeeId } }),
      this.prisma.leavePolicy.findUnique({ where: { id: dto.leavePolicyId } }),
    ]);
    if (!employee) throw new NotFoundException('Không tìm thấy nhân viên');
    if (!policy) throw new NotFoundException('Không tìm thấy chính sách phép');

    await this.prisma.employee.update({
      where: { id: dto.employeeId },
      data: { leavePolicyId: dto.leavePolicyId },
    });

    return { message: 'Đã gán chính sách phép thành công' };
  }

  // ─── 6. Tính số ngày phép được hưởng ────────────────────────────────────────
  async computeEntitlement(employeeId: string, year: number) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { leavePolicy: true, jobTitle: { include: { leavePolicy: true } } },
    });
    if (!employee) throw new NotFoundException('Không tìm thấy nhân viên');
    // Ưu tiên gói gán trực tiếp cho NV, fallback sang gói chính sách của chức danh
    const policy = employee.leavePolicy ?? employee.jobTitle?.leavePolicy;
    if (!policy) {
      throw new BadRequestException('Nhân viên chưa được gán chính sách phép (qua NV hoặc chức danh)');
    }
    const seniorityBonus = (policy.seniorityBonus ?? []) as unknown as SeniorityBonusItem[];

    const startDate = employee.startDate ? new Date(employee.startDate) : null;
    if (!startDate) {
      throw new BadRequestException('Nhân viên chưa có ngày vào làm');
    }

    // Thâm niên tính tại thời điểm cuối năm đang xét (không vượt quá hôm nay)
    const endOfYear = new Date(year, 11, 31);
    const refDate = endOfYear.getTime() < Date.now() ? endOfYear : new Date();
    const yearsOfService = Math.floor(
      (refDate.getTime() - startDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
    );

    // Cộng dồn từng bậc thâm niên (mỗi mốc yearsFrom đạt được cộng thêm bonus của mốc đó)
    const bonus = seniorityBonus
      .filter((item) => item.yearsFrom <= yearsOfService)
      .reduce((sum, item) => sum + item.bonus, 0);

    const fullEntitlement = policy.baseAnnualDays + bonus;

    // Pro-rata nếu nhân viên vào trong năm hiện tại
    let entitlement = fullEntitlement;
    let proRata = false;
    if (startDate.getFullYear() === year) {
      proRata = true;
      const startMonth = startDate.getMonth() + 1; // 1-based
      const startDay = startDate.getDate();
      // Tháng vào tính nếu startDay <= 15
      const monthsRemaining = 12 - startMonth + (startDay <= 15 ? 1 : 0);
      entitlement = Math.ceil(fullEntitlement * monthsRemaining / 12);
    }

    return {
      employeeId,
      year,
      entitlement,
      fullEntitlement,
      proRata,
      yearsOfService,
      bonus,
      policy: {
        id: policy.id,
        name: policy.name,
        baseAnnualDays: policy.baseAnnualDays,
        seniorityBonus,
      },
    };
  }

  // ─── 7. Tính lại LeaveBalance cho nhân viên theo policy ─────────────────────
  async recalculateBalance(employeeId: string, year: number) {
    const { entitlement } = await this.computeEntitlement(employeeId, year);

    // Loại "Phép năm" — đây là quỹ cần đồng bộ tổng ngày được hưởng (totalDays)
    const annualType = await this.prisma.leaveType.findFirst({
      where: { name: { contains: 'phép năm', mode: 'insensitive' }, isActive: true },
      select: { id: true },
    });

    // Cập nhật entitlementDays cho mọi balance trong năm
    const balances = await this.prisma.leaveBalance.findMany({ where: { employeeId, year } });
    await this.prisma.$transaction(
      balances.map((b) =>
        this.prisma.leaveBalance.update({
          where: { id: b.id },
          data: { entitlementDays: entitlement },
        }),
      ),
    );

    // Đồng bộ quỹ Phép năm: totalDays = entitlement (giữ nguyên usedDays đã dùng)
    if (annualType) {
      await this.prisma.leaveBalance.upsert({
        where: {
          employeeId_leaveTypeId_year: { employeeId, leaveTypeId: annualType.id, year },
        },
        update: { totalDays: entitlement, entitlementDays: entitlement },
        create: {
          employeeId,
          leaveTypeId: annualType.id,
          year,
          totalDays: entitlement,
          usedDays: 0,
          entitlementDays: entitlement,
        },
      });
    }

    return { employeeId, year, entitlement, balancesUpdated: balances.length };
  }

  // ─── 8. Tính lại phép năm HÀNG LOẠT (cho nút "Tính lại phép năm" của HR) ─────
  async recalculateAll(year: number) {
    // Chỉ NV còn làm + có gói phép (trực tiếp hoặc qua chức danh)
    const employees = await this.prisma.employee.findMany({
      where: {
        deletedAt: null,
        OR: [
          { leavePolicyId: { not: null } },
          { jobTitle: { leavePolicyId: { not: null } } },
        ],
      },
      select: { id: true },
      take: 5000,
    });

    let ok = 0;
    let skipped = 0;
    for (const e of employees) {
      try {
        await this.recalculateBalance(e.id, year);
        ok++;
      } catch {
        skipped++; // NV thiếu ngày vào làm / chưa gán gói → bỏ qua
      }
    }

    return {
      message: `Đã tính lại phép năm ${year} cho ${ok} nhân viên (bỏ qua ${skipped}).`,
      year,
      recalculated: ok,
      skipped,
      total: employees.length,
    };
  }
}
