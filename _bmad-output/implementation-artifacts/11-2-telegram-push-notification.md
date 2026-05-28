# Story 11.2: Backend — Push Task Card khi Tạo Mới & Deadline Alert

Status: done

## Story

As a team member,
I want to receive a formatted Telegram message with action buttons when a new task is assigned to me or when my task is approaching its deadline,
so that I am notified in Telegram without needing to open the Loop web app.

## Acceptance Criteria

1. `TelegramCardBuilder` có method `buildTaskCard(task, event)` trả về object `{ text: string, reply_markup: InlineKeyboardMarkup }` đúng format MarkdownV2 với 3 nút inline: ✅ Hoàn thành | 🔄 Đang làm | ↩️ Trả lại.
2. Callback data format: `task:done:{taskId}` | `task:inprogress:{taskId}` | `task:return:{taskId}`.
3. Sau khi `TasksService.create()` hoàn thành thành công và task có `assigneeId`, `TelegramService.sendMessageWithId()` được gọi **bất đồng bộ** (fire-and-forget, không `await`, không block response).
4. `message_id` trả về từ Telegram được lưu vào DB (model `TelegramMessage`) để dùng cho Story 11.3 (edit card sau khi update).
5. `AlertSchedulerService.runAlertChecks()` sau khi check `DueSoon` và `Overdue` tasks, gọi thêm `TelegramService.sendDeadlineCards()` bất đồng bộ.
6. Deduplication: mỗi `(taskId, eventType, date)` chỉ gửi 1 lần/ngày. Lưu sent log vào `TelegramMessage` với flag `sentDate`.
7. Nếu `isEnabled: false` hoặc task không có `assigneeId`, bỏ qua — không gửi.
8. Lỗi Telegram không ảnh hưởng luồng tạo task (catch toàn bộ).
9. Unit tests cho `TelegramCardBuilder`: verify text format + callback_data đúng.

## Tasks / Subtasks

- [x] Task 1: Thêm model `TelegramMessage` vào Prisma schema (AC: 4, 6)
  - [x] Thêm vào `apps/backend/prisma/schema.prisma`
  - [x] Thêm relation vào `Task` model: `telegramMessages TelegramMessage[]`
  - [x] Chạy `npx prisma db push` trong `apps/backend/`

- [x] Task 2: Implement `TelegramCardBuilder` (AC: 1, 2)
  - [x] Tạo `apps/backend/src/integrations/telegram/telegram-card.builder.ts`
  - [x] Implement `buildTaskCard(task, event: 'NEW_TASK' | 'DEADLINE_ALERT')` → `{ text, reply_markup }`
  - [x] Implement `escapeMarkdownV2(str)` helper
  - [x] Format text theo spec
  - [x] InlineKeyboard: 3 button, 1 row

- [x] Task 3: Hook vào `TasksService.create()` (AC: 3, 4, 7, 8)
  - [x] Inject `TelegramService`, `TelegramCardBuilder` vào `TasksService` constructor
  - [x] Sau khi `prisma.task.create()` thành công, fire-and-forget call
  - [x] Implement `private async sendTelegramCardAsync(task)`

- [x] Task 4: Hook vào `AlertSchedulerService` (AC: 5, 6, 7)
  - [x] Inject `TelegramService`, `TelegramCardBuilder`, `PrismaService` vào `AlertSchedulerService`
  - [x] Tạo method `private async sendTelegramDeadlineAlerts()`
  - [x] Query tasks sắp đến hạn (7 ngày, status không phải DONE/CANCELLED)
  - [x] Deduplication check trước khi gửi
  - [x] Gọi `sendMessageWithId`, lưu `TelegramMessage`
  - [x] Thêm `this.sendTelegramDeadlineAlerts().catch(() => {})` vào `runAlertChecks()`

- [x] Task 5: Export `TelegramCardBuilder` từ `TelegramModule` (AC: 1)
  - [x] `TelegramCardBuilder` trong `providers` và `exports` của `telegram.module.ts`
  - [x] Import `TelegramModule` vào `TasksModule` và `AlertsModule`

- [x] Task 6: Unit tests (AC: 9)
  - [x] Tạo `apps/backend/src/integrations/telegram/telegram-card.builder.spec.ts`
  - [x] Test `buildTaskCard('NEW_TASK')`: verify text + callback_data
  - [x] Test `buildTaskCard('DEADLINE_ALERT')`: verify header khác
  - [x] Test `escapeMarkdownV2`: ký tự đặc biệt được escape đúng

## Dev Notes

### Cấu trúc thực tế cần sửa

**`TasksService`** ở `apps/backend/src/tasks/tasks.service.ts`:
- Method `create()` line ~17: sau `prisma.task.create()` thêm fire-and-forget call
- Import thêm `TelegramService` và `TelegramCardBuilder` — nhưng phải cẩn thận circular dependency: `TasksModule` import `TelegramModule`, không ngược lại

