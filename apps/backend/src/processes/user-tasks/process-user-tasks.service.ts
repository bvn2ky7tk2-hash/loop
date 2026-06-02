import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BpmnEngineService } from '../engine/bpmn-engine.service';
import { UserTaskStatus } from '../../generated/prisma';
import { CompleteTaskDto } from './dto/complete-task.dto';
import { ReturnTaskDto } from './dto/return-task.dto';

@Injectable()
export class ProcessUserTasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engineService: BpmnEngineService,
  ) {}

  async countAll() {
    const total = await this.prisma.processUserTask.count({
      where: { status: { in: [UserTaskStatus.PENDING, UserTaskStatus.IN_PROGRESS] } },
    });
    return { total };
  }

  async findAll(userId: string, page = 1, pageSize = 20, instanceId?: string) {
    // When viewing an instance's tasks (monitor page): show all tasks for that instance.
    // When browsing inbox (no instanceId): show only actionable tasks — exclude COMPLETED/SKIPPED.
    const where = instanceId
      ? { instanceId }
      : {
          OR: [
            { assigneeId: userId, status: { in: [UserTaskStatus.PENDING, UserTaskStatus.IN_PROGRESS] } },
            { assigneeId: null,   status: UserTaskStatus.PENDING },
          ],
        };

    const [items, total] = await Promise.all([
      this.prisma.processUserTask.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { dueDate: 'desc' },
        include: {
          instance: {
            select: {
              id: true,
              status: true,
              variables: true,
              startedByUser: {
                select: {
                  id: true,
                  name: true,
                  employee: {
                    select: {
                      code: true,
                      fullName: true,
                      orgUnit: { select: { name: true } },
                      position: {
                        select: {
                          jobTitle: { select: { name: true } },
                        },
                      },
                    },
                  },
                },
              },
              definition: {
                select: {
                  id: true,
                  name: true,
                  version: true,
                  formFields: true,
                  taskFormFields: true,
                },
              },
            },
          },
          assignee: { select: { id: true, name: true } },
        },
      }),
      this.prisma.processUserTask.count({ where }),
    ]);

    return { data: items, meta: { total, page, pageSize } };
  }

  async findOne(id: string) {
    const task = await this.prisma.processUserTask.findUnique({
      where: { id },
      include: {
        instance: {
          select: {
            id: true,
            status: true,
            variables: true,
            startedByUser: {
              select: {
                id: true,
                name: true,
                employee: {
                  select: {
                    code: true,
                    fullName: true,
                    orgUnit: { select: { name: true } },
                    position: {
                      select: {
                        jobTitle: { select: { name: true } },
                      },
                    },
                  },
                },
              },
            },
            definition: {
              select: {
                id: true,
                name: true,
                version: true,
                formFields: true,
                taskFormFields: true,
              },
            },
          },
        },
        assignee: { select: { id: true, name: true } },
      },
    });

    if (!task) throw new NotFoundException('Không tìm thấy user task');
    return { data: task };
  }

  async claim(id: string, userId: string) {
    const task = await this.prisma.processUserTask.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Không tìm thấy user task');

    if (task.status !== UserTaskStatus.PENDING) {
      throw new BadRequestException('Chỉ task ở trạng thái PENDING mới có thể claim');
    }

    // Nếu đã có assignee khác → không cho claim
    if (task.assigneeId && task.assigneeId !== userId) {
      throw new ForbiddenException('Task đã được giao cho người khác');
    }

    const updated = await this.prisma.processUserTask.update({
      where: { id },
      data: { assigneeId: userId, status: UserTaskStatus.IN_PROGRESS },
    });

    return { data: updated };
  }

  /**
   * Ủy quyền / giao task cho người khác xử lý.
   * Người đang giữ task (hoặc task chưa gán) chuyển sang assignee mới, kèm ghi chú.
   */
  async reassign(id: string, targetUserId: string, currentUserId: string, note?: string) {
    const task = await this.prisma.processUserTask.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Không tìm thấy user task');
    if (task.status === UserTaskStatus.COMPLETED || task.status === UserTaskStatus.SKIPPED) {
      throw new BadRequestException('Task đã kết thúc, không thể ủy quyền');
    }
    // Chỉ người đang giữ task (hoặc task chưa gán) mới được ủy quyền
    if (task.assigneeId && task.assigneeId !== currentUserId) {
      throw new ForbiddenException('Chỉ người đang xử lý task mới có thể ủy quyền');
    }
    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId }, select: { id: true, name: true },
    });
    if (!target) throw new NotFoundException('Không tìm thấy người được ủy quyền');

    const updated = await this.prisma.processUserTask.update({
      where: { id },
      data: { assigneeId: targetUserId, status: UserTaskStatus.PENDING },
    });

    const fromUser = await this.prisma.user.findUnique({
      where: { id: currentUserId }, select: { name: true },
    });
    await this.prisma.processActivityLog.create({
      data: {
        instanceId: task.instanceId,
        activityId: task.activityId,
        activityName: `${task.name} — ủy quyền cho ${target.name}${note ? ` (${note})` : ''}`,
        activityType: 'reassign',
        performedBy: currentUserId,
        startedAt: new Date(),
        completedAt: new Date(),
      },
    });

    // Thông báo cho người được ủy quyền
    try {
      await this.prisma.notification.create({
        data: {
          userId: targetUserId,
          type: 'PROCESS_TASK_ASSIGNED' as never,
          title: 'Bạn được ủy quyền xử lý công việc',
          body: `${fromUser?.name ?? 'Người dùng'} đã ủy quyền cho bạn xử lý: "${task.name}"${note ? ` — ${note}` : ''}`,
          link: `/processes/instances/${task.instanceId}`,
          entityType: 'ProcessUserTask',
          entityId: task.id,
        },
      });
    } catch { /* notification không bắt buộc */ }

    return { data: updated };
  }

  async complete(id: string, userId: string, dto: CompleteTaskDto) {
    const task = await this.prisma.processUserTask.findUnique({
      where: { id },
      include: { instance: true },
    });

    if (!task) throw new NotFoundException('Không tìm thấy user task');

    if (task.status === UserTaskStatus.COMPLETED) {
      throw new BadRequestException('Task đã hoàn thành');
    }

    if (task.status === UserTaskStatus.SKIPPED) {
      throw new BadRequestException('Task đã bị bỏ qua');
    }

    if (task.assigneeId && task.assigneeId !== userId) {
      throw new ForbiddenException('Chỉ người được giao task mới có thể hoàn thành');
    }

    // Cập nhật task status + lưu form data vào task record
    const hasVars = dto.variables && Object.keys(dto.variables).length > 0;
    const updated = await this.prisma.processUserTask.update({
      where: { id },
      data: {
        status: UserTaskStatus.COMPLETED,
        completedAt: new Date(),
        ...(hasVars ? { formData: dto.variables as never } : {}),
      },
    });

    // Merge variables vào instance để các bước sau có thể xem lại
    if (hasVars) {
      const inst = await this.prisma.processInstance.findUnique({
        where: { id: task.instanceId },
        select: { variables: true },
      });
      const merged = {
        ...(inst?.variables as Record<string, unknown> ?? {}),
        ...dto.variables,
      };
      await this.prisma.processInstance.update({
        where: { id: task.instanceId },
        data: { variables: merged as never },
      });
    }

    // Ghi activity log
    await this.prisma.processActivityLog.create({
      data: {
        instanceId: task.instanceId,
        activityId: task.activityId,
        activityName: task.name,
        activityType: 'bpmn:UserTask',
        performedBy: userId,
        completedAt: new Date(),
      },
    });

    // Gửi notification hoàn thành (taskCompleted trigger) trước khi resume engine
    await this.engineService.sendCompletionNotification(
      id,
      task.instanceId,
      task.activityId,
      task.name,
    );

    // Tiếp tục engine execution (tokenState được persist bên trong engineService)
    try {
      await this.engineService.completeUserTask(
        task.instanceId,
        task.activityId,
        dto.variables ?? {},
      );
    } catch {
      // Engine error đã được log trong BpmnEngineService
    }

    return { data: updated };
  }

  /**
   * Duyệt/Từ chối nhiều user tasks cùng lúc.
   * APPROVE/REJECT → set variables { decision } rồi complete engine.
   * Task không thuộc userId hoặc sai trạng thái → ghi vào errors[].
   */
  async batchApprove(taskIds: string[], decision: 'APPROVE' | 'REJECT', userId: string) {
    const results: { id: string; status: 'ok' | 'error'; message?: string }[] = [];

    for (const id of taskIds) {
      try {
        const task = await this.prisma.processUserTask.findUnique({ where: { id } });

        if (!task) {
          results.push({ id, status: 'error', message: 'Task không tồn tại' });
          continue;
        }

        if (task.status !== UserTaskStatus.PENDING && task.status !== UserTaskStatus.IN_PROGRESS) {
          results.push({ id, status: 'error', message: `Task ở trạng thái ${task.status}, không thể xử lý` });
          continue;
        }

        if (task.assigneeId && task.assigneeId !== userId) {
          results.push({ id, status: 'error', message: 'Task đã được giao cho người khác' });
          continue;
        }

        const variables = { decision };

        await this.prisma.processUserTask.update({
          where: { id },
          data: { status: UserTaskStatus.COMPLETED, completedAt: new Date(), formData: variables as never },
        });

        const inst = await this.prisma.processInstance.findUnique({
          where: { id: task.instanceId },
          select: { variables: true },
        });
        await this.prisma.processInstance.update({
          where: { id: task.instanceId },
          data: { variables: { ...(inst?.variables as Record<string, unknown> ?? {}), decision } as never },
        });

        await this.prisma.processActivityLog.create({
          data: {
            instanceId: task.instanceId,
            activityId: task.activityId,
            activityName: `${task.name} (batch-${decision.toLowerCase()})`,
            activityType: 'bpmn:UserTask',
            performedBy: userId,
            completedAt: new Date(),
          },
        });

        try {
          await this.engineService.completeUserTask(task.instanceId, task.activityId, variables);
        } catch {
          // Engine error không block kết quả batch
        }

        results.push({ id, status: 'ok' });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Lỗi không xác định';
        results.push({ id, status: 'error', message: msg });
      }
    }

    const okCount = results.filter((r) => r.status === 'ok').length;
    const errCount = results.filter((r) => r.status === 'error').length;
    return { data: results, meta: { total: taskIds.length, ok: okCount, errors: errCount } };
  }

  async returnTask(id: string, userId: string, dto: ReturnTaskDto) {
    const task = await this.prisma.processUserTask.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Không tìm thấy user task');

    if (task.status !== UserTaskStatus.IN_PROGRESS) {
      throw new BadRequestException('Chỉ task đang IN_PROGRESS mới có thể trả lại');
    }

    if (task.assigneeId !== userId) {
      throw new ForbiddenException('Chỉ người đang xử lý task mới có thể trả lại');
    }

    const updated = await this.prisma.processUserTask.update({
      where: { id },
      data: {
        status: UserTaskStatus.PENDING,
        assigneeId: null,
      },
    });

    await this.prisma.processActivityLog.create({
      data: {
        instanceId: task.instanceId,
        activityId: task.activityId,
        activityName: task.name + ' (returned)',
        activityType: 'bpmn:UserTask',
        performedBy: userId,
        completedAt: new Date(),
      },
    });

    return { data: updated };
  }
}
