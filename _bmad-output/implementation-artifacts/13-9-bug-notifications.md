# Story 13.9: Bug Notifications & Telegram Integration

Status: ready

## Story

As a user,
I want to receive notifications when bugs are assigned to me or their status changes,
So that I am informed of events relevant to me without checking the system constantly.

## Acceptance Criteria

1. Khi bug được assign: `BUG_ASSIGNED` notification gửi tới assignee mới (in-app).
2. Khi bug chuyển `RESOLVED`, `CLOSED`, hoặc `CANCELLED`: `BUG_STATUS_CHANGED` notification gửi tới reporter (in-app).
3. Khi bug `CRITICAL` được tạo: `BUG_CRITICAL` notification gửi tới PM của project (in-app).
4. Khi bug `CRITICAL` được tạo và Telegram enabled: message push tới Telegram channel (Epic 11 `TelegramService`); failure không block bug creation.
5. Tab "Bugs" xuất hiện trong `NotificationBell` dropdown (bên cạnh Task / Nguồn lực / Ngân sách).
6. Click notification bug → navigate tới `/bugs` với drawer tự động mở cho bug đó.
7. Tất cả notifications gửi **synchronous** trong `BugsService` — không qua BullMQ.

## Tasks / Subtasks

- [ ] Task 1: Inject `NotificationDeliveryService` vào `BugsService` (AC: 1, 2, 3, 7)
  - [ ] Import `AlertsModule` vào `BugsModule` để dùng `NotificationDeliveryService`
  - [ ] Hoặc: export service từ `AlertsModule` và import vào `BugsModule`

- [ ] Task 2: Thêm notification trigger sau `assign()` (AC: 1)
  - [ ] Gọi `notificationDeliveryService.sendInApp()` sau khi update `assigneeId`
  - [ ] Payload: `{ userId: assigneeId, type: 'BUG_ASSIGNED', title: 'Bug mới được giao cho bạn', body: '[title] — [severity] — [projectName]', entityType: 'BUG', entityId: bugId }`

- [ ] Task 3: Thêm notification trigger sau `transition()` (AC: 2)
  - [ ] Chỉ trigger khi `toStatus` là `RESOLVED`, `CLOSED`, hoặc `CANCELLED`
  - [ ] Gửi tới `bug.reporterId`
  - [ ] Payload: `{ type: 'BUG_STATUS_CHANGED', title: 'Bug đã được [action]', body: bug.title, ... }`

- [ ] Task 4: Thêm notification trigger sau `create()` khi severity = CRITICAL (AC: 3, 4)
  - [ ] Fetch PM của project (`project.pmId`)
  - [ ] Gửi `BUG_CRITICAL` notification tới PM
  - [ ] Gọi `TelegramService.sendMessage()` wrapped trong try/catch

- [ ] Task 5: Update `NotificationBell` — thêm tab "Bugs" (AC: 5)
  - [ ] Tìm `NotificationBell` component (Epic 7)
  - [ ] Thêm tab "Bugs" với filter `type IN ('BUG_ASSIGNED', 'BUG_STATUS_CHANGED', 'BUG_CRITICAL')`
  - [ ] Cập nhật API query nếu cần filter theo type

- [ ] Task 6: Deep link từ notification (AC: 6)
  - [ ] Notification record có `entityType: 'BUG'` và `entityId: bugId`
  - [ ] `NotificationBell` onClick: nếu `entityType === 'BUG'` → `navigate('/bugs')` + set URL param `?bugId=entityId`
  - [ ] `BugListPage` đọc `?bugId=` param khi mount → tự động open `BugDetailDrawer`

## Dev Notes

### NotificationDeliveryService — gọi từ BugsService

```typescript
// apps/backend/src/bugs/bugs.service.ts
constructor(
  private prisma: PrismaService,
  private bugAttachmentService: BugAttachmentService,
  private notificationDelivery: NotificationDeliveryService, // inject từ AlertsModule
) {}
```

Để dùng `NotificationDeliveryService` từ `AlertsModule`, cần export nó:
```typescript
// apps/backend/src/alerts/alerts.module.ts
@Module({
  exports: [NotificationDeliveryService], // thêm dòng này nếu chưa có
})
```

Sau đó import `AlertsModule` vào `BugsModule`:
```typescript
// apps/backend/src/bugs/bugs.module.ts
@Module({
  imports: [PrismaModule, AlertsModule],
  ...
})
```

### Trigger notification khi assign

```typescript
// Trong BugsService.assign():
async assign(id: string, dto: AssignBugDto, callerId: string, orgUnitIds: string[]) {
  // ... existing logic
  const updated = await this.prisma.bug.update({ ... });

  if (dto.assigneeId) {
    // Lấy project name cho body message
    const bug = await this.prisma.bug.findUnique({
      where: { id },
      include: { project: true },
    });
    await this.notificationDelivery.sendInApp({
      userId: dto.assigneeId,
      type: NotificationType.BUG_ASSIGNED,
      title: 'Bug mới được giao cho bạn',
      body: `${bug.title} — ${bug.severity} — ${bug.project.name}`,
      entityType: 'BUG',
      entityId: id,
    });
  }
  return updated;
}
```

