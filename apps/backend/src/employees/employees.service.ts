import { Injectable, NotFoundException, ConflictException, BadRequestException, Inject } from '@nestjs/common';
import { Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Prisma } from '../generated/prisma';
import type { Employee, EmployeeRate, Role } from '../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { CreateRateDto } from './dto/create-rate.dto';
import { CreateEducationRecordDto, UpdateEducationRecordDto } from './dto/education.dto';
import { CreateWorkExperienceDto, UpdateWorkExperienceDto } from './dto/work-experience.dto';
import { CreateFamilyMemberDto, UpdateFamilyMemberDto, RegisterDependentDto } from './dto/family-member.dto';
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
    const code = dto.code ?? await this.generateNextCode();

    const existing = await this.prisma.employee.findFirst({ where: { code, deletedAt: null } });
    if (existing) throw new ConflictException('Mã nhân sự đã tồn tại');

    const { code: _c, startDate, birthdate, cccdIssueDate, idIssueDate, ...rest } = dto;

    return this.prisma.employee.create({
      data: {
        ...rest,
        code,
        startDate: new Date(startDate),
        birthdate: birthdate ? new Date(birthdate) : null,
        cccdIssueDate: cccdIssueDate ? new Date(cccdIssueDate) : null,
        idIssueDate: idIssueDate ? new Date(idIssueDate) : null,
        techStack: rest.techStack ?? [],
        tenantId: this.getTenantId(),
      },
      include: {
        orgUnit: { select: { name: true } },
        jobTitle: { select: { id: true, name: true } },
        position: { select: { id: true, code: true, jobTitle: { select: { name: true } } } },
      },
    });
  }

  private async generateNextCode(): Promise<string> {
    const tenantId = this.getTenantId();

    // Tìm số thứ tự lớn nhất từ các mã đúng dạng EMP-[0-9]+ (bỏ qua EMP-DEMO-DEV* và các mã cũ)
    const rows = tenantId
      ? await this.prisma.$queryRaw<{ maxnum: number | null }[]>`
          SELECT MAX(CAST(SUBSTRING(code, 5) AS INTEGER)) AS maxnum
          FROM employees
          WHERE code ~ '^EMP-[0-9]+$' AND deleted_at IS NULL AND tenant_id = ${tenantId}
        `
      : await this.prisma.$queryRaw<{ maxnum: number | null }[]>`
          SELECT MAX(CAST(SUBSTRING(code, 5) AS INTEGER)) AS maxnum
          FROM employees
          WHERE code ~ '^EMP-[0-9]+$' AND deleted_at IS NULL
        `;

    let seq = Number(rows[0]?.maxnum ?? 0) + 1;
    let code = `EMP-${String(seq).padStart(4, '0')}`;

    // Đảm bảo không trùng (edge case: có gap do xóa)
    while (await this.prisma.employee.findFirst({ where: this.tenantWhere({ code }) })) {
      seq++;
      code = `EMP-${String(seq).padStart(4, '0')}`;
    }
    return code;
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
          jobTitle: { select: { id: true, name: true } },
          position: { select: { id: true, code: true, jobTitle: { select: { name: true } } } },
          rates: { orderBy: { effectiveDate: 'desc' }, take: 1 },
          allocations: {
            where: { startDate: { lte: now }, endDate: { gte: now } },
            select: { id: true },
          },
        },
        orderBy: { createdAt: 'desc' },
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
      include: {
        orgUnit: { select: { id: true, name: true } },
        position: { include: { jobTitle: { select: { name: true } } } },
      },
      orderBy: { endDate: 'desc' },
      take: 200,
    });

    return employees.map((e) => ({
      id: e.id,
      code: e.code,
      fullName: e.fullName,
      email: e.email,
      orgUnit: e.orgUnit ? { id: e.orgUnit.id, name: e.orgUnit.name } : undefined,
      position: e.position ? { jobTitle: e.position.jobTitle ? { name: e.position.jobTitle.name } : null } : undefined,
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
        jobTitle: { select: { id: true, name: true } },
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
      include: {
        orgUnit: { select: { name: true } },
        jobTitle: { select: { id: true, name: true } },
        position: { include: { jobTitle: { select: { name: true } } } },
        rates: { orderBy: { effectiveDate: 'desc' }, take: 1 },
      },
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
      include: {
        orgUnit: { select: { name: true } },
        jobTitle: { select: { id: true, name: true } },
        position: { select: { id: true, code: true, jobTitle: { select: { name: true } } } },
      },
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

  // ── Education Records ──────────────────────────────────────────────────────

  async getEducationRecords(employeeId: string) {
    await this.findOrThrow(employeeId);
    return this.prisma.educationRecord.findMany({
      where: { employeeId },
      orderBy: [{ isMainDegree: 'desc' }, { graduationYear: 'desc' }],
    });
  }

  async createEducationRecord(employeeId: string, dto: CreateEducationRecordDto) {
    await this.findOrThrow(employeeId);
    return this.prisma.educationRecord.create({
      data: { ...dto, employeeId, tenantId: this.getTenantId() },
    });
  }

  async updateEducationRecord(employeeId: string, recordId: string, dto: UpdateEducationRecordDto) {
    await this.findOrThrow(employeeId);
    const record = await this.prisma.educationRecord.findFirst({ where: { id: recordId, employeeId } });
    if (!record) throw new NotFoundException('Không tìm thấy bản ghi học vấn');
    return this.prisma.educationRecord.update({ where: { id: recordId }, data: dto });
  }

  async deleteEducationRecord(employeeId: string, recordId: string) {
    await this.findOrThrow(employeeId);
    const record = await this.prisma.educationRecord.findFirst({ where: { id: recordId, employeeId } });
    if (!record) throw new NotFoundException('Không tìm thấy bản ghi học vấn');
    return this.prisma.educationRecord.delete({ where: { id: recordId } });
  }

  // ── Previous Work Experience ───────────────────────────────────────────────

  async getWorkExperiences(employeeId: string) {
    await this.findOrThrow(employeeId);
    return this.prisma.previousWorkExperience.findMany({
      where: { employeeId },
      orderBy: { startDate: 'desc' },
    });
  }

  async createWorkExperience(employeeId: string, dto: CreateWorkExperienceDto) {
    await this.findOrThrow(employeeId);
    return this.prisma.previousWorkExperience.create({
      data: {
        ...dto,
        employeeId,
        tenantId: this.getTenantId(),
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
      },
    });
  }

  async updateWorkExperience(employeeId: string, expId: string, dto: UpdateWorkExperienceDto) {
    await this.findOrThrow(employeeId);
    const exp = await this.prisma.previousWorkExperience.findFirst({ where: { id: expId, employeeId } });
    if (!exp) throw new NotFoundException('Không tìm thấy kinh nghiệm làm việc');
    return this.prisma.previousWorkExperience.update({
      where: { id: expId },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
      },
    });
  }

  async deleteWorkExperience(employeeId: string, expId: string) {
    await this.findOrThrow(employeeId);
    const exp = await this.prisma.previousWorkExperience.findFirst({ where: { id: expId, employeeId } });
    if (!exp) throw new NotFoundException('Không tìm thấy kinh nghiệm làm việc');
    return this.prisma.previousWorkExperience.delete({ where: { id: expId } });
  }

  // ── Family Members ─────────────────────────────────────────────────────────

  async getFamilyMembers(employeeId: string) {
    await this.findOrThrow(employeeId);
    return this.prisma.familyMember.findMany({
      where: { employeeId },
      orderBy: { relationship: 'asc' },
    });
  }

  async createFamilyMember(employeeId: string, dto: CreateFamilyMemberDto) {
    await this.findOrThrow(employeeId);
    return this.prisma.familyMember.create({
      data: {
        ...dto,
        employeeId,
        tenantId: this.getTenantId(),
        birthdate: dto.birthdate ? new Date(dto.birthdate) : null,
      },
    });
  }

  async updateFamilyMember(employeeId: string, memberId: string, dto: UpdateFamilyMemberDto) {
    await this.findOrThrow(employeeId);
    const member = await this.prisma.familyMember.findFirst({ where: { id: memberId, employeeId } });
    if (!member) throw new NotFoundException('Không tìm thấy thành viên gia đình');
    return this.prisma.familyMember.update({
      where: { id: memberId },
      data: { ...dto, birthdate: dto.birthdate ? new Date(dto.birthdate) : null },
    });
  }

  async deleteFamilyMember(employeeId: string, memberId: string) {
    await this.findOrThrow(employeeId);
    const member = await this.prisma.familyMember.findFirst({ where: { id: memberId, employeeId } });
    if (!member) throw new NotFoundException('Không tìm thấy thành viên gia đình');
    // Xóa Dependent liên kết trước (nếu có)
    if (member.dependentId) {
      await this.prisma.dependent.delete({ where: { id: member.dependentId } });
    }
    return this.prisma.familyMember.delete({ where: { id: memberId } });
  }

  // ── Register / Unregister Dependent ───────────────────────────────────────

  async registerDependent(employeeId: string, memberId: string, dto: RegisterDependentDto) {
    await this.findOrThrow(employeeId);
    const member = await this.prisma.familyMember.findFirst({ where: { id: memberId, employeeId } });
    if (!member) throw new NotFoundException('Không tìm thấy thành viên gia đình');

    if (!dto.isDependent) {
      // Hủy đăng ký người phụ thuộc
      if (member.dependentId) {
        await this.prisma.dependent.delete({ where: { id: member.dependentId } });
        await this.prisma.familyMember.update({ where: { id: memberId }, data: { dependentId: null } });
      }
      return { isDependent: false };
    }

    // Đảm bảo EmployeeTaxProfile tồn tại
    await this.prisma.employeeTaxProfile.upsert({
      where: { employeeId },
      create: { employeeId },
      update: {},
    });

    // Relationship mapping từ enum → string
    const relMap: Record<string, string> = {
      SPOUSE: 'Vợ/Chồng', PARENT: 'Cha/Mẹ', CHILD: 'Con',
      SIBLING: 'Anh/Chị/Em', GRANDPARENT: 'Ông/Bà', OTHER: 'Khác',
    };

    if (member.dependentId) {
      // Cập nhật Dependent hiện có
      const dep = await this.prisma.dependent.update({
        where: { id: member.dependentId },
        data: {
          taxId: dto.taxId,
          registeredFrom: dto.registeredFrom ? new Date(dto.registeredFrom) : new Date(),
          registeredTo: dto.registeredTo ? new Date(dto.registeredTo) : null,
        },
      });
      return { isDependent: true, dependent: dep };
    }

    // Tạo mới Dependent và link vào FamilyMember
    const dep = await this.prisma.dependent.create({
      data: {
        employeeId,
        name: member.fullName,
        relationship: relMap[member.relationship] ?? member.relationship,
        taxId: dto.taxId ?? member.idNumber,
        registeredFrom: dto.registeredFrom ? new Date(dto.registeredFrom) : new Date(),
        registeredTo: dto.registeredTo ? new Date(dto.registeredTo) : null,
      },
    });

    await this.prisma.familyMember.update({
      where: { id: memberId },
      data: { dependentId: dep.id },
    });

    return { isDependent: true, dependent: dep };
  }

  async getFamilyMembersWithDependent(employeeId: string) {
    await this.findOrThrow(employeeId);
    return this.prisma.familyMember.findMany({
      where: { employeeId },
      include: { dependent: true },
      orderBy: { relationship: 'asc' },
    });
  }
}
