# Story 13.2: Bug CRUD & Lifecycle API

Status: ready

## Story

As any authenticated user,
I want to create, read, update, and transition bugs through their lifecycle,
So that bugs are tracked from discovery to resolution with proper access control.

## Acceptance Criteria

1. `POST /api/v1/bugs` tạo bug thành công với `status: OPEN`, `reporterId = caller.id`; validate tất cả `taskIds` thuộc `projectId`.
2. `GET /api/v1/bugs` trả về danh sách có phân trang, filter, scoped theo org (via project JOIN).
3. `GET /api/v1/bugs/my` trả về bugs có `assigneeId = caller.id`, sorted CRITICAL first.
4. `GET /api/v1/bugs/:id` trả về detail kèm `tasks[]`, `attachments[]`, `reporter`, `assignee`.
5. `PUT /api/v1/bugs/:id` chỉ hoạt động khi bug ở `OPEN` hoặc `IN_PROGRESS`; trả 422 nếu CLOSED/CANCELLED.
6. `POST /api/v1/bugs/:id/transition` enforce đúng transition matrix; set `resolvedAt`/`closedAt` khi cần.
7. `PUT /api/v1/bugs/:id/assign` chỉ PM được gọi; cập nhật `assigneeId`.
8. `POST /api/v1/bugs/:id/tasks` link task vào bug; validate task thuộc cùng project.
9. `DELETE /api/v1/bugs/:id/tasks/:taskId` unlink task; trả 400 nếu là task cuối cùng.
10. Module `bugs` được đăng ký trong `AppModule`.
11. Tất cả endpoints có `@OrgScoped()` decorator và OrgScope được enforce qua project JOIN.
12. `GET /api/v1/bugs` route phải đăng ký TRƯỚC `GET /api/v1/bugs/:id` để tránh NestJS route conflict.

## Tasks / Subtasks

- [ ] Task 1: Tạo `BugsModule` và đăng ký vào `AppModule` (AC: 10)
  - [ ] Tạo `apps/backend/src/bugs/bugs.module.ts`
  - [ ] Import `PrismaModule` (hoặc inject PrismaService trực tiếp theo pattern dự án)
  - [ ] Đăng ký `BugsModule` trong `apps/backend/src/app.module.ts`

- [ ] Task 2: Tạo DTOs (AC: 1, 5, 6, 7)
  - [ ] `create-bug.dto.ts`: `projectId`, `taskIds[]`, `title`, `severity`, `description?`, `assigneeId?`
  - [ ] `update-bug.dto.ts`: `title?`, `description?`, `severity?`, `assigneeId?` (PartialType pattern)
  - [ ] `transition-bug.dto.ts`: `toStatus: BugStatus`
  - [ ] `assign-bug.dto.ts`: `assigneeId: string`
  - [ ] `bug-filter.dto.ts`: query params cho GET — `projectId?`, `status?`, `severity?`, `assigneeId?`, `reporterId?`, `taskId?`, `dateFrom?`, `dateTo?`, `page?`, `pageSize?`

- [ ] Task 3: Implement `BugsService` — CRUD & state machine (AC: 1-9, 11)
  - [ ] `create(dto, userId, orgUnitIds)`: validate tasks, tạo Bug + BugTask records trong transaction
  - [ ] `findAll(filters, orgUnitIds)`: org-scoped list qua project JOIN, pagination
  - [ ] `findMine(userId)`: bugs assigned to me, sorted CRITICAL→HIGH→MEDIUM→LOW
  - [ ] `findOne(id, orgUnitIds)`: detail với includes tasks, attachments, reporter, assignee; throw 404 nếu ngoài scope
  - [ ] `update(id, dto, userId, orgUnitIds)`: chỉ OPEN/IN_PROGRESS; chỉ reporter hoặc PM
  - [ ] `transition(id, toStatus, userId, orgUnitIds)`: validate VALID_TRANSITIONS, set timestamps
  - [ ] `assign(id, assigneeId, userId, orgUnitIds)`: PM only
  - [ ] `linkTask(id, taskId, orgUnitIds)`: validate task thuộc cùng project
  - [ ] `unlinkTask(id, taskId, orgUnitIds)`: check min 1 task remains

- [ ] Task 4: Implement `BugsController` (AC: 1-9, 11, 12)
  - [ ] Tạo tất cả endpoints theo spec
  - [ ] Thứ tự route: `/my` và `/stats` TRƯỚC `/:id` (tránh NestJS parse "my" thành id)
  - [ ] Dùng `@OrgScoped()` trên controller class

- [ ] Task 5: Verify với HTTP client hoặc unit test (AC: 1-9)
  - [ ] Test tạo bug với valid data → 201
  - [ ] Test transition OPEN → IN_PROGRESS → RESOLVED
  - [ ] Test transition invalid → 422
  - [ ] Test unlink task cuối → 400

## Dev Notes

### Module location

Theo pattern thực tế của dự án: `apps/backend/src/bugs/` (flat — không phải `src/modules/bugs/`).

