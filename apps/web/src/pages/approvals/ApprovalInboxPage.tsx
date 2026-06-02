import { useState } from 'react';
import { Row, Col, Table, Tag, Button, Select, Typography, Space, App, Spin } from 'antd';
import {
  InboxOutlined, CheckOutlined, CloseOutlined,
} from '@ant-design/icons';
import { EmployeeInfoCell } from '../../components/ui/EmployeeInfoCell';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useThemePalette } from '../../hooks/useThemePalette';
import { usePagination } from '../../hooks/usePagination';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { FilterBar } from '../../components/FilterBar';
import { processesApi, type ProcessUserTask } from '../../api/processes.api';

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
  const { page, pageSize, paginationProps } = usePagination(50);

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

  // Filter theo ngày
  const filteredTasks = allTasks.filter((task) => {
    if (!dateFilter) return true;
    const created = dayjs(task.dueDate || (task as any).createdAt);
    const now = dayjs();
    if (dateFilter === 'today') return created.isSame(now, 'day');
    if (dateFilter === 'week') return created.isSame(now, 'week');
    if (dateFilter === 'month') return created.isSame(now, 'month');
    return true;
  });

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
      width: 170,
      render: (_: unknown, record: ProcessUserTask) => {
        if (record.status === 'COMPLETED' || record.status === 'SKIPPED') {
          return <Text style={{ color: textMuted, fontSize: 12 }}>—</Text>;
        }
        const isLoading = completeMutation.isPending && (completeMutation.variables as any)?.taskId === record.id;
        return (
          <Space size={6}>
            <Button
              type="primary"
              size="small"
              icon={<CheckOutlined />}
              loading={isLoading}
              onClick={() => completeMutation.mutate({ taskId: record.id, outcome: 'APPROVED' })}
              style={{ fontSize: 12 }}
            >
              Duyệt
            </Button>
            <Button
              danger
              size="small"
              icon={<CloseOutlined />}
              loading={isLoading}
              onClick={() => completeMutation.mutate({ taskId: record.id, outcome: 'REJECTED' })}
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
        <Select
          value={dateFilter}
          onChange={setDateFilter}
          options={DATE_OPTIONS}
          style={{ width: 160 }}
          placeholder="Thời gian"
        />
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
          locale={{ emptyText: <Text style={{ color: textMuted }}>Không có yêu cầu nào đang chờ</Text> }}
        />
      </div>
    </div>
  );
}
