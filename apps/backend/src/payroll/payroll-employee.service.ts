import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  UpsertEmployeeTaxProfileDto,
  CreateDependentDto,
  TerminateDependentDto,
  CreateAllowanceTypeDto,
} from './dto/employee-tax-profile.dto';

@Injectable()
export class PayrollEmployeeService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Employee Tax Profile ────────────────────────────────────────────────────

  async getTaxProfile(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new NotFoundException(`Nhân viên ${employeeId} không tìm thấy`);

    const profile = await this.prisma.employeeTaxProfile.findUnique({
      where: { employeeId },
      include: {
        dependents: {
          orderBy: { registeredFrom: 'desc' },
        },
      },
    });

    return profile ?? { employeeId, taxId: null, residencyStatus: 'RESIDENT', wageZone: 1, dependents: [] };
  }

  async upsertTaxProfile(employeeId: string, dto: UpsertEmployeeTaxProfileDto) {
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new NotFoundException(`Nhân viên ${employeeId} không tìm thấy`);

    return this.prisma.employeeTaxProfile.upsert({
      where: { employeeId },
      create: {
        employeeId,
        taxId: dto.taxId ?? null,
        residencyStatus: dto.residencyStatus,
        wageZone: dto.wageZone,
      },
      update: {
        taxId: dto.taxId ?? null,
        residencyStatus: dto.residencyStatus,
        wageZone: dto.wageZone,
      },
      include: { dependents: true },
    });
  }

  // ─── Dependents (Người phụ thuộc) ───────────────────────────────────────────

  async listDependents(employeeId: string) {
    await this.ensureTaxProfile(employeeId);
    return this.prisma.dependent.findMany({
      where: { employeeId },
      orderBy: { registeredFrom: 'desc' },
    });
  }

  async addDependent(employeeId: string, dto: CreateDependentDto) {
    // Auto-create tax profile if not exists
    await this.prisma.employeeTaxProfile.upsert({
      where: { employeeId },
      create: { employeeId, residencyStatus: 'RESIDENT', wageZone: 1 },
      update: {},
    });

    return this.prisma.dependent.create({
      data: {
        employeeId,
        name: dto.name,
        relationship: dto.relationship,
        taxId: dto.taxId ?? null,
        registeredFrom: new Date(dto.registeredFrom),
      },
    });
  }

  async terminateDependent(employeeId: string, dependentId: string, dto: TerminateDependentDto) {
    const dep = await this.prisma.dependent.findFirst({
      where: { id: dependentId, employeeId },
    });
    if (!dep) throw new NotFoundException('Không tìm thấy người phụ thuộc');

    return this.prisma.dependent.update({
      where: { id: dependentId },
      data: { registeredTo: new Date(dto.registeredTo) },
    });
  }

  async deleteDependent(employeeId: string, dependentId: string) {
    const dep = await this.prisma.dependent.findFirst({
      where: { id: dependentId, employeeId },
    });
    if (!dep) throw new NotFoundException('Không tìm thấy người phụ thuộc');
    await this.prisma.dependent.delete({ where: { id: dependentId } });
    return { success: true };
  }

  // ─── Allowance Types ─────────────────────────────────────────────────────────

  async listAllowanceTypes() {
    return this.prisma.allowanceType.findMany({
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
  }

  async createAllowanceType(dto: CreateAllowanceTypeDto) {
    return this.prisma.allowanceType.create({
      data: {
        name: dto.name,
        defaultAmount: dto.defaultAmount,
        isBhxhExempt: dto.isBhxhExempt ?? true,
        isPitExempt: dto.isPitExempt ?? false,
        pitExemptCeiling: dto.pitExemptCeiling ?? null,
      },
    });
  }

  async updateAllowanceType(id: string, dto: Partial<CreateAllowanceTypeDto & { isActive: boolean }>) {
    const at = await this.prisma.allowanceType.findUnique({ where: { id } });
    if (!at) throw new NotFoundException('Không tìm thấy loại phụ cấp');
    return this.prisma.allowanceType.update({ where: { id }, data: dto as any });
  }

  // ─── Per-record allowance override ───────────────────────────────────────────

  async upsertRecordAllowance(recordId: string, allowanceTypeId: string, amount: number, note?: string) {
    const record = await this.prisma.payrollRecord.findUnique({ where: { id: recordId } });
    if (!record) throw new NotFoundException('Không tìm thấy bản ghi lương');

    return this.prisma.employeeAllowance.upsert({
      where: { payrollRecordId_allowanceTypeId: { payrollRecordId: recordId, allowanceTypeId } },
      create: { payrollRecordId: recordId, allowanceTypeId, amount, overrideNote: note },
      update: { amount, overrideNote: note },
    });
  }

  // ─── Employee self-service: view own profile ────────────────────────────────

  async getMyTaxProfile(userId: string) {
    const employee = await this.prisma.employee.findFirst({ where: { userId } });
    if (!employee) throw new NotFoundException('Không tìm thấy hồ sơ nhân viên');
    return this.getTaxProfile(employee.id);
  }

  async getMyPayrollRecords(userId: string) {
    const employee = await this.prisma.employee.findFirst({ where: { userId } });
    if (!employee) return [];

    const records = await this.prisma.payrollRecord.findMany({
      where: { employeeId: employee.id },
      include: {
        period: {
          select: {
            id: true, name: true, startDate: true, endDate: true, status: true, type: true,
          },
        },
        employee: {
          select: {
            id: true,
            code: true,
            fullName: true,
            user: { select: { id: true, name: true, email: true } },
            orgUnit: { select: { id: true, name: true } },
            position: { select: { jobTitle: { select: { id: true, name: true } } } },
          },
        },
      },
      orderBy: { period: { startDate: 'desc' } },
    });

    return records.map(r => ({
      ...r,
      periodName: r.period?.name,
      periodStart: r.period?.startDate,
      periodEnd: r.period?.endDate,
      periodStatus: r.period?.status,
      periodType: r.period?.type,
    }));
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private async ensureTaxProfile(employeeId: string) {
    const profile = await this.prisma.employeeTaxProfile.findUnique({ where: { employeeId } });
    if (!profile) throw new NotFoundException(`Nhân viên ${employeeId} chưa có hồ sơ thuế`);
    return profile;
  }
}
