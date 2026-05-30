import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { TenantAwareService } from '../common/services/tenant-aware.service';
import { paginate, PaginatedResult } from '../common/dto/pagination.dto';
import { CreateJournalDto, UpdateJournalDto, ConvertToTaskDto } from './dto/create-journal.dto';

@Injectable({ scope: Scope.REQUEST })
export class ProjectJournalService extends TenantAwareService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REQUEST) req?: any,
  ) {
    super(req);
  }

  async create(projectId: string, dto: CreateJournalDto, userId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
    });
    if (!project) throw new NotFoundException('Không tìm thấy dự án');

    return this.prisma.projectJournal.create({
      data: {
        projectId,
        date:           new Date(dto.date),
        title:          dto.title,
        startTime:      dto.startTime,
        endTime:        dto.endTime,
        location:       dto.location,
        participants:   dto.participants ?? [],
        content:        dto.content,
        resolvedItems:  dto.resolvedItems ?? [],
        unresolvedItems: dto.unresolvedItems ?? [],
        attachments:    dto.attachments,
        createdById:    userId,
        tenantId:       this.getTenantId(),
      },
      include: {
        createdBy: { select: { id: true, name: true } },
      },
    });
  }

  async list(projectId: string, page = 1, limit = 50): Promise<PaginatedResult<any>> {
    const where = this.tenantWhere({ projectId });
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.projectJournal.findMany({
        where,
        include: { createdBy: { select: { id: true, name: true } } },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.projectJournal.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findOne(id: string) {
    const journal = await this.prisma.projectJournal.findUnique({
      where: { id },
      include: { createdBy: { select: { id: true, name: true } } },
    });
    if (!journal) throw new NotFoundException('Không tìm thấy nhật ký');
    return journal;
  }

  async update(id: string, dto: UpdateJournalDto) {
    await this.findOne(id);
    return this.prisma.projectJournal.update({
      where: { id },
      data: {
        ...(dto.date           ? { date: new Date(dto.date) } : {}),
        ...(dto.title          !== undefined ? { title: dto.title } : {}),
        ...(dto.startTime      !== undefined ? { startTime: dto.startTime } : {}),
        ...(dto.endTime        !== undefined ? { endTime: dto.endTime } : {}),
        ...(dto.location       !== undefined ? { location: dto.location } : {}),
        ...(dto.participants   !== undefined ? { participants: dto.participants } : {}),
        ...(dto.content        !== undefined ? { content: dto.content } : {}),
        ...(dto.resolvedItems  !== undefined ? { resolvedItems: dto.resolvedItems } : {}),
        ...(dto.unresolvedItems !== undefined ? { unresolvedItems: dto.unresolvedItems } : {}),
        ...(dto.attachments    !== undefined ? { attachments: dto.attachments } : {}),
      },
      include: { createdBy: { select: { id: true, name: true } } },
    });
  }

  /**
   * Đếm số items status=OPEN trong unresolvedItems của toàn bộ journals thuộc project.
   */
  async unresolvedSummary(projectId: string) {
    const where = this.tenantWhere({ projectId });
    const journals = await this.prisma.projectJournal.findMany({
      where,
      select: { unresolvedItems: true },
      take: 500,
    });

    let total = 0;
    let open  = 0;

    for (const j of journals) {
      const items = (j.unresolvedItems as any[]) ?? [];
      total += items.length;
      open  += items.filter((i: any) => !i.status || i.status === 'OPEN').length;
    }

    return { total, open, resolved: total - open };
  }

  /**
   * Chuyển một item trong unresolvedItems thành Task.
   * Cập nhật item.status = 'CONVERTED' và lưu taskId.
   */
  async convertToTask(
    journalId: string,
    itemId: string,
    dto: ConvertToTaskDto,
    requestUserId: string,
  ) {
    const journal = await this.findOne(journalId);

    const unresolvedItems = (journal.unresolvedItems as any[]) ?? [];
    const itemIndex = unresolvedItems.findIndex((i: any) => i.id === itemId);
    if (itemIndex === -1) throw new NotFoundException('Không tìm thấy unresolved item');

    // Tạo Task trong project
    const task = await this.prisma.task.create({
      data: {
        projectId:  journal.projectId,
        title:      dto.taskTitle,
        description: unresolvedItems[itemIndex].text ?? '',
        assigneeId: dto.assigneeId,
        tenantId:   this.getTenantId(),
      },
    });

    // Cập nhật item → CONVERTED và gắn taskId
    unresolvedItems[itemIndex] = {
      ...unresolvedItems[itemIndex],
      status: 'CONVERTED',
      taskId: task.id,
    };

    await this.prisma.projectJournal.update({
      where: { id: journalId },
      data: { unresolvedItems },
    });

    return { taskId: task.id, task };
  }
}
