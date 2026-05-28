# Story 13.6: Web UI — Global Bug Management Page

Status: ready

## Story

As a PM, Leadership, or Admin,
I want a centralized bug management page with powerful filtering,
So that I can see all bugs across projects in my scope and act on them without switching pages.

## Acceptance Criteria

1. Route `/bugs` render `BugListPage`, có link từ sidebar navigation.
2. Summary bar ở top hiển thị badge counts theo severity (Critical/High/Medium/Low) cho data hiện tại.
3. Bảng bug có cột: Severity badge | Tiêu đề | Dự án | Task(s) | Người xử lý | Người báo | Trạng thái | Ngày tạo.
4. Default sort: CRITICAL first (theo severity order), rồi `createdAt DESC`.
5. Filter bar với 6 bộ lọc: Dự án, Trạng thái, Mức độ, Người xử lý, Người báo, Ngày tạo.
6. Active filter count badge hiển thị trên nút "Bộ lọc"; link "Xóa bộ lọc" khi có filter active.
7. Click row → `BugDetailDrawer` mở (không navigate away).
8. Nút "Tạo bug" → `BugCreateDrawer` mở.
9. Secondary columns (Người báo, Ngày tạo) ẩn ở breakpoint `md` (UX-DR6).
10. Pagination: mặc định 20 items/page.

## Tasks / Subtasks

- [ ] Task 1: Tạo `BugListPage.tsx` tại route `/bugs` (AC: 1)
  - [ ] `apps/web/src/pages/bugs/BugListPage.tsx`
  - [ ] Đăng ký route `/bugs` trong React Router config
  - [ ] Thêm menu item "Quản lý Bug" vào sidebar navigation

- [ ] Task 2: Implement Summary Bar (AC: 2)
  - [ ] Fetch `GET /bugs/stats?{filters}` hoặc tính từ data hiện có
  - [ ] Hiển thị 4 badge chips với màu severity UX-DR11

- [ ] Task 3: Implement bảng bug với columns (AC: 3, 4, 9)
  - [ ] Ant Design `Table` với columns theo spec
  - [ ] Severity column dùng `BugSeverityBadge` component (Story 13.5)
  - [ ] Status column dùng `BugStatusTag` component (Story 13.5)
  - [ ] Task(s) column: hiển thị max 2 chip, "+N more" nếu nhiều hơn
  - [ ] Responsive: `responsive: ['lg']` cho Reporter và Created columns

- [ ] Task 4: Implement Filter Bar (AC: 5, 6)
  - [ ] Collapse/expand filter panel
  - [ ] 6 filter inputs: Select dự án, Select status (multi), Select severity (multi), Select người xử lý, Select người báo, DatePicker range
  - [ ] Active filter count badge
  - [ ] "Xóa bộ lọc" link khi có active filter

- [ ] Task 5: Integrate Drawers (AC: 7, 8)
  - [ ] State: `selectedBugId`, `createDrawerOpen`
  - [ ] Click row → set `selectedBugId` → render `<BugDetailDrawer bugId={selectedBugId} />`
  - [ ] "Tạo bug" button → `setCreateDrawerOpen(true)` → `<BugCreateDrawer />`

- [ ] Task 6: Pagination (AC: 10)
  - [ ] TanStack Query: `page`, `pageSize` trong query key
  - [ ] Ant Design Table `pagination` prop kết nối với `meta.total` từ API

## Dev Notes

### BugListPage — layout tổng quát

```tsx
// apps/web/src/pages/bugs/BugListPage.tsx
export default function BugListPage() {
  const [filters, setFilters] = useState<BugFilterDto>({ page: 1, pageSize: 20 });
  const [selectedBugId, setSelectedBugId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useGetBugs(filters);

  return (
    <PageLayout title="Quản lý Bug">
      {/* Summary Bar */}
      <SeveritySummaryBar filters={filters} />

      {/* Filter Bar */}
      <BugFilterBar value={filters} onChange={setFilters} />

      {/* Action Bar */}
      <div style={{ marginBottom: 16, textAlign: 'right' }}>
        <Button type="primary" icon={<BugOutlined />} onClick={() => setCreateOpen(true)}>
          Tạo bug
        </Button>
      </div>

      {/* Table */}
      <Table
        dataSource={data?.data}
        loading={isLoading}
        rowKey="id"
        onRow={(record) => ({ onClick: () => setSelectedBugId(record.id) })}
        pagination={{ total: data?.meta.total, pageSize: filters.pageSize,
          current: filters.page, onChange: (page) => setFilters(f => ({...f, page})) }}
        columns={columns}
      />

      {/* Drawers */}
      <BugCreateDrawer open={createOpen} onClose={() => setCreateOpen(false)} />
      {selectedBugId && (
        <BugDetailDrawer bugId={selectedBugId} onClose={() => setSelectedBugId(null)} />
      )}
    </PageLayout>
  );
}
```

