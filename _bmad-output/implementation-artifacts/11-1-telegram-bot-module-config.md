# Story 11.1: Backend — Telegram Bot Module & Configuration API

Status: done

## Story

As a system administrator,
I want to configure a Telegram bot token and chat ID through the Loop API,
so that the Telegram integration can be enabled or disabled without restarting the server.

## Acceptance Criteria

1. Prisma schema có model `TelegramConfig` mới với các trường: `id`, `botToken`, `chatId`, `isEnabled`, `createdAt`, `updatedAt`. Chỉ có tối đa 1 record (singleton pattern).
2. `TelegramService` có method `sendMessage(text, replyMarkup?)` gọi `POST https://api.telegram.org/bot{token}/sendMessage`. Nếu lỗi (network, token sai), catch và log Pino `warn` — KHÔNG throw, KHÔNG break caller.
3. `GET /api/v1/integrations/telegram` trả về config hiện tại (`botToken` mask chỉ 8 ký tự đầu + `***`). Nếu chưa có config, trả `{ isEnabled: false, botToken: null, chatId: null }`.
4. `PUT /api/v1/integrations/telegram` upsert config. Chỉ Admin mới được gọi.
5. `POST /api/v1/integrations/telegram/test` gửi tin thử nghiệm đến chatId đã config. Trả `{ success: true }` hoặc `{ success: false, error: "..." }` — không bao giờ trả 5xx.
6. Khi `isEnabled: false`, method `sendMessage` return sớm mà không gọi Telegram API.
7. `TelegramModule` được import vào `AppModule`.
8. Unit tests cho `TelegramService`: (a) gọi fetch đúng URL khi enabled, (b) return sớm khi disabled, (c) không throw khi fetch fail.

## Tasks / Subtasks

- [x] Task 1: Prisma migration — thêm model `TelegramConfig` (AC: 1)
  - [x] Thêm model vào `apps/backend/prisma/schema.prisma`
  - [x] Chạy `npx prisma db push` trong `apps/backend/`
  - [x] Verify schema synced với DB

- [x] Task 2: Tạo `TelegramModule` structure (AC: 2, 6, 7)
  - [x] Tạo thư mục `apps/backend/src/integrations/telegram/`
  - [x] Tạo `telegram.module.ts` — NestJS module, export `TelegramService`
  - [x] Tạo `telegram.service.ts` — inject `PrismaService`, implement `sendMessage()` dùng native `fetch()`
  - [x] Implement `isEnabled` check: load config từ DB khi khởi động, cache in-memory, refresh khi config update
  - [x] Tạo `telegram.controller.ts` — 3 endpoints: GET, PUT, POST /test
  - [x] Tạo `dto/update-telegram-config.dto.ts` — class-validator DTOs

- [x] Task 3: Implement Controller endpoints (AC: 3, 4, 5)
  - [x] `GET /api/v1/integrations/telegram` — trả masked config
  - [x] `PUT /api/v1/integrations/telegram` — `@Roles(Role.ADMIN)`, upsert, refresh cache service
  - [x] `POST /api/v1/integrations/telegram/test` — `@Roles(Role.ADMIN)`, gọi sendMessage rồi trả `{ success, error? }`

- [x] Task 4: Register vào AppModule (AC: 7)
  - [x] Import `TelegramModule` vào `apps/backend/src/app.module.ts`

- [x] Task 5: Unit tests (AC: 8)
  - [x] Tạo `apps/backend/src/integrations/telegram/telegram.service.spec.ts`
  - [x] Test: `sendMessage` khi `isEnabled: false` → return undefined, không gọi fetch
  - [x] Test: `sendMessage` khi enabled → gọi fetch với đúng URL format
  - [x] Test: khi fetch throw error → catch, log warn, return undefined (không rethrow)
  - [x] Test: `maskToken()` helper → 8 chars + `***`

## Dev Notes

### Cấu trúc file thực tế của project

Module theo pattern flat: `src/{domain}/` — KHÔNG phải `src/modules/{domain}/`. Xem các module hiện có: `src/alerts/`, `src/notifications/`, `src/tasks/`. Tạo `src/integrations/telegram/` theo pattern tương tự.

`AppModule` ở `apps/backend/src/app.module.ts` — import thêm `TelegramModule` vào array `imports`.

### Prisma schema — thêm model mới

