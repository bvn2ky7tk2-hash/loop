import { useState, useEffect } from 'react';
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
  message,
} from 'antd';
import {
  FieldTimeOutlined,
  PlusOutlined,
  CheckOutlined,
  CloseOutlined,
  StopOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';

import { useThemePalette } from '../../hooks/useThemePalette';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { FilterBar } from '../../components/FilterBar';
import { OrgUnitSelect } from '../../components/selects';
import { CenteredModal } from '../../components/ui/CenteredModal';
import { usePermissions } from '../../hooks/usePermissions';
import { otApi, type OvertimeRequest, type FormField } from '../../api/overtime';
import { EmployeeInfoCell } from '../../components/ui/EmployeeInfoCell';
import { employeesApi } from '../../api/employees';
import { DynamicFormFields } from '../processes/components/DynamicFormFields';

const DEFAULT_OT_FIELDS: FormField[] = [
  { name: 'date',     label: 'Ngày làm thêm', type: 'date',     required: true },
  { name: 'fromTime', label: 'Từ giờ',         type: 'time',     required: false },
  { name: 'toTime',   label: 'Đến giờ',        type: 'time',     required: false },
  { name: 'hours',    label: 'Số giờ OT',      type: 'number',   required: true, min: 0.5, max: 12 },
  { name: 'reason',   label: 'Lý do',          type: 'textarea', required: false },
];

const { Text } = Typography;
const { Option } = Select;

const NOW = dayjs();

// ─── Status helpers ──────────────────────────────────────────────────────────

function OtStatusTag({
  status,
  isDark,
}: {
  status: OvertimeRequest['status'];
  isDark: boolean;
}) {
  const map: Record<
    OvertimeRequest['status'],
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OvertimePage() {
  const { textPrimary, textMuted, bgContainer, borderColor, linkColor, isDark } =
    useThemePalette();
  const { hasRole } = usePermissions();
  const qc = useQueryClient();
  const canManage = hasRole('ADMIN') || hasRole('HR') || hasRole('PM');

  // BPM form schema
  const [otFormFields, setOtFormFields] = useState<FormField[]>(DEFAULT_OT_FIELDS);
  useEffect(() => {
    otApi.getFormSchema()
      .then((res) => setOtFormFields(res.fields))
      .catch(() => setOtFormFields(DEFAULT_OT_FIELDS));
  }, []);

  // Filter state
  const [month, setMonth] = useState<number>(NOW.month() + 1);
  const [year, setYear] = useState<number>(NOW.year());
  const [status, setStatus] = useState<string>('');
  const [orgUnitId, setOrgUnitId] = useState<string | undefined>(undefined);

  // Modal state
  const [addOpen, setAddOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addForm] = Form.useForm();
  const [rejectForm] = Form.useForm();

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: listData, isFetching } = useQuery({
    queryKey: ['ot-list', month, year, status, orgUnitId],
    queryFn: () =>
      otApi.list({
        month,
        year,
        status: (status as OvertimeRequest['status']) || undefined,
        orgUnitId,
        limit: 100,
        page: 1,
      }),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees-list'],
    queryFn: () => employeesApi.list(),
    staleTime: 5 * 60 * 1000,
  });

  const records = listData?.data ?? [];

  // ── Stats ──────────────────────────────────────────────────────────────────

  const total = records.length;
  const pending = records.filter((r) => r.status === 'PENDING').length;
  const approved = records.filter((r) => r.status === 'APPROVED').length;
  const rejected = records.filter((r) => r.status === 'REJECTED').length;

  // ── Mutations ──────────────────────────────────────────────────────────────

  const invalidate = () => qc.invalidateQueries({ queryKey: ['ot-list'] });

  const createMut = useMutation({
    mutationFn: otApi.create,
    onSuccess: () => {
      message.success('Tạo đăng ký OT thành công');
      setAddOpen(false);
      addForm.resetFields();
      invalidate();
    },
    onError: () => message.error('Không thể tạo đăng ký OT'),
  });

  const cancelMut = useMutation({
    mutationFn: (id: string) => otApi.cancel(id),
    onSuccess: () => { message.success('Đã hủy đăng ký OT'); invalidate(); },
    onError: () => message.error('Không thể hủy'),
  });

  const approveMut = useMutation({
    mutationFn: (id: string) => otApi.approveDirectly(id),
    onSuccess: () => { message.success('Đã duyệt'); invalidate(); },
    onError: () => message.error('Không thể duyệt'),
  });

  const rejectMut = useMutation({
    mutationFn: ({ id, rejectedReason }: { id: string; rejectedReason: string }) =>
      otApi.reject(id, { rejectedReason }),
    onSuccess: () => {
      message.success('Đã từ chối');
      setRejectOpen(false);
      rejectForm.resetFields();
      setSelectedId(null);
      invalidate();
    },
    onError: () => message.error('Không thể từ chối'),
  });

  // ── Columns ────────────────────────────────────────────────────────────────

  const columns: ColumnsType<OvertimeRequest> = [
    {
      title: 'Nhân viên',
      dataIndex: 'employee',
      key: 'employee',
      render: (_, row) =>
        row.employee ? (
          <EmployeeInfoCell employee={row.employee} />
        ) : (
          <Text style={{ color: textMuted }}>—</Text>
        ),
    },
    {
      title: 'Ngày OT',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      render: (v: string) => (
        <Text style={{ color: textMuted }}>{dayjs(v).format('DD/MM/YYYY')}</Text>
      ),
    },
    {
      title: 'Giờ (từ–đến)',
      key: 'timeRange',
      width: 130,
      render: (_, row) =>
        row.fromTime && row.toTime ? (
          <Text style={{ color: textPrimary }}>
            {row.fromTime} – {row.toTime}
          </Text>
        ) : (
          <Text style={{ color: textMuted }}>—</Text>
        ),
    },
    {
      title: 'Số giờ',
      dataIndex: 'hours',
      key: 'hours',
      width: 90,
      render: (v: number) => (
        <Text style={{ color: linkColor, fontWeight: 600 }}>{v}h</Text>
      ),
    },
    {
      title: 'Lý do',
      dataIndex: 'reason',
      key: 'reason',
      render: (v?: string | null) =>
        v ? (
          <Tooltip title={v}>
            <Text
              style={{ color: textPrimary, maxWidth: 200, display: 'inline-block' }}
              ellipsis
            >
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
      render: (v: OvertimeRequest['status']) => <OtStatusTag status={v} isDark={isDark} />,
    },
    {
      title: 'BPM',
      dataIndex: 'processInstanceId',
      key: 'bpm',
      width: 130,
      render: (v?: string | null) =>
        v ? (
          <Badge
            color="#3B82F6"
            text={
              <Text style={{ color: linkColor, fontSize: 12 }}>
                <LinkOutlined style={{ marginRight: 4 }} />
                Đang qua BPM
              </Text>
            }
          />
        ) : (
          <Text style={{ color: textMuted }}>—</Text>
        ),
    },
    {
      title: 'Hành động',
      key: 'actions',
      width: 160,
      render: (_, row) => (
        <Space size={4}>
          {canManage && row.status === 'PENDING' && (
            <>
              <Tooltip title="Duyệt">
                <Button
                  size="small"
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={() => approveMut.mutate(row.id)}
                  loading={approveMut.isPending}
                  disabled={approveMut.isPending}
                />
              </Tooltip>
              <Tooltip title="Từ chối">
                <Button
                  size="small"
                  danger
                  icon={<CloseOutlined />}
                  onClick={() => {
                    setSelectedId(row.id);
                    setRejectOpen(true);
                  }}
                />
              </Tooltip>
            </>
          )}
          {row.status === 'PENDING' && (
            <Tooltip title="Hủy đăng ký">
              <Button
                size="small"
                icon={<StopOutlined />}
                onClick={() => cancelMut.mutate(row.id)}
                loading={cancelMut.isPending}
                disabled={cancelMut.isPending}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: `Tháng ${i + 1}`,
  }));

  const yearOptions = [2024, 2025, 2026].map((y) => ({ value: y, label: `${y}` }));

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Đăng ký OT"
        icon={<FieldTimeOutlined />}
        iconColor="#F97316"
        actions={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setAddOpen(true)}
          >
            Thêm đăng ký OT
          </Button>
        }
      />

      {/* Stat Cards */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}>
          <StatCard
            label="Tổng đăng ký"
            value={total}
            color="#6366F1"
            icon={<FieldTimeOutlined />}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            label="Chờ duyệt"
            value={pending}
            color="#F59E0B"
            icon={<FieldTimeOutlined />}
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
        <Select
          value={month}
          onChange={setMonth}
          style={{ width: 130 }}
          options={monthOptions}
        />
        <Select
          value={year}
          onChange={setYear}
          style={{ width: 100 }}
          options={yearOptions}
        />
        <Select
          value={status}
          onChange={setStatus}
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
        {canManage && (
          <OrgUnitSelect
            placeholder="Phòng ban"
            style={{ minWidth: 180 }}
            value={orgUnitId}
            onChange={setOrgUnitId}
            allowClear
          />
        )}
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
          dataSource={records}
          loading={isFetching}
          pagination={{ pageSize: 20, showSizeChanger: false }}
          size="middle"
        />
      </div>

      {/* Modal: Thêm đăng ký OT */}
      <CenteredModal
        title="Thêm đăng ký OT"
        open={addOpen}
        onClose={() => { setAddOpen(false); addForm.resetFields(); }}
        footer={
          <Space>
            <Button onClick={() => { setAddOpen(false); addForm.resetFields(); }}>Hủy</Button>
            <Button type="primary" loading={createMut.isPending} disabled={createMut.isPending} onClick={() => addForm.submit()}>
              Tạo đăng ký
            </Button>
          </Space>
        }
      >
        <Form
          form={addForm}
          layout="vertical"
          onFinish={(values) => {
            createMut.mutate({
              employeeId: values.employeeId,
              date:      values.date?.format?.('YYYY-MM-DD') ?? values.date,
              fromTime:  values.fromTime?.format?.('HH:mm') ?? values.fromTime,
              toTime:    values.toTime?.format?.('HH:mm') ?? values.toTime,
              hours:     values.hours,
              reason:    values.reason || undefined,
            });
          }}
        >
          <Form.Item
            name="employeeId"
            label="Nhân viên"
            rules={[{ required: true, message: 'Vui lòng chọn nhân viên' }]}
          >
            <Select
              showSearch
              placeholder="Chọn nhân viên"
              filterOption={(input, opt) =>
                (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())
              }
              options={employees.map((e) => ({
                value: e.id,
                label: `${e.fullName} (${e.code})`,
              }))}
            />
          </Form.Item>

          <DynamicFormFields fields={otFormFields} />
        </Form>
      </CenteredModal>

      {/* Modal: Từ chối */}
      <CenteredModal
        title="Từ chối đăng ký OT"
        open={rejectOpen}
        onClose={() => { setRejectOpen(false); rejectForm.resetFields(); setSelectedId(null); }}
        footer={
          <Space>
            <Button onClick={() => { setRejectOpen(false); rejectForm.resetFields(); setSelectedId(null); }}>Hủy</Button>
            <Button type="primary" danger loading={rejectMut.isPending} disabled={rejectMut.isPending} onClick={() => rejectForm.submit()}>
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
            rules={[{ required: true, message: 'Vui lòng nhập lý do' }]}
          >
            <Input.TextArea rows={3} placeholder="Nhập lý do từ chối..." maxLength={500} showCount />
          </Form.Item>
        </Form>
      </CenteredModal>
    </div>
  );
}
