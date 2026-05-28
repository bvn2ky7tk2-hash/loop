import { useState, useMemo } from 'react';
import {
  Tabs, List, Badge, Typography, Space, Empty, Skeleton, Tag, Select, Switch, Radio,
} from 'antd';
import dayjs from 'dayjs';
import { useGetMyBugs, type Bug, type BugSeverity, type BugStatus, type BugItemType } from '../../api/bugs.api';
import { BugStatusPill } from '../../components/bugs/BugStatusPill';
import { BugDetailDrawer } from '../../components/bugs/BugDetailDrawer';
import { SEVERITY_CONFIG } from '../../components/bugs/BugSeverityBadge';

const SEVERITY_ORDER: BugSeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

const SEVERITY_OPTIONS: { value: BugSeverity; label: string }[] = [
  { value: 'CRITICAL', label: 'Nghiêm trọng' },
  { value: 'HIGH',     label: 'Cao' },
  { value: 'MEDIUM',   label: 'Trung bình' },
  { value: 'LOW',      label: 'Thấp' },
];

interface BugGroupProps {
  severity: BugSeverity;
  bugs:     Bug[];
  onSelect: (id: string) => void;
}

function BugGroup({ severity, bugs, onSelect }: BugGroupProps) {
  const cfg = SEVERITY_CONFIG[severity];
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span>{cfg.icon}</span>
        <Typography.Text strong>{cfg.label}</Typography.Text>
        <Badge count={bugs.length} style={{ backgroundColor: cfg.color }} />
      </div>
      <List
        dataSource={bugs}
        renderItem={(bug) => (
          <List.Item
            style={{ cursor: 'pointer', minHeight: 44 }}
            onClick={() => onSelect(bug.id)}
          >
            <List.Item.Meta
              title={
                <Space size={4}>
                  {bug.itemType === 'ISSUE'
                    ? <Tag color="blue" style={{ margin: 0 }}>Issue</Tag>
                    : <Tag color="red" style={{ margin: 0 }}>Bug</Tag>}
                  {bug.isCR && <Tag color="orange" style={{ margin: 0, fontSize: 10 }}>CR</Tag>}
                  <span>{bug.title}</span>
                </Space>
              }
              description={`${bug.project?.name ?? ''}${bug.tasks?.length ? ` • ${bug.tasks.length} tasks` : ''}`}
            />
            <Space>
              <BugStatusPill status={bug.status} />
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {dayjs(bug.createdAt).format('DD/MM')}
              </Typography.Text>
            </Space>
          </List.Item>
        )}
      />
    </div>
  );
}

export default function MyBugsPage() {
  const [activeTab, setActiveTab]         = useState('all');
  const [selectedBugId, setSelectedBugId] = useState<string | null>(null);

  // Extra filters
  const [itemType, setItemType]       = useState<BugItemType | ''>('');
  const [severities, setSeverities]   = useState<BugSeverity[]>([]);
  const [projectId, setProjectId]     = useState<string | undefined>();
  const [onlyCR, setOnlyCR]           = useState(false);

  const { data: bugs, isLoading } = useGetMyBugs();

  // Derive project list from bugs data
  const projectOptions = useMemo(() => {
    if (!bugs) return [];
    const seen = new Map<string, string>();
    bugs.forEach((b) => { if (b.project) seen.set(b.project.id, b.project.name); });
    return [...seen.entries()].map(([value, label]) => ({ value, label }));
  }, [bugs]);

  const statusMap: Record<string, BugStatus> = {
    open: 'OPEN', inProgress: 'IN_PROGRESS', resolved: 'RESOLVED',
  };

  const filtered = useMemo(() => {
    if (!bugs) return [];
    return bugs.filter((b) => {
      if (activeTab !== 'all' && b.status !== statusMap[activeTab]) return false;
      if (itemType && b.itemType !== itemType) return false;
      if (severities.length && !severities.includes(b.severity)) return false;
      if (projectId && b.projectId !== projectId) return false;
      if (onlyCR && !b.isCR) return false;
      return true;
    });
  }, [bugs, activeTab, itemType, severities, projectId, onlyCR]);

  const grouped = useMemo(
    () =>
      SEVERITY_ORDER
        .map((sev) => ({ severity: sev, bugs: filtered.filter((b) => b.severity === sev) }))
        .filter((g) => g.bugs.length > 0),
    [filtered],
  );

  const tabItems = [
    { key: 'all',        label: `Tất cả (${bugs?.length ?? 0})` },
    { key: 'open',       label: `Open (${bugs?.filter((b) => b.status === 'OPEN').length ?? 0})` },
    { key: 'inProgress', label: `In Progress (${bugs?.filter((b) => b.status === 'IN_PROGRESS').length ?? 0})` },
    { key: 'resolved',   label: `Resolved (${bugs?.filter((b) => b.status === 'RESOLVED').length ?? 0})` },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={3}>My Bugs</Typography.Title>

      {isLoading && <Skeleton active />}

      {!isLoading && (!bugs || bugs.length === 0) && (
        <Empty description="Không có bug nào được giao cho bạn" />
      )}

      {!isLoading && bugs && bugs.length > 0 && (
        <>
          <Tabs items={tabItems} activeKey={activeTab} onChange={setActiveTab} />

          {/* Filter row */}
          <Space wrap style={{ marginBottom: 16 }}>
            <Radio.Group
              optionType="button"
              buttonStyle="solid"
              value={itemType}
              onChange={(e) => setItemType(e.target.value)}
            >
              <Radio.Button value="">Tất cả</Radio.Button>
              <Radio.Button value="BUG">🐛 Bug</Radio.Button>
              <Radio.Button value="ISSUE">📋 Issue</Radio.Button>
            </Radio.Group>

            <Select
              mode="multiple"
              placeholder="Mức độ"
              allowClear
              style={{ minWidth: 150 }}
              options={SEVERITY_OPTIONS}
              value={severities}
              onChange={setSeverities}
            />

            {projectOptions.length > 1 && (
              <Select
                placeholder="Dự án"
                allowClear
                style={{ minWidth: 160 }}
                options={projectOptions}
                value={projectId}
                onChange={setProjectId}
              />
            )}

            <Space size={6}>
              <Typography.Text type="secondary" style={{ fontSize: 13 }}>Chỉ CR</Typography.Text>
              <Switch size="small" checked={onlyCR} onChange={setOnlyCR} />
            </Space>
          </Space>

          {grouped.map((g) => (
            <BugGroup key={g.severity} severity={g.severity} bugs={g.bugs} onSelect={setSelectedBugId} />
          ))}
          {grouped.length === 0 && (
            <Empty description="Không có bug nào phù hợp bộ lọc" />
          )}
        </>
      )}

      {selectedBugId && (
        <BugDetailDrawer bugId={selectedBugId} onClose={() => setSelectedBugId(null)} />
      )}
    </div>
  );
}