**`AlertSchedulerService`** ở `apps/backend/src/alerts/alert-scheduler.service.ts`:
- Method `runAlertChecks()` dùng `Promise.all([...])` — thêm `this.sendTelegramDeadlineAlerts()` vào array, hoặc gọi riêng sau `Promise.all` (khuyến nghị gọi riêng để không ảnh hưởng nếu Telegram fail)

**`AlertsModule`** ở `apps/backend/src/alerts/alerts.module.ts`:
- Thêm `TelegramModule` vào `imports` array

**`TasksModule`** — cần tìm file này và thêm `TelegramModule` vào `imports`.

### Format card MarkdownV2

```
📌 *\[LOOP\]* Task mới được giao
*TSK* \| {title_escaped}
👤 Thực hiện: {assigneeName_escaped}
📅 Hạn: {dueDate_formatted} \({daysLeft} ngày\)
📊 Estimate: {estimateHours}h \| Dự án: {projectName_escaped}
```

Với `DEADLINE_ALERT` thay header thành: `⚠️ *\[LOOP\]* Task sắp đến hạn`

Nếu `dueDate` null: bỏ dòng deadline.
Nếu `assigneeName` null (chưa assign): không gửi (check trước khi build card).

**Quan trọng — MarkdownV2 escape**: Telegram MarkdownV2 yêu cầu escape các ký tự: `_ * [ ] ( ) ~ ` > # + - = | { } . !` bằng dấu `\`. Implement đúng `escapeMarkdownV2()`:

```typescript
function escapeMarkdownV2(text: string): string {
  return text.replace(/([_*\[\]()~`>#+=|{}.!\\-])/g, '\\$1');
}
```

### InlineKeyboard format

```typescript
const reply_markup = {
  inline_keyboard: [[
    { text: '✅ Hoàn thành', callback_data: `task:done:${task.id}` },
    { text: '🔄 Đang làm',  callback_data: `task:inprogress:${task.id}` },
    { text: '↩️ Trả lại',   callback_data: `task:return:${task.id}` },
  ]],
};
```

### Deduplication logic

```typescript
// Check trước khi gửi
const today = new Date();
today.setHours(0, 0, 0, 0);
const existing = await this.prisma.telegramMessage.findUnique({
  where: { taskId_eventType_sentDate: { taskId: task.id, eventType: 'DEADLINE_ALERT', sentDate: today } },
});
if (existing) return; // đã gửi hôm nay
```

### Fire-and-forget pattern

```typescript
// ĐÚNG — fire and forget
this.sendTelegramCardAsync(task).catch(() => {});

// SAI — block response
await this.sendTelegramCardAsync(task);
```

Lý do: `create()` phải return response nhanh. Telegram API call (~100–500ms) không được block.

### Task model cần include assignee name

Khi build card, cần `assignee.fullName`. Trong `sendTelegramCardAsync`, query thêm:
```typescript
const taskWithAssignee = await this.prisma.task.findUnique({
  where: { id: task.id },
  include: {
    assignee: { select: { fullName: true } },
    project: { select: { name: true } },
  },
});
```

### DaysLeft calculation

```typescript
function daysUntilDeadline(dueDate: Date): number {
  const now = new Date();
  const diff = dueDate.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
```

### References

- `TasksService.create()`: `apps/backend/src/tasks/tasks.service.ts` line ~17–55
- `AlertSchedulerService.runAlertChecks()`: `apps/backend/src/alerts/alert-scheduler.service.ts`
- `AlertsModule`: `apps/backend/src/alerts/alerts.module.ts`
- Prisma Task model (dueDate, assigneeId, estimateHours): `apps/backend/prisma/schema.prisma`
- `TelegramService` (Story 11.1): `apps/backend/src/integrations/telegram/telegram.service.ts`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List

- `apps/backend/prisma/schema.prisma` (modified — TelegramMessage model + Task relation)
- `apps/backend/prisma/migrations/{timestamp}_add_telegram_message/migration.sql` (new)
- `apps/backend/src/integrations/telegram/telegram-card.builder.ts` (new)
- `apps/backend/src/integrations/telegram/telegram-card.builder.spec.ts` (new)
- `apps/backend/src/integrations/telegram/telegram.module.ts` (modified — export TelegramCardBuilder)
- `apps/backend/src/tasks/tasks.service.ts` (modified — fire-and-forget hook)
- `apps/backend/src/tasks/tasks.module.ts` (modified — import TelegramModule)
- `apps/backend/src/alerts/alert-scheduler.service.ts` (modified — sendTelegramDeadlineAlerts)
- `apps/backend/src/alerts/alerts.module.ts` (modified — import TelegramModule)

## Change Log

| Date | Change |
|------|--------|
| 2026-05-26 | Story created by Winston (System Architect) |
