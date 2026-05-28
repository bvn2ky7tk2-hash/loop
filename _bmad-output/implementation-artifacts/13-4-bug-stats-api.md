# Story 13.4: Bug Statistics API

Status: ready

## Story

As a PM or Leadership,
I want a single API endpoint returning aggregated bug metrics,
So that the dashboard can load all statistics in one round trip.

## Acceptance Criteria

1. `GET /api/v1/bugs/stats` với JWT hợp lệ (bất kỳ role) trả về response đầy đủ 5 sections.
2. `byStatus` trả đúng count cho 5 statuses, scoped theo orgUnitIds.
3. `bySeverity` trả đúng count cho 4 severities, scoped theo orgUnitIds.
4. `openByProject` trả max 10 projects, sorted by `open` DESC, có trường `critical`.
5. `openByTask` trả max 10 tasks có nhiều open bug nhất, scoped theo orgUnitIds.
6. `trend` mặc định 30 ngày gần nhất nếu không có `dateFrom`/`dateTo`; mỗi entry là 1 ngày.
7. Filter `?projectId=` hoạt động đúng: tất cả sections đều filter theo project đó.
8. Endpoint đăng ký tại `/api/v1/bugs/stats` — TRƯỚC route `/:id` trong controller.

## Tasks / Subtasks

- [ ] Task 1: Tạo `BugStatsService` (AC: 1-7)
  - [ ] Tạo `apps/backend/src/bugs/bug-stats.service.ts`
  - [ ] Implement `getStats(filters, orgUnitIds)`: gọi 5 methods song song với `Promise.all`
  - [ ] Implement `getByStatus(filters, orgUnitIds)`: `prisma.bug.groupBy` by status
  - [ ] Implement `getBySeverity(filters, orgUnitIds)`: `prisma.bug.groupBy` by severity
  - [ ] Implement `getOpenByProject(filters, orgUnitIds)`: groupBy projectId, top 10
  - [ ] Implement `getOpenByTask(filters, orgUnitIds)`: `$queryRaw` với JOIN qua BugTask
  - [ ] Implement `getTrend(filters, orgUnitIds)`: `$queryRaw` với `DATE_TRUNC`

- [ ] Task 2: Thêm `GET /api/v1/bugs/stats` vào `BugsController` (AC: 8)
  - [ ] Route phải đứng TRƯỚC `@Get(':id')` trong controller file
  - [ ] Inject `BugStatsService` vào controller
  - [ ] Parse query params: `projectId?`, `dateFrom?`, `dateTo?`

- [ ] Task 3: Register `BugStatsService` vào `BugsModule` providers (AC: 1)

- [ ] Task 4: Verify response shape với real data (AC: 1-7)
  - [ ] Seed vài bug records rồi call endpoint
  - [ ] Verify trend có đủ 30 entries (ngày nào không có bug thì `created: 0, resolved: 0`)

## Dev Notes

### BugStatsService — structure tổng quát

```typescript
// apps/backend/src/bugs/bug-stats.service.ts
@Injectable()
export class BugStatsService {
  constructor(private prisma: PrismaService) {}

  async getStats(filters: BugStatsFilterDto, orgUnitIds: string[]) {
    const [byStatus, bySeverity, openByProject, openByTask, trend] =
      await Promise.all([
        this.getByStatus(filters, orgUnitIds),
        this.getBySeverity(filters, orgUnitIds),
        this.getOpenByProject(filters, orgUnitIds),
        this.getOpenByTask(filters, orgUnitIds),
        this.getTrend(filters, orgUnitIds),
      ]);
    return { byStatus, bySeverity, openByProject, openByTask, trend };
  }
}
```

### getByStatus() — prisma.bug.groupBy

```typescript
private async getByStatus(filters, orgUnitIds: string[]) {
  const where = this.buildBaseWhere(filters, orgUnitIds);
  const rows = await this.prisma.bug.groupBy({
    by: ['status'],
    where,
    _count: { id: true },
  });
  // Normalize to { open, inProgress, resolved, closed, cancelled }
  const result = { open: 0, inProgress: 0, resolved: 0, closed: 0, cancelled: 0 };
  for (const row of rows) {
    const key = this.statusToKey(row.status);
    result[key] = row._count.id;
  }
  return result;
}
```

### getBySeverity() — prisma.bug.groupBy

```typescript
private async getBySeverity(filters, orgUnitIds: string[]) {
  const where = this.buildBaseWhere(filters, orgUnitIds);
  const rows = await this.prisma.bug.groupBy({
    by: ['severity'],
    where,
    _count: { id: true },
  });
  const result = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const row of rows) {
    result[row.severity.toLowerCase()] = row._count.id;
  }
  return result;
}
```

### getOpenByProject() — groupBy với project name

