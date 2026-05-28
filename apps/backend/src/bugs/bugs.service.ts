import { Injectable, NotFoundException, BadRequestException, ForbiddenException, UnprocessableEntityException, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TelegramService } from '../integrations/telegram/telegram.service';
import { TasksService } from '../tasks/tasks.service';
import { BugStatus, BugSeverity, BugItemType, NotificationType } from '../generated/prisma';
import { CreateBugDto } from './dto/create-bug.dto';
import { UpdateBugDto } from './dto/update-bug.dto';
import { TransitionBugDto } from './dto/transition-bug.dto';
import { AssignBugDto } from './dto/assign-bug.dto';
import { FilterBugDto } from './dto/filter-bug.dto';
import { ApproveBugDto } from './dto/approve-bug.dto';

const BUG_TRANSITIONS: Record<BugStatus, BugStatus[]> = {
  [BugStatus.OPEN]:           [BugStatus.PENDING, BugStatus.IN_PROGRESS, BugStatus.CANCELLED],
  [BugStatus.PENDING]:        [BugStatus.IN_PROGRESS, BugStatus.CANCELLED],
  [BugStatus.IN_PROGRESS]:    [BugStatus.RESOLVED, BugStatus.CANCELLED],
  [BugStatus.RESOLVED]:       [BugStatus.CLOSED, BugStatus.IN_PROGRESS],
  [BugStatus.CLOSED]:         [],
  [BugStatus.CANCELLED]:      [],
  [BugStatus.PENDING_REVIEW]: [],
  [BugStatus.APPROVED]:       [],
  [BugStatus.REJECTED]:       [],
};

const CR_TRANSITIONS: Record<BugStatus, BugStatus[]> = {
  [BugStatus.OPEN]:           [BugStatus.PENDING_REVIEW, BugStatus.CANCELLED],
  [BugStatus.PENDING_REVIEW]: [BugStatus.CANCELLED],
  [BugStatus.APPROVED]:       [BugStatus.IN_PROGRESS, BugStatus.CANCELLED],
  [BugStatus.IN_PROGRESS]:    [BugStatus.RESOLVED, BugStatus.CANCELLED],
  [BugStatus.RESOLVED]:       [BugStatus.CLOSED, BugStatus.IN_PROGRESS],
  [BugStatus.CLOSED]:         [],
  [BugStatus.CANCELLED]:      [],
  [BugStatus.REJECTED]:       [],
  [BugStatus.PENDING]:        [],
};

const NOTIFY_ON_STATUS: BugStatus[] = [BugStatus.RESOLVED, BugStatus.CLOSED, BugStatus.CANCELLED];

const STATUS_LABEL: Record<string, string> = {
  RESOLVED:  'resolved',
  CLOSED:    'đóng',
  CANCELLED: 'huỷ',
};

const BUG_INCLUDE = {
  project:    { select: { id: true, name: true, pmId: true } },
  reporter:   { select: { id: true, name: true } },
  assignee:   { select: { id: true, name: true } },
  pmApprover: { select: { id: true, name: true } },
  tasks:      { include: { task: { select: { id: true, title: true } } } },
  attachments: { orderBy: { createdAt: 'asc' as const } },
  tags:       true,
} as const;

@Injectable()
export class BugsService {
  private readonly logger = new Logger(BugsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly tasksService: TasksService,
    @Optional() private readonly telegramService: TelegramService,
  ) {}

