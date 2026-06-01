import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DefinitionStatus } from '../generated/prisma';

export interface StartProcessOpts {
  definitionKey: string;
  entityType: string;           // 'PURCHASE_ORDER' | 'BUDGET_PLAN' | ...
  entityId: string;
  startedByUserId?: string;
  approverUserId?: string | null;
  variables?: Record<string, unknown>;
  taskName?: string;
}

/**
 * Khởi tạo BPM process cho một bản ghi nghiệp vụ (PO, ngân sách, đánh giá...).
 * Liên kết entity lưu trong variables (entityType/entityId) — không cần thêm cột FK.
 * Trả về { instanceId } nếu start thành công, null nếu loại đó chưa cấu hình quy trình.
 */
@Injectable()
export class ProcessStarterService {
  private readonly logger = new Logger(ProcessStarterService.name);
  constructor(private readonly prisma: PrismaService) {}

  async startForEntity(opts: StartProcessOpts): Promise<{ instanceId: string } | null> {
    if (!opts.startedByUserId) return null; // không có người khởi tạo hợp lệ → bỏ qua an toàn
    const def = await this.prisma.processDefinition.findFirst({
      where: { key: opts.definitionKey, status: DefinitionStatus.ACTIVE },
      select: { id: true, name: true, stepConfig: true, bpmnXml: true },
    });
    if (!def) return null; // chưa cấu hình quy trình → nghiệp vụ vẫn chạy bình thường

    // Bước đầu lấy từ BPMN XML (giữ đúng thứ tự); fallback stepConfig
    const m = /<bpmn:userTask\s+id="([^"]+)"|<userTask\s+id="([^"]+)"/.exec(def.bpmnXml ?? '');
    const firstTask = m?.[1] ?? m?.[2] ?? Object.keys((def.stepConfig as Record<string, unknown>) ?? {})[0] ?? 'ApproveTask';
    const taskName = opts.taskName ?? `Phê duyệt: ${def.name}`;

    try {
      const instance = await this.prisma.processInstance.create({
        data: {
          definitionId: def.id,
          startedBy: opts.startedByUserId,
          status: 'RUNNING',
          variables: {
            ...(opts.variables ?? {}),
            entityType: opts.entityType,
            entityId: opts.entityId,
          } as object,
          tokenState: { current: firstTask } as object,
        },
      });

      await this.prisma.processUserTask.create({
        data: {
          instanceId: instance.id,
          activityId: firstTask,
          name: taskName,
          assigneeId: opts.approverUserId ?? null,
          candidateRoles: ['MANAGER', 'ADMIN'],
          status: 'PENDING',
        },
      });

      await this.prisma.processActivityLog.createMany({
        data: [
          { instanceId: instance.id, activityId: 'StartEvent_1', activityName: 'Bắt đầu', activityType: 'startEvent', performedBy: opts.startedByUserId },
          { instanceId: instance.id, activityId: firstTask, activityName: taskName, activityType: 'userTask', performedBy: null },
        ],
      });

      return { instanceId: instance.id };
    } catch (e) {
      this.logger.error(`Không thể start process ${opts.definitionKey}: ${(e as Error).message}`);
      return null;
    }
  }
}
