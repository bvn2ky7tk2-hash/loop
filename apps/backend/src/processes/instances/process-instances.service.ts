import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { BpmnEngineService } from '../engine/bpmn-engine.service';
import { DefinitionStatus, InstanceStatus } from '../../generated/prisma';
import { StartInstanceDto } from './dto/start-instance.dto';
import { TenantAwareService } from '../../common/services/tenant-aware.service';

@Injectable({ scope: Scope.REQUEST })
export class ProcessInstancesService extends TenantAwareService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engineService: BpmnEngineService,
    @Inject(REQUEST) req?: any,
  ) {
    super(req);
  }

  async findAll(orgUnitIds: string[] | null, page = 1, pageSize = 20, definitionId?: string, status?: InstanceStatus) {
    const extra = {
      ...(orgUnitIds === null ? {} : { definition: { orgUnitId: { in: orgUnitIds } } }),
      ...(definitionId ? { definitionId } : {}),
      ...(status ? { status } : {}),
    };
    const where = this.tenantWhere(extra);

    const [items, total] = await Promise.all([
      this.prisma.processInstance.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { startedAt: 'desc' },
        include: {
          definition: { select: { id: true, name: true, version: true } },
          startedByUser: { select: { id: true, name: true } },
        },
      }),
      this.prisma.processInstance.count({ where }),
    ]);

    return {
      data: items,
      meta: { total, page, pageSize },
    };
  }

  async findOne(id: string) {
    const instance = await this.prisma.processInstance.findUnique({
      where: { id },
      include: {
        definition: { select: { id: true, name: true, version: true, status: true, bpmnXml: true } },
        startedByUser: { select: { id: true, name: true } },
        userTasks: {
          select: {
            id: true,
            activityId: true,
            name: true,
            status: true,
            assigneeId: true,
            dueDate: true,
            completedAt: true,
          },
        },
      },
    });

    if (!instance) throw new NotFoundException('Không tìm thấy process instance');
    return { data: instance };
  }

  async start(dto: StartInstanceDto, userId: string) {
    const definition = await this.prisma.processDefinition.findUnique({
      where: { id: dto.definitionId },
    });

    if (!definition) throw new NotFoundException('Không tìm thấy process definition');
    if (definition.status !== DefinitionStatus.ACTIVE) {
      throw new BadRequestException('Chỉ có thể khởi động process definition đang ACTIVE');
    }

    // Tạo instance record trước
    const instance = await this.prisma.processInstance.create({
      data: {
        definitionId: dto.definitionId,
        projectId: dto.projectId ?? null,
        startedBy: userId,
        status: InstanceStatus.RUNNING,
        variables: (dto.variables ?? {}) as never,
        tokenState: {} as never,
        tenantId: this.getTenantId() ?? null,
      },
    });

    // Ghi activity log cho start event
    await this.prisma.processActivityLog.create({
      data: {
        instanceId: instance.id,
        activityId: 'start',
        activityName: 'Process Started',
        activityType: 'bpmn:StartEvent',
        performedBy: userId,
        completedAt: new Date(),
      },
    });

    // Khởi động engine và lưu tokenState
    try {
      const tokenState = await this.engineService.start(
        instance.id,
        definition.bpmnXml,
        dto.variables ?? {},
      );

      const updated = await this.prisma.processInstance.update({
        where: { id: instance.id },
        data: { tokenState: tokenState as never },
        include: {
          definition: { select: { id: true, name: true, version: true } },
          startedByUser: { select: { id: true, name: true } },
        },
      });

      return { data: updated };
    } catch {
      // Engine đã set status ERROR bên trong
      const failed = await this.prisma.processInstance.findUnique({
        where: { id: instance.id },
        include: {
          definition: { select: { id: true, name: true, version: true } },
          startedByUser: { select: { id: true, name: true } },
        },
      });
      return { data: failed };
    }
  }

  async cancel(id: string, userId: string) {
    const instance = await this.prisma.processInstance.findUnique({ where: { id } });
    if (!instance) throw new NotFoundException('Không tìm thấy process instance');

    if (instance.status === InstanceStatus.COMPLETED) {
      throw new BadRequestException('Không thể huỷ instance đã hoàn thành');
    }
    if (instance.status === InstanceStatus.CANCELLED) {
      throw new BadRequestException('Instance đã bị huỷ trước đó');
    }

    // Huỷ các user tasks đang pending
    await this.prisma.processUserTask.updateMany({
      where: { instanceId: id, status: { in: ['PENDING', 'IN_PROGRESS'] } },
      data: { status: 'SKIPPED' },
    });

    const updated = await this.prisma.processInstance.update({
      where: { id },
      data: { status: InstanceStatus.CANCELLED, completedAt: new Date() },
    });

    await this.prisma.processActivityLog.create({
      data: {
        instanceId: id,
        activityId: 'cancel',
        activityName: 'Process Cancelled',
        activityType: 'system',
        performedBy: userId,
        completedAt: new Date(),
      },
    });

    return { data: updated };
  }

  async getActivityLog(id: string) {
    const instance = await this.prisma.processInstance.findUnique({ where: { id } });
    if (!instance) throw new NotFoundException('Không tìm thấy process instance');

    const logs = await this.prisma.processActivityLog.findMany({
      where: { instanceId: id },
      orderBy: { startedAt: 'asc' },
    });

    return { data: logs };
  }
}
