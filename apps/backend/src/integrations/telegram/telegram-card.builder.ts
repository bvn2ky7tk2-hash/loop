import { Injectable } from '@nestjs/common';

export type TelegramEventType = 'NEW_TASK' | 'DEADLINE_ALERT';

export interface TaskCardData {
  id: string;
  title: string;
  dueDate?: Date | null;
  estimateHours?: number | string | null;
  assigneeName?: string | null;
  projectName?: string | null;
}

export interface InlineKeyboardMarkup {
  inline_keyboard: Array<Array<{ text: string; callback_data: string }>>;
}

export interface TelegramCard {
  text: string;
  reply_markup: InlineKeyboardMarkup;
}

export function escapeMarkdownV2(text: string): string {
  return text.replace(/([_*[\]()~`>#+=|{}.!\\-])/g, '\\$1');
}

function daysUntilDeadline(dueDate: Date): number {
  const now = new Date();
  const diff = dueDate.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

@Injectable()
export class TelegramCardBuilder {
  buildTaskCard(task: TaskCardData, event: TelegramEventType): TelegramCard {
    const header =
      event === 'NEW_TASK'
        ? '📌 *\\[LOOP\\]* Task mới được giao'
        : '⚠️ *\\[LOOP\\]* Task sắp đến hạn';

    const titleEscaped = escapeMarkdownV2(task.title);
    const assigneeEscaped = task.assigneeName
      ? escapeMarkdownV2(task.assigneeName)
      : 'Chưa giao';
    const projectEscaped = task.projectName
      ? escapeMarkdownV2(task.projectName)
      : 'N/A';

    const estimateHours = task.estimateHours != null ? Number(task.estimateHours) : 0;

    let lines = [
      header,
      `*TSK* \\| ${titleEscaped}`,
      `👤 Thực hiện: ${assigneeEscaped}`,
    ];

    if (task.dueDate) {
      const daysLeft = daysUntilDeadline(task.dueDate);
      const d = task.dueDate;
      const dateFormatted = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
      const daysLeftEscaped = escapeMarkdownV2(`${daysLeft}`);
      const dateEscaped = escapeMarkdownV2(dateFormatted);
      lines.push(`📅 Hạn: ${dateEscaped} \\(${daysLeftEscaped} ngày\\)`);
    }

    lines.push(
      `📊 Estimate: ${escapeMarkdownV2(String(estimateHours))}h \\| Dự án: ${projectEscaped}`,
    );

    const text = lines.join('\n');

    const reply_markup: InlineKeyboardMarkup = {
      inline_keyboard: [
        [
          { text: '✅ Hoàn thành', callback_data: `task:done:${task.id}` },
          { text: '🔄 Đang làm', callback_data: `task:inprogress:${task.id}` },
          { text: '↩️ Trả lại', callback_data: `task:return:${task.id}` },
        ],
      ],
    };

    return { text, reply_markup };
  }
}
