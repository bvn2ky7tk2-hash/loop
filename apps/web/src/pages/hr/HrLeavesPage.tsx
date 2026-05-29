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
  DatePicker,
  Space,
  Typography,
  Tooltip,
  Modal,
  message,
} from 'antd';
import {
  CalendarOutlined,
  CheckOutlined,
  CloseOutlined,
  SearchOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';

import { useThemePalette } from '../../hooks/useThemePalette';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { FilterBar } from '../../components/FilterBar';
import { CenteredModal } from '../../components/ui/CenteredModal';
import { usePermissions } from '../../hooks/usePermissions';
import { leavesApi } from '../../api/leaves';
import type { LeaveRequest, LeaveType, LeaveStatus } from '../../api/leaves';

const { Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

// ─── Status Tag ────────────────────────────────────────────────────────────────

function LeaveStatusTag({
  status,
  isDark,
}: {
  status: LeaveStatus;
  isDark: boolean;
}) {
  const map: Record<
    LeaveStatus,
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

  const cfg = map[status] ?? map.PENDING;

  return (
    <Tag
      color={isDark ? undefined : cfg.light}
      style={
        isDark
          ? {
              background: cfg.darkBg,
              color: cfg.darkColor,
              borderColor: cfg.darkBorder,
            }
          : {}
      }
    >
      {cfg.label}
    </Tag>
  );
}

// ─── LeaveType Tag ─────────────────────────────────────────────────────────────

function LeaveTypeTag({
  leaveType,
  isDark,
}: {
  leaveType?: LeaveType | null;
  isDark: boolean;
}) {
  if (!leaveType) return <Text style={{ color: 'rgba(148,163,184,0.8)' }}>—</Text>;

  const color = leaveType.color || '#6366F1';

  return (
    <Tag
      style={
        isDark
          ? {
              background: `${color}26`,
              color: color,
              borderColor: `${color}4D`,
            }
          : {
              background: `${color}1A`,
              color: color,
              borderColor: `${color}4D`,
            }
      }
    >
      {leaveType.name}
    </Tag>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HrLeavesPage() {
  const { textPrimary, textMuted, bgContainer, borderColor, linkColor, isDark } =
    useThemePalette();
  const { hasRole } = usePermissions();
  const qc = useQueryClient();
  const canManage = hasRole('ADMIN') || hasRole('HR');

  // Filter state
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterTypeId, setFilterTypeId] = useState<string>('');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [page, setPage] = useState(1);

  // Modal: từ chối
  const [rejectOpen, setRejectOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectForm] = Form.useForm();

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: listData, isFetching } = useQuery({
    queryKey: ['hr-leaves-all', page, filterStatus, filterTypeId, dateRange],
    queryFn: () =>
      leavesApi.list({
        page,
        pageSize: 20,
        status: (filterStatus as LeaveStatus) || undefined,
        leaveTypeId: filterTypeId || undefined,
        startDate: dateRange?.[0]?.format('YYYY-MM-DD') || undefined,
        endDate: dateRange?.[1]?.format('YYYY-MM-DD') || undefined,
      }),
  });

  const { data: leaveTypes = [] } = useQuery({
    queryKey: ['leave-types'],
    queryFn: () => leavesApi.getTypes(),
    staleTime: 10 * 60 * 1000,
  });

  const records = listData?.data ?? [];
  const total = listData?.total ?? 0;

  // Tính stats từ data hiện tại (trang đang hiển thị)
  const pending = records.filter((r) => r.status === 'PENDING').length;
  const approved = records.filter((r) => r.status === 'APPROVED').length;
  const rejected = records.filter((r) => r.status === 'REJECTED').length;

  // ── Lọc theo tên phía client ────────────────────────────────────────────────
  const filtered = search.trim()
    ? records.filter((r) =>
        r.employee?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
        r.employee?.code?.toLowerCase().includes(search.toLowerCase())
      )
    : records;

  // ── Mutations ──────────────────────────────────────────────────────────────

  const invalidate = () => qc.invalidateQueries({ queryKey: ['hr-leaves-all'] });

  const approveMut = useMutation({
    mutationFn: (id: string) =>
      leavesApi.approve(id, { status: 'APPROVED' }),
    onSuccess: () => {
      message.success('Đã duyệt đơn nghỉ phép');
      invalidate();
    },
    onError: () => message.error('Không thể duyệt đơn'),
  });

  const rejectMut = useMutation({
    mutationFn: ({ id, rejectedReason }: { id: string; rejectedReason: string }) =>
      leavesApi.approve(id, { status: 'REJECTED', rejectedReason }),
    onSuccess: () => {
      message.success('Đã từ chối đơn');
      setRejectOpen(false);
      rejectForm.resetFields();
      setSelectedId(null);
      invalidate();
    },
    onError: () => message.error('Không thể từ chối đơn'),
  });

  const handleApprove = (record: LeaveRequest) => {
    Modal.confirm({
      title: 'Xác nhận duyệt đơn',
      content: (
        <span>
          Duyệt đơn nghỉ phép của{' '}
          <strong>{record.employee?.fullName ?? 'nhân viên'}</strong>?
        </span>
      ),
      okText: 'Duyệt',
      cancelText: 'Hủy',
      okButtonProps: { type: 'primary' },
      onOk: () => approveMut.mutateAsync(record.id),
    });
  };

  const handleReject = (record: LeaveRequest) => {
    setSelectedId(record.id);
    setRejectOpen(true);
  };

  // ── Columns ────────────────────────────────────────────────────────────────

  const columns: ColumnsType<LeaveRequest> = [
    {
      title: 'Nhân viên',
      key: 'employee',
      render: (_, row) =>
        row.employee ? (
          <Space direction="vertical" size={0}>
            <Text style={{ color: textPrimary, fontWeight: 500 }}>
              {row.employee.fullName}
            </Text>
            <Text style={{ color: textMuted, fontSize: 12 }}>
              {row.employee.code}
            </Text>
          </Space>
        ) : (
          <Text style={{ color: textMuted }}>—</Text>
        ),
    },
    {
      title: 'Loại nghỉ',
      dataIndex: 'leaveType',
      key: 'leaveType',
      width: 150,
      render: (lt?: LeaveType | null) => (
        <LeaveTypeTag leaveType={lt} isDark={isDark} />
      ),
    },
    {
      title: 'Ngày bắt đầu',
      dataIndex: 'startDate',
      key: 'startDate',
      width: 130,
      render: (v: string) => (
        <Text style={{ color: textMuted }}>{dayjs(v).format('DD/MM/YYYY')}</Text>
      ),
    },
    {
      title: 'Ngày kết thúc',
      dataIndex: 'endDate',
      key: 'endDate',
      width: 130,
      render: (v: string) => (
        <Text style={{ color: textMuted }}>{dayjs(v).format('DD/MM/YYYY')}</Text>
      ),
    },
    {
      title: 'Số ngày',
      dataIndex: 'days',
      key: 'days',
      width: 90,
      render: (v: number) => (
        <Text style={{ color: linkColor, fontWeight: 600 }}>{v}</Text>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (v: LeaveStatus) => <LeaveStatusTag status={v} isDark={isDark} />,
    },
    {
      title: 'BPM',
      dataIndex: 'processInstanceId',
      key: 'bpm',
      width: 110,
      render: (v?: string | null) =>
        v ? (
          <Tag
            style={
              isDark
                ? {
                    background: 'rgba(59,130,246,0.15)',
                    color: '#93C5FD',
                    borderColor: 'rgba(59,130,246,0.3)',
                  }
                : {}
            }
            color={isDark ? undefined : 'blue'}
            icon={<LinkOutlined />}
          >
            BPM
          </Tag>
        ) : (
          <Text style={{ color: textMuted }}>—</Text>
        ),
    },
    {
      title: 'Hành động',
      key: 'actions',
      width: 160,
      render: (_, row) => {
        if (!canManage) return null;
        if (row.status !== 'PENDING') return null;

        return (
          <Space size={4}>
            <Tooltip title="Duyệt đơn">
              <Button
                size="small"
                type="primary"
                icon={<CheckOutlined />}
                loading={approveMut.isPending && selectedId === row.id}
                onClick={() => handleApprove(row)}
              >
                Duyệt
              </Button>
            </Tooltip>
            <Tooltip title="Từ chối">
              <Button
                size="small"
                danger
                icon={<CloseOutlined />}
                onClick={() => handleReject(row)}
              >
                Từ chối
              </Button>
            </Tooltip>
          </Space>
        );
      },
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Quản lý đơn nghỉ phép"
        icon={<CalendarOutlined />}
        iconColor="#10B981"
      />

      {/* Stat Cards */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}>
          <StatCard
            label="Tổng đơn"
            value={total}
            color="#6366F1"
            icon={<CalendarOutlined />}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            label="Chờ duyệt"
            value={pending}
            color="#F59E0B"
            icon={<CalendarOutlined />}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            label="Đã duyệt"
            value={approved}
            color="#10B981"
            icon={<CheckOutlined />}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            label="Từ chối"
            value={rejected}
            color="#EF4444"
            icon={<CloseOutlined />}
          />
        </Col>
      </Row>

      {/* Filter Bar */}
      <FilterBar>
        <Input
          prefix={<SearchOutlined />}
          placeholder="Tìm tên nhân viên..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          style={{ width: 220 }}
        />
        <Select
          value={filterTypeId}
          onChange={setFilterTypeId}
          style={{ width: 180 }}
          placeholder="Loại nghỉ phép"
          allowClear
        >
          <Option value="">Tất cả loại</Option>
          {leaveTypes.map((lt) => (
            <Option key={lt.id} value={lt.id}>
              {lt.name}
            </Option>
          ))}
        </Select>
        <Select
          value={filterStatus}
          onChange={(v) => { setFilterStatus(v); setPage(1); }}
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
        <RangePicker
          format="DD/MM/YYYY"
          placeholder={['Từ ngày', 'Đến ngày']}
          onChange={(vals) =>
            setDateRange(vals as [dayjs.Dayjs | null, dayjs.Dayjs | null] | null)
          }
          allowClear
        />
      </FilterBar>

      {/* Table */}
      <div
        style={{
          background: bgContainer,
          borderRadius: 8,
          border: `1px solid ${borderColor}`,
          overflow: 'hidden',
        }}
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={filtered}
          loading={isFetching}
          size="middle"
          pagination={{
            current: page,
            pageSize: 20,
            total,
            showSizeChanger: false,
            showTotal: (t) => (
              <Text style={{ color: textMuted }}>Tổng {t} đơn</Text>
            ),
            onChange: (p) => setPage(p),
          }}
        />
      </div>

      {/* Modal: Từ chối đơn */}
      <CenteredModal
        title="Từ chối đơn nghỉ phép"
        open={rejectOpen}
        onClose={() => {
          setRejectOpen(false);
          rejectForm.resetFields();
          setSelectedId(null);
        }}
        footer={
          <Space>
            <Button
              onClick={() => {
                setRejectOpen(false);
                rejectForm.resetFields();
                setSelectedId(null);
              }}
            >
              Hủy
            </Button>
            <Button
              type="primary"
              danger
              loading={rejectMut.isPending}
              onClick={() => rejectForm.submit()}
            >
              Xác nhận từ chối
            </Button>
          </Space>
        }
      >
        <Form
          form={rejectForm}
          layout="vertical"
          onFinish={(values) => {
            if (!selectedId) return;
            rejectMut.mutate({ id: selectedId, rejectedReason: values.rejectedReason });
          }}
        >
          <Form.Item
            name="rejectedReason"
            label="Lý do từ chối"
            rules={[{ required: true, message: 'Vui lòng nhập lý do từ chối' }]}
          >
            <Input.TextArea
              rows={3}
              placeholder="Nhập lý do từ chối đơn nghỉ phép..."
              maxLength={500}
              showCount
            />
          </Form.Item>
        </Form>
      </CenteredModal>
    </div>
  );
}
