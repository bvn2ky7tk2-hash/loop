import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter } from 'node:events';
import { Engine } from 'bpmn-engine';
import type { BpmnEngineExecutionState } from 'bpmn-engine';
import { PrismaService } from '../../prisma/prisma.service';
import { InstanceStatus, UserTaskStatus } from '../../generated/prisma';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationType } from '../../generated/prisma';
import { ProcessEventBus } from '../process-event-bus.service';
import type { AssigneeConfigDto, StepConfigItemDto, NotificationTriggerDto } from '../definitions/dto/create-definition.dto';
import { DelegationService } from '../../delegation/delegation.service';

export interface WaitEventApi {
  id: string;
  executionId?: string;
  name?: string;
  type?: string;
  owner?: { id: string };
  fields?: { routingKey: string };
  content?: {
    id?: string;
    name?: string;
    type?: string;
    executionId?: string;
    [key: string]: unknown;
  };
  signal?: (variables?: Record<string, unknown>) => void;
}

// ─── Internal types for stepConfig JSON from DB ───────────────────────────────

interface StepConfigMap {
  [activityId: string]: StepConfigItemDto;
}

interface TemplateContext {
  process: { name: string };
  task: { name: string; dueDate?: string };
  requester: { name: string; email: string };
  assignee: { name: string; email: string };
  recipient: { name: string; email: string };
  variables: Record<string, unknown>;
}

@Injectable()
export class BpmnEngineService {
  private readonly logger = new Logger(BpmnEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly eventBus: ProcessEventBus,
    private readonly delegationService: DelegationService,
  ) {}

  /**
   * Khởi động một process instance mới từ bpmnXml.
   * Trả về tokenState (serialized engine state) và danh sách wait events.
   */
  async start(
    instanceId: string,
    bpmnXml: string,
    variables: Record<string, unknown>,
  ): Promise<BpmnEngineExecutionState> {
    const engine = new Engine({ name: instanceId, source: bpmnXml });
    const listener = new EventEmitter();

    const waitActivities: WaitEventApi[] = [];

    listener.on('wait', (api: WaitEventApi) => {
      waitActivities.push(api);
    });

    try {
      const execution = await engine.execute({
        listener,
        variables,
      });

      const state = await engine.getState();

      await this.prisma.processInstance.update({
        where: { id: instanceId },
        data: { tokenState: state as never },
      });

      await this.handleWaitActivities(instanceId, waitActivities);
      await this.checkCompletion(instanceId, execution.state);

      return state;
    } catch (err) {
      this.logger.warn(`BpmnEngine start error instanceId=${instanceId}`, err);
      await this.prisma.processInstance.update({
        where: { id: instanceId },
        data: { status: InstanceStatus.ERROR },
      });
      await this.prisma.processActivityLog.create({
        data: {
          instanceId,
          activityId: 'engine',
          activityName: 'Engine Error',
          activityType: 'error',
          completedAt: new Date(),
        },
      });
      throw err;
    }
  }

  /**
   * Khôi phục engine từ tokenState đã lưu và resume execution.
   */
  async resume(
    instanceId: string,
    bpmnXml: string,
    tokenState: BpmnEngineExecutionState,
  ): Promise<BpmnEngineExecutionState> {
    const engine = new Engine({ name: instanceId, source: bpmnXml });
    engine.recover(tokenState);

    const listener = new EventEmitter();
    const waitActivities: WaitEventApi[] = [];

    listener.on('wait', (api: WaitEventApi) => {
      waitActivities.push(api);
    });

    try {
      const execution = await engine.resume({ listener });
      const state = await engine.getState();
      await this.handleWaitActivities(instanceId, waitActivities);
      await this.checkCompletion(instanceId, execution.state);
      return state;
    } catch (err) {
      this.logger.warn(`BpmnEngine resume error instanceId=${instanceId}`, err);
      throw err;
    }
  }

