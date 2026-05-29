import { useState } from 'react';
import {
  Row,
  Col,
  Table,
  Tag,
  Button,
  Input,
  Select,
  Form,
  Space,
  Typography,
  Tooltip,
  Badge,
  Tabs,
  Popconfirm,
  message,
} from 'antd';
import {
  FileTextOutlined,
  CheckOutlined,
  CloseOutlined,
  LinkOutlined,
  SearchOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';

import { useThemePalette } from '../../hooks/useThemePalette';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { FilterBar } from '../../components/FilterBar';
import { CenteredModal } from '../../components/ui/CenteredModal';
import { hrRequestsApi } from '../../api/hr-requests';
import type { LeaveRequest, OvertimeRequest } from '../../api/hr-requests';

const { Text } = Typography;
const { Option } = Select;

// ─── Status Tag — Leave ───────────────────────────────────────────────────────

type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

const STATUS_CFG: Record<
  RequestStatus,
  { label: string; light: string; darkBg: string; darkColor: string; darkBorder: string }
> = {
  PENDING: {
    label: 'Chờ duyệt',
    light: 'gold',
    darkBg: 'rgba(251,191,36,0.15)',
    darkColor: '#FCD34D',
    darkBorder: 'rgba(251,191,36,0.3)',
  },
  APPROVED: {
    label: 'Đã duyệt',
    light: 'green',
    darkBg: 'rgba(52,211,153,0.15)',
    darkColor: '#6EE7B7',
    darkBorder: 'rgba(52,211,153,0.3)',
  },
  REJECTED: {
    label: 'Từ chối',
    light: 'red',
    darkBg: 'rgba(248,113,113,0.15)',
    darkColor: '#FCA5A5',
    darkBorder: 'rgba(248,113,113,0.3)',
  },
  CANCELLED: {
    label: 'Đã hủy',
    light: 'default',
    darkBg: 'rgba(148,163,184,0.15)',
    darkColor: '#94A3B8',
    darkBorder: 'rgba(148,163,184,0.3)',
  },
};

function StatusTag({ status, isDark }: { status: RequestStatus; isDark: boolean }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.PENDING;
  return (
    <Tag
      color={isDark ? undefined : cfg.light}
      style={isDark ? { background: cfg.darkBg, color: cfg.darkColor, borderColor: cfg.darkBorder } : {}}
    >
      {cfg.label}
    </Tag>
  );
}

function BpmChip({ id, linkColor, textMuted }: { id?: string | null; linkColor: string; textMuted: string }) {
  if (!id) return <Text style={{ color: textMuted }}>—</Text>;
  return (
    <Badge
      color="#3B82F6"
      text={
        <Text style={{ color: linkColor, fontSize: 12 }}>
          <LinkOutlined style={{ marginRight: 4 }} />
          BPM
        </Text>
      }
    />
  );
}

// ─── Reject Modal ─────────────────────────────────────────────────────────────

interface RejectModalProps {
  open: boolean;
  loading: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}

function RejectModal({ open, loading, onCancel, onConfirm }: RejectModalProps) {
  const [form] = Form.useForm();
  return (
    <CenteredModal
      title="Từ chối đơn"
      open={open}
      onClose={() => { onCancel(); form.resetFields(); }}
      footer={
        <Space>
          <Button onClick={() => { onCancel(); form.resetFields(); }}>Hủy</Button>
          <Button type="primary" danger loading={loading} onClick={() => form.submit()}>
            Xác nhận từ chối
          </Button>
        </Space>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={(v) => { onConfirm(v.reason); form.resetFields(); }}
      >
        <Form.Item
          name="reason"
          label="Lý do từ chối"
          rules={[{ required: true, message: 'Vui lòng nhập lý do từ chối' }]}
        >
          <Input.TextArea rows={3} placeholder="Nhập lý do từ chối..." maxLength={500} showCount />
        </Form.Item>
      </Form>
    </CenteredModal>
  );
}

// ─── Tab Đơn nghỉ phép ────────────────────────────────────────────────────────

function LeaveTab() {
  const { textPrimary, textMuted, bgContainer, borderColor, linkColor, isDark } = useThemePalette();
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [page, setPage] = useState(1);
  const [rejectId, setRejectId] = useState<string | null>(null);

  const { data, isFetching } = useQuery({
    queryKey: ['hr-leaves', page, status],
    queryFn: () =>
      hrRequestsApi.listLeaves({
        page,
        pageSize: 20,
        status: (status as any) || undefined,
      }),
  });

  const records = (data?.data ?? []).filter((r) => {
    if (!search) return true;
    const emp = (r.employee as any);
    const name = emp?.fullName ?? '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['hr-leaves'] });

  const approveMut = useMutation({
    mutationFn: (id: string) => hrRequestsApi.approveLeave(id),
    onSuccess: () => { message.success('Đã phê duyệt đơn nghỉ phép'); invalidate(); },
    onError: () => message.error('Không thể phê duyệt'),
  });

  const rejectMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      hrRequestsApi.rejectLeave(id, reason),
    onSuccess: () => { message.success('Đã từ chối đơn nghỉ phép'); setRejectId(null); invalidate(); },
    onError: () => message.error('Không thể từ chối'),
  });

  const columns: ColumnsType<LeaveRequest> = [
    {
      title: 'Nhân viên',
      key: 'employee',
      width: 180,
      render: (_, row) => {
        const emp = row.employee as any;
        return emp?.fullName
          ? <Text style={{ color: linkColor, fontWeight: 500 }}>{emp.fullName}</Text>
          : <Text style={{ color: textMuted }}>—</Text>;
      },
    },
    {
      title: 'Loại nghỉ',
      key: 'leaveType',
      width: 140,
      render: (_, row) => {
        const lt = row.leaveType as any;
        return lt?.name
          ? <Text style={{ color: textPrimary }}>{lt.name}</Text>
          : <Text style={{ color: textMuted }}>—</Text>;
      },
    },
    {
      title: 'Từ ngày',
      dataIndex: 'startDate',
      key: 'startDate',
      width: 110,
      render: (v: string) => <Text style={{ color: textMuted }}>{dayjs(v).format('DD/MM/YYYY')}</Text>,
    },
    {
      title: 'Đến ngày',
      dataIndex: 'endDate',
      key: 'endDate',
      width: 110,
      render: (v: string) => <Text style={{ color: textMuted }}>{dayjs(v).format('DD/MM/YYYY')}</Text>,
    },
    {
      title: 'Số ngày',
      dataIndex: 'days',
      key: 'days',
      width: 80,
      render: (v: number) => <Text style={{ color: linkColor, fontWeight: 600 }}>{v}</Text>,
    },
    {
      title: 'Lý do',
      dataIndex: 'reason',
      key: 'reason',
      render: (v?: string) =>
        v ? (
          <Tooltip title={v}>
            <Text style={{ color: textPrimary, maxWidth: 150, display: 'inline-block' }} ellipsis>
              {v}
            </Text>
          </Tooltip>
        ) : (
          <Text style={{ color: textMuted }}>—</Text>
        ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (v: RequestStatus) => <StatusTag status={v} isDark={isDark} />,
    },
    {
      title: 'Quy trình',
      dataIndex: 'processInstanceId',
      key: 'bpm',
      width: 90,
      render: (v?: string | null) => <BpmChip id={v} linkColor={linkColor} textMuted={textMuted} />,
    },
    {
      title: 'Ngày nộp',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 110,
      render: (v: string) => <Text style={{ color: textMuted }}>{dayjs(v).format('DD/MM/YYYY')}</Text>,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 140,
      render: (_, row) => {
        if (row.status !== 'PENDING') return null;
        return (
          <Space size={4}>
            <Popconfirm
              title="Xác nhận phê duyệt đơn nghỉ phép này?"
              onConfirm={() => approveMut.mutate(row.id)}
              okText="Duyệt"
              cancelText="Hủy"
            >
              <Tooltip title="Phê duyệt">
                <Button
                  size="small"
                  type="primary"
                  icon={<CheckOutlined />}
                  loading={approveMut.isPending && approveMut.variables === row.id}
                />
              </Tooltip>
            </Popconfirm>
            <Tooltip title="Từ chối">
              <Button
                size="small"
                danger
                icon={<CloseOutlined />}
                onClick={() => setRejectId(row.id)}
              />
            </Tooltip>
          </Space>
        );
      },
    },
  ];

  return (
    <>
      <FilterBar>
        <Input
          prefix={<SearchOutlined />}
          placeholder="Tìm theo tên nhân viên..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          style={{ width: 240 }}
          allowClear
        />
        <Select
          value={status}
          onChange={(v) => { setStatus(v); setPage(1); }}
          style={{ width: 160 }}
          placeholder="Tất cả trạng thái"
          allowClear
        >
          <Option value="">Tất cả</Option>
          <Option value="PENDING">Chờ duyệt</Option>
          <Option value="APPROVED">Đã duyệt</Option>
          <Option value="REJECTED">Từ chối</Option>
          <Option value="CANCELLED">Đã hủy</Option>
        </Select>
      </FilterBar>

      <div style={{ background: bgContainer, borderRadius: 8, border: `1px solid ${borderColor}`, overflow: 'hidden' }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={records}
          loading={isFetching}
          size="middle"
          pagination={{
            current: page,
            pageSize: 20,
            total: data?.total ?? 0,
            onChange: (p) => setPage(p),
            showSizeChanger: false,
            showTotal: (total) => `Tổng ${total} đơn`,
          }}
        />
      </div>

      <RejectModal
        open={!!rejectId}
        loading={rejectMut.isPending}
        onCancel={() => setRejectId(null)}
        onConfirm={(reason) => {
          if (rejectId) rejectMut.mutate({ id: rejectId, reason });
        }}
      />
    </>
  );
}

// ─── Tab Đăng ký OT ──────────────────────────────────────────────────────────

function OtTab() {
  const { textPrimary, textMuted, bgContainer, borderColor, linkColor, isDark } = useThemePalette();
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [page, setPage] = useState(1);
  const [rejectId, setRejectId] = useState<string | null>(null);

  const { data, isFetching } = useQuery({
    queryKey: ['hr-ot', page, status],
    queryFn: () =>
      hrRequestsApi.listOt({
        page,
        limit: 20,
        status: (status as any) || undefined,
      }),
  });

  const records = (data?.data ?? []).filter((r) => {
    if (!search) return true;
    const name = r.employee?.fullName ?? '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['hr-ot'] });

  const approveMut = useMutation({
    mutationFn: (id: string) => hrRequestsApi.approveOt(id),
    onSuccess: () => { message.success('Đã phê duyệt đơn OT'); invalidate(); },
    onError: () => message.error('Không thể phê duyệt'),
  });

  const rejectMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      hrRequestsApi.rejectOt(id, reason),
    onSuccess: () => { message.success('Đã từ chối đơn OT'); setRejectId(null); invalidate(); },
    onError: () => message.error('Không thể từ chối'),
  });

  const columns: ColumnsType<OvertimeRequest> = [
    {
      title: 'Nhân viên',
      key: 'employee',
      width: 180,
      render: (_, row) =>
        row.employee?.fullName
          ? <Text style={{ color: linkColor, fontWeight: 500 }}>{row.employee.fullName}</Text>
          : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      title: 'Ngày OT',
      dataIndex: 'date',
      key: 'date',
      width: 110,
      render: (v: string) => <Text style={{ color: textMuted }}>{dayjs(v).format('DD/MM/YYYY')}</Text>,
    },
    {
      title: 'Giờ (từ–đến)',
      key: 'timeRange',
      width: 130,
      render: (_, row) =>
        row.fromTime && row.toTime
          ? <Text style={{ color: textPrimary }}>{row.fromTime} – {row.toTime}</Text>
          : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      title: 'Số giờ',
      dataIndex: 'hours',
      key: 'hours',
      width: 80,
      render: (v: number) => <Text style={{ color: linkColor, fontWeight: 600 }}>{v}h</Text>,
    },
    {
      title: 'Lý do',
      dataIndex: 'reason',
      key: 'reason',
      render: (v?: string | null) =>
        v ? (
          <Tooltip title={v}>
            <Text style={{ color: textPrimary, maxWidth: 150, display: 'inline-block' }} ellipsis>
              {v}
            </Text>
          </Tooltip>
        ) : (
          <Text style={{ color: textMuted }}>—</Text>
        ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (v: RequestStatus) => <StatusTag status={v} isDark={isDark} />,
    },
    {
      title: 'Quy trình',
      dataIndex: 'processInstanceId',
      key: 'bpm',
      width: 90,
      render: (v?: string | null) => <BpmChip id={v} linkColor={linkColor} textMuted={textMuted} />,
    },
    {
      title: 'Ngày nộp',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 110,
      render: (v: string) => <Text style={{ color: textMuted }}>{dayjs(v).format('DD/MM/YYYY')}</Text>,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 140,
      render: (_, row) => {
        if (row.status !== 'PENDING') return null;
        return (
          <Space size={4}>
            <Popconfirm
              title="Xác nhận phê duyệt đơn OT này?"
              onConfirm={() => approveMut.mutate(row.id)}
              okText="Duyệt"
              cancelText="Hủy"
            >
              <Tooltip title="Phê duyệt">
                <Button
                  size="small"
                  type="primary"
                  icon={<CheckOutlined />}
                  loading={approveMut.isPending && approveMut.variables === row.id}
                />
              </Tooltip>
            </Popconfirm>
            <Tooltip title="Từ chối">
              <Button
                size="small"
                danger
                icon={<CloseOutlined />}
                onClick={() => setRejectId(row.id)}
              />
            </Tooltip>
          </Space>
        );
      },
    },
  ];

  return (
    <>
      <FilterBar>
        <Input
          prefix={<SearchOutlined />}
          placeholder="Tìm theo tên nhân viên..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          style={{ width: 240 }}
          allowClear
        />
        <Select
          value={status}
          onChange={(v) => { setStatus(v); setPage(1); }}
          style={{ width: 160 }}
          placeholder="Tất cả trạng thái"
          allowClear
        >
          <Option value="">Tất cả</Option>
          <Option value="PENDING">Chờ duyệt</Option>
          <Option value="APPROVED">Đã duyệt</Option>
          <Option value="REJECTED">Từ chối</Option>
          <Option value="CANCELLED">Đã hủy</Option>
        </Select>
      </FilterBar>

      <div style={{ background: bgContainer, borderRadius: 8, border: `1px solid ${borderColor}`, overflow: 'hidden' }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={records}
          loading={isFetching}
          size="middle"
          pagination={{
            current: page,
            pageSize: 20,
            total: data?.total ?? 0,
            onChange: (p) => setPage(p),
            showSizeChanger: false,
            showTotal: (total) => `Tổng ${total} đơn`,
          }}
        />
      </div>

      <RejectModal
        open={!!rejectId}
        loading={rejectMut.isPending}
        onCancel={() => setRejectId(null)}
        onConfirm={(reason) => {
          if (rejectId) rejectMut.mutate({ id: rejectId, reason });
        }}
      />
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HrRequestsPage() {
  // ── Stats — load cả 2 tab để tính thống kê ─────────────────────────────────
  const now = dayjs();
  const thisMonth = now.month() + 1;
  const thisYear = now.year();

  const { data: allLeaves } = useQuery({
    queryKey: ['hr-requests-leaves-stats'],
    queryFn: () => hrRequestsApi.listLeaves({ page: 1, pageSize: 200 }),
    staleTime: 60_000,
  });

  const { data: allOt } = useQuery({
    queryKey: ['hr-requests-ot-stats'],
    queryFn: () => hrRequestsApi.listOt({ page: 1, limit: 200, month: thisMonth, year: thisYear }),
    staleTime: 60_000,
  });

  const leaveRecords = allLeaves?.data ?? [];
  const otRecords = allOt?.data ?? [];

  const pendingLeaves = leaveRecords.filter((r) => r.status === 'PENDING').length;
  const approvedLeavesThisMonth = leaveRecords.filter(
    (r) =>
      r.status === 'APPROVED' &&
      dayjs(r.updatedAt).month() + 1 === thisMonth &&
      dayjs(r.updatedAt).year() === thisYear,
  ).length;
  const pendingOt = otRecords.filter((r) => r.status === 'PENDING').length;
  const approvedOtHours = otRecords
    .filter((r) => r.status === 'APPROVED')
    .reduce((sum, r) => sum + Number(r.hours), 0);

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Quản lý đơn từ nhân sự"
        icon={<FileTextOutlined />}
        iconColor="#6366F1"
      />

      {/* Stat Cards */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}>
          <StatCard
            label="Chờ duyệt nghỉ phép"
            value={pendingLeaves}
            color="#F59E0B"
            icon={<CalendarOutlined />}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            label="Đã duyệt tháng này"
            value={approvedLeavesThisMonth}
            color="#10B981"
            icon={<CheckOutlined />}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            label="Chờ duyệt OT"
            value={pendingOt}
            color="#3B82F6"
            icon={<ClockCircleOutlined />}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            label="Giờ OT đã duyệt"
            value={`${approvedOtHours}h`}
            color="#6366F1"
            icon={<ClockCircleOutlined />}
          />
        </Col>
      </Row>

      {/* Tabs */}
      <Tabs
        defaultActiveKey="leaves"
        items={[
          {
            key: 'leaves',
            label: (
              <span>
                <CalendarOutlined style={{ marginRight: 6 }} />
                Đơn nghỉ phép
              </span>
            ),
            children: <LeaveTab />,
          },
          {
            key: 'ot',
            label: (
              <span>
                <ClockCircleOutlined style={{ marginRight: 6 }} />
                Đăng ký làm thêm
              </span>
            ),
            children: <OtTab />,
          },
        ]}
      />
    </div>
  );
}
