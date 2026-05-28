# Story 13.7: Web UI — My Bugs Page

Status: ready

## Story

As any authenticated user,
I want a personal "My Bugs" page showing all bugs assigned to me, grouped by severity,
So that I can quickly see what I need to work on without filtering the global list.

## Acceptance Criteria

1. Route `/my-bugs` render `MyBugsPage`, có link từ sidebar.
2. Bug được grouped theo severity: Critical section → High → Medium → Low.
3. Mỗi group header hiển thị: severity icon + label + count badge.
4. Mỗi bug item hiển thị: tiêu đề, project name, task count, status Tag, created date.
5. Filter tabs: Tất cả | Open | In Progress | Resolved — tab label có count (e.g., "Open (3)").
6. Click bug item → `BugDetailDrawer` mở.
7. Empty state: ✅ icon + "Không có bug nào được giao cho bạn".
8. Tất cả touch targets ≥ 44×44px (UX-DR9).

## Tasks / Subtasks

- [ ] Task 1: Tạo `MyBugsPage.tsx` (AC: 1, 2, 3, 4)
  - [ ] `apps/web/src/pages/bugs/MyBugsPage.tsx`
  - [ ] Fetch `GET /api/v1/bugs/my` qua `useGetMyBugs()`
  - [ ] Group bugs theo severity sau khi nhận data
  - [ ] Render group sections với header + list

- [ ] Task 2: Implement filter tabs (AC: 5)
  - [ ] Ant Design `Tabs` với 4 tabs
  - [ ] Count trong tab label từ grouped data
  - [ ] Filter ở client-side (không re-fetch)

- [ ] Task 3: Integrate `BugDetailDrawer` (AC: 6)
  - [ ] State: `selectedBugId`
  - [ ] Click item → `setSelectedBugId`

- [ ] Task 4: Empty state và loading (AC: 7)
  - [ ] Ant Design `Empty` với custom description
  - [ ] Loading skeleton khi fetching

## Dev Notes

### MyBugsPage — grouping logic

```tsx
// apps/web/src/pages/bugs/MyBugsPage.tsx
const SEVERITY_ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const;

export default function MyBugsPage() {
  const [activeTab, setActiveTab] = useState<string>('all');
  const [selectedBugId, setSelectedBugId] = useState<string | null>(null);

  const { data: bugs, isLoading } = useGetMyBugs();

  const filtered = useMemo(() => {
    if (!bugs) return [];
    if (activeTab === 'all') return bugs;
    const statusMap = { open: 'OPEN', inProgress: 'IN_PROGRESS', resolved: 'RESOLVED' };
    return bugs.filter(b => b.status === statusMap[activeTab]);
  }, [bugs, activeTab]);

  const grouped = useMemo(() => {
    return SEVERITY_ORDER.map(severity => ({
      severity,
      bugs: filtered.filter(b => b.severity === severity),
    })).filter(g => g.bugs.length > 0);
  }, [filtered]);

  const tabItems = [
    { key: 'all',        label: `Tất cả (${bugs?.length ?? 0})` },
    { key: 'open',       label: `Open (${bugs?.filter(b => b.status === 'OPEN').length ?? 0})` },
    { key: 'inProgress', label: `In Progress (${bugs?.filter(b => b.status === 'IN_PROGRESS').length ?? 0})` },
    { key: 'resolved',   label: `Resolved (${bugs?.filter(b => b.status === 'RESOLVED').length ?? 0})` },
  ];

  if (!isLoading && (!bugs || bugs.length === 0)) {
    return (
      <PageLayout title="My Bugs">
        <Empty image="✅" description="Không có bug nào được giao cho bạn" />
      </PageLayout>
    );
  }

  return (
    <PageLayout title="My Bugs">
      <Tabs items={tabItems} activeKey={activeTab} onChange={setActiveTab} />
      {isLoading ? <Skeleton /> : grouped.map(group => (
        <BugGroup key={group.severity} {...group} onSelect={setSelectedBugId} />
      ))}
      {selectedBugId && (
        <BugDetailDrawer bugId={selectedBugId} onClose={() => setSelectedBugId(null)} />
      )}
    </PageLayout>
  );
}
```

### BugGroup component

```tsx
const BugGroup: React.FC<{ severity: BugSeverity; bugs: Bug[]; onSelect: (id: string) => void }> = ({
  severity, bugs, onSelect,
}) => {
  const config = SEVERITY_CONFIG[severity]; // từ BugSeverityBadge

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span>{config.icon}</span>
        <Typography.Text strong>{config.label}</Typography.Text>
        <Badge count={bugs.length} style={{ backgroundColor: config.color }} />
      </div>
      <List
        dataSource={bugs}
        renderItem={(bug) => (
          <List.Item
            style={{ cursor: 'pointer', minHeight: 44 }}  // AC: touch target ≥ 44px
            onClick={() => onSelect(bug.id)}
          >
            <List.Item.Meta
              title={bug.title}
              description={`${bug.project?.name} • ${bug.tasks?.length ?? 0} tasks`}
            />
            <Space>
              <BugStatusTag status={bug.status} />
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {dayjs(bug.createdAt).format('DD/MM')}
              </Typography.Text>
            </Space>
          </List.Item>
        )}
      />
    </div>
  );
};
```

### useGetMyBugs() hook

```typescript
// apps/web/src/api/bugs.api.ts
export const useGetMyBugs = () =>
  useQuery({
    queryKey: bugKeys.mine(),
    queryFn: () => api.get<Bug[]>('/bugs/my').then(r => r.data),
  });
```

### References

- `BugDetailDrawer`: Story 13.5
- `BugStatusTag`, `BugSeverityBadge`: Story 13.5
- `useGetMyBugs`: `apps/web/src/api/bugs.api.ts` (Story 13.5)
- Sidebar link: thêm cùng Story 13.6