### OrgScope pattern cho Bug

Bug không có `orgUnitId` trực tiếp — phải filter qua project:

```typescript
// Trong BugsService — LUÔN dùng pattern này:
const bugs = await this.prisma.bug.findMany({
  where: {
    project: { orgUnitId: { in: orgUnitIds } },
    // ... other filters
  },
});

// Verify ownership khi update/transition (findOne trước):
const bug = await this.prisma.bug.findFirst({
  where: { id, project: { orgUnitId: { in: orgUnitIds } } },
});
if (!bug) throw new NotFoundException('Bug không tồn tại');
```

### State Machine — VALID_TRANSITIONS map

```typescript
// bugs.service.ts — định nghĩa ở top of class hoặc file-level const
const VALID_TRANSITIONS: Record<BugStatus, BugStatus[]> = {
  [BugStatus.OPEN]:        [BugStatus.IN_PROGRESS, BugStatus.CANCELLED],
  [BugStatus.IN_PROGRESS]: [BugStatus.RESOLVED, BugStatus.CANCELLED],
  [BugStatus.RESOLVED]:    [BugStatus.CLOSED, BugStatus.OPEN],
  [BugStatus.CLOSED]:      [],
  [BugStatus.CANCELLED]:   [],
};

// Trong transition():
if (!VALID_TRANSITIONS[bug.status].includes(dto.toStatus)) {
  throw new UnprocessableEntityException('Chuyển trạng thái không hợp lệ');
}

// Role constraints:
// CANCELLED → chỉ PM (user.role === Role.PM hoặc ADMIN)
// RESOLVED → CLOSED: reporter hoặc PM
// RESOLVED → OPEN: chỉ reporter
// Còn lại: assignee hoặc PM
```

### Severity sort order cho findMine

PostgreSQL không có native enum sort theo logic business. Dùng CASE:

```typescript
// Dùng Prisma $queryRaw hoặc orderBy với raw
const bugs = await this.prisma.$queryRaw`
  SELECT b.* FROM bugs b
  WHERE b.assignee_id = ${userId}
    AND b.status NOT IN ('CLOSED', 'CANCELLED')
  ORDER BY
    CASE b.severity
      WHEN 'CRITICAL' THEN 1
      WHEN 'HIGH' THEN 2
      WHEN 'MEDIUM' THEN 3
      WHEN 'LOW' THEN 4
    END,
    b.created_at DESC
`;
```

Nếu muốn dùng Prisma ORM (không raw), orderBy severity không sort theo business logic — phải dùng raw hoặc sort ở application layer sau khi fetch.

### create() — transaction cho Bug + BugTask

```typescript
async create(dto: CreateBugDto, reporterId: string, orgUnitIds: string[]) {
  // 1. Verify project in org scope
  const project = await this.prisma.project.findFirst({
    where: { id: dto.projectId, orgUnitId: { in: orgUnitIds } },
  });
  if (!project) throw new NotFoundException('Dự án không tồn tại');

  // 2. Verify all taskIds belong to projectId
  const tasks = await this.prisma.task.findMany({
    where: { id: { in: dto.taskIds }, projectId: dto.projectId },
  });
  if (tasks.length !== dto.taskIds.length) {
    throw new BadRequestException('Task không thuộc dự án này');
  }

  // 3. Create Bug + BugTask in transaction
  return this.prisma.$transaction(async (tx) => {
    const bug = await tx.bug.create({
      data: {
        projectId: dto.projectId,
        title: dto.title,
        description: dto.description,
        severity: dto.severity ?? BugSeverity.MEDIUM,
        reporterId,
        assigneeId: dto.assigneeId,
        tasks: {
          create: dto.taskIds.map((taskId) => ({ taskId })),
        },
      },
      include: { tasks: true },
    });
    return bug;
  });
}
```

### findAll() — pagination response format

```typescript
// Trả về format chuẩn dự án:
return {
  data: bugs,
  meta: { total, page: filters.page ?? 1, pageSize: filters.pageSize ?? 20 },
};
```

### bugs.controller.ts — thứ tự route quan trọng

```typescript
@Controller('bugs')
export class BugsController {
  @Get('my')          // PHẢI trước @Get(':id')
  findMine() { ... }

  @Get('stats')       // PHẢI trước @Get(':id')
  getStats() { ... }  // gọi BugStatsService (Story 13.4)

  @Get()
  findAll() { ... }

  @Post()
  create() { ... }

  @Get(':id')
  findOne() { ... }

  @Put(':id')
  update() { ... }

  // ... rest
}
```

### References

- Pattern module tham khảo: `apps/backend/src/tasks/` hoặc `apps/backend/src/projects/`
- Prisma models: `Bug`, `BugTask` trong `schema.prisma` (Story 13.1)
- OrgScope decorator: `apps/backend/src/common/decorators/org-scoped.decorator.ts`
- Role enum: `apps/backend/src/generated/prisma` (sau Story 13.1)
