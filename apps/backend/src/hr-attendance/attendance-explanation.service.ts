import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
  Inject,
  Logger,
} from '@nestjs/common';
import { Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { PaginatedResult, paginate } from '../common/dto/pagination.dto';
import { getEmployeeIdsInOrgSubtree } from '../common/utils/org-subtree';
import { TenantAwareService } from '../common/services/tenant-aware.service';
import { DefinitionStatus, InstanceStatus } from '../generated/prisma';
import { BpmnEngineService } from '../processes/engine/bpmn-engine.service';
import {
  CreateExplanationDto,
  ExplanationQueryDto,
  ReviewExplanationDto,
} from './dto/attendance-explanation.dto';

const EXPLANATION_INCLUDE = {
  employee: {
    select: {
      id: true, fullName: true, code: true, userId: true,
      orgUnit:  { select: { id: true, name: true, code: true } },
      position: { include: { jobTitle: { select: { id: true, name: true } } } },
    },
  },
  attendanceRecord: {
    select: {
      id: true,
      date: true,
      checkIn: true,
      checkOut: true,
      status: true,
      lateMinutes: true,
      earlyLeaveMinutes: true,
      totalHours: true,
    },
  },
};

const PROCESS_KEY = 'attendance-explanation-v1';

@Injectable({ scope: Scope.REQUEST })
export class AttendanceExplanationService extends TenantAwareService {
  private readonly logger = new Logger(AttendanceExplanationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly engineService: BpmnEngineService,
    @Inject(REQUEST) req?: any,
  ) {
    super(req);
  }

  // ─── Tạo giải trình chấm công → auto start BPM ────────────────────────────
  async create(dto: CreateExplanationDto, startedByUserId?: string): Promise<any> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: dto.employeeId },
      include: {
        directManager: { include: { user: { select: { id: true } } } },
        orgUnit: { include: { leader: { include: { user: { select: { id: true } } } } } },
      },
    });
    if (!employee) throw new NotFoundException('Không tìm thấy nhân viên');

    const explanation = await this.prisma.attendanceExplanation.create({
      data: {
        employeeId: dto.employeeId,
        date: new Date(dto.date),
        attendanceRecordId: dto.attendanceRecordId ?? null,
        type: dto.type as any,
        reason: dto.reason,
        requestedCheckIn: dto.requestedCheckIn ? new Date(dto.requestedCheckIn) : null,
        requestedCheckOut: dto.requestedCheckOut ? new Date(dto.requestedCheckOut) : null,
        status: 'PENDING',
        ...(this.getTenantId() ? { tenantId: this.getTenantId() } : {}),
      },
      include: EXPLANATION_INCLUDE,
    });

    // Tự động start BPM process nếu process definition đang ACTIVE
    try {
      const definition = await this.prisma.processDefinition.findFirst({
        where: { key: PROCESS_KEY, status: DefinitionStatus.ACTIVE },
        select: { id: true, name: true, bpmnXml: true },
      });

      if (definition) {
        const manager =
          (employee as any).directManager ??
          (employee as any).orgUnit?.leader;
        const managerUserId: string | undefined = (manager as any)?.user?.id ?? undefined;

        const userId = startedByUserId ?? employee.userId ?? undefined;

        const variables = {
          attendanceExplanationId: explanation.id,
          employeeId:   dto.employeeId,
          date:         dto.date,
          type:         dto.type,
          reason:       dto.reason,
          managerUserId: managerUserId ?? null,
        };

        const instance = await this.prisma.processInstance.create({
          data: {
            definitionId: definition.id,
            startedBy:    userId ?? 'system',
            status:       InstanceStatus.RUNNING,
            variables:    variables as any,
            tokenState:   {} as any,
            ...(this.getTenantId() ? { tenantId: this.getTenantId() } : {}),
          },
        });

        const tokenState = await this.engineService.start(instance.id, definition.bpmnXml, variables);
        await this.prisma.processInstance.update({
          where: { id: instance.id },
          data:  { tokenState: tokenState as any },
        });

        await this.prisma.attendanceExplanation.update({
          where: { id: explanation.id },
          data:  { processInstanceId: instance.id },
        });

        this.logger.log(`BPM started for explanation ${explanation.id}: instance ${instance.id}`);
      }
    } catch (err) {
      // BPM thất bại không chặn việc tạo giải trình
      this.logger.warn(`Failed to start BPM for explanation ${explanation.id}: ${err}`);
    }

    return explanation;
  }

  // ─── Danh sách giải trình ────────────────────────────────────────────────────
  async list(query: ExplanationQueryDto): Promise<PaginatedResult<any>> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);

    const where: any = this.tenantWhere();
    if (query.employeeId) where.employeeId = query.employeeId;
    if (query.status) where.status = query.status;
    if (query.orgUnitId) {
      const empIds = await getEmployeeIdsInOrgSubtree(this.prisma, query.orgUnitId);
      where.employeeId = { in: empIds };
    }
    if (query.dateFrom || query.dateTo) {
      where.date = {};
      if (query.dateFrom) where.date.gte = new Date(query.dateFrom);
      if (query.dateTo) where.date.lte = new Date(query.dateTo);
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.attendanceExplanation.findMany({
        where,
        include: EXPLANATION_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.attendanceExplanation.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  // ─── Duyệt giải trình → cập nhật AttendanceRecord ──────────────────────────
  async approve(id: string, reviewerId: string, _dto?: ReviewExplanationDto): Promise<any> {
    const explanation = await this.prisma.attendanceExplanation.findUnique({
      where: { id },
      include: { attendanceRecord: true },
    });
    if (!explanation) throw new NotFoundException('Không tìm thấy giải trình');
    if (explanation.status !== 'PENDING') {
      throw new UnprocessableEntityException('Chỉ có thể duyệt giải trình ở trạng thái PENDING');
    }

    const updated = await this.prisma.attendanceExplanation.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedById: reviewerId,
        reviewedAt: new Date(),
      },
      include: EXPLANATION_INCLUDE,
    });

    // Áp dụng hiệu ứng lên AttendanceRecord (nếu có)
    if (explanation.attendanceRecordId) {
      await this.applyExplanationEffect(explanation);
    }

    return updated;
  }

  // ─── Từ chối giải trình ─────────────────────────────────────────────────────
  async reject(id: string, reviewerId: string, dto: ReviewExplanationDto): Promise<any> {
    const explanation = await this.prisma.attendanceExplanation.findUnique({
      where: { id },
    });
    if (!explanation) throw new NotFoundException('Không tìm thấy giải trình');
    if (explanation.status !== 'PENDING') {
      throw new UnprocessableEntityException('Chỉ có thể từ chối giải trình ở trạng thái PENDING');
    }

    return this.prisma.attendanceExplanation.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewedById: reviewerId,
        reviewedAt: new Date(),
        rejectReason: dto.rejectReason ?? null,
      },
      include: EXPLANATION_INCLUDE,
    });
  }

  // ─── Áp dụng hiệu ứng giải trình lên AttendanceRecord ──────────────────────
  async applyExplanationEffect(explanation: any): Promise<void> {
    const recordId = explanation.attendanceRecordId;
    if (!recordId) return;

    const updateData: any = {};

    switch (explanation.type) {
      case 'LATE_ARRIVAL':
        // Xóa phút đi trễ
        updateData.lateMinutes = 0;
        break;

      case 'EARLY_DEPARTURE':
        // Xóa phút về sớm
        updateData.earlyLeaveMinutes = 0;
        break;

      case 'MISSING_CHECKIN':
        // Ghi nhận giờ vào theo yêu cầu
        if (explanation.requestedCheckIn) {
          updateData.checkIn = explanation.requestedCheckIn;
          updateData.lateMinutes = 0;
        }
        break;

      case 'MISSING_CHECKOUT':
        // Ghi nhận giờ ra theo yêu cầu
        if (explanation.requestedCheckOut) {
          updateData.checkOut = explanation.requestedCheckOut;
          updateData.earlyLeaveMinutes = 0;
        }
        break;

      case 'BUSINESS_TRIP':
      case 'ONSITE':
        // Coi như ngày làm đủ: đặt status = PRESENT, clear late/early, totalHours = 8
        updateData.status = 'PRESENT';
        updateData.lateMinutes = 0;
        updateData.earlyLeaveMinutes = 0;
        updateData.totalHours = 8;
        break;

      case 'WFH':
        // WFH: đặt status = PRESENT, clear late/early, totalHours = 8
        updateData.status = 'PRESENT';
        updateData.lateMinutes = 0;
        updateData.earlyLeaveMinutes = 0;
        updateData.totalHours = 8;
        break;

      default:
        break;
    }

    if (Object.keys(updateData).length > 0) {
      await this.prisma.attendanceRecord.update({
        where: { id: recordId },
        data: updateData,
      });
    }
  }
}
