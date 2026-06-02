import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { BpmnEngineService } from '../engine/bpmn-engine.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { DefinitionStatus, InstanceStatus, NotificationType } from '../../generated/prisma';
import { StartInstanceDto } from './dto/start-instance.dto';
import { TenantAwareService } from '../../common/services/tenant-aware.service';

@Injectable({ scope: Scope.REQUEST })
export class ProcessInstancesService extends TenantAwareService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engineService: BpmnEngineService,
    private readonly notificationsService: NotificationsService,
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

      // E23.5: Notify người khởi tạo khi quy trình bắt đầu
      await this.engineService.notifyProcessStarted(instance.id, definition.name, userId);

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

  async cancel(id: string, userId: string, userRole?: string) {
    const instance = await this.prisma.processInstance.findUnique({
      where: { id },
      include: { definition: { select: { name: true } } },
    });
    if (!instance) throw new NotFoundException('Không tìm thấy process instance');

    // E23.7: Chỉ startedBy hoặc ADMIN được cancel
    const isAdmin = userRole === 'ADMIN';
    if (instance.startedBy !== userId && !isAdmin) {
      throw new ForbiddenException('Chỉ người khởi tạo hoặc Admin mới có thể huỷ quy trình này');
    }

    if (instance.status === InstanceStatus.COMPLETED) {
      throw new BadRequestException('Không thể huỷ instance đã hoàn thành');
    }
    if (instance.status === InstanceStatus.CANCELLED) {
      throw new BadRequestException('Instance đã bị huỷ trước đó');
    }

    // Lấy danh sách assignee của các task đang active để notify
    const activeTasks = await this.prisma.processUserTask.findMany({
      where: { instanceId: id, status: { in: ['PENDING', 'IN_PROGRESS'] } },
      select: { id: true, assigneeId: true, name: true },
    });

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

    // E23.7: Notify tất cả assignee của task đang active
    const processName = instance.definition.name;
    const assigneeIds = [...new Set(activeTasks.map((t) => t.assigneeId).filter(Boolean) as string[])];
    for (const assigneeId of assigneeIds) {
      try {
        await this.notificationsService.createAndDeliver(
          assigneeId,
          NotificationType.SYSTEM_ALERT,
          `Quy trình bị huỷ: ${processName}`,
          `Quy trình "${processName}" đã bị huỷ. Các task của bạn trong quy trình này đã bị đóng.`,
          { processInstanceId: id },
        );
      } catch {
        // Không block cancel nếu notify thất bại
      }
    }

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
