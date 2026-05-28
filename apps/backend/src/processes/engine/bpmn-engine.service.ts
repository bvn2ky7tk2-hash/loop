import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter } from 'node:events';
import { Engine } from 'bpmn-engine';
import type { BpmnEngineExecutionState } from 'bpmn-engine';
import { PrismaService } from '../../prisma/prisma.service';
import { InstanceStatus, UserTaskStatus } from '../../generated/prisma';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationType } from '../../generated/prisma';
import { ProcessEventBus } from '../process-event-bus.service';

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

@Injectable()
export class BpmnEngineService {
  private readonly logger = new Logger(BpmnEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly eventBus: ProcessEventBus,
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

      // Persist state before creating user task records so a crash between
      // handleWaitActivities and the caller's update doesn't leave orphaned tasks
      // with no recoverable engine state.
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

    // Merge variables into the serialised state BEFORE recovery so that
    // gateway conditionExpressions can resolve them. bpmn-elements evaluates
    // conditions against the process-execution environment, not engine.environment.
    const stateWithVars = mergeVariablesIntoState(tokenState, variables);

    const engine = new Engine({ name: instanceId, source: bpmnXml });
    engine.recover(stateWithVars);

    const listener = new EventEmitter();
    // Only collect wait activities that occur AFTER signaling — pre-signal waits are
    // already recorded in DB from a previous handleWaitActivities call.
    let postSignal = false;
    const newWaitActivities: WaitEventApi[] = [];

    listener.on('wait', (api: WaitEventApi) => {
      if (postSignal) newWaitActivities.push(api);
    });

    const execution = await engine.resume({ listener });
    // Mark that from here, any 'wait' event is a new downstream task.
    postSignal = true;

    // Signal the user task to advance execution.
    execution.signal({ id: activityId, ...variables });

    // Wait for next user task (wait) or process end.
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
    // Kiểm tra đã tồn tại chưa
    const existing = await this.prisma.processUserTask.findFirst({
      where: { instanceId, activityId, status: { in: [UserTaskStatus.PENDING, UserTaskStatus.IN_PROGRESS] } },
    });
    if (existing) return;

    const formData = (content.formData ?? content.form ?? null) as Record<string, unknown> | null;
    const assigneeId = (content.assigneeId ?? content.assignee ?? null) as string | null;
    const dueDateRaw = content.dueDate as string | null | undefined;
    const dueDate = dueDateRaw ? new Date(dueDateRaw) : null;

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

    // Ghi activity log
    await this.prisma.processActivityLog.create({
      data: {
        instanceId,
        activityId,
        activityName: name,
        activityType: 'bpmn:UserTask',
        performedBy: assigneeId ?? null,
      },
    });

    // Gửi notification nếu có assigneeId
    if (assigneeId) {
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

  private async checkCompletion(instanceId: string, executionState: string): Promise<void> {
    if (executionState === 'idle') {
      // Đọc variables trước khi update để emit cùng payload
      const instance = await this.prisma.processInstance.findUnique({
        where: { id: instanceId },
        select: { variables: true },
      });
      await this.prisma.processInstance.update({
        where: { id: instanceId },
        data: { status: InstanceStatus.COMPLETED, completedAt: new Date() },
      });
      this.eventBus.emitCompleted({
        instanceId,
        variables: (instance?.variables ?? {}) as Record<string, unknown>,
      });
    }
  }
}

/**
 * Merge task output variables into the serialised bpmn-engine state so that
 * gateway conditionExpressions can evaluate them after engine.recover().
 * bpmn-elements stores variables at both the definition level and the
 * process-execution level; we update both to be safe.
 */
function mergeVariablesIntoState(
  state: BpmnEngineExecutionState,
  variables: Record<string, unknown>,
): BpmnEngineExecutionState {
  if (!variables || Object.keys(variables).length === 0) return state;

  const s = JSON.parse(JSON.stringify(state)) as Record<string, unknown>;
  const defs = (s.definitions as Record<string, unknown>[] | undefined) ?? [];

  for (const def of defs) {
    // definition-level environment
    const defEnv = def.environment as Record<string, unknown> | undefined;
    if (defEnv?.variables && typeof defEnv.variables === 'object') {
      Object.assign(defEnv.variables as Record<string, unknown>, variables);
    }

    // process-execution-level environments
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
