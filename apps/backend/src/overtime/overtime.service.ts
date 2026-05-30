import { Injectable, NotFoundException, UnprocessableEntityException, OnModuleInit, Inject } from '@nestjs/common';
import { Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { OtStatus, DefinitionStatus } from '../generated/prisma';
import { PaginatedResult, paginate } from '../common/dto/pagination.dto';
import { ProcessEventBus, ProcessCompletedPayload } from '../processes/process-event-bus.service';
import { CreateOvertimeRequestDto, ListOtQueryDto, RejectOtDto } from './dto/overtime-request.dto';
import { TenantAwareService } from '../common/services/tenant-aware.service';

// Key định danh ProcessDefinition cho quy trình duyệt tăng ca
const OT_PROCESS_KEY = 'overtime-approval';

const OT_INCLUDE = {
  employee: { select: { id: true, fullName: true, userId: true } },
} as const;

@Injectable({ scope: Scope.REQUEST })
export class OvertimeService extends TenantAwareService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: ProcessEventBus,
    @Inject(REQUEST) req?: any,
  ) {
    super(req);
  }

  onModuleInit() {
    this.eventBus.onCompleted(async (payload) => {
      await this.handleProcessCompleted(payload);
    });
  }

  // Xử lý kết quả process khi hoàn tất — cập nhật trạng thái đơn tăng ca
  private async handleProcessCompleted({ instanceId, variables }: ProcessCompletedPayload): Promise<void> {
    const ot = await this.prisma.overtimeRequest.findFirst({
      where: { processInstanceId: instanceId },
    });
    if (!ot) return;

    const decision = variables['decision'] as string | undefined;
    if (!decision) return;

    if (decision === 'APPROVED') {
      await this.prisma.overtimeRequest.update({
        where: { id: ot.id },
        data: {
          status: OtStatus.APPROVED,
          approvedAt: new Date(),
          approvedById: (variables['approvedById'] as string) ?? null,
        },
      });
    } else if (decision === 'REJECTED') {
      await this.prisma.overtimeRequest.update({
        where: { id: ot.id },
        data: {
          status: OtStatus.REJECTED,
          rejectedReason: (variables['rejectedReason'] as string) ?? 'Từ chối qua quy trình',
        },
      });
    }
  }

  async create(dto: CreateOvertimeRequestDto, submittedByUserId: string) {
    // Validate employee tồn tại
    const employee = await this.prisma.employee.findUnique({
      where: { id: dto.employeeId },
      select: { id: true, fullName: true },
    });
    if (!employee) throw new NotFoundException(`Nhân viên ${dto.employeeId} không tồn tại`);

    const ot = await this.prisma.overtimeRequest.create({
      data: {
        employeeId: dto.employeeId,
        date: new Date(dto.date),
        fromTime: dto.fromTime,
        toTime: dto.toTime,
        hours: dto.hours,
        reason: dto.reason,
        status: OtStatus.PENDING,
        ...(this.getTenantId() ? { tenantId: this.getTenantId() } : {}),
      },
      include: OT_INCLUDE,
    });

    // Tự động start BPM process nếu ProcessDefinition 'overtime-approval' tồn tại và ACTIVE
    const definition = await this.prisma.processDefinition.findFirst({
      where: { key: OT_PROCESS_KEY },
      select: { id: true, status: true },
    });

    if (definition?.status === DefinitionStatus.ACTIVE) {
      // Tìm manager = directManager hoặc lãnh đạo đơn vị — dùng làm assignee trong BPM
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
            overtimeRequestId: ot.id,
            employeeId: ot.employeeId,
            date: new Date(dto.date).toISOString(),
            hours: Number(ot.hours),
            reason: ot.reason ?? '',
            // Truyền userId của manager để BPM assign task
            managerUserId: managerUserId ?? null,
          } as any,
          tokenState: {} as any,
        },
      });

      await this.prisma.overtimeRequest.update({
        where: { id: ot.id },
        data: { processInstanceId: instance.id },
      });
    }

    return ot;
  }

  async list(query: ListOtQueryDto): Promise<PaginatedResult<any>> {
    const { employeeId, status, month, year, page = 1, limit = 50 } = query;

    const where: any = this.tenantWhere();
    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;

    // Lọc theo tháng/năm dựa trên trường date
    if (month || year) {
      const now = new Date();
      const targetYear = year ?? now.getFullYear();
      if (month) {
        // Lọc theo tháng cụ thể trong năm
        const startDate = new Date(targetYear, month - 1, 1);
        const endDate = new Date(targetYear, month, 1);
        where.date = { gte: startDate, lt: endDate };
      } else {
        // Chỉ lọc theo năm
        const startDate = new Date(targetYear, 0, 1);
        const endDate = new Date(targetYear + 1, 0, 1);
        where.date = { gte: startDate, lt: endDate };
      }
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.overtimeRequest.findMany({
        where,
        include: OT_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.overtimeRequest.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findOne(id: string) {
    const ot = await this.prisma.overtimeRequest.findUnique({
      where: { id },
      include: {
        ...OT_INCLUDE,
        processInstance: {
          include: {
            userTasks: true,
          },
        },
      },
    });
    if (!ot) throw new NotFoundException(`Đơn tăng ca ${id} không tìm thấy`);
    return ot;
  }

  async cancel(id: string, _userId: string) {
    const ot = await this.findOne(id);

    if (ot.status !== OtStatus.PENDING) {
      throw new UnprocessableEntityException(
        `Chỉ có thể huỷ đơn ở trạng thái PENDING, hiện tại: ${ot.status}`,
      );
    }

    return this.prisma.overtimeRequest.update({
      where: { id },
      data: { status: OtStatus.CANCELLED },
      include: OT_INCLUDE,
    });
  }

  // Fallback khi không có BPM — duyệt trực tiếp
  async approveDirectly(id: string, userId: string) {
    const ot = await this.findOne(id);

    if (ot.status !== OtStatus.PENDING) {
      throw new UnprocessableEntityException(
        `Chỉ có thể duyệt đơn ở trạng thái PENDING, hiện tại: ${ot.status}`,
      );
    }

    return this.prisma.overtimeRequest.update({
      where: { id },
      data: {
        status: OtStatus.APPROVED,
        approvedById: userId,
        approvedAt: new Date(),
      },
      include: OT_INCLUDE,
    });
  }

  async reject(id: string, dto: RejectOtDto, userId: string) {
    const ot = await this.findOne(id);

    if (ot.status !== OtStatus.PENDING) {
      throw new UnprocessableEntityException(
        `Chỉ có thể từ chối đơn ở trạng thái PENDING, hiện tại: ${ot.status}`,
      );
    }

    return this.prisma.overtimeRequest.update({
      where: { id },
      data: {
        status: OtStatus.REJECTED,
        rejectedReason: dto.rejectedReason,
        approvedById: userId,
        approvedAt: new Date(),
      },
      include: OT_INCLUDE,
    });
  }
}
