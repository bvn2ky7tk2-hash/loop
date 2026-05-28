import { Injectable, NotFoundException, UnprocessableEntityException, OnModuleInit, Optional } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';
import { LeaveStatus, DefinitionStatus } from '../generated/prisma';
import { PaginatedResult, paginate } from '../common/dto/pagination.dto';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { ApproveLeaveDto } from './dto/approve-leave.dto';
import { ProcessEventBus, ProcessCompletedPayload } from '../processes/process-event-bus.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditLogService } from '../audit-log/audit-log.service';

const LEAVE_REQUEST_INCLUDE = {
  employee: { select: { id: true, fullName: true, userId: true } },
  leaveType: { select: { id: true, name: true, isPaid: true, color: true } },
  approvedBy: { select: { id: true, name: true } },
} as const;

@Injectable()
export class LeavesService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: ProcessEventBus,
    private readonly auditLog: AuditLogService,
    @Optional() private readonly notificationsService?: NotificationsService,
  ) {}

  onModuleInit() {
    this.eventBus.onCompleted(async (payload) => {
      await this.handleProcessCompleted(payload);
    });
  }

  // Xử lý kết quả process khi hoàn tất — cập nhật trạng thái đơn nghỉ phép
  private async handleProcessCompleted({ instanceId, variables }: ProcessCompletedPayload): Promise<void> {
    const leave = await this.prisma.leaveRequest.findFirst({
      where: { processInstanceId: instanceId },
      include: { leaveType: { select: { id: true } } },
    });
    if (!leave) return;

    const decision = variables['decision'] as string | undefined;
    if (!decision) return;

    if (decision === 'APPROVED') {
      await this.prisma.$transaction(async (tx) => {
        await tx.leaveRequest.update({
          where: { id: leave.id },
          data: {
            status: LeaveStatus.APPROVED,
            approvedAt: new Date(),
            approvedById: (variables['approvedById'] as string) ?? null,
          },
        });
        // Cập nhật số ngày đã dùng trong năm
        const year = new Date(leave.startDate).getFullYear();
        await tx.leaveBalance.updateMany({
          where: { employeeId: leave.employeeId, leaveTypeId: leave.leaveTypeId, year },
          data: { usedDays: { increment: Number(leave.days) } },
        });
      });
    } else if (decision === 'REJECTED') {
      await this.prisma.leaveRequest.update({
        where: { id: leave.id },
        data: {
          status: LeaveStatus.REJECTED,
          rejectedReason: (variables['rejectedReason'] as string) ?? 'Từ chối qua quy trình',
        },
      });
    }
  }

  async listRequests(
    employeeId?: string,
    status?: LeaveStatus,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResult<any>> {
    const where: any = {};
    if (employeeId) where.employeeId = employeeId;
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
      },
      include: LEAVE_REQUEST_INCLUDE,
    });

    // Tự động start process nếu loại nghỉ phép có cấu hình process key
    const leaveTypeWithProcess = await this.prisma.leaveType.findUnique({
      where: { id: dto.leaveTypeId },
      select: { processDefinitionKey: true, name: true },
    });

    if (leaveTypeWithProcess?.processDefinitionKey) {
      const definition = await this.prisma.processDefinition.findUnique({
        where: { key: leaveTypeWithProcess.processDefinitionKey },
        select: { id: true, status: true },
      });

      if (definition?.status === DefinitionStatus.ACTIVE) {
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

      // Cập nhật used_days khi được duyệt
      if (dto.status === 'APPROVED') {
        const currentYear = new Date(request.startDate).getFullYear();
        await tx.leaveBalance.updateMany({
          where: {
            employeeId:  request.employeeId,
            leaveTypeId: request.leaveTypeId,
            year:        currentYear,
          },
          data: {
            usedDays: { increment: Number(request.days) },
          },
        });
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

  async listTypes() {
    return this.prisma.leaveType.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
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