  async create(dto: CreateBugDto, reporterId: string, orgUnitIds: string[] | null) {
    await this.assertProjectInScope(dto.projectId, orgUnitIds);

    const itemType = dto.itemType ?? BugItemType.BUG;
    const isCR = dto.isCR ?? false;
    const initialStatus = (itemType === BugItemType.ISSUE && isCR)
      ? BugStatus.PENDING_REVIEW
      : BugStatus.OPEN;

    const createdBug = await this.prisma.$transaction(async (tx) => {
      const bug = await tx.bug.create({
        data: {
          projectId:     dto.projectId,
          reporterId,
          assigneeId:    dto.assigneeId,
          title:         dto.title,
          description:   dto.description,
          severity:      dto.severity ?? BugSeverity.MEDIUM,
          itemType,
          isCR,
          status:        initialStatus,
          requesterName: dto.requesterName,
          dueDate:       dto.dueDate ? new Date(dto.dueDate) : undefined,
          estimatedHours: dto.estimatedHours,
          affectedModule: dto.affectedModule,
        },
      });

      if (dto.taskIds?.length) {
        await tx.bugTask.createMany({
          data: dto.taskIds.map((taskId) => ({ bugId: bug.id, taskId })),
          skipDuplicates: true,
        });
      }

      if (dto.tags?.length) {
        await tx.bugTag.createMany({
          data: dto.tags.map((tag) => ({ bugId: bug.id, tag })),
          skipDuplicates: true,
        });
      }

      return bug;
    });

    const bug = await this.prisma.bug.findUnique({
      where: { id: createdBug.id },
      include: BUG_INCLUDE,
    });

    // Notifications for CRITICAL bugs (BUG type)
    if (bug!.severity === BugSeverity.CRITICAL && bug!.itemType === BugItemType.BUG) {
      const pmId = bug!.project.pmId;
      if (pmId) {
        await this.notificationsService.createAndDeliver(
          pmId,
          NotificationType.BUG_CRITICAL,
          `Bug Critical mới trong ${bug!.project.name}`,
          `${bug!.title} — báo cáo bởi ${bug!.reporter.name}`,
          {},
          'BUG',
          bug!.id,
        ).catch(() => {});
      }

      if (this.telegramService) {
        try {
          await this.telegramService.sendMessage(
            `🔴 Bug Critical mới\n*${bug!.title}*\nDự án: ${bug!.project.name}\nBáo cáo: ${bug!.reporter.name}`,
          );
        } catch (err: any) {
          this.logger.warn(`Telegram notification failed for bug ${bug!.id}: ${err.message}`);
        }
      }
    }

    // Notify PM when new CR (ISSUE + isCR) created
    if (bug!.itemType === BugItemType.ISSUE && bug!.isCR) {
      const pmId = bug!.project.pmId;
      if (pmId) {
        await this.notificationsService.createAndDeliver(
          pmId,
          NotificationType.ISSUE_CR_PENDING,
          `CR mới cần phê duyệt trong ${bug!.project.name}`,
          `${bug!.title} — yêu cầu bởi ${bug!.requesterName ?? bug!.reporter.name}`,
          {},
          'BUG',
          bug!.id,
        ).catch(() => {});
      }
    }

    return bug;
  }

  async findAll(filters: FilterBugDto, orgUnitIds: string[] | null) {
    const { page = 1, pageSize = 20 } = filters;
    const where = this.buildWhere(filters, orgUnitIds);

    const [data, total] = await this.prisma.$transaction([
      this.prisma.bug.findMany({
        where,
        include: BUG_INCLUDE,
        orderBy: [
          { severity: 'asc' },
          { createdAt: 'desc' },
        ],
        skip:  (page - 1) * pageSize,
        take:  pageSize,
      }),
      this.prisma.bug.count({ where }),
    ]);

    return { data, meta: { total, page, pageSize } };
  }

  async countMine(userId: string) {
    const total = await this.prisma.bug.count({
      where: {
        assigneeId: userId,
        status: { notIn: ['CLOSED', 'CANCELLED', 'REJECTED'] },
      },
    });
    return { total };
  }

