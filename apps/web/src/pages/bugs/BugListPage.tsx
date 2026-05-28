import { useState } from 'react';
import {
  Table, Button, Space, Tag, Typography, Select, DatePicker,
  Badge, theme, Radio, Switch,
} from 'antd';
import { BugOutlined, FilterOutlined, CloseOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '../../api/projects';
import { usersApi } from '../../api/users';
import {
  useGetBugs, useGetBugStats,
  type Bug, type BugFilterDto, type BugSeverity, type BugStatus, type BugItemType,
} from '../../api/bugs.api';
import { BugSeverityBadge } from '../../components/bugs/BugSeverityBadge';
import { BugStatusPill } from '../../components/bugs/BugStatusPill';
import { BugCreateDrawer } from '../../components/bugs/BugCreateDrawer';
import { BugDetailDrawer } from '../../components/bugs/BugDetailDrawer';

const { Text } = Typography;
const { RangePicker } = DatePicker;

const SEVERITY_ORDER: Record<BugSeverity, number> = { CRITICAL: 1, HIGH: 2, MEDIUM: 3, LOW: 4 };

const STATUS_OPTIONS: { value: BugStatus; label: string }[] = [
  { value: 'OPEN',           label: 'Open' },
  { value: 'PENDING',        label: 'Chờ xử lý' },
  { value: 'PENDING_REVIEW', label: 'Chờ duyệt' },
  { value: 'APPROVED',       label: 'Đã duyệt' },
  { value: 'REJECTED',       label: 'Từ chối' },
  { value: 'IN_PROGRESS',    label: 'Đang xử lý' },
  { value: 'RESOLVED',       label: 'Resolved' },
  { value: 'CLOSED',         label: 'Closed' },
  { value: 'CANCELLED',      label: 'Đã huỷ' },
];

const SEVERITY_OPTIONS: { value: BugSeverity; label: string }[] = [
  { value: 'CRITICAL', label: 'Nghiêm trọng' },
  { value: 'HIGH',     label: 'Cao' },
  { value: 'MEDIUM',   label: 'Trung bình' },
  { value: 'LOW',      label: 'Thấp' },
];

const OVERDUE_STATUSES = ['RESOLVED', 'CLOSED', 'CANCELLED', 'REJECTED'];

export default function BugListPage() {
  const { token } = theme.useToken();
  const [searchParams] = useSearchParams();

  const [filters, setFilters]   = useState<BugFilterDto>({ page: 1, pageSize: 20 });
  const [filterOpen, setFilterOpen] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedBugId, setSelectedBugId] = useState<string | null>(searchParams.get('bugId'));

  const { data, isLoading } = useGetBugs(filters);
  const { data: stats }     = useGetBugStats(filters.projectId ? { projectId: filters.projectId } : {});
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: projectsApi.list });
  const { data: users = [] }    = useQuery({ queryKey: ['users'], queryFn: usersApi.list });

  const activeFilterCount = Object.entries(filters).filter(
    ([k, v]) => !['page', 'pageSize'].includes(k) && v !== undefined && v !== '',
  ).length;

  const clearFilters = () => setFilters({ page: 1, pageSize: 20 });

  const columns: ColumnsType<Bug> = [
    {
      title: 'Loại', dataIndex: 'itemType', width: 80,
      render: (t: BugItemType, row: Bug) => (
        <Space size={2} direction="vertical" style={{ lineHeight: 1 }}>
          <Tag color={t === 'BUG' ? 'red' : 'blue'} style={{ margin: 0 }}>
            {t === 'BUG' ? '🐛 Bug' : '📋 Issue'}
          </Tag>
          {row.isCR && <Tag color="orange" style={{ margin: 0, fontSize: 10 }}>CR</Tag>}
        </Space>
      ),
    },
    {
      title: 'Mức độ', dataIndex: 'severity', width: 110,
      render: (s: BugSeverity) => <BugSeverityBadge severity={s} />,
      sorter: (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
    },
    { title: 'Tiêu đề', dataIndex: 'title', ellipsis: true },
    { title: 'Dự án', dataIndex: ['project', 'name'], width: 140, ellipsis: true },
    {
      title: 'Task(s)', dataIndex: 'tasks', width: 160,
      render: (tasks: Bug['tasks']) => (
        <Space wrap size={4}>
          {tasks?.slice(0, 2).map((t) => (
            <Tag key={t.taskId} style={{ fontSize: 11 }}>{t.task?.title?.slice(0, 18)}</Tag>
          ))}
          {(tasks?.length ?? 0) > 2 && <Tag>+{tasks!.length - 2}</Tag>}
        </Space>
      ),
    },
    {
      title: 'Người xử lý', dataIndex: ['assignee', 'name'], width: 130,
      render: (name?: string) => name ?? <Text type="secondary">Chưa assign</Text>,
    },
    {
      title: 'Người yêu cầu', dataIndex: 'requesterName', width: 130, ellipsis: true,
      render: (name?: string) => name ?? <Text type="secondary">—</Text>,
    },
    {
      title: 'Trạng thái', dataIndex: 'status', width: 130,
      render: (s: BugStatus) => <BugStatusPill status={s} />,
    },
    {
      title: 'Hạn xử lý', dataIndex: 'dueDate', width: 110,
      responsive: ['lg'],
      render: (d?: string, row?: Bug) => {
        if (!d) return <Text type="secondary">—</Text>;
        const overdue = new Date(d) < new Date() && !OVERDUE_STATUSES.includes(row?.status ?? '');
        return (
          <Space size={4}>
            <Text style={overdue ? { color: '#FF4D4F' } : undefined}>{dayjs(d).format('DD/MM/YYYY')}</Text>
            {overdue && <Tag color="error" style={{ margin: 0, fontSize: 10 }}>Quá hạn</Tag>}
          </Space>
        );
      },
    },
    {
      title: 'Ngày tạo', dataIndex: 'createdAt', width: 110,
      responsive: ['xl'],
      render: (d: string) => dayjs(d).format('DD/MM/YYYY'),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>Bug & Issues</Typography.Title>
        <Space>
          <Badge count={activeFilterCount} size="small">
            <Button icon={<FilterOutlined />} onClick={() => setFilterOpen(!filterOpen)}>
              Bộ lọc
            </Button>
          </Badge>
          {activeFilterCount > 0 && (
            <Button icon={<CloseOutlined />} onClick={clearFilters} size="small">Xoá bộ lọc</Button>
          )}
          <Button type="primary" icon={<BugOutlined />} onClick={() => setCreateOpen(true)}>
            Tạo mới
          </Button>
        </Space>
      </div>

      {/* Summary bar */}
      {stats && (
        <Space style={{ marginBottom: 16 }} wrap>
          <Tag style={{ fontSize: 13, padding: '2px 10px' }}>
            Tổng: <Text strong>{data?.meta.total ?? 0}</Text>
          </Tag>
          <Tag color="processing">
            🔵 {stats.byStatus.open + stats.byStatus.inProgress} Đang mở
          </Tag>
          <Tag color="error">🔴 {stats.bySeverity.critical} Nghiêm trọng</Tag>
          <Tag color="volcano">🟠 {stats.bySeverity.high} Cao</Tag>
          <Tag color="gold">🟡 {stats.bySeverity.medium} Trung bình</Tag>
          <Tag color="success">🟢 {stats.bySeverity.low} Thấp</Tag>
        </Space>
      )}

      {/* Filter bar */}
      {filterOpen && (
        <Space wrap style={{ marginBottom: 16 }}>
          <Radio.Group
            optionType="button"
            buttonStyle="solid"
            defaultValue=""
            onChange={(e) => setFilters((f) => ({ ...f, itemType: e.target.value || undefined, page: 1 }))}
          >
            <Radio.Button value="">Tất cả</Radio.Button>
            <Radio.Button value="BUG">🐛 Bug</Radio.Button>
            <Radio.Button value="ISSUE">📋 Issue</Radio.Button>
          </Radio.Group>
          <Space size={4}>
            <Text type="secondary" style={{ fontSize: 13 }}>Chỉ CR</Text>
            <Switch
              size="small"
              onChange={(checked) => setFilters((f) => ({ ...f, isCR: checked || undefined, page: 1 }))}
            />
          </Space>
          <Select
            placeholder="Dự án"
            allowClear
            style={{ width: 180 }}
            options={projects.map((p) => ({ value: p.id, label: p.name }))}
            onChange={(v) => setFilters((f) => ({ ...f, projectId: v, page: 1 }))}
          />
          <Select
            mode="multiple"
            placeholder="Trạng thái"
            allowClear
            style={{ width: 180 }}
            options={STATUS_OPTIONS}
            onChange={(v) => setFilters((f) => ({ ...f, status: v, page: 1 }))}
          />
          <Select
            mode="multiple"
            placeholder="Mức độ"
            allowClear
            style={{ width: 160 }}
            options={SEVERITY_OPTIONS}
            onChange={(v) => setFilters((f) => ({ ...f, severity: v, page: 1 }))}
          />
          <Select
            showSearch
            placeholder="Người yêu cầu"
            allowClear
            style={{ width: 170 }}
            filterOption={(input, opt) =>
              (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={users.map((u) => ({ value: u.id, label: u.name }))}
            onChange={(v) => setFilters((f) => ({ ...f, reporterId: v, page: 1 }))}
          />
          <Select
            showSearch
            placeholder="Người xử lý"
            allowClear
            style={{ width: 170 }}
            filterOption={(input, opt) =>
              (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={users.map((u) => ({ value: u.id, label: u.name }))}
            onChange={(v) => setFilters((f) => ({ ...f, assigneeId: v, page: 1 }))}
          />
          <RangePicker
            placeholder={['Từ ngày', 'Đến ngày']}
            onChange={(dates) => setFilters((f) => ({
              ...f,
              createdFrom: dates?.[0]?.toISOString(),
              createdTo:   dates?.[1]?.toISOString(),
              page: 1,
            }))}
          />
        </Space>
      )}

      <Table
        dataSource={data?.data}
        loading={isLoading}
        rowKey="id"
        columns={columns}
        rowClassName={(row) => {
          const overdue = row.dueDate && new Date(row.dueDate) < new Date()
            && !OVERDUE_STATUSES.includes(row.status);
          return overdue ? 'bug-row-overdue' : '';
        }}
        onRow={(record) => ({
          onClick: () => setSelectedBugId(record.id),
          style:   { cursor: 'pointer' },
        })}
        pagination={{
          total:    data?.meta.total,
          pageSize: filters.pageSize,
          current:  filters.page,
          onChange: (page) => setFilters((f) => ({ ...f, page })),
          showSizeChanger: true,
          onShowSizeChange: (_, size) => setFilters((f) => ({ ...f, pageSize: size, page: 1 })),
        }}
        style={{ background: token.colorBgContainer }}
      />

      <style>{`
        .bug-row-overdue td { background: rgba(255, 77, 79, 0.06) !important; }
        html.dark .bug-row-overdue td { background: rgba(255, 77, 79, 0.08) !important; }
      `}</style>

      <BugCreateDrawer open={createOpen} onClose={() => setCreateOpen(false)} />

      {selectedBugId && (
        <BugDetailDrawer bugId={selectedBugId} onClose={() => setSelectedBugId(null)} />
      )}
    </div>
  );
}
