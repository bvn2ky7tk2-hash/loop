import { useState, useMemo } from 'react';
import { Row, Col, Table, Tag, Button, Select, Input, Typography, Space, App, Spin } from 'antd';
import {
  InboxOutlined, CheckOutlined, CloseOutlined, EyeOutlined, SearchOutlined,
} from '@ant-design/icons';
import { EmployeeInfoCell } from '../../components/ui/EmployeeInfoCell';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useThemePalette } from '../../hooks/useThemePalette';
import { usePagination } from '../../hooks/usePagination';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { FilterBar } from '../../components/FilterBar';
import { processesApi, useDefinitions, type ProcessUserTask } from '../../api/processes.api';
import { usersApi } from '../../api/users';
import { TaskCompleteDrawer } from '../processes/components/TaskCompleteDrawer';

const { Text } = Typography;

const DATE_OPTIONS = [
  { value: '', label: 'Tất cả thời gian' },
  { value: 'today', label: 'Hôm nay' },
  { value: 'week', label: 'Tuần này' },
  { value: 'month', label: 'Tháng này' },
];

export default function ApprovalInboxPage() {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const { textPrimary, textMuted, borderColor, bgContainer, isDark } = useThemePalette();

  const [dateFilter, setDateFilter] = useState('');
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatus]   = useState('');
  const [defFilter, setDefFilter]   = useState('');
  const [requesterFilter, setRequester] = useState('');
  const [assigneeFilter, setAssignee]    = useState('');
  const [detailTask, setDetailTask] = useState<ProcessUserTask | null>(null);
  const { page, pageSize, paginationProps } = usePagination(50);

  // Options cho filter
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: usersApi.list });
  const { data: defsData } = useDefinitions({ pageSize: 100 });
  const definitions = (defsData?.data ?? []).filter((d) => d.status === 'ACTIVE');

  // Lấy tất cả user tasks đang chờ xử lý (PENDING + IN_PROGRESS)
  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['approval-inbox', page, pageSize],
    queryFn: () => processesApi.listUserTasks({ page, pageSize }),
    refetchInterval: 30_000,
  });

  // Tasks đã hoàn thành hôm nay
  const { data: completedData } = useQuery({
    queryKey: ['approval-inbox-completed-today'],
    queryFn: () => processesApi.listUserTasks({ page: 1, pageSize: 100 }),
    staleTime: 60_000,
  });

  const completeMutation = useMutation({
    mutationFn: ({ taskId, outcome }: { taskId: string; outcome: 'APPROVED' | 'REJECTED' }) =>
      processesApi.completeTask(taskId, { decision: outcome }),
    onSuccess: (_, { outcome }) => {
      message.success(outcome === 'APPROVED' ? 'Đã phê duyệt' : 'Đã từ chối');
      void qc.invalidateQueries({ queryKey: ['approval-inbox'] });
      void qc.invalidateQueries({ queryKey: ['approval-inbox-completed-today'] });
    },
    onError: () => message.error('Không thể xử lý. Vui lòng thử lại.'),
  });

  const allTasks = (tasksData?.data ?? []) as ProcessUserTask[];

  // Gộp tất cả điều kiện lọc
  const filteredTasks = useMemo(() => allTasks.filter((task) => {
    // Tìm theo tên bước / tên quy trình
    if (search) {
      const hay = `${task.name ?? ''} ${task.instance?.definition?.name ?? ''}`.toLowerCase();
      if (!hay.includes(search.toLowerCase())) return false;
    }
    if (statusFilter && task.status !== statusFilter) return false;
    if (defFilter && task.instance?.definition?.id !== defFilter) return false;
    if (requesterFilter && task.instance?.startedByUser?.id !== requesterFilter) return false;
    if (assigneeFilter) {
      if (assigneeFilter === '__UNASSIGNED__') { if (task.assignee?.id) return false; }
      else if (task.assignee?.id !== assigneeFilter) return false;
    }
    if (dateFilter) {
      const created = dayjs(task.dueDate || (task as any).createdAt);
      const now = dayjs();
      if (dateFilter === 'today' && !created.isSame(now, 'day')) return false;
      if (dateFilter === 'week'  && !created.isSame(now, 'week')) return false;
      if (dateFilter === 'month' && !created.isSame(now, 'month')) return false;
    }
    return true;
  }), [allTasks, search, statusFilter, defFilter, requesterFilter, assigneeFilter, dateFilter]);

  const pendingCount = allTasks.filter(t => t.status === 'PENDING' || t.status === 'IN_PROGRESS').length;
  const today = dayjs().startOf('day');
  const approvedToday = (completedData?.data ?? []).filter(t =>
    t.status === 'COMPLETED' && t.completedAt && dayjs(t.completedAt).isAfter(today)
  ).length;
  const overdueCount = allTasks.filter(t =>
    t.dueDate && dayjs(t.dueDate).isBefore(dayjs()) && (t.status === 'PENDING' || t.status === 'IN_PROGRESS')
  ).length;

  const columns = [
    {
      title: 'Quy trình',
      key: 'process',
      width: 160,
      render: (_: unknown, record: ProcessUserTask) => {
        const processName = record.instance?.definition?.name ?? 'Quy trình';
        return (
          <Tag style={isDark
            ? { background: '#6366F122', color: '#818CF8', borderColor: '#6366F155', fontSize: 12 }
            : { fontSize: 12 }}
          >
            {processName}
          </Tag>
        );
      },
    },
    {
      title: 'Bước duyệt',
      dataIndex: 'name',
      ellipsis: true,
      render: (v: string) => <Text style={{ color: textPrimary, fontSize: 13, fontWeight: 500 }}>{v}</Text>,
    },
    {
      title: 'Người yêu cầu',
      key: 'requester',
      width: 200,
      render: (_: unknown, record: ProcessUserTask) => {
        const user = record.instance?.startedByUser;
        if (!user) return <Text style={{ color: textMuted }}>—</Text>;
        // Nếu user có employee profile → dùng EmployeeInfoCell đầy đủ
        if (user.employee) {
          return <EmployeeInfoCell employee={user.employee} />;
        }
        // Fallback: chỉ có name (user chưa liên kết employee)
        return <Text style={{ color: textPrimary, fontSize: 13 }}>{user.name}</Text>;
      },
    },
    {
      title: 'Người thực hiện (bước này)',
      key: 'assignee',
      width: 190,
      render: (_: unknown, record: ProcessUserTask) => {
        if (!record.assignee?.id) {
          return (
            <Tag style={isDark
              ? { background: '#F59E0B22', color: '#FBBF24', borderColor: '#F59E0B55' }
              : {}}
              color={isDark ? undefined : 'orange'}
            >
              Chưa nhận
            </Tag>
          );
        }
        return <Text style={{ color: textPrimary, fontSize: 13 }}>{record.assignee.name}</Text>;
      },
    },
    {
      title: 'Hạn xử lý',
      dataIndex: 'dueDate',
      width: 130,
      render: (v?: string) => {
        if (!v) return <Text style={{ color: textMuted, fontSize: 12 }}>—</Text>;
        const overdue = dayjs(v).isBefore(dayjs());
        return (
          <Text style={{ color: overdue ? '#EF4444' : textMuted, fontSize: 12 }}>
            {dayjs(v).format('DD/MM/YYYY')}
            {overdue && ' ⚠️'}
          </Text>
        );
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 120,
      render: (v: string) => {
        const map: Record<string, { label: string; color: string }> = {
          PENDING:     { label: 'Chờ duyệt',    color: 'warning' },
          IN_PROGRESS: { label: 'Đang xử lý',   color: 'processing' },
          COMPLETED:   { label: 'Đã hoàn thành', color: 'success' },
          SKIPPED:     { label: 'Đã bỏ qua',    color: 'default' },
        };
        const cfg = map[v] ?? { label: v, color: 'default' };
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
    {
      title: 'Hành động',
      key: 'actions',
      width: 230,
      render: (_: unknown, record: ProcessUserTask) => {
        const viewBtn = (
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={(e) => { e.stopPropagation(); setDetailTask(record); }}
            style={{ fontSize: 12 }}
          >
            Xem
          </Button>
        );
        if (record.status === 'COMPLETED' || record.status === 'SKIPPED') {
          return viewBtn;
        }
        const isLoading = completeMutation.isPending && (completeMutation.variables as any)?.taskId === record.id;
        return (
          <Space size={6}>
            {viewBtn}
            <Button
              type="primary"
              size="small"
              icon={<CheckOutlined />}
              loading={isLoading}
              onClick={(e) => { e.stopPropagation(); completeMutation.mutate({ taskId: record.id, outcome: 'APPROVED' }); }}
              style={{ fontSize: 12 }}
            >
              Duyệt
            </Button>
            <Button
              danger
              size="small"
              icon={<CloseOutlined />}
              loading={isLoading}
              onClick={(e) => { e.stopPropagation(); completeMutation.mutate({ taskId: record.id, outcome: 'REJECTED' }); }}
              style={{ fontSize: 12 }}
            >
              Từ chối
            </Button>
          </Space>
        );
      },
    },
  ];

  if (isLoading) {
    return <div style={{ padding: 48, display: 'flex', justifyContent: 'center' }}><Spin size="large" /></div>;
  }

  return (
    <div style={{ padding: 24 }}>
      <PageHeader title="Hộp thư phê duyệt" icon={<InboxOutlined />} iconColor="#6366F1" />

      {/* Stat cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <StatCard label="Chờ duyệt" value={pendingCount} subValue="yêu cầu đang chờ"
            color="#F59E0B" icon={<InboxOutlined />} />
        </Col>
        <Col xs={24} sm={8}>
          <StatCard label="Đã duyệt hôm nay" value={approvedToday} subValue="yêu cầu"
            color="#10B981" icon={<CheckOutlined />} />
        </Col>
        <Col xs={24} sm={8}>
          <StatCard label="Quá hạn" value={overdueCount} subValue="cần xử lý gấp"
            color="#EF4444" icon={<CloseOutlined />} />
        </Col>
      </Row>

      {/* Filter bar */}
      <FilterBar>
        <Input
          prefix={<SearchOutlined />}
          placeholder="Tìm bước duyệt / quy trình..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          style={{ width: 240 }}
        />
        <Select
          placeholder="Quy trình"
          value={defFilter || undefined}
          onChange={(v) => setDefFilter(v ?? '')}
          allowClear
          showSearch
          optionFilterProp="label"
          options={definitions.map((d) => ({ value: d.id, label: d.name }))}
          style={{ width: 220 }}
        />
        <Select
          placeholder="Người yêu cầu"
          value={requesterFilter || undefined}
          onChange={(v) => setRequester(v ?? '')}
          allowClear
          showSearch
          optionFilterProp="label"
          options={users.map((u) => ({ value: u.id, label: u.name }))}
          style={{ width: 180 }}
        />
        <Select
          placeholder="Người thực hiện"
          value={assigneeFilter || undefined}
          onChange={(v) => setAssignee(v ?? '')}
          allowClear
          showSearch
          optionFilterProp="label"
          options={[
            { value: '__UNASSIGNED__', label: '— Chưa nhận —' },
            ...users.map((u) => ({ value: u.id, label: u.name })),
          ]}
          style={{ width: 180 }}
        />
        <Select
          placeholder="Trạng thái"
          value={statusFilter || undefined}
          onChange={(v) => setStatus(v ?? '')}
          allowClear
          options={[
            { value: 'PENDING', label: 'Chờ duyệt' },
            { value: 'IN_PROGRESS', label: 'Đang xử lý' },
            { value: 'COMPLETED', label: 'Đã hoàn thành' },
          ]}
          style={{ width: 150 }}
        />
        <Select
          value={dateFilter}
          onChange={setDateFilter}
          options={DATE_OPTIONS}
          style={{ width: 150 }}
          placeholder="Thời gian"
        />
        {(search || defFilter || requesterFilter || assigneeFilter || statusFilter || dateFilter) && (
          <Button size="small" onClick={() => {
            setSearch(''); setDefFilter(''); setRequester(''); setAssignee(''); setStatus(''); setDateFilter('');
          }}>
            Xóa lọc
          </Button>
        )}
      </FilterBar>

      {/* Table */}
      <div style={{ background: bgContainer, border: `1px solid ${borderColor}`, borderRadius: 12, overflow: 'hidden' }}>
        <Table
          rowKey="id"
          dataSource={filteredTasks}
          columns={columns}
          size="middle"
          loading={isLoading}
          pagination={paginationProps(tasksData?.meta?.total, 'task')}
          onRow={(record) => ({
            onClick: () => setDetailTask(record),
            style: { cursor: 'pointer' },
          })}
          locale={{ emptyText: <Text style={{ color: textMuted }}>Không có yêu cầu nào đang chờ</Text> }}
        />
      </div>

      {/* Modal chi tiết — xem nội dung đơn + form duyệt (dùng chung TaskCompleteDrawer) */}
      <TaskCompleteDrawer
        task={detailTask}
        open={!!detailTask}
        onClose={() => {
          setDetailTask(null);
          void qc.invalidateQueries({ queryKey: ['approval-inbox'] });
          void qc.invalidateQueries({ queryKey: ['approval-inbox-completed-today'] });
        }}
      />
    </div>
  );
}
