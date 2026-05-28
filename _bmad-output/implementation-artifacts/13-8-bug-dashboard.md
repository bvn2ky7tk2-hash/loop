# Story 13.8: Web UI — Bug Dashboard

Status: ready

## Story

As a PM or Leadership,
I want a bug statistics dashboard with 5 charts,
So that I can assess bug health across projects and identify hotspots at a glance.

## Acceptance Criteria

1. Route `/bugs/dashboard` render `BugDashboardPage`.
2. Project filter dropdown ở top; "Tất cả dự án" là default; tất cả charts update khi filter thay đổi.
3. Card 1: Donut chart bug theo 5 statuses; center label = total count.
4. Card 2: Horizontal bar chart bug theo 4 severities, đúng màu UX-DR11.
5. Card 3: Ant Design Table "Top dự án nhiều bug nhất" — max 10 rows, link tới `/bugs?projectId=X`.
6. Card 4: Ant Design Table "Task nhiều bug nhất" — max 10 rows.
7. Card 5: Line chart trend 30 ngày — 2 series (Tạo mới đỏ, Resolved xanh).
8. Dark mode: chart backgrounds `#141414`, grid `rgba(255,255,255,0.1)`.
9. Tab navigation trong `/bugs` page: "Danh sách" | "Dashboard" (tabs ở top của BugListPage).

## Tasks / Subtasks

- [ ] Task 1: Tạo `BugDashboardPage.tsx` (AC: 1, 2)
  - [ ] `apps/web/src/pages/bugs/BugDashboardPage.tsx`
  - [ ] Project filter dropdown (org-scoped)
  - [ ] Grid layout 2 cột cho cards 1 & 2; full width cho cards 3, 4, 5

- [ ] Task 2: Implement Card 1 — Status Donut (AC: 3)
  - [ ] Ant Design Charts `Pie` với `innerRadius: 0.6`
  - [ ] Legend với count per status
  - [ ] Center label dùng `statistic` annotation

- [ ] Task 3: Implement Card 2 — Severity Bar (AC: 4)
  - [ ] Ant Design Charts `Bar` horizontal
  - [ ] Màu từ UX-DR11: `{ CRITICAL: '#FF4D4F', HIGH: '#FA8C16', MEDIUM: '#FADB14', LOW: '#52C41A' }`

- [ ] Task 4: Implement Card 3 — Top Projects table (AC: 5)
  - [ ] Ant Design `Table` với columns: Dự án (link), Open, Critical, Tổng
  - [ ] Link dự án: `<Link to={/bugs?projectId=${row.projectId}}>`

- [ ] Task 5: Implement Card 4 — Top Tasks table (AC: 6)
  - [ ] Ant Design `Table` với columns: Task (link tới task detail), Dự án, Bug đang mở

- [ ] Task 6: Implement Card 5 — Trend Line (AC: 7, 8)
  - [ ] Ant Design Charts `Line` với 2 series
  - [ ] Dark mode theming

- [ ] Task 7: Thêm tab navigation trong BugListPage (AC: 9)
  - [ ] Wrap BugListPage content trong Tabs: "Danh sách" (`/bugs`) | "Dashboard" (`/bugs/dashboard`)
  - [ ] Hoặc: 2 route riêng với active tab state theo URL

## Dev Notes

### BugDashboardPage — layout

```tsx
export default function BugDashboardPage() {
  const [projectFilter, setProjectFilter] = useState<string | undefined>();
  const { data: projects } = useGetProjects(); // org-scoped
  const statsFilters = { projectId: projectFilter };
  const { data: stats, isLoading } = useGetBugStats(statsFilters);

  return (
    <PageLayout title="Bug Dashboard">
      <div style={{ marginBottom: 24 }}>
        <Select
          placeholder="Tất cả dự án"
          allowClear
          style={{ width: 240 }}
          options={projects?.data.map(p => ({ value: p.id, label: p.name }))}
          onChange={setProjectFilter}
        />
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Trạng thái tổng quan"><StatusDonut data={stats?.byStatus} /></Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Phân bố mức độ"><SeverityBar data={stats?.bySeverity} /></Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Top dự án nhiều bug nhất"><TopProjectsTable data={stats?.openByProject} /></Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Task nhiều bug nhất"><TopTasksTable data={stats?.openByTask} /></Card>
        </Col>
        <Col xs={24}>
          <Card title="Xu hướng 30 ngày"><TrendLine data={stats?.trend} /></Card>
        </Col>
      </Row>
    </PageLayout>
  );
}
```

### Card 1 — Status Donut

