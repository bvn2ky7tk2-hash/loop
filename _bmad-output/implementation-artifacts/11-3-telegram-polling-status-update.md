# Story 11.3: Backend — Telegram Long-Polling Worker & Status Update Handler

Status: done

## Story

As a team member,
I want to tap an action button in the Telegram task card and have Loop automatically update the task status,
so that I can update progress without leaving Telegram or opening the web app.

## Acceptance Criteria

1. `TelegramPollerService` implement `OnModuleInit` — khi app start và `isEnabled: true`, bắt đầu vòng lặp long-poll `getUpdates?timeout=30` liên tục.
2. Parser: khi nhận `callback_query` với data format `task:{action}:{taskId}`, route đúng action sang `TasksService`.
3. Map actions: `done` → `TaskStatus.DONE`, `inprogress` → `TaskStatus.IN_PROGRESS`, `return` → `TaskStatus.RETURNED`.
4. Sau khi update task thành công, gọi `answerCallbackQuery(callbackQueryId, confirmText)` trong vòng 10 giây.
5. Card gốc được edit: xóa InlineKeyboard, append dòng status: `_✅ Cập nhật: Hoàn thành — {timestamp}_` (hoặc tương ứng).
6. Nếu `taskId` không tồn tại trong DB: `answerCallbackQuery` với `"❌ Không tìm thấy task này"`, không ghi DB.
7. Nếu task đã ở `DONE` hoặc `CANCELLED`: `answerCallbackQuery` với `"ℹ️ Task này đã ở trạng thái {status}"`, không thay đổi.
8. Nếu network error trong polling loop: wait 5 giây rồi retry — KHÔNG crash service.
9. `lastUpdateId` được track in-memory; restart app reset về 0 (acceptable).
10. Khi `isEnabled` thay đổi sang `false` (qua PUT config), poller dừng gọi Telegram API (check flag trước mỗi iteration).
11. Unit tests: (a) parse callback_data đúng, (b) unknown format bị bỏ qua, (c) task DONE/CANCELLED bị reject, (d) task không tồn tại trả error answer.

## Tasks / Subtasks

- [x] Task 1: Implement `TelegramPollerService` với long-poll loop (AC: 1, 8, 9, 10)
  - [x] Tạo `apps/backend/src/integrations/telegram/telegram-poller.service.ts`
  - [x] Implement `OnModuleInit.onModuleInit()`: gọi `startPolling()` không await
  - [x] `startPolling()`: vòng lặp `while(true)`, retry sau 5s nếu lỗi
  - [x] Check `telegramService.getIsEnabled()` trước mỗi iteration
  - [x] Track `offset` in-memory

- [x] Task 2: Implement callback parser và router (AC: 2, 3, 6, 7)
  - [x] Method `parseCallbackData(data)` — public để test
  - [x] Parse `query.data`: split bằng `:` → `['task', action, taskId]`
  - [x] Validate prefix, action, taskId
  - [x] Lookup task từ DB, handle not-found (AC: 6)
  - [x] Check current status DONE/CANCELLED (AC: 7)
  - [x] Gọi `prisma.task.update()` trực tiếp (Option A — tránh circular dependency)

- [x] Task 3: Answer callback + Edit card (AC: 4, 5)
  - [x] Gọi `answerCallbackQuery` sau update
  - [x] Lookup `TelegramMessage` by taskId
  - [x] Gọi `editMessageText` với status mới

- [x] Task 4: Register `TelegramPollerService` vào `TelegramModule` (AC: 1)
  - [x] Thêm vào `providers` của `telegram.module.ts`
  - [x] Inject `PrismaService` trực tiếp (tránh circular)

- [x] Task 5: Method `updateTaskStatus` — dùng prisma trực tiếp trong poller (AC: 2, 3)
  - [x] Update task status + progress = 100 nếu DONE

- [x] Task 6: Unit tests (AC: 11)
  - [x] Tạo `apps/backend/src/integrations/telegram/telegram-poller.service.spec.ts`
  - [x] Test `parseCallbackData` — valid và invalid cases
  - [x] Test `handleCallbackQuery` khi task DONE → answer info
  - [x] Test `handleCallbackQuery` khi taskId không tồn tại → answer error
  - [x] Test happy path → prisma.task.update được gọi đúng args

## Dev Notes

### Long-poll loop pattern (quan trọng)

`OnModuleInit` KHÔNG phải `async` loop — nếu `await` trong `onModuleInit`, NestJS sẽ bị block và không start. Pattern đúng:

```typescript
// ĐÚNG
async onModuleInit() {
  // Không await — để loop chạy nền
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
            this.logger.warn('Callback handler error', err)
          );
        }
      }
    } catch (err) {
      this.logger.warn('Polling error, retrying in 5s', err);
      await this.sleep(5000);
    }
  }
}

private sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

### Dependency injection / Circular dependency

`TelegramPollerService` cần `TasksService`. `TasksService` cần `TelegramService` (từ Story 11.2).

Để tránh circular dependency:
- **Option A (khuyến nghị)**: `TelegramPollerService` inject `PrismaService` trực tiếp thay vì `TasksService` — tự gọi `prisma.task.update()` mà không qua service
- **Option B**: Dùng `forwardRef(() => TasksModule)` trong `TelegramModule` imports

Option A đơn giản hơn, ít coupling hơn:

```typescript
// Trong TelegramPollerService, thay vì inject TasksService:
private async updateTask(taskId: string, status: TaskStatus): Promise<Task | null> {
  const task = await this.prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return null;
  if (['DONE', 'CANCELLED'].includes(task.status)) {
    return task; // signal: already done
  }
  return this.prisma.task.update({
    where: { id: taskId },
    data: {
      status,
      ...(status === 'DONE' ? { progress: 100 } : {}),
    },
  });
}
```

### Lookup TelegramMessage để edit card

```typescript
const tgMsg = await this.prisma.telegramMessage.findFirst({
  where: { taskId },
  orderBy: { createdAt: 'desc' },
});
if (tgMsg) {
  await this.telegramService.editMessageText(tgMsg.messageId, editedText);
}
```

### Edit text format

Khi edit, không thể reproduce toàn bộ card text gốc (không lưu). Thay vào đó, build simple message:

```typescript
const statusLabel = {
  DONE: '✅ Hoàn thành',
  IN_PROGRESS: '🔄 Đang làm',
  RETURNED: '↩️ Trả lại',
}[status] ?? status;

const now = new Date();
const timestamp = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')} ${now.getDate().toString().padStart(2,'0')}/${(now.getMonth()+1).toString().padStart(2,'0')}`;

const editedText = `📌 *\\[LOOP\\]* Task đã cập nhật\n_${statusLabel} — ${timestamp}_`;
```

Note: edit message sẽ xóa InlineKeyboard tự động nếu không gửi `reply_markup` trong editMessageText (Telegram behavior: nếu không include `reply_markup` trong edit, keyboard bị xóa).

### answerCallbackQuery timing

Telegram yêu cầu `answerCallbackQuery` trong 10 giây sau khi nhận callback_query. Đây là lý do xử lý callback phải nhanh. DB query cho `task.findUnique` thường < 50ms trên local network. Không có rủi ro timeout trong điều kiện bình thường.

### Status label map (tiếng Việt)

```typescript
const STATUS_LABELS: Record<string, string> = {
  DONE: 'Hoàn thành',
  IN_PROGRESS: 'Đang làm',
  RETURNED: 'Trả lại',
  TODO: 'Chờ làm',
  PENDING_APPROVAL: 'Chờ duyệt',
  CANCELLED: 'Đã huỷ',
};
```

### getUpdates với AbortSignal

`TelegramService.getUpdates()` (Story 11.1) dùng `AbortSignal.timeout((timeout + 5) * 1000)`. Với `timeout=30`, abort sau 35 giây. Nếu Telegram không trả lời trong 35s → `fetch` throw `TimeoutError` → catch trong `getUpdates` → trả `[]` → polling loop tiếp tục ngay lập tức.

### References

- `TelegramService.getUpdates()`, `answerCallbackQuery()`, `editMessageText()`: `apps/backend/src/integrations/telegram/telegram.service.ts` (Story 11.1)
- `TelegramMessage` model: `apps/backend/prisma/schema.prisma` (Story 11.2)
- `NotificationQueueService` (pattern OnModuleInit + loop): `apps/backend/src/notifications/notification-queue.service.ts`
- `TaskStatus` enum: `apps/backend/src/generated/prisma` (generated từ schema)
- `PrismaService`: `apps/backend/src/prisma/prisma.service.ts`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List

- `apps/backend/src/integrations/telegram/telegram-poller.service.ts` (new)
- `apps/backend/src/integrations/telegram/telegram-poller.service.spec.ts` (new)
- `apps/backend/src/integrations/telegram/telegram.module.ts` (modified — add TelegramPollerService)
- `apps/backend/prisma/schema.prisma` (potentially modified — nếu cần thêm field vào TelegramMessage)

## Change Log

| Date | Change |
|------|--------|
| 2026-05-26 | Story created by Winston (System Architect) |
