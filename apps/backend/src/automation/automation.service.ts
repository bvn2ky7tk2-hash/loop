import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

export interface ActionContext {
  entityId?: string;
  entityType?: string;
  userId?: string;
  [key: string]: unknown;
}

export interface EvaluateResult {
  matched: boolean;
  reason: string;
}

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async listRules() {
    return this.prisma.automationRule.findMany({ orderBy: { createdAt: 'desc' } });
  }

  /** Wrapper: load rule theo key rồi gọi evaluateRule — dùng từ controller */
  async evaluateRuleByKey(key: string, context: ActionContext): Promise<EvaluateResult & { ruleKey: string; ruleName: string }> {
    const rule = await this.prisma.automationRule.findFirst({ where: { key } });
    if (!rule) throw new NotFoundException('Rule không tồn tại');
    const result = this.evaluateRule(rule, context);
    return { ...result, ruleKey: rule.key, ruleName: rule.name };
  }

  /**
   * Đánh giá tất cả các điều kiện (conditions JSON) của một rule so với context.
   * Mỗi condition có dạng { field, operator, value }.
   * Các operator: eq, neq, gt, gte, lt, lte, contains, in, notIn.
   * Trả về matched=true khi tất cả conditions đều thỏa mãn (AND logic).
   */
  evaluateRule(rule: { conditions?: unknown; key: string }, context: ActionContext): EvaluateResult {
    const conditions = (rule.conditions as Array<{ field: string; operator: string; value: unknown }> | null) ?? [];

    if (conditions.length === 0) {
      return { matched: true, reason: 'Không có điều kiện — rule luôn khớp' };
    }

    for (const cond of conditions) {
      const ctxVal = context[cond.field];
      const matched = this._evalCondition(ctxVal, cond.operator, cond.value);
      if (!matched) {
        return {
          matched: false,
          reason: `Điều kiện không thỏa mãn: ${cond.field} ${cond.operator} ${JSON.stringify(cond.value)} (thực tế: ${JSON.stringify(ctxVal)})`,
        };
      }
    }

    return { matched: true, reason: 'Tất cả điều kiện thỏa mãn' };
  }

  private _evalCondition(actual: unknown, operator: string, expected: unknown): boolean {
    switch (operator) {
      case 'eq':       return actual === expected;
      case 'neq':      return actual !== expected;
      case 'gt':       return typeof actual === 'number' && typeof expected === 'number' && actual > expected;
      case 'gte':      return typeof actual === 'number' && typeof expected === 'number' && actual >= expected;
      case 'lt':       return typeof actual === 'number' && typeof expected === 'number' && actual < expected;
      case 'lte':      return typeof actual === 'number' && typeof expected === 'number' && actual <= expected;
      case 'contains': return typeof actual === 'string' && typeof expected === 'string' && actual.includes(expected);
      case 'in':       return Array.isArray(expected) && expected.includes(actual);
      case 'notIn':    return Array.isArray(expected) && !expected.includes(actual);
      default: {
        this.logger.warn(`_evalCondition: unknown operator "${operator}"`);
        return false;
      }
    }
  }

  async toggleRule(key: string, isActive: boolean) {
    const rule = await this.prisma.automationRule.findFirst({ where: { key } });
    if (!rule) throw new NotFoundException('Rule không tồn tại');
    return this.prisma.automationRule.update({ where: { id: rule.id }, data: { isActive } });
  }

  async getStats() {
    const [totalRules, activeRules, lastRule] = await Promise.all([
      this.prisma.automationRule.count(),
      this.prisma.automationRule.count({ where: { isActive: true } }),
      this.prisma.automationRule.findFirst({ where: { lastRunAt: { not: null } }, orderBy: { lastRunAt: 'desc' } }),
    ]);
    return { totalRules, activeRules, lastRunAt: lastRule?.lastRunAt ?? null };
  }

  async runRule(key: string) {
    const rule = await this.prisma.automationRule.findFirst({ where: { key } });
    if (!rule) throw new NotFoundException('Rule không tồn tại');
    // executeRule đã tự logRun bên trong
    await this.executeRule(rule.id);
    return this.prisma.automationRule.findFirst({ where: { key } });
  }

  /**
   * Ghi log mỗi lần rule chạy và cập nhật lastRunAt, runCount, lastError trên rule.
   * Gọi sau mỗi lần executeRule() từ scheduler hoặc manual trigger.
   */
  async logRun(
    ruleId: string,
    status: 'SUCCESS' | 'FAILED' | 'SKIPPED',
    message: string | null,
    durationMs: number,
    entityId?: string,
    entityType?: string,
  ) {
    await this.prisma.$transaction([
      this.prisma.automationRuleLog.create({
        data: {
          ruleId,
          status,
          message,
          durationMs,
          entityId,
          entityType,
        },
      }),
      this.prisma.automationRule.update({
        where: { id: ruleId },
        data: {
          lastRunAt: new Date(),
          runCount: { increment: 1 },
          lastError: status === 'FAILED' ? (message ?? 'Unknown error') : null,
        },
      }),
    ]);
  }

  /**
   * Dispatch một action thuộc rule — xử lý theo type: SEND_NOTIFICATION, UPDATE_FIELD, START_BPM_PROCESS.
   */
  async dispatchAction(action: { type: string; [k: string]: any }, context: ActionContext): Promise<void> {
    switch (action.type) {
      case 'SEND_NOTIFICATION': {
        // userId ưu tiên từ action, fallback sang context
        const targetUserId: string | undefined = action.userId ?? context.userId;
        if (!targetUserId) {
          this.logger.warn('SEND_NOTIFICATION: thiếu userId, bỏ qua');
          return;
        }
        await this.notifications.createInApp(targetUserId, {
          title: action.title ?? 'Thông báo tự động',
          body: action.body ?? '',
          type: action.notificationType ?? 'REMINDER',
          link: action.link ?? null,
          entityType: context.entityType ?? action.entityType,
          entityId: context.entityId ?? action.entityId,
        });
        break;
      }

      case 'UPDATE_FIELD': {
        // Cập nhật field trên entity bằng raw parameterized query để tránh SQL injection
        const { table, field, value, whereField, whereValue } = action;
        if (!table || !field || !whereField || whereValue === undefined) {
          this.logger.warn('UPDATE_FIELD: thiếu tham số bắt buộc (table/field/whereField/whereValue)');
          return;
        }
        // Giới hạn tên table/field cho phép nhằm ngăn injection tên cột
        const allowedIdentifier = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
        if (!allowedIdentifier.test(table) || !allowedIdentifier.test(field) || !allowedIdentifier.test(whereField)) {
          this.logger.warn('UPDATE_FIELD: tên table/field không hợp lệ');
          return;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await this.prisma.$executeRawUnsafe(
          `UPDATE "${table}" SET "${field}" = $1, updated_at = NOW() WHERE "${whereField}" = $2`,
          value,
          whereValue ?? context.entityId,
        );
        break;
      }

      case 'START_BPM_PROCESS': {
        const processKey: string | undefined = action.processDefinitionKey;
        if (!processKey) {
          this.logger.warn('START_BPM_PROCESS: thiếu processDefinitionKey');
          return;
        }
        const definition = await this.prisma.processDefinition.findFirst({
          where: { key: processKey, status: 'ACTIVE' },
        });
        if (!definition) {
          this.logger.warn(`START_BPM_PROCESS: không tìm thấy ProcessDefinition key="${processKey}"`);
          return;
        }
        // Lấy user system để làm startedBy nếu không có userId
        let startedBy = context.userId;
        if (!startedBy) {
          const sysUser = await this.prisma.user.findFirst({
            where: { role: 'ADMIN', isActive: true },
            select: { id: true },
          });
          startedBy = sysUser?.id;
        }
        if (!startedBy) {
          this.logger.warn('START_BPM_PROCESS: không tìm thấy user để startedBy');
          return;
        }
        await this.prisma.processInstance.create({
          data: {
            definitionId: definition.id,
            startedBy,
            status: 'RUNNING',
            variables: action.variables ?? {},
            tokenState: {},
          },
        });
        break;
      }

      default:
        this.logger.warn(`dispatchAction: unknown action type "${action.type}"`);
    }
  }

  /**
   * Thực thi rule theo ruleId: load rule → loop actions → gọi dispatchAction → logRun SUCCESS/FAILED.
   * Đây là engine chung hoạt động với rules có actions JSON.
   * Với rules legacy (hard-coded), fallback sang _runByKey.
   */
  async executeRule(ruleId: string, context: ActionContext = {}): Promise<void> {
    const rule = await this.prisma.automationRule.findUnique({ where: { id: ruleId } });
    if (!rule) throw new NotFoundException(`AutomationRule id="${ruleId}" không tồn tại`);

    const start = Date.now();
    try {
      const actions = (rule.actions as Array<{ type: string; [k: string]: any }> | null) ?? [];

      if (actions.length > 0) {
        // Generic engine: loop và dispatch từng action
        for (const action of actions) {
          await this.dispatchAction(action, context);
        }
      } else {
        // Fallback: hard-coded logic theo key
        await this._runByKey(rule.key);
      }

      await this.logRun(ruleId, 'SUCCESS', null, Date.now() - start, context.entityId, context.entityType);
    } catch (err: any) {
      await this.logRun(ruleId, 'FAILED', err?.message ?? 'Unknown error', Date.now() - start, context.entityId, context.entityType);
      throw err;
    }
  }

  /** Legacy: chạy rule theo key hard-coded — dùng khi rule không có actions JSON */
  private async _runByKey(key: string): Promise<void> {
    switch (key) {
      case 'timesheet-reminder':   return this.timesheetReminder();
      case 'contract-expiry':      return this.contractExpiryAlert();
      case 'leave-escalation':     return this.leaveEscalation();
      case 'okr-checkin-reminder': return this.okrCheckInReminder();
      default: this.logger.warn(`_runByKey: unknown rule key "${key}"`);
    }
  }

  // ─── Rule implementations ───────────────────────────────────────────────────

  async timesheetReminder() {
    this.logger.log('Running timesheet-reminder');
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);

    // Tìm users có employee, check xem tuần này đã nộp timesheet chưa
    const employees = await this.prisma.employee.findMany({
      where: { isActive: true, userId: { not: null } },
      select: { userId: true, fullName: true },
    });

    for (const emp of employees) {
      if (!emp.userId) continue;
      const hasTimesheet = await this.prisma.timesheetRecord.count({
        where: {
          userId: emp.userId,
          periodStart: { gte: weekStart },
          status: { in: ['SUBMITTED', 'APPROVED'] },
        },
      });
      if (!hasTimesheet) {
        await this.notifications.createInApp(emp.userId, {
          title: 'Nhắc nộp timesheet',
          body: 'Bạn chưa nộp timesheet tuần này. Vui lòng nộp trước cuối ngày hôm nay.',
          type: 'REMINDER',
          link: '/timesheet',
        });
      }
    }
    this.logger.log('timesheet-reminder complete');
  }

  async contractExpiryAlert() {
    this.logger.log('Running contract-expiry');
    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);

    const expiringContracts = await this.prisma.contract.findMany({
      where: { status: 'ACTIVE', endDate: { lte: in30Days, gte: new Date() } },
      include: { employee: { select: { fullName: true } } },
    });

    if (!expiringContracts.length) return;

    // Notify HR (ADMIN) users
    const hrUsers = await this.prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'LEADERSHIP'] }, isActive: true },
      select: { id: true },
    });

    for (const contract of expiringContracts) {
      const date = contract.endDate?.toLocaleDateString('vi-VN') ?? '';
      for (const hr of hrUsers) {
        await this.notifications.createInApp(hr.id, {
          title: 'Hợp đồng sắp hết hạn',
          body: `Hợp đồng của ${contract.employee.fullName} sẽ hết hạn vào ${date}. Cần gia hạn trước thời hạn.`,
          type: 'ALERT',
          link: '/contracts',
        });
      }
    }
    this.logger.log(`contract-expiry: notified ${expiringContracts.length} contracts`);
  }

  async leaveEscalation() {
    this.logger.log('Running leave-escalation');
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const pendingLeaves = await this.prisma.leaveRequest.findMany({
      where: { status: 'PENDING', createdAt: { lte: twoDaysAgo } },
      include: { employee: { select: { fullName: true } } },
    });

    // Notify admin/leadership users
    const managers = await this.prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'LEADERSHIP'] }, isActive: true },
      select: { id: true },
    });

    for (const leave of pendingLeaves) {
      const days = Math.floor((Date.now() - leave.createdAt.getTime()) / 86400000);
      for (const mgr of managers) {
        await this.notifications.createInApp(mgr.id, {
          title: 'Đơn nghỉ phép tồn đọng',
          body: `Đơn nghỉ phép của ${leave.employee.fullName} đã chờ ${days} ngày. Vui lòng xử lý sớm.`,
          type: 'ALERT',
          link: '/leaves',
        });
      }
    }
    this.logger.log(`leave-escalation: ${pendingLeaves.length} pending leaves`);
  }

  async okrCheckInReminder() {
    this.logger.log('Running okr-checkin-reminder');
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const staleObjectives = await this.prisma.okrObjective.findMany({
      where: { status: 'ACTIVE', updatedAt: { lte: fourteenDaysAgo } },
      include: { owner: { select: { id: true } } },
    });

    for (const obj of staleObjectives) {
      await this.notifications.createInApp(obj.owner.id, {
        title: 'Nhắc cập nhật OKR',
        body: `OKR "${obj.title}" chưa được cập nhật 14 ngày. Hãy check-in tiến độ.`,
        type: 'REMINDER',
        link: '/hr/okr',
      });
    }
    this.logger.log(`okr-checkin-reminder: ${staleObjectives.length} stale objectives`);
  }
}