File: `apps/backend/prisma/schema.prisma`

```prisma
model TelegramConfig {
  id        String   @id @default(uuid())
  botToken  String   @map("bot_token")
  chatId    String   @map("chat_id")
  isEnabled Boolean  @default(false) @map("is_enabled")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("telegram_configs")
}
```

Singleton: chỉ có 1 record. `upsert` dùng `where: { id: SINGLETON_ID }` với `SINGLETON_ID = 'singleton'`.

### TelegramService pattern

Dùng Node.js built-in `fetch()` (Node 18+ — không cần add dependency). Pattern bắt chước `MailService` ở `src/notifications/mail.service.ts` (inject PrismaService, try/catch, Pino logger).

```typescript
// apps/backend/src/integrations/telegram/telegram.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const SINGLETON_ID = 'singleton';
const TG_API = 'https://api.telegram.org';

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

  async refreshConfig() {
    const config = await this.prisma.telegramConfig.findUnique({ where: { id: SINGLETON_ID } });
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
  
  // Trả về message_id của tin nhắn đã gửi (dùng để edit sau)
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
      const data = await res.json() as { ok: boolean; result?: { message_id: number } };
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
      const data = await res.json() as { ok: boolean; result: TelegramUpdate[] };
      return data.result ?? [];
    } catch (err) {
      this.logger.warn('Telegram getUpdates failed', err);
      return [];
    }
  }

  maskToken(token: string): string {
    return token.substring(0, 8) + '***';
  }

  getIsEnabled(): boolean { return this.isEnabled; }
}

export interface TelegramUpdate {
  update_id: number;
  callback_query?: {
    id: string;
    data?: string;
    message?: { message_id: number; chat: { id: number } };
    from: { id: number; username?: string; first_name?: string };
  };
}
```

### Controller pattern

Xem `src/alerts/alerts.controller.ts` để follow pattern: `@ApiTags`, `@Controller`, `@UseGuards(JwtAuthGuard)`, `@Roles`.

Guards: `JwtAuthGuard` ở `src/common/guards/jwt-auth.guard.ts`, `RolesGuard` ở `src/common/guards/roles.guard.ts`. Decorator `@Roles` ở `src/common/decorators/roles.decorator.ts`.

```typescript
// Route prefix
@Controller('integrations/telegram')
@UseGuards(JwtAuthGuard)
@ApiTags('integrations')
```

### DTO pattern

```typescript
// dto/update-telegram-config.dto.ts
import { IsBoolean, IsOptional, IsString } from 'class-validator';
export class UpdateTelegramConfigDto {
  @IsOptional() @IsString() botToken?: string;
  @IsOptional() @IsString() chatId?: string;
  @IsOptional() @IsBoolean() isEnabled?: boolean;
}
```

### Test pattern

Xem `src/alerts/alerts.service.ts` tests nếu có, hoặc follow Jest pattern của dự án. Jest config ở `apps/backend/package.json` (key `"jest"`). Dùng `jest.fn()` để mock `PrismaService` và `fetch`.

Để mock global `fetch` trong Jest (Node 18 có sẵn):
```typescript
global.fetch = jest.fn();
// Sau đó:
(global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ ok: true, result: { message_id: 1 } }) });
```

### References

- Pattern NotificationQueueService (OnModuleInit + BullMQ): `apps/backend/src/notifications/notification-queue.service.ts`
- Pattern MailService (try/catch + Logger): `apps/backend/src/notifications/mail.service.ts`
- AppModule imports array: `apps/backend/src/app.module.ts`
- Prisma schema: `apps/backend/prisma/schema.prisma`
- Guards: `apps/backend/src/common/guards/`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List

- `apps/backend/prisma/schema.prisma` (modified — TelegramConfig model added)
- `apps/backend/src/integrations/telegram/telegram.module.ts` (new)
- `apps/backend/src/integrations/telegram/telegram.service.ts` (new)
- `apps/backend/src/integrations/telegram/telegram.controller.ts` (new)
- `apps/backend/src/integrations/telegram/dto/update-telegram-config.dto.ts` (new)
- `apps/backend/src/integrations/telegram/telegram.service.spec.ts` (new)
- `apps/backend/src/app.module.ts` (modified)

## Change Log

| Date | Change |
|------|--------|
| 2026-05-26 | Story created by Winston (System Architect) |