  async findMine(userId: string) {
    return this.prisma.bug.findMany({
      where: { assigneeId: userId },
      include: BUG_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, orgUnitIds: string[] | null, userId?: string) {
    const scopeFilter = orgUnitIds !== null
      ? { project: { orgUnitId: { in: orgUnitIds } } }
      : {};

    const bug = await this.prisma.bug.findFirst({
      where: {
        id,
        ...(orgUnitIds !== null && userId
          // Cho phép assignee/reporter xem bug của mình dù ngoài scope
          ? { OR: [scopeFilter, { assigneeId: userId }, { reporterId: userId }] }
          : scopeFilter),
      },
      include: BUG_INCLUDE,
    });

    if (!bug) throw new NotFoundException(`Bug ${id} không tìm thấy`);
    return bug;
  }

  async update(id: string, dto: UpdateBugDto, orgUnitIds: string[] | null) {
    await this.findOne(id, orgUnitIds);

    const { taskIds, tags, assigneeId, dueDate, ...bugData } = dto;

    return this.prisma.bug.update({
      where: { id },
      data: {
        ...bugData,
        ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
        ...(assigneeId !== undefined ? { assigneeId: assigneeId || null } : {}),
        ...(taskIds !== undefined ? {
          tasks: {
            deleteMany: {},
            create: taskIds.map((taskId) => ({ taskId })),
          },
        } : {}),
        ...(tags !== undefined ? {
          tags: {
            deleteMany: {},
            create: tags.map((tag) => ({ tag })),
          },
        } : {}),
      },
      include: BUG_INCLUDE,
    });
  }

  async transition(id: string, dto: TransitionBugDto, orgUnitIds: string[] | null) {
    const bug = await this.findOne(id, orgUnitIds);

    const allowed = bug.isCR ? (CR_TRANSITIONS[bug.status] ?? []) : (BUG_TRANSITIONS[bug.status] ?? []);
    if (!allowed.includes(dto.toStatus)) {
      throw new BadRequestException(
        `Không thể chuyển từ ${bug.status} sang ${dto.toStatus}`,
      );
    }

    const now = new Date();
    const extraData: Record<string, any> = {};
    if (dto.toStatus === BugStatus.RESOLVED) extraData.resolvedAt = now;
    if (dto.toStatus === BugStatus.CLOSED) extraData.closedAt = now;

    const updated = await this.prisma.bug.update({
      where: { id },
      data:  { status: dto.toStatus, ...extraData },
      include: BUG_INCLUDE,
    });

    if (NOTIFY_ON_STATUS.includes(dto.toStatus) && bug.reporterId) {
      await this.notificationsService.createAndDeliver(
        bug.reporterId,
        NotificationType.BUG_STATUS_CHANGED,
        `Bug đã được ${STATUS_LABEL[dto.toStatus] ?? dto.toStatus}`,
        bug.title,
        {},
        'BUG',
        bug.id,
      ).catch(() => {});
    }

    // Đồng bộ: Bug CANCELLED → huỷ task linked còn ở TODO/PENDING_APPROVAL
    if (dto.toStatus === BugStatus.CANCELLED) {
      this.cancelLinkedPendingTasks(id).catch(() => {});
    }

    // Đồng bộ: Mọi đổi trạng thái bug → cập nhật lại % task linked
    this.syncLinkedTasksProgress(id).catch(() => {});

    return updated;
  }

  async approve(id: string, dto: ApproveBugDto, orgUnitIds: string[] | null, actorRole: string) {
    const bug = await this.findOne(id, orgUnitIds);

    if (!bug.isCR) throw new UnprocessableEntityException('Chỉ có thể phê duyệt CR');
    if (bug.status !== BugStatus.PENDING_REVIEW) {
      throw new UnprocessableEntityException('Chỉ có thể duyệt bug ở trạng thái PENDING_REVIEW');
    }
    if (!['PM', 'ADMIN'].includes(actorRole)) {
      throw new ForbiddenException('Chỉ PM mới có thể phê duyệt CR');
    }
    if (dto.decision === 'REJECTED' && !dto.note) {
      throw new BadRequestException('Lý do từ chối là bắt buộc');
    }

    const newStatus = dto.decision === 'APPROVED' ? BugStatus.APPROVED : BugStatus.REJECTED;

    const updated = await this.prisma.bug.update({
      where: { id },
      data: {
        status:      newStatus,
        approvalNote: dto.note,
        approvedAt:  new Date(),
      },
      include: BUG_INCLUDE,
    });

    if (bug.reporterId) {
      const notifType = dto.decision === 'APPROVED'
        ? NotificationType.ISSUE_CR_APPROVED
        : NotificationType.ISSUE_CR_REJECTED;
      const title = dto.decision === 'APPROVED' ? 'CR đã được PM phê duyệt' : 'CR bị từ chối';
      await this.notificationsService.createAndDeliver(
        bug.reporterId,
        notifType,
        title,
        `${bug.title}${dto.note ? ' — ' + dto.note : ''}`,
        {},
        'BUG',
        id,
      ).catch(() => {});
    }

    return updated;
  }

  async assign(id: string, dto: AssignBugDto, orgUnitIds: string[] | null) {
    await this.findOne(id, orgUnitIds);

    const updated = await this.prisma.bug.update({
      where: { id },
      data:  { assigneeId: dto.assigneeId ?? null },
      include: BUG_INCLUDE,
    });

    if (dto.assigneeId) {
      await this.notificationsService.createAndDeliver(
        dto.assigneeId,
        NotificationType.BUG_ASSIGNED,
        'Bug mới được giao cho bạn',
        `${updated.title} — ${updated.severity} — ${updated.project.name}`,
        {},
        'BUG',
        id,
      ).catch(() => {});
    }

    return updated;
  }

  async remove(id: string, orgUnitIds: string[] | null) {
    await this.findOne(id, orgUnitIds);
    await this.prisma.bug.delete({ where: { id } });
  }

  private buildWhere(filters: FilterBugDto, orgUnitIds: string[] | null) {
    const where: any = orgUnitIds !== null
      ? { project: { orgUnitId: { in: orgUnitIds } } }
      : {};

    if (filters.projectId) where.projectId = filters.projectId;
    if (filters.assigneeId) where.assigneeId = filters.assigneeId;
    if (filters.reporterId) where.reporterId = filters.reporterId;
    if (filters.itemType) where.itemType = filters.itemType;
    if (filters.isCR !== undefined) where.isCR = filters.isCR;
    if (filters.requesterName) {
      where.requesterName = { contains: filters.requesterName, mode: 'insensitive' };
    }

    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      where.status = { in: statuses };
    }

    if (filters.severity) {
      const severities = Array.isArray(filters.severity) ? filters.severity : [filters.severity];
      where.severity = { in: severities };
    }

    if (filters.createdFrom || filters.createdTo) {
      where.createdAt = {};
      if (filters.createdFrom) where.createdAt.gte = new Date(filters.createdFrom);
      if (filters.createdTo)   where.createdAt.lte = new Date(filters.createdTo);
    }

    if (filters.overdue) {
      where.dueDate = { lt: new Date() };
      where.status = { notIn: ['RESOLVED', 'CLOSED', 'CANCELLED', 'REJECTED'] };
    }

    return where;
  }

  private async syncLinkedTasksProgress(bugId: string): Promise<void> {
    const links = await this.prisma.bugTask.findMany({
      where: { bugId },
      select: { taskId: true },
    });
    for (const { taskId } of links) {
      await this.tasksService.syncProgressFromBugs(taskId);
    }
  }

  /**
   * Đồng bộ: Bug CANCELLED → huỷ các task linked còn ở TODO/PENDING_APPROVAL.
   * Không động đến IN_PROGRESS/RETURNED vì đang được xử lý tích cực.
   */
  private async cancelLinkedPendingTasks(bugId: string): Promise<void> {
    const links = await this.prisma.bugTask.findMany({
      where: { bugId },
      include: { task: { select: { id: true, status: true } } },
    });

    const cancelable = ['TODO', 'PENDING_APPROVAL'];
    for (const link of links) {
      if (link.task && cancelable.includes(link.task.status)) {
        await this.prisma.task.update({
          where: { id: link.taskId },
          data: { status: 'CANCELLED' },
        });
      }
    }
  }

  private async assertProjectInScope(projectId: string, orgUnitIds: string[] | null) {
    if (orgUnitIds === null) return; // ADMIN xem tất cả
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, orgUnitId: { in: orgUnitIds } },
    });
    if (!project) throw new NotFoundException(`Project ${projectId} không tìm thấy trong scope`);
  }
}
