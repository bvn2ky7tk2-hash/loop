import { Injectable, NotFoundException, UnprocessableEntityException, ForbiddenException, Optional, Inject } from '@nestjs/common';
import { Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';
import { LeaveStatus, DefinitionStatus } from '../generated/prisma';
import { PaginatedResult, paginate } from '../common/dto/pagination.dto';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { ApproveLeaveDto } from './dto/approve-leave.dto';
import { CreateLeaveTypeDto, UpdateLeaveTypeDto } from './dto/leave-type.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { TenantAwareService } from '../common/services/tenant-aware.service';
import { getEmployeeIdsInOrgSubtree } from '../common/utils/org-subtree';
import { HrEventBus } from '../common/events/hr-event-bus.service';

const LEAVE_REQUEST_INCLUDE = {
  employee: {
    select: {
      id: true, fullName: true, code: true, userId: true,
      orgUnit:  { select: { id: true, name: true, code: true } },
      position: { include: { jobTitle: { select: { id: true, name: true } } } },
    },
  },
  leaveType: { select: { id: true, name: true, isPaid: true, color: true, deductsAnnualLeave: true, maxDaysPerYear: true } },
  approvedBy: { select: { id: true, name: true } },
};

@Injectable({ scope: Scope.REQUEST })
export class LeavesService extends TenantAwareService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly hrEventBus: HrEventBus,
    @Optional() private readonly notificationsService?: NotificationsService,
    @Inject(REQUEST) req?: any,
  ) {
    super(req);
  }

  async listMyRequests(
    userId: string,
    status?: LeaveStatus,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResult<any>> {
    const employee = await this.prisma.employee.findFirst({
      where: { userId, deletedAt: null },
      select: { id: true },
    });
    if (!employee) return paginate([], 0, page, limit);

    const where: any = { employeeId: employee.id };
    if (status) where.status = status;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.leaveRequest.findMany({
        where,
        include: LEAVE_REQUEST_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.leaveRequest.count({ where }),
    ]);
    return paginate(data, total, page, limit);
  }

  async listRequests(
    employeeId?: string,
    status?: LeaveStatus,
    orgUnitId?: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResult<any>> {
    const where: any = this.tenantWhere();
    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;
    if (orgUnitId) {
      const empIds = await getEmployeeIdsInOrgSubtree(this.prisma, orgUnitId);
      where.employeeId = { in: empIds };
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.leaveRequest.findMany({
        where,
        include: LEAVE_REQUEST_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.leaveRequest.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findOne(id: string) {
    const request = await this.prisma.leaveRequest.findUnique({
      where: { id },
      include: LEAVE_REQUEST_INCLUDE,
    });
    if (!request) throw new NotFoundException(`Yêu cầu nghỉ phép ${id} không tìm thấy`);
    return request;
  }

  async createRequest(dto: CreateLeaveRequestDto, submittedByUserId: string) {
    const leaveType = await this.prisma.leaveType.findUnique({
      where: { id: dto.leaveTypeId },
    });
    if (!leaveType) throw new NotFoundException(`Loại nghỉ phép ${dto.leaveTypeId} không tồn tại`);
    if (!leaveType.isActive) {
      throw new UnprocessableEntityException(`Loại nghỉ phép "${leaveType.name}" đã bị vô hiệu hóa`);
    }

    const currentYear = new Date().getFullYear();
    const balance = await this.prisma.leaveBalance.findUnique({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId: dto.employeeId,
          leaveTypeId: dto.leaveTypeId,
          year: currentYear,
        },
      },
    });

    if (balance) {
      const remaining = Number(balance.totalDays) - Number(balance.usedDays);
      if (dto.days > remaining) {
        throw new UnprocessableEntityException(
          `Số ngày nghỉ yêu cầu (${dto.days}) vượt quá số ngày còn lại (${remaining})`,
        );
      }
    }

    const leave = await this.prisma.leaveRequest.create({
      data: {
        employeeId:  dto.employeeId,
        leaveTypeId: dto.leaveTypeId,
        startDate:   new Date(dto.startDate),
        endDate:     new Date(dto.endDate),
        days:        dto.days,
        reason:      dto.reason,
        status:      LeaveStatus.PENDING,
        ...(this.getTenantId() ? { tenantId: this.getTenantId() } : {}),
      },
      include: LEAVE_REQUEST_INCLUDE,
    });

    // Tự động start process nếu loại nghỉ phép có cấu hình process key
    const leaveTypeWithProcess = await this.prisma.leaveType.findUnique({
      where: { id: dto.leaveTypeId },
      select: { processDefinitionKey: true, name: true },
    });

    if (leaveTypeWithProcess?.processDefinitionKey) {
      const definition = await this.prisma.processDefinition.findFirst({
        where: { key: leaveTypeWithProcess.processDefinitionKey },
        select: { id: true, status: true },
      });

      if (definition?.status === DefinitionStatus.ACTIVE) {
        // Tìm manager = directManager hoặc lãnh đạo đơn vị
        const employeeWithUnit = await this.prisma.employee.findUnique({
          where: { id: dto.employeeId },
          include: {
            orgUnit: { include: { leader: { include: { user: true } } } },
            directManager: { include: { user: true } },
          },
        });
        const manager = (employeeWithUnit as any)?.directManager || (employeeWithUnit as any)?.orgUnit?.leader;
        const managerUserId: string | undefined = (manager as any)?.userId ?? undefined;

        const instance = await this.prisma.processInstance.create({
          data: {
            definitionId: definition.id,
            startedBy: submittedByUserId,
            status: 'RUNNING' as any,
            variables: {
              leaveRequestId: leave.id,
              employeeId: leave.employeeId,
              leaveTypeName: leaveTypeWithProcess.name,
              startDate: (leave.startDate as Date).toISOString(),
              endDate: (leave.endDate as Date).toISOString(),
              days: Number(leave.days),
              reason: leave.reason ?? '',
              // Truyền userId của manager để BPM có thể assign task
              managerUserId: managerUserId ?? null,
            } as any,
            tokenState: {} as any,
          },
        });
        await this.prisma.leaveRequest.update({
          where: { id: leave.id },
          data: { processInstanceId: instance.id },
        });
      }
    }

    return leave;
  }

  async approveReject(id: string, dto: ApproveLeaveDto, approverId: string) {
    const request = await this.findOne(id);

    if (request.status !== LeaveStatus.PENDING) {
      throw new UnprocessableEntityException(
        `Chỉ có thể duyệt yêu cầu ở trạng thái PENDING, hiện tại: ${request.status}`,
      );
    }

    if (dto.status === LeaveStatus.REJECTED && !dto.rejectedReason) {
      throw new UnprocessableEntityException('Lý do từ chối là bắt buộc');
    }

    const newStatus = dto.status as LeaveStatus;

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.leaveRequest.update({
        where: { id },
        data: {
          status:         newStatus,
          approvedById:   approverId,
          approvedAt:     new Date(),
          rejectedReason: dto.status === 'REJECTED' ? dto.rejectedReason : null,
        },
        include: LEAVE_REQUEST_INCLUDE,
      });

      // Cập nhật used_days khi được duyệt — upsert để đảm bảo balance luôn tồn tại
      if (dto.status === 'APPROVED') {
        const currentYear = new Date(request.startDate as Date).getFullYear();
        const leaveTypeForBalance = request.leaveType as any;
        const maxDays = leaveTypeForBalance?.maxDaysPerYear ?? 12;
        await tx.leaveBalance.upsert({
          where: {
            employeeId_leaveTypeId_year: {
              employeeId:  request.employeeId,
              leaveTypeId: request.leaveTypeId,
              year:        currentYear,
            },
          },
          create: {
            employeeId:  request.employeeId,
            leaveTypeId: request.leaveTypeId,
            year:        currentYear,
            totalDays:   maxDays,
            usedDays:    Number(request.days),
          },
          update: {
            usedDays: { increment: Number(request.days) },
          },
        });

        // Nếu loại nghỉ có deductsAnnualLeave = true, tự động trừ thêm vào quỹ "Phép năm".
        // (LeaveType là danh mục global — không lọc theo tenant)
        if (leaveTypeForBalance?.deductsAnnualLeave) {
          const annualLeaveType = await tx.leaveType.findFirst({
            where: { name: { contains: 'phép năm', mode: 'insensitive' } },
          });
          // Guard: nếu chính đơn này ĐÃ là loại "Phép năm" thì balance đã được trừ ở trên
          // → KHÔNG trừ lần nữa (tránh double-count cùng một dòng balance).
          if (annualLeaveType && annualLeaveType.id !== request.leaveTypeId) {
            await tx.leaveBalance.upsert({
              where: {
                employeeId_leaveTypeId_year: {
                  employeeId: request.employeeId,
                  leaveTypeId: annualLeaveType.id,
                  year: currentYear,
                },
              },
              create: {
                employeeId: request.employeeId,
                leaveTypeId: annualLeaveType.id,
                year: currentYear,
                totalDays: annualLeaveType.maxDaysPerYear,
                usedDays: Number(request.days),
              },
              update: {
                usedDays: { increment: Number(request.days) },
              },
            });
          }
        }
      }

      return result;
    });

    // Notify requester (employee.userId) về kết quả duyệt
    const employeeWithUser = updated.employee as unknown as { userId?: string; fullName: string };
    if (employeeWithUser?.userId && this.notificationsService) {
      const isApproved = dto.status === 'APPROVED';
      this.notificationsService.createInApp(employeeWithUser.userId, {
        type: isApproved ? 'LEAVE_APPROVED' : 'LEAVE_REJECTED',
        title: isApproved ? 'Đơn nghỉ phép đã được duyệt' : 'Đơn nghỉ phép bị từ chối',
        body: isApproved
          ? `Đơn nghỉ phép ${(request.leaveType as any)?.name ?? ''} (${request.days} ngày) đã được phê duyệt`
          : `Đơn nghỉ phép bị từ chối${dto.rejectedReason ? ': ' + dto.rejectedReason : ''}`,
        link: '/hr/leaves',
        entityType: 'LEAVE',
        entityId: id,
      }).catch(() => {});
    }

    // E16F.4 — Emit leave.approved để HrAttendanceService cập nhật TimesheetRecord
    if (dto.status === 'APPROVED') {
      const leaveType = request.leaveType as any;
      this.hrEventBus.emit({
        type: 'leave.approved',
        refId: id,
        employeeId: request.employeeId,
        metadata: {
          employeeId: request.employeeId,
          startDate: (request.startDate as Date).toISOString(),
          endDate: (request.endDate as Date).toISOString(),
          isPaid: leaveType?.isPaid ?? true,
          days: Number(request.days),
        } as any,
      }).catch(() => {});
    }

    // Ghi audit log — duyệt/từ chối nghỉ phép
    this.auditLog.log({
      userId: approverId,
      action: dto.status === 'APPROVED' ? 'APPROVE' : 'REJECT',
      module: 'hr',
      entity: 'Leave',
      entityId: id,
      newValues: { status: dto.status, rejectedReason: dto.rejectedReason },
    }).catch(() => {});

    return updated;
  }

  async cancelLeave(id: string, requesterId: string) {
    const request = await this.findOne(id);

    // Chỉ nhân viên tạo đơn hoặc ADMIN mới được hủy
    const employee = await this.prisma.employee.findFirst({
      where: { id: request.employeeId },
      select: { userId: true },
    });
    const requesterIsOwner = employee?.userId === requesterId;
    const requester = await this.prisma.user.findUnique({
      where: { id: requesterId },
      select: { role: true },
    });
    const isAdmin = requester?.role === 'ADMIN' || requester?.role === 'LEADERSHIP';

    if (!requesterIsOwner && !isAdmin) {
      throw new ForbiddenException('Không có quyền hủy đơn này');
    }

    if (request.status === 'CANCELLED') {
      throw new UnprocessableEntityException('Đơn đã bị hủy trước đó');
    }

    const wasApproved = request.status === 'APPROVED';

    await this.prisma.$transaction(async (tx) => {
      await tx.leaveRequest.update({
        where: { id },
        data: { status: LeaveStatus.CANCELLED },
      });

      // Hoàn lại usedDays nếu đơn đã được duyệt
      if (wasApproved) {
        const year = new Date(request.startDate as Date).getFullYear();
        await tx.leaveBalance.updateMany({
          where: {
            employeeId:  request.employeeId,
            leaveTypeId: request.leaveTypeId,
            year,
          },
          data: {
            usedDays: { decrement: Number(request.days) },
          },
        });
      }
    });

    this.auditLog.log({
      userId: requesterId,
      action: 'CANCEL',
      module: 'hr',
      entity: 'Leave',
      entityId: id,
      newValues: { status: 'CANCELLED', wasApproved },
    }).catch(() => {});

    return { message: 'Đã hủy đơn nghỉ phép', wasApproved };
  }

  async getBalance(employeeId: string, year?: number) {
    const targetYear = year ?? new Date().getFullYear();

    return this.prisma.leaveBalance.findMany({
      where: { employeeId, year: targetYear },
      include: {
        leaveType: { select: { id: true, name: true, isPaid: true, color: true, maxDaysPerYear: true } },
      },
      orderBy: { leaveType: { name: 'asc' } },
    });
  }

  async getAllBalance(year?: number, orgUnitId?: string, page = 1, limit = 50) {
    const targetYear = year ?? new Date().getFullYear();

    // Lấy tất cả employees thuộc orgUnit (nếu có filter)
    const employeeWhere: any = { deletedAt: null, isActive: true };
    if (orgUnitId) employeeWhere.orgUnitId = orgUnitId;

    const [employees, totalEmployees] = await this.prisma.$transaction([
      this.prisma.employee.findMany({
        where: employeeWhere,
        select: {
          id: true, code: true, fullName: true,
          orgUnit: { select: { id: true, name: true } },
          position: { include: { jobTitle: { select: { id: true, name: true } } } },
        },
        orderBy: { fullName: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.employee.count({ where: employeeWhere }),
    ]);

    const employeeIds = employees.map((e) => e.id);

    // Lấy LeaveBalance cho tất cả employees trong 1 query
    const balances = await this.prisma.leaveBalance.findMany({
      where: { employeeId: { in: employeeIds }, year: targetYear },
      include: {
        leaveType: { select: { id: true, name: true, isPaid: true, color: true, maxDaysPerYear: true } },
      },
    });

    // Lấy lịch sử trừ phép (LeaveRequest APPROVED)
    const leaveHistory = await this.prisma.leaveRequest.findMany({
      where: {
        employeeId: { in: employeeIds },
        status: 'APPROVED',
        startDate: { gte: new Date(targetYear, 0, 1) },
        endDate: { lte: new Date(targetYear, 11, 31) },
      },
      include: {
        leaveType: { select: { id: true, name: true, color: true, isPaid: true } },
      },
      orderBy: { startDate: 'desc' },
    });

    // Group by employeeId
    const balanceMap = new Map<string, typeof balances>();
    for (const b of balances) {
      if (!balanceMap.has(b.employeeId)) balanceMap.set(b.employeeId, []);
      balanceMap.get(b.employeeId)!.push(b);
    }

    const historyMap = new Map<string, typeof leaveHistory>();
    for (const h of leaveHistory) {
      if (!historyMap.has(h.employeeId)) historyMap.set(h.employeeId, []);
      historyMap.get(h.employeeId)!.push(h);
    }

    const data = employees.map((emp) => ({
      employee: emp,
      balances: (balanceMap.get(emp.id) ?? []).map((b) => ({
        leaveTypeId: b.leaveTypeId,
        leaveType: b.leaveType,
        totalDays: Number(b.totalDays),
        usedDays: Number(b.usedDays),
        remainingDays: Number(b.totalDays) - Number(b.usedDays),
        year: b.year,
      })),
      recentHistory: (historyMap.get(emp.id) ?? []).slice(0, 5).map((h) => ({
        id: h.id,
        leaveType: h.leaveType,
        startDate: h.startDate,
        endDate: h.endDate,
        days: Number(h.days),
        reason: h.reason,
        createdAt: h.createdAt,
      })),
    }));

    return { data, total: totalEmployees, page, limit, year: targetYear };
  }

  // Khởi tạo LeaveBalance cho toàn nhân sự × toàn loại phép trong năm
  // Chỉ tạo bản ghi chưa tồn tại — không ghi đè dữ liệu đã có
  async initBalances(year: number, orgUnitId?: string) {
    const employeeWhere: any = { isActive: true, deletedAt: null };
    if (orgUnitId) employeeWhere.orgUnitId = orgUnitId;

    const [employees, leaveTypes] = await Promise.all([
      this.prisma.employee.findMany({ where: employeeWhere, select: { id: true } }),
      this.prisma.leaveType.findMany({ where: { isActive: true }, select: { id: true, maxDaysPerYear: true } }),
    ]);

    if (employees.length === 0) return { message: 'Không có nhân viên nào', created: 0, employees: 0 };
    if (leaveTypes.length === 0) return { message: 'Không có loại phép nào', created: 0, employees: 0 };

    // Batch upsert — upsert với update {} nghĩa là bỏ qua bản ghi đã tồn tại
    const upserts = employees.flatMap((emp) =>
      leaveTypes.map((lt) =>
        this.prisma.leaveBalance.upsert({
          where: { employeeId_leaveTypeId_year: { employeeId: emp.id, leaveTypeId: lt.id, year } },
          create: { employeeId: emp.id, leaveTypeId: lt.id, year, totalDays: lt.maxDaysPerYear, usedDays: 0 },
          update: {}, // giữ nguyên bản ghi đã có, chỉ tạo mới khi chưa có
        }),
      ),
    );

    // Chạy song song theo batch 200 để tránh quá tải transaction
    const BATCH = 200;
    let created = 0;
    for (let i = 0; i < upserts.length; i += BATCH) {
      await this.prisma.$transaction(upserts.slice(i, i + BATCH));
      created += Math.min(BATCH, upserts.length - i);
    }

    return {
      message: `Đã khởi tạo phép năm ${year} cho ${employees.length} nhân viên × ${leaveTypes.length} loại phép`,
      year,
      employees: employees.length,
      leaveTypes: leaveTypes.length,
      total: employees.length * leaveTypes.length,
    };
  }

  async getMonthlyStats(year: number, orgUnitId?: string) {
    const where: any = {
      status: 'APPROVED',
      startDate: { gte: new Date(year, 0, 1) },
      endDate:   { lte: new Date(year, 11, 31) },
    };
    if (orgUnitId) where.employee = { orgUnitId };

    const requests = await this.prisma.leaveRequest.findMany({
      where,
      include: { leaveType: { select: { id: true, name: true, color: true } } },
    });

    // Tổng hợp theo tháng (theo startDate)
    type TypeEntry = { leaveTypeId: string; name: string; color: string; days: number };
    type MonthEntry = { totalRequests: number; totalDays: number; byType: Map<string, TypeEntry> };
    const monthMap = new Map<number, MonthEntry>();
    for (let m = 1; m <= 12; m++) {
      monthMap.set(m, { totalRequests: 0, totalDays: 0, byType: new Map() });
    }
    for (const req of requests) {
      const m = new Date(req.startDate as Date).getMonth() + 1;
      const entry = monthMap.get(m)!;
      entry.totalRequests++;
      entry.totalDays += Number(req.days);
      const tid = req.leaveTypeId;
      if (!entry.byType.has(tid)) {
        entry.byType.set(tid, {
          leaveTypeId: tid,
          name: (req as any).leaveType?.name ?? 'Nghỉ phép',
          color: (req as any).leaveType?.color ?? '#6366F1',
          days: 0,
        });
      }
      entry.byType.get(tid)!.days += Number(req.days);
    }

    const months = Array.from(monthMap.entries()).map(([month, d]) => ({
      month,
      totalRequests: d.totalRequests,
      totalDays:     d.totalDays,
      byType:        Array.from(d.byType.values()),
    }));

    return { year, months };
  }

  async listTypes(includeInactive = false) {
    return this.prisma.leaveType.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async createType(dto: CreateLeaveTypeDto) {
    return this.prisma.leaveType.create({
      data: {
        name: dto.name,
        maxDaysPerYear: dto.maxDaysPerYear ?? 0,
        isPaid: dto.isPaid ?? true,
        color: dto.color ?? '#2563EB',
        annualDays: dto.annualDays ?? 0,
        maxCarryOver: dto.maxCarryOver ?? 0,
        deductsAnnualLeave: dto.deductsAnnualLeave ?? false,
        processDefinitionKey: dto.processDefinitionKey ?? null,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateType(id: string, dto: UpdateLeaveTypeDto) {
    const exists = await this.prisma.leaveType.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Không tìm thấy loại nghỉ');
    return this.prisma.leaveType.update({ where: { id }, data: { ...dto } });
  }

  async removeType(id: string) {
    const exists = await this.prisma.leaveType.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Không tìm thấy loại nghỉ');
    // Soft-delete giữ lịch sử đơn/balance đã tham chiếu
    await this.prisma.leaveType.update({ where: { id }, data: { isActive: false } });
    return { message: 'Đã vô hiệu hóa loại nghỉ' };
  }

  async exportExcel(): Promise<Buffer> {
    const requests = await this.prisma.leaveRequest.findMany({
      include: LEAVE_REQUEST_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Nghỉ phép');

    ws.columns = [
      { header: 'Nhân viên',      key: 'employee',  width: 25 },
      { header: 'Loại nghỉ',      key: 'leaveType', width: 18 },
      { header: 'Từ ngày',        key: 'from',      width: 13 },
      { header: 'Đến ngày',       key: 'to',        width: 13 },
      { header: 'Số ngày',        key: 'days',      width: 10 },
      { header: 'Trạng thái',     key: 'status',    width: 13 },
    ];

    ws.getRow(1).font = { bold: true };

    requests.forEach((r) => {
      ws.addRow({
        employee:  (r as { employee?: { fullName?: string } }).employee?.fullName ?? '',
        leaveType: (r as { leaveType?: { name?: string } }).leaveType?.name ?? '',
        from:      new Date(r.startDate).toLocaleDateString('vi-VN'),
        to:        new Date(r.endDate).toLocaleDateString('vi-VN'),
        days:      Number(r.days),
        status:    r.status,
      });
    });

    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }
}