  /**
   * Complete a user task và tiếp tục execution.
   */
  async completeUserTask(
    instanceId: string,
    activityId: string,
    variables: Record<string, unknown>,
  ): Promise<BpmnEngineExecutionState> {
    const instance = await this.prisma.processInstance.findUnique({
      where: { id: instanceId },
      include: { definition: true },
    });

    if (!instance) throw new Error(`Instance ${instanceId} not found`);
    if (instance.status !== InstanceStatus.RUNNING) {
      throw new Error(`Instance ${instanceId} is not running (status: ${instance.status})`);
    }

    const bpmnXml = instance.definition.bpmnXml;
    const tokenState = instance.tokenState as unknown as BpmnEngineExecutionState;

    const stateWithVars = mergeVariablesIntoState(tokenState, variables);

    const engine = new Engine({ name: instanceId, source: bpmnXml });
    engine.recover(stateWithVars);

    const listener = new EventEmitter();
    let postSignal = false;
    const newWaitActivities: WaitEventApi[] = [];

    listener.on('wait', (api: WaitEventApi) => {
      if (postSignal) newWaitActivities.push(api);
    });

    const execution = await engine.resume({ listener });
    postSignal = true;

    execution.signal({ id: activityId, ...variables });

    let settledBy = 'timeout';
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => { settledBy = 'timeout'; resolve(); }, 800);
      listener.once('wait', () => { clearTimeout(timeout); settledBy = 'wait'; resolve(); });
      engine.once('end', () => { clearTimeout(timeout); settledBy = 'end'; resolve(); });
    });

    this.logger.log(
      `completeUserTask settled by=${settledBy} execution.state=${execution.state} newWaits=${newWaitActivities.length} instance=${instanceId.slice(0, 8)}`,
    );

    const newState = await engine.getState();
    this.logger.log(`newState.state=${(newState as { state?: string }).state} instance=${instanceId.slice(0, 8)}`);

    await this.prisma.processInstance.update({
      where: { id: instanceId },
      data: { tokenState: newState as never },
    });

    await this.handleWaitActivities(instanceId, newWaitActivities);
    await this.checkCompletion(instanceId, execution.state);

    return newState;
  }

  /**
   * Trigger timer boundary event.
   */
  async triggerTimerEvent(
    instanceId: string,
    activityId: string,
  ): Promise<BpmnEngineExecutionState> {
    const instance = await this.prisma.processInstance.findUnique({
      where: { id: instanceId },
      include: { definition: true },
    });

    if (!instance) throw new Error(`Instance ${instanceId} not found`);
    if (instance.status !== InstanceStatus.RUNNING) return instance.tokenState as unknown as BpmnEngineExecutionState;

    const bpmnXml = instance.definition.bpmnXml;
    const tokenState = instance.tokenState as unknown as BpmnEngineExecutionState;

    const engine = new Engine({ name: instanceId, source: bpmnXml });
    engine.recover(tokenState);

    const listener = new EventEmitter();
    const waitActivities: WaitEventApi[] = [];
    listener.on('wait', (api: WaitEventApi) => waitActivities.push(api));

    const execution = await engine.resume({ listener });
    execution.cancelActivity({ id: activityId });

    await new Promise<void>((resolve) => setTimeout(resolve, 300));

    const newState = await engine.getState();

    await this.prisma.processInstance.update({
      where: { id: instanceId },
      data: { tokenState: newState as never },
    });

    await this.handleWaitActivities(instanceId, waitActivities);
    await this.checkCompletion(instanceId, execution.state);

    return newState;
  }

  /**
   * Gửi notification khi task hoàn thành — gọi từ ProcessUserTasksService.
   */
  async sendCompletionNotification(
    taskId: string,
    instanceId: string,
    activityId: string,
    taskName: string,
  ): Promise<void> {
    try {
      const instance = await this.prisma.processInstance.findUnique({
        where: { id: instanceId },
        include: { definition: true, startedByUser: true },
      });
      if (!instance) return;

      const stepConfig = (instance.definition.stepConfig as StepConfigMap | null)?.[activityId];
      const trigger = stepConfig?.notificationConfig?.taskCompleted;
      if (!trigger?.enabled || !trigger.recipients?.length) return;

      const task = await this.prisma.processUserTask.findUnique({
        where: { id: taskId },
        include: { assignee: true },
      });
      if (!task) return;

      await this.sendStepNotification(trigger, {
        taskId,
        instanceId,
        taskName,
        instance,
        assignee: task.assignee ?? null,
        dueDate: task.dueDate?.toISOString(),
      });
    } catch (err) {
      this.logger.warn(`sendCompletionNotification failed taskId=${taskId}`, err);
    }
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  private async handleWaitActivities(
    instanceId: string,
    waitActivities: WaitEventApi[],
  ): Promise<void> {
    for (const api of waitActivities) {
      const content = api.content ?? api;
      const activityId = (content as { id?: string }).id ?? api.id ?? 'unknown';
      const activityName = (content as { name?: string }).name ?? activityId;
      const activityType = (content as { type?: string }).type ?? '';

      if (activityType.includes('UserTask') || activityType === 'bpmn:UserTask') {
        await this.createUserTaskRecord(instanceId, activityId, activityName, content as unknown as Record<string, unknown>);
      } else if (activityType.includes('TimerEvent') || activityType.includes('Boundary')) {
        this.logger.debug(`Timer event detected: ${activityId} on instance ${instanceId}`);
      } else {
        this.logger.warn(`Unsupported wait activity type="${activityType}" id="${activityId}" on instance ${instanceId}`);
      }
    }
  }

  private async createUserTaskRecord(
    instanceId: string,
    activityId: string,
    name: string,
    content: Record<string, unknown>,
  ): Promise<void> {
    const existing = await this.prisma.processUserTask.findFirst({
      where: { instanceId, activityId, status: { in: [UserTaskStatus.PENDING, UserTaskStatus.IN_PROGRESS] } },
    });
    if (existing) return;

    const formData = (content.formData ?? content.form ?? null) as Record<string, unknown> | null;
    const dueDateRaw = content.dueDate as string | null | undefined;
    const dueDate = dueDateRaw ? new Date(dueDateRaw) : null;

    // Load definition stepConfig + instance để resolve assignee
    const instance = await this.prisma.processInstance.findUnique({
      where: { id: instanceId },
      include: { definition: true, startedByUser: true },
    });

    // Resolve assignee theo stepConfig, fallback về content.assigneeId (BPMN property)
    let assigneeId: string | null = (content.assigneeId ?? content.assignee ?? null) as string | null;
    const stepConfig = (instance?.definition.stepConfig as StepConfigMap | null)?.[activityId];

    if (stepConfig?.assigneeConfig && instance) {
      const resolved = await this.resolveAssignee(stepConfig.assigneeConfig, {
        startedBy: instance.startedBy,
        variables: instance.variables,
        startedByUser: instance.startedByUser,
      });
      if (resolved) assigneeId = resolved;
    }

    const task = await this.prisma.processUserTask.create({
      data: {
        instanceId,
        activityId,
        name,
        assigneeId,
        formData: formData as never,
        dueDate,
        status: UserTaskStatus.PENDING,
      },
    });

    // Delegation middleware: nếu assignee đang ủy quyền, tạo task bản sao cho delegate
    if (assigneeId && instance) {
      try {
        const moduleType = (instance.definition as any).moduleType ?? 'GENERAL';
        const delegation = await this.delegationService.findActiveDelegation(assigneeId, moduleType);
        if (delegation) {
          const delegator = await this.prisma.user.findUnique({
            where: { id: assigneeId },
            select: { name: true },
          });
          const delegatorName = delegator?.name ?? assigneeId;
          await this.prisma.processUserTask.create({
            data: {
              instanceId,
              activityId: `${activityId}_delegated`,
              name,
              assigneeId: delegation.delegateId,
              formData: formData as never,
              dueDate,
              status: UserTaskStatus.PENDING,
              // Lưu ghi chú ủy quyền trong formData nếu không có field riêng
            },
          });
          this.logger.log(
            `Delegation: task "${name}" (${task.id}) sao chép cho delegate ${delegation.delegateId} từ ${assigneeId}`,
          );
          // Thông báo cho delegate
          try {
            await this.notificationsService.createAndDeliver(
              delegation.delegateId,
              NotificationType.PROCESS_TASK_ASSIGNED,
              'Bạn có task được ủy quyền',
              `Task "${name}" được ủy quyền từ ${delegatorName}`,
              { processUserTaskId: task.id, instanceId, delegatedFrom: assigneeId },
            );
          } catch (err) {
            this.logger.warn(`Không thể gửi notification delegation cho ${delegation.delegateId}`, err);
          }
        }
      } catch (err) {
        // Delegation không block task chính — chỉ log warning
        this.logger.warn(`Delegation check thất bại cho task ${task.id}`, err);
      }
    }

    await this.prisma.processActivityLog.create({
      data: {
        instanceId,
        activityId,
        activityName: name,
        activityType: 'bpmn:UserTask',
        performedBy: assigneeId ?? null,
      },
    });

    // Notification qua stepConfig (ưu tiên) hoặc fallback notification cơ bản
    if (instance) {
      const trigger = stepConfig?.notificationConfig?.taskAssigned;
      if (trigger?.enabled && trigger.recipients?.length) {
        const assigneeUser = assigneeId
          ? await this.prisma.user.findUnique({ where: { id: assigneeId } })
          : null;

        await this.sendStepNotification(trigger, {
          taskId: task.id,
          instanceId,
          taskName: name,
          instance: {
            startedBy: instance.startedBy,
            variables: instance.variables,
            definition: { name: instance.definition.name },
            startedByUser: {
              name: instance.startedByUser.name,
              email: instance.startedByUser.email ?? null,
            },
          },
          assignee: assigneeUser,
          dueDate: dueDate?.toISOString(),
        });
      } else if (assigneeId) {
        // Fallback: notification cơ bản khi chưa cấu hình stepConfig
        try {
          await this.notificationsService.createAndDeliver(
            assigneeId,
            NotificationType.PROCESS_TASK_ASSIGNED,
            'Bạn có task quy trình mới',
            `Task "${name}" đang chờ bạn xử lý`,
            { processUserTaskId: task.id, instanceId },
          );
        } catch (err) {
          this.logger.warn(`Không thể gửi notification cho user task ${task.id}`, err);
        }
      }
    }
  }

  /**
   * Resolve assignee từ AssigneeConfigDto.
   * Trả về userId hoặc null nếu không tìm được.
   */
  private async resolveAssignee(
    config: AssigneeConfigDto,
    instance: { startedBy: string; variables: unknown; startedByUser: { orgUnitId?: string | null } },
  ): Promise<string | null> {
    switch (config.mode) {
      case 'fixed':
        return config.userId ?? null;

      case 'orgunit': {
        if (!config.orgUnitId) return null;
        const user = await this.prisma.user.findFirst({
          where: {
            orgUnitId: config.orgUnitId,
            isActive: true,
            ...(config.role ? { role: config.role as never } : {}),
          },
          select: { id: true },
          orderBy: { createdAt: 'asc' },
        });
        return user?.id ?? null;
      }

      case 'requester_manager': {
        const requester = await this.prisma.user.findUnique({
          where: { id: instance.startedBy },
          select: { orgUnitId: true },
        });
        if (!requester?.orgUnitId) return null;
        // Tìm user có role LEADERSHIP hoặc PM trong cùng phòng ban
        const manager = await this.prisma.user.findFirst({
          where: {
            orgUnitId: requester.orgUnitId,
            isActive: true,
            role: { in: ['LEADERSHIP', 'PM'] as never[] },
            id: { not: instance.startedBy },
          },
          select: { id: true },
          orderBy: { createdAt: 'asc' },
        });
        return manager?.id ?? null;
      }

      case 'variable': {
        if (!config.variablePath) return null;
        const vars = instance.variables as Record<string, unknown>;
        const val = vars?.[config.variablePath];
        return typeof val === 'string' ? val : null;
      }

      default:
        return null;
    }
  }

  /**
   * Render template {{key.subkey}} với context object.
   */
  private renderTemplate(template: string, ctx: TemplateContext): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (_, path: string) => {
      const parts = path.trim().split('.');
      let val: unknown = ctx;
      for (const part of parts) {
        if (val && typeof val === 'object' && part in (val as Record<string, unknown>)) {
          val = (val as Record<string, unknown>)[part];
        } else {
          val = undefined;
          break;
        }
      }
      return val != null ? String(val) : `{{${path}}}`;
    });
  }

  /**
   * Resolve danh sách userId từ recipients config.
   */
  private async resolveRecipientIds(
    recipients: string[],
    instanceId: string,
    assigneeId: string | null,
    startedBy: string,
    instanceVariables: Record<string, unknown>,
  ): Promise<string[]> {
    const ids = new Set<string>();

    for (const r of recipients) {
      if (r === 'assignee' && assigneeId) {
        ids.add(assigneeId);
      } else if (r === 'requester') {
        ids.add(startedBy);
      } else if (r === 'requester_manager') {
        const requester = await this.prisma.user.findUnique({
          where: { id: startedBy },
          select: { orgUnitId: true },
        });
        if (requester?.orgUnitId) {
          const manager = await this.prisma.user.findFirst({
            where: {
              orgUnitId: requester.orgUnitId,
              isActive: true,
              role: { in: ['LEADERSHIP', 'PM'] as never[] },
              id: { not: startedBy },
            },
            select: { id: true },
          });
          if (manager) ids.add(manager.id);
        }
      } else if (r.startsWith('user:')) {
        const uid = r.slice(5);
        if (uid) ids.add(uid);
      } else if (r.startsWith('{{') && r.endsWith('}}')) {
        // {{variables.fieldName}}
        const path = r.slice(2, -2).trim();
        const parts = path.split('.');
        if (parts[0] === 'variables' && parts[1]) {
          const val = instanceVariables[parts[1]];
          if (typeof val === 'string') ids.add(val);
        }
      }
    }

    return Array.from(ids);
  }

  /**
   * Gửi notification theo trigger config cho một bước quy trình.
   */
  private async sendStepNotification(
    trigger: NotificationTriggerDto,
    ctx: {
      taskId: string;
      instanceId: string;
      taskName: string;
      instance: {
        startedBy: string;
        variables: unknown;
        definition: { name: string };
        startedByUser: { name: string; email?: string | null };
      };
      assignee: { id: string; name: string; email?: string | null } | null;
      dueDate?: string;
    },
  ): Promise<void> {
    const { instance, assignee, taskName, dueDate } = ctx;
    const instanceVars = (instance.variables ?? {}) as Record<string, unknown>;

    const recipientIds = await this.resolveRecipientIds(
      trigger.recipients,
      ctx.instanceId,
      assignee?.id ?? null,
      instance.startedBy,
      instanceVars,
    );

    if (!recipientIds.length) return;

    // Load user info cho tất cả recipients một lần
    const recipientUsers = await this.prisma.user.findMany({
      where: { id: { in: recipientIds }, isActive: true },
      select: { id: true, name: true, email: true },
    });

    for (const recipient of recipientUsers) {
      const templateCtx: TemplateContext = {
        process: { name: instance.definition.name },
        task: { name: taskName, dueDate: dueDate ?? '' },
        requester: {
          name: instance.startedByUser.name,
          email: instance.startedByUser.email ?? '',
        },
        assignee: {
          name: assignee?.name ?? '',
          email: assignee?.email ?? '',
        },
        recipient: {
          name: recipient.name,
          email: recipient.email ?? '',
        },
        variables: instanceVars,
      };

      const subject = this.renderTemplate(trigger.subject, templateCtx);
      const body = this.renderTemplate(trigger.bodyTemplate, templateCtx);

      try {
        await this.notificationsService.createAndDeliver(
          recipient.id,
          NotificationType.PROCESS_TASK_ASSIGNED,
          subject,
          body,
          { processUserTaskId: ctx.taskId, instanceId: ctx.instanceId },
        );
      } catch (err) {
        this.logger.warn(`sendStepNotification failed recipient=${recipient.id}`, err);
      }
    }
  }

  private async checkCompletion(instanceId: string, executionState: string): Promise<void> {
    if (executionState === 'idle') {
      const instance = await this.prisma.processInstance.findUnique({
        where: { id: instanceId },
        select: { variables: true },
      });
      await this.prisma.processInstance.update({
        where: { id: instanceId },
        data: { status: InstanceStatus.COMPLETED, completedAt: new Date() },
      });
      await this.eventBus.emitCompleted({
        instanceId,
        variables: (instance?.variables ?? {}) as Record<string, unknown>,
      });
    }
  }
}

/**
 * Merge task output variables into the serialised bpmn-engine state so that
 * gateway conditionExpressions can evaluate them after engine.recover().
 */
function mergeVariablesIntoState(
  state: BpmnEngineExecutionState,
  variables: Record<string, unknown>,
): BpmnEngineExecutionState {
  if (!variables || Object.keys(variables).length === 0) return state;

  const s = JSON.parse(JSON.stringify(state)) as Record<string, unknown>;
  const defs = (s.definitions as Record<string, unknown>[] | undefined) ?? [];

  for (const def of defs) {
    const defEnv = def.environment as Record<string, unknown> | undefined;
    if (defEnv?.variables && typeof defEnv.variables === 'object') {
      Object.assign(defEnv.variables as Record<string, unknown>, variables);
    }

    const execution = def.execution as Record<string, unknown> | undefined;
    const processes = (execution?.processes as Record<string, unknown>[] | undefined) ?? [];
    for (const proc of processes) {
      const procEnv = proc.environment as Record<string, unknown> | undefined;
      if (procEnv?.variables && typeof procEnv.variables === 'object') {
        Object.assign(procEnv.variables as Record<string, unknown>, variables);
      }
    }
  }

  return s as unknown as BpmnEngineExecutionState;
}
