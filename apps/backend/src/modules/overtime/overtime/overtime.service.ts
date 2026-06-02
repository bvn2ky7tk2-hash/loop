import { Injectable, NotFoundException, UnprocessableEntityException, Inject, Logger } from '@nestjs/common';
import { Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { OtStatus, DefinitionStatus, InstanceStatus } from '../generated/prisma';
import { PaginatedResult, paginate } from '../common/dto/pagination.dto';
import { BpmnEngineService } from '../processes/engine/bpmn-engine.service';
import { CreateOvertimeRequestDto, ListOtQueryDto, RejectOtDto } from './dto/overtime-request.dto';
import { TenantAwareService } from '../common/services/tenant-aware.service';
import { getEmployeeIdsInOrgSubtree } from '../common/utils/org-subtree';

// Key định danh ProcessDefinition cho quy trình duyệt tăng ca
const OT_PROCESS_KEY = 'overtime-approval-v1';

const OT_INCLUDE = {
  employee: {
    select: {
      id: true, fullName: true, code: true, userId: true,
      orgUnit:  { select: { id: true, name: true, code: true } },
      position: { include: { jobTitle: { select: { id: true, name: true } } } },
    },
  },
};

@Injectable({ scope: Scope.REQUEST })
export class OvertimeService extends TenantAwareService {
  private readonly logger = new Logger(OvertimeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly engineService: BpmnEngineService,
    @Inject(REQUEST) req?: any,
  ) {
    super(req);
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
        // OvertimeRequest chưa có tenantId (v6 task)
      },
      include: OT_INCLUDE,
    });

    await this.startBpmProcess(ot, submittedByUserId, dto);


    return ot;
  }

  async list(query: ListOtQueryDto): Promise<PaginatedResult<any>> {
    const { employeeId, status, month, year, orgUnitId, page = 1, limit = 50 } = query;

    // OvertimeRequest chưa có tenantId (v6 task) — dùng {} thay tenantWhere()
    const where: any = {};
    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;
    if (orgUnitId) {
      const empIds = await getEmployeeIdsInOrgSubtree(this.prisma, orgUnitId);
      where.employeeId = { in: empIds };
    }

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

  private async startBpmProcess(ot: any, submittedByUserId: string, dto: CreateOvertimeRequestDto): Promise<void> {
    try {
      const definition = await this.prisma.processDefinition.findFirst({
        where: { key: OT_PROCESS_KEY, status: DefinitionStatus.ACTIVE },
        select: { id: true, bpmnXml: true },
      });
      if (!definition) return;

      const employeeWithUnit = await this.prisma.employee.findUnique({
        where: { id: dto.employeeId },
        include: {
          orgUnit:       { include: { leader: { include: { user: true } } } },
          directManager: { include: { user: true } },
        },
      });
      const manager = (employeeWithUnit as any)?.directManager ?? (employeeWithUnit as any)?.orgUnit?.leader;
      const managerUserId: string | undefined = (manager as any)?.userId ?? undefined;

      const variables = {
        overtimeRequestId: ot.id,
        employeeId:        ot.employeeId,
        date:              new Date(dto.date).toISOString(),
        hours:             Number(ot.hours),
        reason:            ot.reason ?? '',
        managerUserId:     managerUserId ?? null,
      };

      const instance = await this.prisma.processInstance.create({
        data: {
          definitionId: definition.id,
          startedBy:    submittedByUserId,
          status:       InstanceStatus.RUNNING,
          variables:    variables as any,
          tokenState:   {} as any,
        },
      });

      const tokenState = await this.engineService.start(instance.id, definition.bpmnXml, variables);
      await this.prisma.processInstance.update({
        where: { id: instance.id },
        data:  { tokenState: tokenState as any },
      });

      await this.prisma.overtimeRequest.update({
        where: { id: ot.id },
        data:  { processInstanceId: instance.id },
      });

      this.logger.log(`BPM started for OvertimeRequest ${ot.id}`);
    } catch (e) {
      this.logger.warn(`Failed to start BPM for OvertimeRequest ${ot.id}: ${e}`);
    }
  }
}
