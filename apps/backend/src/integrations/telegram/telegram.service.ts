import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const SINGLETON_ID = 'singleton';
const TG_API = 'https://api.telegram.org';

export interface TelegramUpdate {
  update_id: number;
  callback_query?: {
    id: string;
    data?: string;
    message?: { message_id: number; chat: { id: number } };
    from: { id: number; username?: string; first_name?: string };
  };
}

@Injectable()
export class TelegramService implements OnModuleInit {
  private readonly logger = new Logger(TelegramService.name);
  private botToken: string | null = null;
  private chatId: string | null = null;
  private isEnabled = false;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.refreshConfig();
  }

  async refreshConfig(): Promise<void> {
    const config = await this.prisma.telegramConfig.findUnique({
      where: { id: SINGLETON_ID },
    });
    this.isEnabled = config?.isEnabled ?? false;
    this.botToken = config?.botToken ?? null;
    this.chatId = config?.chatId ?? null;
  }

  async sendMessage(text: string, replyMarkup?: object): Promise<void> {
    if (!this.isEnabled || !this.botToken || !this.chatId) return;
    try {
      const res = await fetch(`${TG_API}/bot${this.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.chatId,
          text,
          parse_mode: 'MarkdownV2',
          ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        this.logger.warn(`Telegram API error ${res.status}: ${body}`);
      }
    } catch (err) {
      this.logger.warn('Telegram sendMessage failed', err);
    }
  }

  async sendMessageWithId(text: string, replyMarkup?: object): Promise<number | null> {
    if (!this.isEnabled || !this.botToken || !this.chatId) return null;
    try {
      const res = await fetch(`${TG_API}/bot${this.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.chatId,
          text,
          parse_mode: 'MarkdownV2',
          ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
        }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { ok: boolean; result?: { message_id: number } };
      return data.result?.message_id ?? null;
    } catch (err) {
      this.logger.warn('Telegram sendMessageWithId failed', err);
      return null;
    }
  }

  async editMessageText(messageId: number, text: string): Promise<void> {
    if (!this.isEnabled || !this.botToken || !this.chatId) return;
    try {
      await fetch(`${TG_API}/bot${this.botToken}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.chatId,
          message_id: messageId,
          text,
          parse_mode: 'MarkdownV2',
        }),
      });
    } catch (err) {
      this.logger.warn('Telegram editMessageText failed', err);
    }
  }

  async answerCallbackQuery(callbackQueryId: string, text: string): Promise<void> {
    if (!this.botToken) return;
    try {
      await fetch(`${TG_API}/bot${this.botToken}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
      });
    } catch (err) {
      this.logger.warn('Telegram answerCallbackQuery failed', err);
    }
  }

  async getUpdates(offset: number, timeout = 30): Promise<TelegramUpdate[]> {
    if (!this.botToken) return [];
    try {
      const res = await fetch(
        `${TG_API}/bot${this.botToken}/getUpdates?offset=${offset}&timeout=${timeout}`,
        { signal: AbortSignal.timeout((timeout + 5) * 1000) },
      );
      if (!res.ok) return [];
      const data = (await res.json()) as { ok: boolean; result: TelegramUpdate[] };
      return data.result ?? [];
    } catch (err) {
      this.logger.warn('Telegram getUpdates failed', err);
      return [];
    }
  }

  maskToken(token: string): string {
    return token.substring(0, 8) + '***';
  }

  getIsEnabled(): boolean {
    return this.isEnabled;
  }

  getBotToken(): string | null {
    return this.botToken;
  }

  getChatId(): string | null {
    return this.chatId;
  }
}
