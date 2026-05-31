import { Injectable, NotFoundException, ConflictException, BadRequestException, Inject } from '@nestjs/common';
import { Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Prisma } from '../generated/prisma';
import type { Employee, EmployeeRate, Role } from '../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { CreateRateDto } from './dto/create-rate.dto';
import * as ExcelJS from 'exceljs';
import { TenantAwareService } from '../common/services/tenant-aware.service';

@Injectable({ scope: Scope.REQUEST })
export class EmployeesService extends TenantAwareService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REQUEST) req?: any,
  ) {
    super(req);
  }

  async create(dto: CreateEmployeeDto) {
    const existing = await this.prisma.employee.findFirst({ where: { code: dto.code, deletedAt: null } });
    if (existing) throw new ConflictException('Mã nhân sự đã tồn tại');

    return this.prisma.employee.create({
      data: {
        code: dto.code,
        fullName: dto.fullName,
        orgUnitId: dto.orgUnitId,
        level: dto.level,
        startDate: new Date(dto.startDate),
        birthdate: dto.birthdate ? new Date(dto.birthdate) : null,
        techStack: dto.techStack ?? [],
        email: dto.email,
        cccd: dto.cccd,
        cccdIssueDate: dto.cccdIssueDate ? new Date(dto.cccdIssueDate) : null,
        cccdIssuePlace: dto.cccdIssuePlace,
        userId: dto.userId,
        positionId: dto.positionId,
        tenantId: this.getTenantId(),
      },
      include: { orgUnit: { select: { name: true } } },
    });
  }

  async findAll(orgUnitIds: string[] | null, callerRole: Role, page = 1, limit = 50) {
    const now = new Date();
    const where: Prisma.EmployeeWhereInput = this.tenantWhere({
      deletedAt: null,
      ...(orgUnitIds !== null ? { orgUnitId: { in: orgUnitIds } } : {}),
    });

    const skip = (page - 1) * limit;
    const [employees, total] = await this.prisma.$transaction([
      this.prisma.employee.findMany({
        where,
        include: {
          orgUnit: { select: { name: true } },
          rates: { orderBy: { effectiveDate: 'desc' }, take: 1 },
          allocations: {
            where: { startDate: { lte: now }, endDate: { gte: now } },
            select: { id: true },
          },
        },
        orderBy: { fullName: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.employee.count({ where }),
    ]);

    const data = employees.map((e) => ({
      ...this.toPublic(e, callerRole),
      activeProjectCount: e.allocations.length,
    }));

    return { data, total, page, limit };
  }

  /** Danh sách nhân viên đã nghỉ việc (employeeStatus = TERMINATED) dùng cho trang Offboarding */
  async findOffboarding(orgUnitIds: string[] | null) {
    const where: Prisma.EmployeeWhereInput = this.tenantWhere({
      deletedAt: null,
      employeeStatus: 'TERMINATED',
      ...(orgUnitIds !== null ? { orgUnitId: { in: orgUnitIds } } : {}),
    });

    const employees = await this.prisma.employee.findMany({
      where,
      include: { orgUnit: { select: { name: true } } },
      orderBy: { endDate: 'desc' },
      take: 200,
    });

    return employees.map((e) => ({
      id: e.id,
      code: e.code,
      fullName: e.fullName,
      email: e.email,
      orgUnit: e.orgUnit ? { name: e.orgUnit.name } : undefined,
      terminationDate: e.endDate ? e.endDate.toISOString() : undefined,
      // offboardingStatus và offboardingProgress chưa có trong schema — mặc định PENDING / 0
      offboardingStatus: 'PENDING' as const,
      offboardingProgress: 0,
      processInstanceId: null,
    }));
  }

  async findOne(id: string, callerRole: Role) {
    const emp = await this.prisma.employee.findFirst({
      // Dùng findFirst thay findUnique để có thể lọc deletedAt
      where: { id, deletedAt: null },
      include: {
        orgUnit: { select: { id: true, name: true } },
        position: { include: { jobTitle: { select: { name: true } } } },
        rates: { orderBy: { effectiveDate: 'desc' } },
      },
    });
    if (!emp) throw new NotFoundException('Không tìm thấy nhân sự');
    return callerRole === 'ADMIN' ? emp : this.toPublic(emp, callerRole);
  }

  async findMe(userId: string) {
    const emp = await this.prisma.employee.findFirst({
      // Chỉ trả về nhân sự chưa bị xóa mềm
      where: { userId, deletedAt: null },
      include: { orgUnit: { select: { name: true } }, rates: { orderBy: { effectiveDate: 'desc' }, take: 1 } },
    });
    if (!emp) throw new NotFoundException('Chưa có hồ sơ nhân sự cho tài khoản này');
    return emp;
  }

  async update(id: string, dto: UpdateEmployeeDto) {
    await this.findOrThrow(id);
    return this.prisma.employee.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        birthdate: dto.birthdate ? new Date(dto.birthdate) : undefined,
        cccdIssueDate: dto.cccdIssueDate ? new Date(dto.cccdIssueDate) : undefined,
      },
      include: { orgUnit: { select: { name: true } } },
    });
  }

  async addRate(employeeId: string, dto: CreateRateDto): Promise<EmployeeRate> {
    await this.findOrThrow(employeeId);

    const effectiveDate = new Date(dto.effectiveDate);
    const existing = await this.prisma.employeeRate.findFirst({
      where: { employeeId, effectiveDate },
    });
    if (existing) throw new BadRequestException('Đã có rate hiệu lực vào ngày này');

    return this.prisma.employeeRate.create({
      data: {
        employeeId,
        effectiveDate,
        ratePerDay: dto.ratePerDay,
        currency: dto.currency ?? 'VND',
      },
    });
  }

  async getRates(employeeId: string, page = 1, limit = 50) {
    await this.findOrThrow(employeeId);
    const skip = (page - 1) * limit;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.employeeRate.findMany({
        where: { employeeId },
        orderBy: { effectiveDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.employeeRate.count({ where: { employeeId } }),
    ]);
    return { data, total, page, limit };
  }

  async getProjectHistory(employeeId: string, page = 1, limit = 50) {
    await this.findOrThrow(employeeId);
    const skip = (page - 1) * limit;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.allocation.findMany({
        where: { employeeId },
        include: { project: { select: { id: true, name: true, code: true, type: true } } },
        orderBy: { startDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.allocation.count({ where: { employeeId } }),
    ]);
    return { data, total, page, limit };
  }

  async exportExcel(): Promise<Buffer> {
    const employees = await this.prisma.employee.findMany({
      // Chỉ export nhân sự chưa bị xóa mềm, lọc theo tenant
      where: this.tenantWhere({ deletedAt: null }),
      include: { orgUnit: { select: { name: true } } },
      orderBy: { fullName: 'asc' },
      take: 5000,
    });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Nhân viên');

    ws.columns = [
      { header: 'Họ tên',        key: 'fullName',  width: 28 },
      { header: 'Email',         key: 'email',     width: 30 },
      { header: 'Phòng ban',     key: 'orgUnit',   width: 22 },
      { header: 'Cấp độ',       key: 'level',     width: 12 },
      { header: 'Ngày vào làm', key: 'startDate', width: 14 },
      { header: 'Trạng thái',   key: 'status',    width: 12 },
    ];

    // Style header row
    ws.getRow(1).font = { bold: true };

    employees.forEach((e) => {
      ws.addRow({
        fullName:  e.fullName,
        email:     e.email ?? '',
        orgUnit:   e.orgUnit?.name ?? '',
        level:     e.level,
        startDate: e.startDate ? new Date(e.startDate).toLocaleDateString('vi-VN') : '',
        status:    (e as { status?: string }).status ?? 'ACTIVE',
      });
    });

    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }

  async getRateAtDate(employeeId: string, date: Date): Promise<EmployeeRate | null> {
    return this.prisma.employeeRate.findFirst({
      where: { employeeId, effectiveDate: { lte: date } },
      orderBy: { effectiveDate: 'desc' },
    });
  }

  async remove(id: string) {
    await this.findOrThrow(id);
    return this.prisma.employee.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async restore(id: string) {
    const emp = await this.prisma.employee.findUnique({ where: { id } });
    if (!emp) throw new NotFoundException('Không tìm thấy nhân sự');
    return this.prisma.employee.update({
      where: { id },
      data: { deletedAt: null },
    });
  }

  private async findOrThrow(id: string): Promise<Employee> {
    // Kiểm tra cả deletedAt để không thao tác trên record đã xóa mềm
    const emp = await this.prisma.employee.findFirst({ where: { id, deletedAt: null } });
    if (!emp) throw new NotFoundException('Không tìm thấy nhân sự');
    return emp;
  }

  private toPublic(emp: Employee & Record<string, unknown>, _role: Role) {
    const { cccd: _c, cccdIssueDate: _d, cccdIssuePlace: _p, allocations: _a, ...rest } = emp as Employee & {
      cccd: unknown; cccdIssueDate: unknown; cccdIssuePlace: unknown; allocations: unknown;
    };
    return rest;
  }

  // ── L-03: Employee History ─────────────────────────────────────────────────

  async getWorkHistory(employeeId: string) {
    await this.findOrThrow(employeeId);
    return this.prisma.workHistory.findMany({
      where: { employeeId },
      orderBy: { eventDate: 'desc' },
      take: 50,
    });
  }

  async getPositionHistory(employeeId: string) {
    await this.findOrThrow(employeeId);
    return this.prisma.positionHistory.findMany({
      where: { employeeId },
      orderBy: { startDate: 'desc' },
      take: 50,
      include: {
        position: {
          select: { id: true, code: true, jobTitle: { select: { name: true } } },
        },
      },
    });
  }

  async getLeaveSummary(employeeId: string) {
    await this.findOrThrow(employeeId);
    return this.prisma.leaveBalance.findMany({
      where: { employeeId },
      include: { leaveType: { select: { id: true, name: true, color: true } } },
      orderBy: { year: 'desc' },
    });
  }
}