### Trigger notification khi transition

```typescript
// Trong BugsService.transition():
const NOTIFY_ON_STATUS = [BugStatus.RESOLVED, BugStatus.CLOSED, BugStatus.CANCELLED];

if (NOTIFY_ON_STATUS.includes(dto.toStatus)) {
  const statusLabel = { RESOLVED: 'resolved', CLOSED: 'đóng', CANCELLED: 'huỷ' };
  await this.notificationDelivery.sendInApp({
    userId: bug.reporterId,
    type: NotificationType.BUG_STATUS_CHANGED,
    title: `Bug đã được ${statusLabel[dto.toStatus]}`,
    body: bug.title,
    entityType: 'BUG',
    entityId: bug.id,
  });
}
```

### Trigger CRITICAL notification + Telegram

```typescript
// Trong BugsService.create() — SAU khi bug đã tạo thành công:
if (createdBug.severity === BugSeverity.CRITICAL) {
  const project = await this.prisma.project.findUnique({ where: { id: dto.projectId } });

  // In-app notification cho PM
  if (project.pmId) {
    await this.notificationDelivery.sendInApp({
      userId: project.pmId,
      type: NotificationType.BUG_CRITICAL,
      title: `Bug Critical mới trong ${project.name}`,
      body: `${createdBug.title} — báo cáo bởi ${reporter.name}`,
      entityType: 'BUG',
      entityId: createdBug.id,
    });
  }

  // Telegram — fail silently
  try {
    await this.telegramService.sendMessage(
      `🔴 Bug Critical mới\n*${createdBug.title}*\nDự án: ${project.name}\nBáo cáo: ${reporter.name}`
    );
  } catch (err) {
    this.logger.warn(`Telegram notification failed for bug ${createdBug.id}: ${err.message}`);
  }
}
```

**Lưu ý TelegramService:** Chỉ inject nếu `TelegramModule` được import vào `BugsModule`. Nếu Epic 11 chưa được deploy/enabled, dùng `@Optional()` decorator:

```typescript
constructor(
  // ...
  @Optional() private telegramService: TelegramService,
) {}

// Khi gọi:
if (this.telegramService) {
  try { await this.telegramService.sendMessage(...); } catch {}
}
```

### NotificationBell — thêm tab Bugs

```tsx
// apps/web/src/components/common/NotificationBell.tsx
// Tìm tabs definition và thêm:
const tabs = [
  { key: 'all',       label: 'Tất cả', types: undefined },
  { key: 'task',      label: 'Task',   types: ['TASK_OVERDUE', 'TASK_DUE_TODAY', ...] },
  { key: 'resource',  label: 'Nguồn lực', types: ['RESOURCE_EXPIRING', ...] },
  { key: 'budget',    label: 'Ngân sách', types: ['BUDGET_NEAR_LIMIT', ...] },
  { key: 'bugs',      label: 'Bugs',   types: ['BUG_ASSIGNED', 'BUG_STATUS_CHANGED', 'BUG_CRITICAL'] },
];
```

### Deep link từ notification

```tsx
// Trong NotificationBell — khi click notification:
const handleNotificationClick = (notification: Notification) => {
  markAsRead(notification.id);
  if (notification.entityType === 'BUG' && notification.entityId) {
    navigate(`/bugs?bugId=${notification.entityId}`);
  } else if (notification.entityType === 'TASK') {
    navigate(`/tasks/${notification.entityId}`);
  }
  closeDropdown();
};

// Trong BugListPage — đọc URL param khi mount:
const [searchParams] = useSearchParams();
const initialBugId = searchParams.get('bugId');
const [selectedBugId, setSelectedBugId] = useState<string | null>(initialBugId);
```

### Lưu ý về Notification model

`Notification` model hiện tại (Story 7.2) có fields: `id`, `userId`, `type`, `message`, `isRead`, `createdAt`. Cần thêm `entityType` và `entityId` nếu chưa có:

```typescript
// Kiểm tra schema hiện có:
// Nếu Notification chưa có entityType/entityId → thêm vào schema và db push
// entityType String? @map("entity_type")
// entityId   String? @map("entity_id")
```

Nếu đã có `entityType`/`entityId` (Epic 11/12 đã thêm) → bỏ qua bước này.

### References

- `NotificationDeliveryService`: `apps/backend/src/alerts/notification-delivery.service.ts`
- `TelegramService`: `apps/backend/src/integrations/telegram/` (Epic 11)
- `NotificationBell`: `apps/web/src/components/common/NotificationBell.tsx` (Epic 7)
- `NotificationType` enum: `apps/backend/prisma/schema.prisma` (đã thêm 3 values ở Story 13.1)
