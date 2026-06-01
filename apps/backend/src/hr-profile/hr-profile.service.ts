import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { InsuranceEnrollmentStatus } from '../generated/prisma';
import { UpdatePersonalInfoDto } from './dto/hr-profile.dto';
import { TenantAwareService } from '../common/services/tenant-aware.service';

@Injectable({ scope: Scope.REQUEST })
export class HrProfileService extends TenantAwareService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REQUEST) req?: any,
  ) {
    super(req);
  }

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
        // Thông tin cá nhân mở rộng
        gender: employee.gender,
        maritalStatus: employee.maritalStatus,
        phoneNumber: employee.phoneNumber,
        hometown: employee.hometown,
        placeOfBirth: employee.placeOfBirth,
        ethnicity: employee.ethnicity,
        religion: employee.religion,
        nationality: employee.nationality,
        // Giấy tờ tùy thân
        idType: employee.idType,
        idNumber: employee.idNumber,
        idIssueDate: employee.idIssueDate,
        idIssuePlace: employee.idIssuePlace,
        cccd: employee.cccd,
        cccdIssueDate: employee.cccdIssueDate,
        cccdIssuePlace: employee.cccdIssuePlace,
        // Địa chỉ
        permanentAddress: employee.permanentAddress,
        currentAddress: employee.currentAddress,
        // Ngân hàng
        bankAccount: employee.bankAccount,
        bankName: employee.bankName,
        // Thông tin tổ chức
        startDate: employee.startDate,
        endDate: employee.endDate,
        isActive: employee.isActive,
        employeeStatus: employee.employeeStatus,
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
        // Thông tin cơ bản
        ...(dto.fullName !== undefined ? { fullName: dto.fullName } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
        ...(dto.birthdate ? { birthdate: new Date(dto.birthdate) } : {}),
        // Thông tin cá nhân mở rộng
        ...(dto.gender !== undefined ? { gender: dto.gender } : {}),
        ...(dto.maritalStatus !== undefined ? { maritalStatus: dto.maritalStatus } : {}),
        ...(dto.phoneNumber !== undefined ? { phoneNumber: dto.phoneNumber } : {}),
        ...(dto.hometown !== undefined ? { hometown: dto.hometown } : {}),
        ...(dto.placeOfBirth !== undefined ? { placeOfBirth: dto.placeOfBirth } : {}),
        ...(dto.ethnicity !== undefined ? { ethnicity: dto.ethnicity } : {}),
        ...(dto.religion !== undefined ? { religion: dto.religion } : {}),
        ...(dto.nationality !== undefined ? { nationality: dto.nationality } : {}),
        // Giấy tờ
        ...(dto.idType !== undefined ? { idType: dto.idType } : {}),
        ...(dto.idNumber !== undefined ? { idNumber: dto.idNumber } : {}),
        ...(dto.idIssueDate ? { idIssueDate: new Date(dto.idIssueDate) } : {}),
        ...(dto.idIssuePlace !== undefined ? { idIssuePlace: dto.idIssuePlace } : {}),
        // Địa chỉ
        ...(dto.permanentAddress !== undefined ? { permanentAddress: dto.permanentAddress } : {}),
        ...(dto.currentAddress !== undefined ? { currentAddress: dto.currentAddress } : {}),
        // Ngân hàng
        ...(dto.bankAccount !== undefined ? { bankAccount: dto.bankAccount } : {}),
        ...(dto.bankName !== undefined ? { bankName: dto.bankName } : {}),
      },
      select: {
        id: true, code: true, fullName: true, email: true, birthdate: true,
        gender: true, maritalStatus: true, phoneNumber: true, hometown: true, placeOfBirth: true,
        ethnicity: true, religion: true, nationality: true,
        idType: true, idNumber: true, idIssueDate: true, idIssuePlace: true,
        permanentAddress: true, currentAddress: true,
        bankAccount: true, bankName: true,
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