### Columns definition

```tsx
const columns: ColumnsType<Bug> = [
  {
    title: 'Mức độ',
    dataIndex: 'severity',
    width: 100,
    render: (s) => <BugSeverityBadge severity={s} />,
    sorter: (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  },
  {
    title: 'Tiêu đề',
    dataIndex: 'title',
    ellipsis: true,
  },
  {
    title: 'Dự án',
    dataIndex: ['project', 'name'],
    width: 140,
    ellipsis: true,
  },
  {
    title: 'Task(s)',
    dataIndex: 'tasks',
    width: 160,
    render: (tasks: BugTask[]) => (
      <>
        {tasks.slice(0, 2).map(t => (
          <Tag key={t.taskId}>{t.task?.title?.slice(0, 20)}</Tag>
        ))}
        {tasks.length > 2 && <Tag>+{tasks.length - 2}</Tag>}
      </>
    ),
  },
  {
    title: 'Người xử lý',
    dataIndex: ['assignee', 'name'],
    width: 130,
    render: (name) => name ?? <span style={{ color: '#8C8C8C' }}>Chưa assign</span>,
  },
  {
    title: 'Người báo',
    dataIndex: ['reporter', 'name'],
    width: 130,
    responsive: ['lg'],
  },
  {
    title: 'Trạng thái',
    dataIndex: 'status',
    width: 120,
    render: (s) => <BugStatusTag status={s} />,
  },
  {
    title: 'Ngày tạo',
    dataIndex: 'createdAt',
    width: 110,
    responsive: ['lg'],
    render: (d) => dayjs(d).format('DD/MM/YYYY'),
  },
];

const SEVERITY_ORDER = { CRITICAL: 1, HIGH: 2, MEDIUM: 3, LOW: 4 };
```

### Summary Bar component

```tsx
const SeveritySummaryBar: React.FC<{ filters: BugFilterDto }> = ({ filters }) => {
  const { data } = useGetBugStats(filters);
  if (!data) return null;
  const { bySeverity } = data;
  return (
    <Space style={{ marginBottom: 16 }}>
      <Tag color="#FF4D4F">🔴 {bySeverity.critical} Critical</Tag>
      <Tag color="#FA8C16">🟠 {bySeverity.high} High</Tag>
      <Tag color="#FADB14" style={{ color: '#000' }}>🟡 {bySeverity.medium} Medium</Tag>
      <Tag color="#52C41A">🟢 {bySeverity.low} Low</Tag>
    </Space>
  );
};
```

### Sidebar navigation

Tìm sidebar navigation config trong dự án (thường ở `apps/web/src/components/layout/Sidebar.tsx` hoặc `AppLayout.tsx`) và thêm:

```tsx
// Thêm 2 items vào sidebar menu:
{ key: '/my-bugs',  label: 'My Bugs',      icon: <BugOutlined /> },
{ key: '/bugs',     label: 'Quản lý Bug',  icon: <BugFilled /> },
```

### React Router — đăng ký routes

```tsx
// Trong router config (App.tsx hoặc router.tsx):
{ path: '/bugs',            element: <BugListPage /> },
{ path: '/my-bugs',         element: <MyBugsPage /> },
{ path: '/bugs/dashboard',  element: <BugDashboardPage /> },
```

### References

- `BugSeverityBadge`, `BugStatusTag`: Story 13.5
- `BugCreateDrawer`, `BugDetailDrawer`: Story 13.5
- `useGetBugs`, `useGetBugStats`: `apps/web/src/api/bugs.api.ts` (Story 13.5)
- Pattern tham khảo layout: `apps/web/src/pages/projects/ProjectListPage.tsx`