```tsx
import { Pie } from '@ant-design/charts';

const STATUS_COLORS = {
  open: '#1677FF', inProgress: '#FA8C16', resolved: '#52C41A',
  closed: '#8C8C8C', cancelled: '#D9D9D9',
};

const StatusDonut: React.FC<{ data?: BugStatsByStatus }> = ({ data }) => {
  if (!data) return <Skeleton />;
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  const chartData = [
    { type: 'Open', value: data.open, color: STATUS_COLORS.open },
    { type: 'Đang xử lý', value: data.inProgress, color: STATUS_COLORS.inProgress },
    { type: 'Resolved', value: data.resolved, color: STATUS_COLORS.resolved },
    { type: 'Closed', value: data.closed, color: STATUS_COLORS.closed },
    { type: 'Đã huỷ', value: data.cancelled, color: STATUS_COLORS.cancelled },
  ];
  return (
    <Pie
      data={chartData}
      angleField="value"
      colorField="type"
      innerRadius={0.6}
      color={({ type }) => chartData.find(d => d.type === type)?.color ?? '#ccc'}
      statistic={{
        title: { content: 'Tổng' },
        content: { content: String(total) },
      }}
    />
  );
};
```

### Card 2 — Severity Bar

```tsx
import { Bar } from '@ant-design/charts';

const SEVERITY_COLORS = {
  CRITICAL: '#FF4D4F', HIGH: '#FA8C16', MEDIUM: '#FADB14', LOW: '#52C41A',
};

const SeverityBar: React.FC<{ data?: BugStatsBySeverity }> = ({ data }) => {
  if (!data) return <Skeleton />;
  const chartData = [
    { severity: 'Critical', count: data.critical, color: SEVERITY_COLORS.CRITICAL },
    { severity: 'High',     count: data.high,     color: SEVERITY_COLORS.HIGH },
    { severity: 'Medium',   count: data.medium,   color: SEVERITY_COLORS.MEDIUM },
    { severity: 'Low',      count: data.low,       color: SEVERITY_COLORS.LOW },
  ];
  return (
    <Bar
      data={chartData}
      xField="count"
      yField="severity"
      color={({ severity }) => chartData.find(d => d.severity === severity)?.color ?? '#ccc'}
      label={{ position: 'right' }}
    />
  );
};
```

### Card 5 — Trend Line (dark mode aware)

```tsx
import { Line } from '@ant-design/charts';
import { theme } from 'antd';

const TrendLine: React.FC<{ data?: BugTrendEntry[] }> = ({ data }) => {
  const { token } = theme.useToken();
  const isDark = token.colorBgBase === '#141414';

  if (!data) return <Skeleton />;

  // Transform: mỗi ngày có 2 data points (Tạo mới + Resolved)
  const chartData = data.flatMap(d => [
    { date: d.date, value: d.created,  type: 'Tạo mới' },
    { date: d.date, value: d.resolved, type: 'Resolved' },
  ]);

  return (
    <Line
      data={chartData}
      xField="date"
      yField="value"
      seriesField="type"
      color={['#FF4D4F', '#52C41A']}
      theme={isDark ? 'dark' : 'default'}
      point={{ size: 3 }}
      xAxis={{ label: { style: { fill: isDark ? 'rgba(255,255,255,0.85)' : '#000' } } }}
      yAxis={{ gridLine: { style: { stroke: isDark ? 'rgba(255,255,255,0.1)' : '#eee' } } }}
    />
  );
};
```

### Tab navigation trong /bugs

Option đơn giản nhất: dùng `Tabs` trong `PageLayout` với `onChange` navigate:

```tsx
// Trong BugListPage.tsx — thêm tabs ở top:
const location = useLocation();
const navigate = useNavigate();

<Tabs
  activeKey={location.pathname === '/bugs/dashboard' ? 'dashboard' : 'list'}
  onChange={(key) => navigate(key === 'dashboard' ? '/bugs/dashboard' : '/bugs')}
  items={[
    { key: 'list', label: 'Danh sách' },
    { key: 'dashboard', label: 'Dashboard' },
  ]}
  style={{ marginBottom: 16 }}
/>
```

### References

- `@ant-design/charts` đã có trong project (Epic 8 dùng cho leadership dashboard)
- `useGetBugStats`: `apps/web/src/api/bugs.api.ts` (Story 13.5)
- Dark mode pattern: `apps/web/src/pages/dashboard/LeadershipDashboardPage.tsx`
- UX-DR11 severity colors: `#FF4D4F`, `#FA8C16`, `#FADB14`, `#52C41A`
