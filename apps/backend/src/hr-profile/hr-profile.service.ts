import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InsuranceEnrollmentStatus } from '../generated/prisma';
import { UpdatePersonalInfoDto } from './dto/hr-profile.dto';

@Injectable()
export class HrProfileService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Profile 360° ─────────────────────────────────────────────────────────────

  async getProfile360(employeeId: string) {
    // Kiểm tra nhân viên tồn tại trước
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        orgUnit: { select: { id: true, name: true } },
        position: {
          include: {
            jobTitle: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!employee) throw new NotFoundException('Nhân viên không tìm thấy');

    // Tải song song các tab dữ liệu
    const [
      workHistory,
      rawSalaryHistory,
      insurance,
      decisions,
      contracts,
      training,
      performance,
    ] = await Promise.all([
      // Tab Công tác — WorkHistory sorted desc
      this.prisma.workHistory.findMany({
        where: { employeeId },
        orderBy: { eventDate: 'desc' },
      }),

      // Tab Lương — SalaryRecord sorted desc
      this.prisma.salaryRecord.findMany({
        where: { employeeId },
        orderBy: { effectiveDate: 'desc' },
      }),

      // Tab BHXH — enrollment active + events + book
      this.prisma.insuranceEnrollment.findFirst({
        where: { employeeId, status: InsuranceEnrollmentStatus.ACTIVE },
        include: {
          events: { orderBy: { effectiveDate: 'desc' } },
          socialInsuranceBook: true,
        },
      }),

      // Tab HrDecision — max 20, sorted desc
      this.prisma.hrDecision.findMany({
        where: { employeeId },
        orderBy: { effectiveDate: 'desc' },
        take: 20,
      }),

      // Tab Hợp đồng
      this.prisma.contract.findMany({
        where: { employeeId },
        orderBy: { startDate: 'desc' },
      }),

      // Tab Đào tạo
      this.prisma.trainingRecord.findMany({
        where: { employeeId },
        include: {
          program: { select: { id: true, title: true, type: true } },
        },
        orderBy: { startDate: 'desc' },
      }),

      // Tab Đánh giá
      this.prisma.performanceReview.findMany({
        where: { employeeId },
        orderBy: { period: 'desc' },
      }),
    ]);

    // Tính % thay đổi lương so với kỳ trước (dùng basicSalary)
    const salaryHistory = rawSalaryHistory.map((record, idx) => {
      const prevRecord = rawSalaryHistory[idx + 1];
      let percentChange: number | null = null;
      if (prevRecord && Number(prevRecord.basicSalary) > 0) {
        percentChange =
          ((Number(record.basicSalary) - Number(prevRecord.basicSalary)) /
            Number(prevRecord.basicSalary)) *
          100;
      }
      return { ...record, percentChange };
    });

    return {
      personal: {
        id: employee.id,
        code: employee.code,
        fullName: employee.fullName,
        birthdate: employee.birthdate,
        email: employee.email,
        level: employee.level,
        cccd: employee.cccd,
        cccdIssueDate: employee.cccdIssueDate,
        cccdIssuePlace: employee.cccdIssuePlace,
        startDate: employee.startDate,
        endDate: employee.endDate,
        isActive: employee.isActive,
        employeeStatus: employee.employeeStatus,
        idType: employee.idType,
        idNumber: employee.idNumber,
        idIssueDate: employee.idIssueDate,
        idIssuePlace: employee.idIssuePlace,
        permanentAddress: employee.permanentAddress,
        currentAddress: employee.currentAddress,
        ethnicity: employee.ethnicity,
        religion: employee.religion,
        nationality: employee.nationality,
        bankAccount: employee.bankAccount,
        bankName: employee.bankName,
        orgUnit: (employee as any).orgUnit,
        position: (employee as any).position,
      },
      workHistory,
      salaryHistory,
      insurance,
      decisions,
      contracts,
      training,
      performance,
    };
  }

  // ── Cập nhật thông tin cá nhân ──────────────────────────────────────────────

  async updatePersonalInfo(employeeId: string, dto: UpdatePersonalInfoDto) {
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new NotFoundException('Nhân viên không tìm thấy');

    return this.prisma.employee.update({
      where: { id: employeeId },
      data: {
        ...(dto.idType !== undefined ? { idType: dto.idType } : {}),
        ...(dto.idNumber !== undefined ? { idNumber: dto.idNumber } : {}),
        ...(dto.idIssueDate ? { idIssueDate: new Date(dto.idIssueDate) } : {}),
        ...(dto.idIssuePlace !== undefined ? { idIssuePlace: dto.idIssuePlace } : {}),
        ...(dto.permanentAddress !== undefined ? { permanentAddress: dto.permanentAddress } : {}),
        ...(dto.currentAddress !== undefined ? { currentAddress: dto.currentAddress } : {}),
        ...(dto.ethnicity !== undefined ? { ethnicity: dto.ethnicity } : {}),
        ...(dto.religion !== undefined ? { religion: dto.religion } : {}),
        ...(dto.nationality !== undefined ? { nationality: dto.nationality } : {}),
        ...(dto.bankAccount !== undefined ? { bankAccount: dto.bankAccount } : {}),
        ...(dto.bankName !== undefined ? { bankName: dto.bankName } : {}),
      },
      select: {
        id: true,
        fullName: true,
        code: true,
        idType: true,
        idNumber: true,
        idIssueDate: true,
        idIssuePlace: true,
        permanentAddress: true,
        currentAddress: true,
        ethnicity: true,
        religion: true,
        nationality: true,
        bankAccount: true,
        bankName: true,
      },
    });
  }

  // ── Danh sách người phụ thuộc ────────────────────────────────────────────────

  async listDependents(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new NotFoundException('Nhân viên không tìm thấy');

    // Dependents liên kết qua EmployeeTaxProfile
    const taxProfile = await this.prisma.employeeTaxProfile.findUnique({
      where: { employeeId },
      include: {
        dependents: {
          orderBy: { name: 'asc' },
        },
      },
    });

    return {
      employeeId,
      taxProfile: taxProfile
        ? {
            taxId: taxProfile.taxId,
            residencyStatus: taxProfile.residencyStatus,
            wageZone: taxProfile.wageZone,
          }
        : null,
      dependents: taxProfile?.dependents ?? [],
    };
  }
}
