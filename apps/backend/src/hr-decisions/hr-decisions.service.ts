import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  Logger,
} from '@nestjs/common';
import { Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { PaginatedResult, paginate } from '../common/dto/pagination.dto';
import {
  HrDecisionType,
  HrDecisionStatus,
  WorkHistoryEventType,
  EmployeeStatus,
  Role,
  DefinitionStatus,
  InstanceStatus,
  ContractStatus,
  InsuranceEnrollmentStatus,
  InsuranceEventType,
} from '../generated/prisma';
import {
  CreateHrDecisionDto,
  UpdateHrDecisionDto,
  HrDecisionQueryDto,
} from './dto/hr-decision.dto';
import { BpmnEngineService } from '../processes/engine/bpmn-engine.service';
import { TenantAwareService } from '../common/services/tenant-aware.service';
import { getEmployeeIdsInOrgSubtree } from '../common/utils/org-subtree';

// Map loại quyết định → ký hiệu viết tắt cho mã quyết định tự động
const TYPE_ABBR: Record<HrDecisionType, string> = {
  HIRE: 'TS',
  PROBATION_END: 'TV',
  TRANSFER: 'DC',
  POSITION_CHANGE: 'VT',
  SALARY_CHANGE: 'CL',
  COMMENDATION: 'KT',
  DISCIPLINE: 'KL',
  TERMINATION: 'CH',
  PROMOTION: 'TC',
  SECONDMENT: 'BP',
};

// Map loại quyết định → loại sự kiện WorkHistory tương ứng
const TYPE_TO_EVENT: Record<HrDecisionType, WorkHistoryEventType> = {
  HIRE: WorkHistoryEventType.HR_DECISION,
  PROBATION_END: WorkHistoryEventType.PROBATION_ENDED,
  TRANSFER: WorkHistoryEventType.HR_DECISION,
  POSITION_CHANGE: WorkHistoryEventType.HR_DECISION,
  SALARY_CHANGE: WorkHistoryEventType.HR_DECISION,
  COMMENDATION: WorkHistoryEventType.HR_DECISION,
  DISCIPLINE: WorkHistoryEventType.HR_DECISION,
  TERMINATION: WorkHistoryEventType.HR_DECISION,
  PROMOTION: WorkHistoryEventType.HR_DECISION,
  SECONDMENT: WorkHistoryEventType.HR_DECISION,
};

@Injectable({ scope: Scope.REQUEST })
export class HrDecisionsService extends TenantAwareService {
  private readonly logger = new Logger(HrDecisionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly engineService: BpmnEngineService,
    @Inject(REQUEST) req?: any,
  ) {
    super(req);
  }

  async list(query: HrDecisionQueryDto): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    // HrDecision chưa có tenantId (v6 task) — dùng {} thay tenantWhere()
    const where: Record<string, unknown> = {};

    if (query.employeeId) {
      where['employeeId'] = query.employeeId;
    }
    if (query.type) {
      where['type'] = query.type;
    }
    if (query.status) {
      where['status'] = query.status;
    }
    if (query.effectiveDateFrom || query.effectiveDateTo) {
      where['effectiveDate'] = {
        ...(query.effectiveDateFrom ? { gte: new Date(query.effectiveDateFrom) } : {}),
        ...(query.effectiveDateTo ? { lte: new Date(query.effectiveDateTo) } : {}),
      };
    }
    if (query.orgUnitId) {
      const empIds = await getEmployeeIdsInOrgSubtree(this.prisma, query.orgUnitId);
      where['employeeId'] = { in: empIds };
    }
    if (query.search) {
      where['OR'] = [
        { decisionNumber: { contains: query.search, mode: 'insensitive' } },
        {
          employee: {
            fullName: { contains: query.search, mode: 'insensitive' },
          },
        },
      ];
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.hrDecision.findMany({
        where,
        skip,
        take: limit,
        orderBy: { effectiveDate: 'desc' },
        include: {
          employee: {
            select: {
              id: true, fullName: true, code: true, userId: true,
              orgUnit:  { select: { id: true, name: true, code: true } },
              position: { include: { jobTitle: { select: { id: true, name: true } } } },
            },
          },
        },
      }),
      this.prisma.hrDecision.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findOne(id: string) {
    const decision = await this.prisma.hrDecision.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true, fullName: true, code: true, userId: true,
            orgUnit:  { select: { id: true, name: true, code: true } },
            position: { include: { jobTitle: { select: { id: true, name: true } } } },
          },
        },
        workHistories: { orderBy: { eventDate: 'desc' }, take: 10 },
      },
    });
    if (!decision) throw new NotFoundException('Không tìm thấy quyết định nhân sự');
    return decision;
  }

  async create(dto: CreateHrDecisionDto, createdById: string) {
    // Tự tạo số quyết định nếu không truyền vào
    let decisionNumber = dto.decisionNumber;
    if (!decisionNumber) {
      const year = new Date(dto.effectiveDate).getFullYear();
      const abbr = TYPE_ABBR[dto.type];
      const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
      const endOfYear = new Date(`${year + 1}-01-01T00:00:00.000Z`);
      const count = await this.prisma.hrDecision.count({
        where: {
          type: dto.type,
          createdAt: { gte: startOfYear, lt: endOfYear },
        },
      });
      const seq = String(count + 1).padStart(4, '0');
      decisionNumber = `QĐ-${abbr}-${year}-${seq}`;
    }

    return this.prisma.hrDecision.create({
      data: {
        decisionNumber,
        type: dto.type,
        employeeId: dto.employeeId,
        effectiveDate: new Date(dto.effectiveDate),
        signedDate: dto.signedDate ? new Date(dto.signedDate) : null,
        content: dto.content,
        signedBy: dto.signedBy,
        notes: dto.notes,
        status: HrDecisionStatus.DRAFT,
        fromOrgUnitId: dto.fromOrgUnitId,
        toOrgUnitId: dto.toOrgUnitId,
        fromPositionId: dto.fromPositionId,
        toPositionId: dto.toPositionId,
        fromSalary: dto.fromSalary,
        toSalary: dto.toSalary,
        createdById,
        // HrDecision chưa có tenantId (v6 task) — bỏ qua
      },
      include: {
        employee: {
          select: {
            id: true, fullName: true, code: true, userId: true,
            orgUnit:  { select: { id: true, name: true, code: true } },
            position: { include: { jobTitle: { select: { id: true, name: true } } } },
          },
        },
      },
    });
  }

  async update(id: string, dto: UpdateHrDecisionDto) {
    const decision = await this.prisma.hrDecision.findUnique({ where: { id } });
    if (!decision) throw new NotFoundException('Không tìm thấy quyết định nhân sự');
    if (decision.status !== HrDecisionStatus.DRAFT) {
      throw new BadRequestException('Chỉ có thể sửa quyết định ở trạng thái DRAFT');
    }

    return this.prisma.hrDecision.update({
      where: { id },
      data: {
        ...(dto.decisionNumber !== undefined ? { decisionNumber: dto.decisionNumber } : {}),
        ...(dto.effectiveDate ? { effectiveDate: new Date(dto.effectiveDate) } : {}),
        ...(dto.signedDate !== undefined
          ? { signedDate: dto.signedDate ? new Date(dto.signedDate) : null }
          : {}),
        ...(dto.content !== undefined ? { content: dto.content } : {}),
        ...(dto.signedBy !== undefined ? { signedBy: dto.signedBy } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        ...(dto.fromOrgUnitId !== undefined ? { fromOrgUnitId: dto.fromOrgUnitId } : {}),
        ...(dto.toOrgUnitId !== undefined ? { toOrgUnitId: dto.toOrgUnitId } : {}),
        ...(dto.fromPositionId !== undefined ? { fromPositionId: dto.fromPositionId } : {}),
        ...(dto.toPositionId !== undefined ? { toPositionId: dto.toPositionId } : {}),
        ...(dto.fromSalary !== undefined ? { fromSalary: dto.fromSalary } : {}),
        ...(dto.toSalary !== undefined ? { toSalary: dto.toSalary } : {}),
      },
      include: {
        employee: {
          select: {
            id: true, fullName: true, code: true, userId: true,
            orgUnit:  { select: { id: true, name: true, code: true } },
            position: { include: { jobTitle: { select: { id: true, name: true } } } },
          },
        },
      },
    });
  }

  /**
   * Khởi động BPM process 'employee-offboarding-v1' khi quyết định nghỉ việc được duyệt.
   * Query ProcessDefinition để lấy definitionId, tạo ProcessInstance với biến
   * employeeId và terminationDate, đồng thời cập nhật terminationDate trên employee.
   */
  private async triggerOffboardingProcess(
    decision: {
      id: string;
      employeeId: string;
      effectiveDate: Date;
      employee: { id: string; directManagerId: string | null };
    },
  ): Promise<void> {
    const definition = await this.prisma.processDefinition.findFirst({
      where: { key: 'employee-offboarding-v1' },
      select: { id: true, status: true },
    });

    if (!definition || definition.status !== DefinitionStatus.ACTIVE) return;

    // Lấy thông tin employee + manager để đưa vào biến process
    const employee = await this.prisma.employee.findUnique({
      where: { id: decision.employeeId },
      select: { id: true, directManagerId: true },
    });

    await this.prisma.processInstance.create({
      data: {
        definitionId: definition.id,
        startedBy: decision.employeeId,
        status: 'RUNNING' as any,
        variables: {
          employeeId: decision.employeeId,
          managerId: employee?.directManagerId ?? null,
          terminationDate: (decision.effectiveDate as Date).toISOString(),
          hrDecisionId: decision.id,
        } as any,
        tokenState: {} as any,
      },
    });

    // Cập nhật endDate (terminationDate) trên employee
    await this.prisma.employee.update({
      where: { id: decision.employeeId },
      data: { endDate: decision.effectiveDate },
    });
  }

  async submit(id: string, userId: string, userRole: Role) {
    const decision = await this.prisma.hrDecision.findUnique({ where: { id } });
    if (!decision) throw new NotFoundException('Không tìm thấy quyết định nhân sự');
    if (decision.status !== HrDecisionStatus.DRAFT) {
      throw new BadRequestException('Chỉ có thể nộp quyết định ở trạng thái DRAFT');
    }

    // Chỉ người tạo hoặc ADMIN mới được nộp
    if (decision.createdById !== userId && userRole !== Role.ADMIN) {
      throw new ForbiddenException('Chỉ người tạo hoặc ADMIN mới được nộp quyết định');
    }

    // Validate effectiveDate >= signedDate
    if (decision.signedDate && decision.effectiveDate < decision.signedDate) {
      throw new BadRequestException('Ngày hiệu lực phải >= ngày ký');
    }

    const updated = await this.prisma.hrDecision.update({
      where: { id },
      data: { status: HrDecisionStatus.PENDING },
    });

    await this.startBpmProcess(decision, userId);

    return updated;
  }

  async approve(id: string) {
    const decision = await this.prisma.hrDecision.findUnique({
      where: { id },
      include: { employee: true },
    });
    if (!decision) throw new NotFoundException('Không tìm thấy quyết định nhân sự');
    if (decision.status !== HrDecisionStatus.PENDING) {
      throw new BadRequestException('Chỉ có thể duyệt quyết định ở trạng thái PENDING');
    }

    const approved = await this.prisma.$transaction(async (tx) => {
      // Duyệt quyết định
      const result = await tx.hrDecision.update({
        where: { id },
        data: { status: HrDecisionStatus.APPROVED },
      });

      // Áp dụng hiệu lực
      await this.applyDecisionEffect(tx, decision);

      return result;
    });

    // E18.3 — Khi duyệt quyết định TERMINATION: tự động start BPM offboarding
    if (decision.type === HrDecisionType.TERMINATION) {
      await this.triggerOffboardingProcess(decision);
    }

    return approved;
  }

  async reject(id: string, reason: string) {
    const decision = await this.prisma.hrDecision.findUnique({ where: { id } });
    if (!decision) throw new NotFoundException('Không tìm thấy quyết định nhân sự');
    if (decision.status !== HrDecisionStatus.PENDING) {
      throw new BadRequestException('Chỉ có thể từ chối quyết định ở trạng thái PENDING');
    }

    return this.prisma.hrDecision.update({
      where: { id },
      data: {
        status: HrDecisionStatus.REJECTED,
        notes: reason,
      },
    });
  }

  // Áp dụng hiệu lực quyết định — chạy trong transaction
  private async applyDecisionEffect(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    decision: {
      id: string;
      type: HrDecisionType;
      employeeId: string;
      effectiveDate: Date;
      toOrgUnitId?: string | null;
      fromOrgUnitId?: string | null;
      toPositionId?: string | null;
      fromPositionId?: string | null;
      toSalary?: unknown;
      fromSalary?: unknown;
      decisionNumber?: string | null;
    },
  ) {
    const eventType = TYPE_TO_EVENT[decision.type];
    const titleMap: Record<HrDecisionType, string> = {
      HIRE: 'Tiếp nhận nhân sự',
      PROBATION_END: 'Kết thúc thử việc',
      TRANSFER: 'Điều chuyển',
      POSITION_CHANGE: 'Thay đổi chức vụ',
      SALARY_CHANGE: 'Thay đổi lương',
      COMMENDATION: 'Khen thưởng',
      DISCIPLINE: 'Kỷ luật',
      TERMINATION: 'Chấm dứt hợp đồng',
      PROMOTION: 'Thăng chức',
      SECONDMENT: 'Biệt phái',
    };

    // Áp dụng theo từng loại quyết định
    if (
      decision.type === HrDecisionType.TRANSFER ||
      decision.type === HrDecisionType.POSITION_CHANGE
    ) {
      const updateData: Record<string, unknown> = {};
      if (decision.toOrgUnitId) updateData['orgUnitId'] = decision.toOrgUnitId;
      if (decision.toPositionId) updateData['positionId'] = decision.toPositionId;

      if (Object.keys(updateData).length > 0) {
        await tx.employee.update({
          where: { id: decision.employeeId },
          data: updateData,
        });
      }

      // Tạo PositionHistory nếu position thay đổi
      if (decision.toPositionId && decision.toPositionId !== decision.fromPositionId) {
        // Đóng record cũ — tránh overlap
        await tx.positionHistory.updateMany({
          where: { employeeId: decision.employeeId, endDate: null },
          data: {
            endDate: new Date(decision.effectiveDate.getTime() - 86_400_000),
          },
        });
        await tx.positionHistory.create({
          data: {
            positionId: decision.toPositionId,
            employeeId: decision.employeeId,
            startDate: decision.effectiveDate,
          },
        });
      }
    } else if (
      decision.type === HrDecisionType.SALARY_CHANGE ||
      decision.type === HrDecisionType.PROMOTION
    ) {
      if (decision.toSalary !== null && decision.toSalary !== undefined) {
        await tx.salaryRecord.create({
          data: {
            employeeId: decision.employeeId,
            basicSalary: decision.toSalary as number,
            effectiveDate: decision.effectiveDate,
            source: 'HR_DECISION',
            hrDecisionId: decision.id,
          },
        });

        // Sync Contract.salaryMonthly để PayrollEngine tính lương đúng
        await tx.contract.updateMany({
          where: {
            employeeId: decision.employeeId,
            status: ContractStatus.ACTIVE,
          },
          data: { salaryMonthly: decision.toSalary as number },
        });

        // Auto tạo InsuranceEvent để không cần HR làm tay 2 lần
        const activeEnrollment = await tx.insuranceEnrollment.findFirst({
          where: {
            employeeId: decision.employeeId,
            status: InsuranceEnrollmentStatus.ACTIVE,
          },
        });
        if (activeEnrollment) {
          await tx.insuranceEvent.create({
            data: {
              enrollmentId: activeEnrollment.id,
              eventType: InsuranceEventType.SALARY_CHANGE,
              insuranceSalary: decision.toSalary as number,
              effectiveDate: decision.effectiveDate,
              hrDecisionId: decision.id,
            },
          });
          await tx.insuranceEnrollment.update({
            where: { id: activeEnrollment.id },
            data: { insuranceSalary: decision.toSalary as number },
          });
        }
      }
      // Nếu PROMOTION cũng kèm thay đổi position
      if (decision.type === HrDecisionType.PROMOTION && decision.toPositionId) {
        await tx.employee.update({
          where: { id: decision.employeeId },
          data: {
            ...(decision.toOrgUnitId ? { orgUnitId: decision.toOrgUnitId } : {}),
            positionId: decision.toPositionId,
          },
        });
        if (decision.toPositionId !== decision.fromPositionId) {
          // Đóng record cũ — tránh overlap
          await tx.positionHistory.updateMany({
            where: { employeeId: decision.employeeId, endDate: null },
            data: {
              endDate: new Date(decision.effectiveDate.getTime() - 86_400_000),
            },
          });
          await tx.positionHistory.create({
            data: {
              positionId: decision.toPositionId,
              employeeId: decision.employeeId,
              startDate: decision.effectiveDate,
            },
          });
        }
      }
    } else if (decision.type === HrDecisionType.TERMINATION) {
      await tx.employee.update({
        where: { id: decision.employeeId },
        data: {
          isActive: false,
          employeeStatus: EmployeeStatus.TERMINATED,
          endDate: decision.effectiveDate,
        },
      });
    } else if (decision.type === HrDecisionType.PROBATION_END) {
      await tx.employee.update({
        where: { id: decision.employeeId },
        data: { employeeStatus: EmployeeStatus.ACTIVE },
      });
    }

    // Luôn tạo WorkHistory với description chi tiết
    const description = await this.buildDecisionDescription(decision, tx);
    await tx.workHistory.create({
      data: {
        employeeId: decision.employeeId,
        eventType,
        eventDate: decision.effectiveDate,
        title: titleMap[decision.type],
        description: description || undefined,
        hrDecisionId: decision.id,
      },
    });
  }

  // Helper tạo description chi tiết cho WorkHistory
  private async buildDecisionDescription(
    decision: {
      type: HrDecisionType;
      fromOrgUnitId?: string | null;
      toOrgUnitId?: string | null;
      fromSalary?: unknown;
      toSalary?: unknown;
      decisionNumber?: string | null;
    },
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
  ): Promise<string> {
    const parts: string[] = [];
    if (decision.decisionNumber) parts.push(`QĐ ${decision.decisionNumber}`);

    if (
      (decision.type === HrDecisionType.TRANSFER ||
        decision.type === HrDecisionType.POSITION_CHANGE) &&
      decision.fromOrgUnitId &&
      decision.toOrgUnitId
    ) {
      const [from, to] = await Promise.all([
        tx.orgUnit.findUnique({ where: { id: decision.fromOrgUnitId }, select: { name: true } }),
        tx.orgUnit.findUnique({ where: { id: decision.toOrgUnitId }, select: { name: true } }),
      ]);
      if (from && to) parts.push(`${from.name} → ${to.name}`);
    }

    if (
      decision.type === HrDecisionType.SALARY_CHANGE &&
      decision.fromSalary != null &&
      decision.toSalary != null
    ) {
      parts.push(
        `Lương: ${Number(decision.fromSalary).toLocaleString('vi-VN')} → ${Number(decision.toSalary).toLocaleString('vi-VN')} đ`,
      );
    }

    if (decision.type === HrDecisionType.PROMOTION) {
      parts.push('Thăng chức');
      if (decision.fromSalary != null && decision.toSalary != null) {
        parts.push(
          `${Number(decision.fromSalary).toLocaleString('vi-VN')} → ${Number(decision.toSalary).toLocaleString('vi-VN')} đ`,
        );
      }
    }

    return parts.join(' | ');
  }

  async findByEmployee(employeeId: string) {
    return this.prisma.hrDecision.findMany({
      where: { employeeId },
      orderBy: { effectiveDate: 'desc' },
      include: {
        employee: {
          select: {
            id: true, fullName: true, code: true, userId: true,
            orgUnit:  { select: { id: true, name: true, code: true } },
            position: { include: { jobTitle: { select: { id: true, name: true } } } },
          },
        },
      },
      take: 200,
    });
  }

  private async startBpmProcess(decision: any, userId: string): Promise<void> {
    try {
      const definition = await this.prisma.processDefinition.findFirst({
        where: { key: 'hr-decision-approval', status: DefinitionStatus.ACTIVE },
        select: { id: true, bpmnXml: true },
      });
      if (!definition) return;

      const variables = {
        hrDecisionId:  decision.id,
        type:          decision.type,
        employeeId:    decision.employeeId,
        effectiveDate: (decision.effectiveDate as Date).toISOString(),
      };

      const instance = await this.prisma.processInstance.create({
        data: {
          definitionId: definition.id,
          startedBy:    userId,
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

      await this.prisma.hrDecision.update({
        where: { id: decision.id },
        data:  { processInstanceId: instance.id },
      });

      this.logger.log(`BPM started for HrDecision ${decision.id}`);
    } catch (e) {
      this.logger.warn(`Failed to start BPM for HrDecision ${decision.id}: ${e}`);
    }
  }
}
