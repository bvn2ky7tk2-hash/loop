import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { TelegramService, TelegramUpdate } from './telegram.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CLS_TENANT_ID } from '../../common/cls/cls-keys';

const STATUS_LABELS: Record<string, string> = {
  DONE: 'Hoàn thành',
  IN_PROGRESS: 'Đang làm',
  RETURNED: 'Trả lại',
  TODO: 'Chờ làm',
  PENDING_APPROVAL: 'Chờ duyệt',
  CANCELLED: 'Đã huỷ',
};

type CallbackAction = 'done' | 'inprogress' | 'return';

interface ParsedCallback {
  action: CallbackAction;
  taskId: string;
}

@Injectable()
export class TelegramPollerService implements OnModuleInit {
  private readonly logger = new Logger(TelegramPollerService.name);
  private offset = 0;

  constructor(
    private readonly telegramService: TelegramService,
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
  ) {}

  async onModuleInit() {
    // Không await — để loop chạy nền, tránh block NestJS startup
    this.startPolling();
  }

  private async startPolling(): Promise<void> {
    this.logger.log('Telegram poller started');
    while (true) {
      if (!this.telegramService.getIsEnabled()) {
        await this.sleep(5000);
        continue;
      }
      try {
        const updates = await this.telegramService.getUpdates(this.offset, 30);
        for (const update of updates) {
          this.offset = update.update_id + 1;
          if (update.callback_query) {
            // Không await — xử lý async, không block polling loop
            this.handleCallbackQuery(update.callback_query).catch((err) =>
              this.logger.warn('Callback handler error', err),
            );
          }
        }
      } catch (err) {
        this.logger.warn('Polling error, retrying in 5s', err);
        await this.sleep(5000);
      }
    }
  }

  parseCallbackData(data: string): ParsedCallback | null {
    const parts = data.split(':');
    if (parts.length !== 3) return null;
    const [prefix, action, taskId] = parts;
    if (prefix !== 'task') return null;
    if (!['done', 'inprogress', 'return'].includes(action)) return null;
    if (!taskId) return null;
    return { action: action as CallbackAction, taskId };
  }

  private async handleCallbackQuery(
    query: NonNullable<TelegramUpdate['callback_query']>,
  ): Promise<void> {
    if (!query.data) return;

    const parsed = this.parseCallbackData(query.data);
    if (!parsed) {
      this.logger.debug(`Ignoring unknown callback data: ${query.data}`);
      return;
    }

    const { action, taskId } = parsed;

    // Resolve task NGOÀI CLS context: query này không bị tenant-extension inject
    // (CLS rỗng) nên đọc được mọi tenant — đúng ý đồ để xác định tenant của task.
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      await this.telegramService.answerCallbackQuery(
        query.id,
        '❌ Không tìm thấy task này',
      );
      return;
    }

    // Không có tenantId → không thể scope an toàn → từ chối ghi (phòng thủ).
    if (!task.tenantId) {
      this.logger.warn(
        `Callback bỏ qua: task ${taskId} không có tenantId, không thể ghi an toàn`,
      );
      await this.telegramService.answerCallbackQuery(
        query.id,
        '❌ Không thể xử lý task này',
      );
      return;
    }

    // Check if already done/cancelled
    if (['DONE', 'CANCELLED'].includes(task.status)) {
      const label = STATUS_LABELS[task.status] ?? task.status;
      await this.telegramService.answerCallbackQuery(
        query.id,
        `ℹ️ Task này đã ở trạng thái ${label}`,
      );
      return;
    }

    // Map action to status
    const statusMap: Record<CallbackAction, string> = {
      done: 'DONE',
      inprogress: 'IN_PROGRESS',
      return: 'RETURNED',
    };
    const newStatus = statusMap[action];

    // Mọi thao tác ghi DB phải nằm trong CLS context có tenantId của task,
    // để tenant-extension scope đúng tenant (tránh ghi sang tenant khác).
    await this.cls.run(async () => {
      this.cls.set(CLS_TENANT_ID, task.tenantId);

      // Update task
      await this.prisma.task.update({
        where: { id: taskId },
        data: {
          status: newStatus as never,
          ...(newStatus === 'DONE' ? { progress: 100 } : {}),
        },
      });

      // Build confirm text
      const statusLabel = STATUS_LABELS[newStatus] ?? newStatus;
      const confirmText = `✅ Đã cập nhật: ${statusLabel}`;
      await this.telegramService.answerCallbackQuery(query.id, confirmText);

      // Edit original message
      const tgMsg = await this.prisma.telegramMessage.findFirst({
        where: { taskId },
        orderBy: { createdAt: 'desc' },
      });

      if (tgMsg) {
        const now = new Date();
        const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} ${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}`;
        const statusEmoji =
          newStatus === 'DONE' ? '✅' : newStatus === 'IN_PROGRESS' ? '🔄' : '↩️';
        const editedText = `📌 *\\[LOOP\\]* Task đã cập nhật\n_${statusEmoji} ${statusLabel} \\— ${timestamp}_`;
        await this.telegramService.editMessageText(tgMsg.messageId, editedText);
      }
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
