import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import {
  PaginatedResult,
  paginate,
} from '../common/dto/pagination.dto';
import { InsuranceEnrollmentStatus, InsuranceEventType } from '../generated/prisma';
import {
  CreateEnrollmentDto,
  CreateInsuranceEventDto,
  CreateSocialInsuranceBookDto,
  InsuranceQueryDto,
  UpdateSocialInsuranceBookDto,
} from './dto/insurance.dto';
import { TenantAwareService } from '../common/services/tenant-aware.service';
import { getEmployeeIdsInOrgSubtree } from '../common/utils/org-subtree';

@Injectable({ scope: Scope.REQUEST })
export class HrInsuranceService extends TenantAwareService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REQUEST) req?: any,
  ) {
    super(req);
  }

  // ── Enrollments ─────────────────────────────────────────────────────────────

  async listEnrollments(query: InsuranceQueryDto): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 50, orgUnitId, status, search } = query;

    // InsuranceEnrollment chưa có tenantId (v6 task)
    const empIds = orgUnitId ? await getEmployeeIdsInOrgSubtree(this.prisma, orgUnitId) : null;
    const where: any = {
      ...(status ? { status: status as InsuranceEnrollmentStatus } : {}),
      ...(empIds ? { employeeId: { in: empIds } } : {}),
      ...(search
        ? {
            employee: {
              OR: [
                { fullName: { contains: search, mode: 'insensitive' } },
                { code: { contains: search, mode: 'insensitive' } },
              ],
            },
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.insuranceEnrollment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          employee: {
            select: {
              id: true, fullName: true, code: true, userId: true,
              orgUnit:  { select: { id: true, name: true, code: true } },
              position: { include: { jobTitle: { select: { id: true, name: true } } } },
            },
          },
          socialInsuranceBook: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.insuranceEnrollment.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async getEnrollmentByEmployee(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new NotFoundException('Nhân viên không tìm thấy');

    const enrollment = await this.prisma.insuranceEnrollment.findFirst({
      where: { employeeId, status: InsuranceEnrollmentStatus.ACTIVE },
      include: {
        events: { orderBy: { effectiveDate: 'desc' } },
        socialInsuranceBook: true,
      },
    });

    return { employee: { id: employee.id, fullName: employee.fullName, code: employee.code }, enrollment };
  }

  async enroll(dto: CreateEnrollmentDto) {
    const employee = await this.prisma.employee.findUnique({ where: { id: dto.employeeId } });
    if (!employee) throw new NotFoundException('Nhân viên không tìm thấy');

    // Kiểm tra đã có enrollment active chưa
    const existing = await this.prisma.insuranceEnrollment.findFirst({
      where: { employeeId: dto.employeeId, status: InsuranceEnrollmentStatus.ACTIVE },
    });
    if (existing) throw new BadRequestException('Nhân viên đã có đăng ký BHXH đang hoạt động');

    const startDate = new Date(dto.startDate);

    // Cảnh báo nếu startDate sau ngày 10 của tháng
    const isLateEnrollment = startDate.getDate() > 10;

    const enrollment = await this.prisma.$transaction(async (tx) => {
      const newEnrollment = await tx.insuranceEnrollment.create({
        data: {
          employeeId: dto.employeeId,
          bhxhBookNumber: dto.bhxhBookNumber,
          insuranceSalary: dto.insuranceSalary,
          startDate,
          status: InsuranceEnrollmentStatus.ACTIVE,
        },
        include: {
          employee: { select: { id: true, fullName: true, code: true } },
        },
      });

      await tx.insuranceEvent.create({
        data: {
          enrollmentId: newEnrollment.id,
          eventType: InsuranceEventType.ENROLL,
          insuranceSalary: dto.insuranceSalary,
          effectiveDate: startDate,
        },
      });

      return newEnrollment;
    });

    if (isLateEnrollment) {
      return {
        warning: `Ngày bắt đầu ${startDate.getDate()}/${startDate.getMonth() + 1} sau ngày 10 — cần kiểm tra kỳ đóng BHXH tháng này`,
        data: enrollment,
      };
    }

    return { data: enrollment };
  }

  // ── Events ───────────────────────────────────────────────────────────────────

  async createEvent(dto: CreateInsuranceEventDto) {
    const enrollment = await this.prisma.insuranceEnrollment.findUnique({
      where: { id: dto.enrollmentId },
    });
    if (!enrollment) throw new NotFoundException('Enrollment không tìm thấy');

    const effectiveDate = new Date(dto.effectiveDate);

    const event = await this.prisma.$transaction(async (tx) => {
      const newEvent = await tx.insuranceEvent.create({
        data: {
          enrollmentId: dto.enrollmentId,
          eventType: dto.eventType,
          insuranceSalary: dto.insuranceSalary,
          effectiveDate,
          reason: dto.reason,
          hrDecisionId: dto.hrDecisionId,
        },
      });

      // Nếu TERMINATE: cập nhật trạng thái enrollment
      if (dto.eventType === InsuranceEventType.TERMINATE) {
        await tx.insuranceEnrollment.update({
          where: { id: dto.enrollmentId },
          data: {
            status: InsuranceEnrollmentStatus.TERMINATED,
            endDate: effectiveDate,
          },
        });
      }

      // Nếu SUSPEND: cập nhật trạng thái enrollment
      if (dto.eventType === InsuranceEventType.SUSPEND) {
        await tx.insuranceEnrollment.update({
          where: { id: dto.enrollmentId },
          data: { status: InsuranceEnrollmentStatus.SUSPENDED },
        });
      }

      // Nếu SALARY_CHANGE: cập nhật insuranceSalary mới
      if (dto.eventType === InsuranceEventType.SALARY_CHANGE && dto.insuranceSalary !== undefined) {
        await tx.insuranceEnrollment.update({
          where: { id: dto.enrollmentId },
          data: { insuranceSalary: dto.insuranceSalary },
        });
      }

      return newEvent;
    });

    return event;
  }

  // ── Dashboard ────────────────────────────────────────────────────────────────

  async getDashboard() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [
      totalActive,
      enrolledThisMonth,
      terminatedThisMonth,
      salaryChangedThisMonth,
      missingBook,
      bookNotReceived,
    ] = await Promise.all([
      this.prisma.insuranceEnrollment.count({
        where: { status: InsuranceEnrollmentStatus.ACTIVE },
      }),
      this.prisma.insuranceEvent.count({
        where: {
          eventType: InsuranceEventType.ENROLL,
          effectiveDate: { gte: startOfMonth, lte: endOfMonth },
        },
      }),
      this.prisma.insuranceEvent.count({
        where: {
          eventType: InsuranceEventType.TERMINATE,
          effectiveDate: { gte: startOfMonth, lte: endOfMonth },
        },
      }),
      this.prisma.insuranceEvent.count({
        where: {
          eventType: InsuranceEventType.SALARY_CHANGE,
          effectiveDate: { gte: startOfMonth, lte: endOfMonth },
        },
      }),
      // Active enrollments không có socialInsuranceBook
      this.prisma.insuranceEnrollment.count({
        where: {
          status: InsuranceEnrollmentStatus.ACTIVE,
          socialInsuranceBook: null,
        },
      }),
      // Sổ BHXH chưa trả cho nhân viên
      this.prisma.socialInsuranceBook.count({
        where: { receivedByEmployee: false },
      }),
    ]);

    return {
      totalActive,
      thisMonth: {
        enrolled: enrolledThisMonth,
        terminated: terminatedThisMonth,
        salaryChanged: salaryChangedThisMonth,
      },
      missingBook,
      bookNotReceived,
    };
  }

  // ── Social Insurance Book ────────────────────────────────────────────────────

  async upsertSocialInsuranceBook(dto: CreateSocialInsuranceBookDto) {
    const employee = await this.prisma.employee.findUnique({ where: { id: dto.employeeId } });
    if (!employee) throw new NotFoundException('Nhân viên không tìm thấy');

    // Lấy enrollment active (nếu có) để liên kết
    const activeEnrollment = await this.prisma.insuranceEnrollment.findFirst({
      where: { employeeId: dto.employeeId, status: InsuranceEnrollmentStatus.ACTIVE },
    });

    return this.prisma.socialInsuranceBook.upsert({
      where: { employeeId: dto.employeeId },
      create: {
        employeeId: dto.employeeId,
        enrollmentId: activeEnrollment?.id,
        bookNumber: dto.bookNumber,
        issueDate: dto.issueDate ? new Date(dto.issueDate) : undefined,
        issueAuthority: dto.issueAuthority,
        receivedByEmployee: false,
      },
      update: {
        bookNumber: dto.bookNumber,
        issueDate: dto.issueDate ? new Date(dto.issueDate) : undefined,
        issueAuthority: dto.issueAuthority,
        enrollmentId: activeEnrollment?.id ?? undefined,
      },
    });
  }

  async updateSocialInsuranceBook(id: string, dto: UpdateSocialInsuranceBookDto) {
    const book = await this.prisma.socialInsuranceBook.findUnique({ where: { id } });
    if (!book) throw new NotFoundException('Sổ BHXH không tìm thấy');

    return this.prisma.socialInsuranceBook.update({
      where: { id },
      data: {
        ...(dto.issueAuthority !== undefined ? { issueAuthority: dto.issueAuthority } : {}),
        ...(dto.receivedByEmployee !== undefined ? { receivedByEmployee: dto.receivedByEmployee } : {}),
        ...(dto.receivedDate ? { receivedDate: new Date(dto.receivedDate) } : {}),
      },
    });
  }

  // ── Export D02-LT ────────────────────────────────────────────────────────────

  async exportD02(year: number, month: number) {
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);

    const events = await this.prisma.insuranceEvent.findMany({
      where: {
        eventType: {
          in: [
            InsuranceEventType.ENROLL,
            InsuranceEventType.TERMINATE,
            InsuranceEventType.SALARY_CHANGE,
          ],
        },
        effectiveDate: { gte: startOfMonth, lte: endOfMonth },
      },
      include: {
        enrollment: {
          include: {
            employee: {
              select: {
                id: true,
                fullName: true,
                code: true,
                birthdate: true,
                orgUnitId: true,
              },
            },
          },
        },
      },
      orderBy: { effectiveDate: 'asc' },
      // Giới hạn an toàn — sự kiện BHXH trong 1 tháng không vượt 500 bản ghi
      take: 500,
    });

    // Trả về shape khớp InsuranceD02Preview của frontend
    const enrolled = events
      .filter((e) => e.eventType === InsuranceEventType.ENROLL)
      .map((e) => ({
        employeeCode: e.enrollment.employee.code,
        fullName: e.enrollment.employee.fullName,
        insuranceSalary: Number(e.insuranceSalary ?? e.enrollment.insuranceSalary),
        effectiveDate: e.effectiveDate.toISOString(),
        reason: e.reason ?? undefined,
      }));

    const terminated = events
      .filter((e) => e.eventType === InsuranceEventType.TERMINATE)
      .map((e) => ({
        employeeCode: e.enrollment.employee.code,
        fullName: e.enrollment.employee.fullName,
        insuranceSalary: Number(e.insuranceSalary ?? e.enrollment.insuranceSalary),
        effectiveDate: e.effectiveDate.toISOString(),
        reason: e.reason ?? undefined,
      }));

    // SALARY_CHANGE: mức cũ = enrollment.insuranceSalary (đã update), mức mới = event.insuranceSalary
    const salaryChanged = events
      .filter((e) => e.eventType === InsuranceEventType.SALARY_CHANGE)
      .map((e) => ({
        employeeCode: e.enrollment.employee.code,
        fullName: e.enrollment.employee.fullName,
        oldSalary: Number(e.enrollment.insuranceSalary),
        newSalary: Number(e.insuranceSalary ?? e.enrollment.insuranceSalary),
        effectiveDate: e.effectiveDate.toISOString(),
      }));

    return { enrolled, terminated, salaryChanged };
  }

  async updateEnrollment(id: string, dto: { insuranceSalary?: number; status?: string; endDate?: string }) {
    const enrollment = await this.prisma.insuranceEnrollment.findUnique({ where: { id } });
    if (!enrollment) throw new NotFoundException('Không tìm thấy đăng ký BHXH');
    return this.prisma.insuranceEnrollment.update({
      where: { id },
      data: {
        ...(dto.insuranceSalary !== undefined ? { insuranceSalary: dto.insuranceSalary } : {}),
        ...(dto.status ? { status: dto.status as InsuranceEnrollmentStatus } : {}),
        ...(dto.endDate ? { endDate: new Date(dto.endDate) } : {}),
      },
      include: { employee: { select: { id: true, fullName: true, code: true } } },
    });
  }
}