```typescript
private async getOpenByProject(filters, orgUnitIds: string[]) {
  // Prisma groupBy không thể join để lấy project.name
  // Dùng findMany + groupBy manual hoặc $queryRaw
  const rows = await this.prisma.$queryRaw<Array<{
    project_id: string;
    project_name: string;
    open_count: bigint;
    critical_count: bigint;
  }>>`
    SELECT
      b."project_id",
      p.name AS project_name,
      COUNT(*) FILTER (WHERE b.status = 'OPEN' OR b.status = 'IN_PROGRESS') AS open_count,
      COUNT(*) FILTER (WHERE b.severity = 'CRITICAL' AND (b.status = 'OPEN' OR b.status = 'IN_PROGRESS')) AS critical_count
    FROM bugs b
    JOIN projects p ON b.project_id = p.id
    WHERE p.org_unit_id = ANY(${orgUnitIds}::uuid[])
      ${filters.projectId ? Prisma.sql`AND b.project_id = ${filters.projectId}::uuid` : Prisma.empty}
    GROUP BY b.project_id, p.name
    ORDER BY open_count DESC
    LIMIT 10
  `;
  return rows.map(r => ({
    projectId: r.project_id,
    projectName: r.project_name,
    open: Number(r.open_count),
    critical: Number(r.critical_count),
  }));
}
```

### getOpenByTask() — qua BugTask join

```typescript
private async getOpenByTask(filters, orgUnitIds: string[]) {
  const rows = await this.prisma.$queryRaw<Array<{
    task_id: string;
    task_title: string;
    project_name: string;
    bug_count: bigint;
  }>>`
    SELECT
      bt.task_id,
      t.title AS task_title,
      p.name AS project_name,
      COUNT(DISTINCT bt.bug_id) AS bug_count
    FROM bug_tasks bt
    JOIN bugs b ON bt.bug_id = b.id
    JOIN tasks t ON bt.task_id = t.id
    JOIN projects p ON b.project_id = p.id
    WHERE p.org_unit_id = ANY(${orgUnitIds}::uuid[])
      AND b.status IN ('OPEN', 'IN_PROGRESS')
      ${filters.projectId ? Prisma.sql`AND b.project_id = ${filters.projectId}::uuid` : Prisma.empty}
    GROUP BY bt.task_id, t.title, p.name
    ORDER BY bug_count DESC
    LIMIT 10
  `;
  return rows.map(r => ({
    taskId: r.task_id,
    taskTitle: r.task_title,
    projectName: r.project_name,
    count: Number(r.bug_count),
  }));
}
```

### getTrend() — DATE_TRUNC 30 ngày

```typescript
private async getTrend(filters, orgUnitIds: string[]) {
  const dateTo = filters.dateTo ? new Date(filters.dateTo) : new Date();
  const dateFrom = filters.dateFrom
    ? new Date(filters.dateFrom)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const rows = await this.prisma.$queryRaw<Array<{
    date: Date;
    created: bigint;
    resolved: bigint;
  }>>`
    SELECT
      DATE_TRUNC('day', b.created_at)::date AS date,
      COUNT(*) AS created,
      COUNT(*) FILTER (WHERE b.status IN ('RESOLVED', 'CLOSED')) AS resolved
    FROM bugs b
    JOIN projects p ON b.project_id = p.id
    WHERE p.org_unit_id = ANY(${orgUnitIds}::uuid[])
      AND b.created_at >= ${dateFrom}
      AND b.created_at <= ${dateTo}
      ${filters.projectId ? Prisma.sql`AND b.project_id = ${filters.projectId}::uuid` : Prisma.empty}
    GROUP BY DATE_TRUNC('day', b.created_at)
    ORDER BY date ASC
  `;
  return rows.map(r => ({
    date: r.date.toISOString().split('T')[0],
    created: Number(r.created),
    resolved: Number(r.resolved),
  }));
}
```

### buildBaseWhere() — helper tái sử dụng

```typescript
private buildBaseWhere(filters: BugStatsFilterDto, orgUnitIds: string[]) {
  return {
    project: { orgUnitId: { in: orgUnitIds } },
    ...(filters.projectId && { projectId: filters.projectId }),
    ...(filters.dateFrom && { createdAt: { gte: new Date(filters.dateFrom) } }),
    ...(filters.dateTo && { createdAt: { lte: new Date(filters.dateTo) } }),
  };
}
```

### Lưu ý quan trọng — BigInt từ $queryRaw

PostgreSQL COUNT() trả về `BigInt` trong Node.js. PHẢI convert sang `Number()` trước khi serialize JSON (JSON.stringify throw với BigInt).

### References

- `apps/backend/src/bugs/bugs.service.ts` (Story 13.2)
- `apps/backend/src/bugs/bugs.module.ts` — register `BugStatsService`
- Import `Prisma` từ `@prisma/client` để dùng `Prisma.sql` và `Prisma.empty`
- Pattern `$queryRaw` tham khảo: các service trong `apps/backend/src/reports/`
