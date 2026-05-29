import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException, Optional, Inject,
} from '@nestjs/common';
import { Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Prisma, TaskStatus } from '../generated/prisma';
import type { Task, Role } from '../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { paginate, type PaginatedResult } from '../common/dto/pagination.dto';
import { TelegramService } from '../integrations/telegram/telegram.service';
import { TelegramCardBuilder } from '../integrations/telegram/telegram-card.builder';
import { NotificationsService } from '../notifications/notifications.service';
import { TenantAwareService } from '../common/services/tenant-aware.service';
import * as ExcelJS from 'exceljs';

const MAX_TASK_LEVELS = 5;
const DEFAULT_MAX_ESTIMATE_HOURS = 4;

@Injectable({ scope: Scope.REQUEST })
export class TasksService extends TenantAwareService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly telegramService: TelegramService,
    private readonly telegramCardBuilder: TelegramCardBuilder,
    @Optional() private readonly notificationsService?: NotificationsService,
    @Inject(REQUEST) req?: any,
  ) {
    super(req);
  }

  async create(projectId: string, dto: CreateTaskDto, caller: { role: Role }): Promise<Task & { warning?: string }> {
    const isMember = caller.role === 'MEMBER';
    const status: TaskStatus = isMember ? 'PENDING_APPROVAL' : 'TODO';

    let level = 1;
    if (dto.parentId) {
      const parent = await this.prisma.task.findUnique({ where: { id: dto.parentId } });
      if (!parent) throw new NotFoundException('Task cha không tồn tại');
      if (parent.level >= MAX_TASK_LEVELS) {
        throw new BadRequestException('Đã đạt giới hạn 5 cấp');
      }
      level = parent.level + 1;
    }

    const task = await this.prisma.task.create({
      data: {
        projectId,
        parentId: dto.parentId ?? null,
        level,
        title: dto.title,
        description: dto.description,
        assigneeId: dto.assigneeId,
        approverId: dto.approverId,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        estimateHours: dto.estimateHours ?? 0,
        position: dto.position ?? 0,
        status,
        tenantId: this.getTenantId(),
      },
    });

    const warning =
      (dto.estimateHours ?? 0) > DEFAULT_MAX_ESTIMATE_HOURS
        ? `Estimate vượt quá ${DEFAULT_MAX_ESTIMATE_HOURS}h mặc định`
        : undefined;

    if (task.assigneeId) {
      this.sendTelegramCardAsync(task).catch(() => {});
      this.notifyAssigneeAsync(task.assigneeId, task.id, task.title, task.projectId).catch(() => {});
    }

    return { ...task, ...(warning ? { warning } : {}) };
  }

  /** Gửi in-app notification cho assignee khi task được giao */
  private async notifyAssigneeAsync(assigneeId: string, taskId: string, taskTitle: string, projectId: string): Promise<void> {
    if (!this.notificationsService) return;
    try {
      const [employee, project] = await Promise.all([
        this.prisma.employee.findUnique({ where: { id: assigneeId }, select: { userId: true } }),
        this.prisma.project.findUnique({ where: { id: projectId }, select: { name: true } }),
      ]);
      if (!employee?.userId) return;
      await this.notificationsService.createInApp(employee.userId, {
        type: 'TASK_ASSIGNED',
        title: 'Bạn được giao task mới',
        body: `${taskTitle}${project ? ` trong dự án ${project.name}` : ''}`,
        link: '/tasks',
        entityType: 'TASK',
        entityId: taskId,
      });
    } catch {
      // fire-and-forget
    }
  }

  private async sendTelegramCardAsync(task: Task): Promise<void> {
    try {
      const taskWithDetails = await this.prisma.task.findUnique({
        where: { id: task.id },
        include: {
          assignee: { select: { fullName: true } },
          project: { select: { name: true } },
        },
      });
      if (!taskWithDetails) return;

      const card = this.telegramCardBuilder.buildTaskCard(
        {
          id: taskWithDetails.id,
          title: taskWithDetails.title,
          dueDate: taskWithDetails.dueDate,
          estimateHours: taskWithDetails.estimateHours as unknown as number,
          assigneeName: (taskWithDetails as unknown as { assignee?: { fullName: string } }).assignee?.fullName ?? null,
          projectName: (taskWithDetails as unknown as { project?: { name: string } }).project?.name ?? null,
        },
        'NEW_TASK',
      );

      const messageId = await this.telegramService.sendMessageWithId(card.text, card.reply_markup);
      if (messageId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        await this.prisma.telegramMessage.create({
          data: {
            taskId: task.id,
            eventType: 'NEW_TASK',
            messageId,
            sentDate: today,
          },
        });
      }
    } catch {
      // fire-and-forget — ignore all errors
    }
  }

  async getProjectTaskTree(projectId: string): Promise<unknown[]> {
    const tasks = await this.prisma.task.findMany({
      where: { projectId },
      orderBy: [{ level: 'asc' }, { position: 'asc' }],
      include: {
        assignee: { select: { id: true, fullName: true } },
      },
      // Giới hạn an toàn — tránh dump toàn bộ task khi dự án lớn
      take: 500,
    });

    return this.buildTree(tasks as unknown as Task[]);
  }

  private buildTree(tasks: Task[], parentId: string | null = null): unknown[] {
    return tasks
      .filter((t) => t.parentId === parentId)
      .map((t) => {
        const children = this.buildTree(tasks, t.id);
        return children.length > 0 ? { ...t, children } : { ...t };
      });
  }

  async findOne(id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, title: true } },
        children: true,
        assignee: { include: { user: { select: { name: true } } } },
        bugLinks: {
          include: { bug: { select: { id: true, title: true, status: true, estimatedHours: true, itemType: true } } },
        },
      },
    });
    if (!task) throw new NotFoundException('Không tìm thấy task');
    return task;
  }

  async update(id: string, dto: Partial<CreateTaskDto>) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Không tìm thấy task');
    if (task.status === 'CANCELLED') throw new ForbiddenException('Task đã bị huỷ, không thể chỉnh sửa');

    return this.prisma.task.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        assigneeId: dto.assigneeId,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        estimateHours: dto.estimateHours,
      },
    });
  }

  async approve(id: string, callerId: string) {
    const task = await this.findOrThrow(id);
    if (task.status !== 'PENDING_APPROVAL') throw new BadRequestException('Task không ở trạng thái chờ duyệt');

    const updated = await this.prisma.task.update({ where: { id }, data: { status: 'TODO' } });
    await this.createNotification(task, 'TASK_APPROVED', `Task "${task.title}" đã được duyệt`);
    return updated;
  }

  async returnTask(id: string, reason: string) {
    const task = await this.findOrThrow(id);
    if (task.status !== 'PENDING_APPROVAL') throw new BadRequestException('Task không ở trạng thái chờ duyệt');

    const updated = await this.prisma.task.update({ where: { id }, data: { status: 'RETURNED' } });
    await this.createNotification(task, 'TASK_RETURNED', `Task "${task.title}" bị trả lại: ${reason}`);
    return updated;
  }

  async resubmit(id: string) {
    const task = await this.findOrThrow(id);
    if (task.status !== 'RETURNED') throw new BadRequestException('Task không ở trạng thái bị trả lại');
    return this.prisma.task.update({ where: { id }, data: { status: 'PENDING_APPROVAL' } });
  }

  async cancel(id: string) {
    const task = await this.findOrThrow(id);
    const updated = await this.prisma.task.update({ where: { id }, data: { status: 'CANCELLED' } });
    await this.createNotification(task, 'TASK_CANCELLED', `Task "${task.title}" đã bị huỷ`);
    return updated;
  }

  async updateProgress(id: string, progressPct: number) {
    const task = await this.findOrThrow(id);
    const hasChildren = await this.prisma.task.count({ where: { parentId: id } });
    if (hasChildren > 0) throw new BadRequestException('Task có subtask — tiến độ được tính tự động');

    const activeBugCount = await this.prisma.bugTask.count({
      where: { taskId: id, bug: { status: { not: 'CANCELLED' } } },
    });
    if (activeBugCount > 0) throw new BadRequestException('Task có bug/issue linked — tiến độ được tính tự động từ bug');

    if (progressPct >= 100 && !task.dueDate) {
      throw new BadRequestException('Vui lòng nhập deadline trước khi hoàn thành task');
    }

    const newStatus: TaskStatus = progressPct >= 100 && task.status === 'IN_PROGRESS' ? 'DONE' : task.status;
    await this.prisma.task.update({ where: { id }, data: { progress: progressPct, status: newStatus } });

    if (task.parentId) await this.rollUpProgress(task.parentId, task.projectId);
    else await this.syncProjectProgress(task.projectId);

    return this.prisma.task.findUnique({ where: { id } });
  }

  /** Tính lại % task từ bug/issue linked (gọi khi bug đổi trạng thái). */
  async syncProgressFromBugs(taskId: string): Promise<void> {
    const links = await this.prisma.bugTask.findMany({
      where: { taskId },
      include: { bug: { select: { status: true, estimatedHours: true } } },
    });

    const active = links.filter((l) => l.bug && l.bug.status !== 'CANCELLED');
    if (!active.length) return;

    const BUG_PCT: Record<string, number> = { IN_PROGRESS: 50, RESOLVED: 100, CLOSED: 100 };
    const totalHours = active.reduce((s, l) => s + (l.bug.estimatedHours ?? 1), 0);
    const weighted = active.reduce((s, l) => {
      const pct = BUG_PCT[l.bug.status] ?? 0;
      const hrs = l.bug.estimatedHours ?? 1;
      return s + pct * (totalHours > 0 ? hrs / totalHours : 1 / active.length);
    }, 0);

    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) return;

    await this.prisma.task.update({ where: { id: taskId }, data: { progress: Math.round(weighted) } });

    if (task.parentId) await this.rollUpProgress(task.parentId, task.projectId);
    else await this.syncProjectProgress(task.projectId);
  }

  async getPendingApprovalTasks(page = 1, limit = 50): Promise<PaginatedResult<unknown>> {
    const where: any = this.tenantWhere({ status: 'PENDING_APPROVAL' as TaskStatus });
    const [data, total] = await this.prisma.$transaction([
      this.prisma.task.findMany({
        where,
        include: {
          assignee: { select: { id: true, fullName: true } },
          project: { select: { id: true, code: true, name: true } },
        },
        orderBy: [{ createdAt: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.task.count({ where }),
    ]);
    return paginate(data, total, page, limit);
  }

  async getMyTasksCount(userId: string, role: string) {
    let assigneeFilter: { assigneeId?: string } = {};
    if (role === 'MEMBER') {
      const employee = await this.prisma.employee.findFirst({
        where: { userId },
        select: { id: true },
      });
      if (!employee) return { total: 0 };
      assigneeFilter = { assigneeId: employee.id };
    }
    const total = await this.prisma.task.count({
      where: { ...assigneeFilter, status: { notIn: ['DONE', 'CANCELLED'] } },
    });
    return { total };
  }

  async getMyTasks(
    userId: string,
    role: string,
    projectId?: string,
    employeeId?: string,
    page = 1,
    limit = 50,
  ): Promise<PaginatedResult<unknown>> {
    let assigneeFilter: { assigneeId?: string } = {};

    if (role === 'MEMBER') {
      const employee = await this.prisma.employee.findFirst({
        where: { userId },
        select: { id: true },
      });
      if (!employee) return paginate([], 0, page, limit);
      assigneeFilter = { assigneeId: employee.id };
    } else if (employeeId) {
      assigneeFilter = { assigneeId: employeeId };
    }

    const where = this.tenantWhere({
      ...assigneeFilter,
      ...(projectId ? { projectId } : {}),
      status: { not: 'CANCELLED' as TaskStatus },
    });

    const [data, total] = await this.prisma.$transaction([
      this.prisma.task.findMany({
        where,
        include: {
          project: { select: { id: true, code: true, name: true } },
          assignee: { select: { id: true, fullName: true } },
        },
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.task.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async moveStatus(id: string, status: TaskStatus, dueDate?: string) {
    const task = await this.findOrThrow(id);
    if (task.status === 'CANCELLED') throw new ForbiddenException('Task đã bị huỷ');

    const resolvedDueDate = dueDate ? new Date(dueDate) : task.dueDate;
    if (status === 'DONE' && !resolvedDueDate) {
      throw new BadRequestException('Vui lòng nhập deadline trước khi hoàn thành task');
    }

    const data: Prisma.TaskUpdateInput = { status };
    if (status === 'DONE') {
      data.progress = 100;
      if (dueDate) data.dueDate = new Date(dueDate);
    }

    const updated = await this.prisma.task.update({ where: { id }, data });
    if (task.parentId) await this.rollUpProgress(task.parentId, task.projectId);
    else await this.syncProjectProgress(task.projectId);

    // Đồng bộ: khi task DONE/CANCELLED → kiểm tra bug linked có thể auto-resolve
    if (status === 'DONE' || status === 'CANCELLED') {
      await this.syncLinkedBugs(id);
    }

    return updated;
  }

  async logEffort(id: string, userId: string, hours: number, logDate: string, note?: string) {
    await this.findOrThrow(id);
    await this.prisma.timeLog.create({
      data: { taskId: id, userId, hours, logDate: new Date(logDate), note },
    });
    return this.prisma.task.update({
      where: { id },
      data: { actualHours: { increment: hours } },
    });
  }

  /**
   * Sau khi task DONE/CANCELLED: nếu tất cả task linked của 1 bug đều
   * DONE hoặc CANCELLED thì tự chuyển bug → RESOLVED.
   * Chỉ áp dụng khi bug đang IN_PROGRESS (thường) hoặc APPROVED (CR).
   */
  private async syncLinkedBugs(taskId: string): Promise<void> {
    const links = await this.prisma.bugTask.findMany({
      where: { taskId },
      select: { bugId: true },
    });
    if (!links.length) return;

    for (const { bugId } of links) {
      const bug = await this.prisma.bug.findUnique({
        where: { id: bugId },
        select: { id: true, status: true },
      });
      if (!bug || !['IN_PROGRESS', 'APPROVED'].includes(bug.status)) continue;

      const allLinks = await this.prisma.bugTask.findMany({
        where: { bugId },
        include: { task: { select: { status: true } } },
      });
      if (!allLinks.length) continue;

      const allSettled = allLinks.every(
        (l) => l.task && ['DONE', 'CANCELLED'].includes(l.task.status),
      );
      if (allSettled) {
        await this.prisma.bug.update({
          where: { id: bugId },
          data: { status: 'RESOLVED', resolvedAt: new Date() },
        });
      }
    }
  }

  private async rollUpProgress(taskId: string, projectId: string): Promise<void> {
    // Giới hạn an toàn — subtask thực tế không bao giờ vượt 200
    const children = await this.prisma.task.findMany({ where: { parentId: taskId }, take: 200 });
    if (!children.length) return;

    const totalEstimate = children.reduce((s, c) => s + Number(c.estimateHours), 0);
    const weightedProgress = children.reduce(
      (s, c) => s + (Number(c.progress) * (totalEstimate > 0 ? Number(c.estimateHours) / totalEstimate : 1 / children.length)),
      0,
    );

    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data: { progress: Math.round(weightedProgress) },
    });
    if (updated.parentId) await this.rollUpProgress(updated.parentId, projectId);
    else await this.syncProjectProgress(projectId);
  }

  private async syncProjectProgress(projectId: string): Promise<void> {
    // Giới hạn an toàn — root task của 1 dự án không bao giờ vượt 200
    const rootTasks = await this.prisma.task.findMany({
      where: { projectId, parentId: null },
      take: 200,
    });
    if (!rootTasks.length) return;

    const totalEstimate = rootTasks.reduce((s, t) => s + Number(t.estimateHours), 0);
    const weighted = rootTasks.reduce(
      (s, t) => s + (Number(t.progress) * (totalEstimate > 0 ? Number(t.estimateHours) / totalEstimate : 1 / rootTasks.length)),
      0,
    );

    await this.prisma.project.update({
      where: { id: projectId },
      data: { progress: Math.round(weighted) },
    });
  }

  async exportExcel(): Promise<Buffer> {
    const tasks = await this.prisma.task.findMany({
      where: this.tenantWhere({}),
      include: {
        project:  { select: { name: true } },
        assignee: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Tasks');

    ws.columns = [
      { header: 'Tiêu đề',     key: 'title',    width: 35 },
      { header: 'Dự án',       key: 'project',  width: 22 },
      { header: 'Người nhận',  key: 'assignee', width: 22 },
      { header: 'Trạng thái',  key: 'status',   width: 16 },
      { header: 'Deadline',    key: 'dueDate',  width: 13 },
      { header: 'Mức ưu tiên', key: 'priority', width: 13 },
    ];

    ws.getRow(1).font = { bold: true };

    tasks.forEach((t) => {
      ws.addRow({
        title:    t.title,
        project:  t.project?.name ?? '',
        assignee: t.assignee?.fullName ?? '',
        status:   t.status,
        dueDate:  t.dueDate ? new Date(t.dueDate).toLocaleDateString('vi-VN') : '',
        priority: (t as { priority?: string }).priority ?? '',
      });
    });

    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }

  private async findOrThrow(id: string): Promise<Task> {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Không tìm thấy task');
    return task;
  }

  private async createNotification(task: Task, type: string, body: string) {
    if (!task.assigneeId) return;
    const employee = await this.prisma.employee.findUnique({
      where: { id: task.assigneeId },
      select: { userId: true },
    });
    if (!employee?.userId) return;

    await this.prisma.notification.create({
      data: {
        userId: employee.userId,
        type: type as never,
        title: 'Cập nhật Task',
        body,
        payload: { taskId: task.id },
      },
    });
  }
}
