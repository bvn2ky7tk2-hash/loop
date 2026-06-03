import { useState, useEffect } from 'react';
import {
  Row, Col, Table, Tag, Button, Space, Typography, Tooltip,
  Badge, Modal, Form, message,
} from 'antd';
import {
  FieldTimeOutlined, PlusOutlined, StopOutlined, LinkOutlined, CloseOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';

import { useThemePalette } from '../../hooks/useThemePalette';
import { usePagination } from '../../hooks/usePagination';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { FilterBar } from '../../components/FilterBar';
import { CenteredModal } from '../../components/ui/CenteredModal';
import { confirmDelete } from '../../components/ui/confirmDelete';
import { otApi, type OvertimeRequest, type FormField } from '../../api/overtime';
import { employeesApi } from '../../api/employees';
import { DynamicFormFields } from '../processes/components/DynamicFormFields';

const { Text } = Typography;

const DEFAULT_OT_FIELDS: FormField[] = [
  { name: 'date',     label: 'Ngày làm thêm', type: 'date',     required: true },
  { name: 'fromTime', label: 'Từ giờ',         type: 'time',     required: false },
  { name: 'toTime',   label: 'Đến giờ',        type: 'time',     required: false },
  { name: 'hours',    label: 'Số giờ OT',      type: 'number',   required: true, min: 0.5, max: 12 },
  { name: 'reason',   label: 'Lý do',          type: 'textarea', required: false },
];

// ─── Status Tag ───────────────────────────────────────────────────────────────

function OtStatusTag({ status, isDark }: { status: OvertimeRequest['status']; isDark: boolean }) {
  const map: Record<OvertimeRequest['status'], { label: string; light: string; darkBg: string; darkColor: string; darkBorder: string }> = {
    PENDING:   { label: 'Chờ duyệt', light: 'gold',    darkBg: 'rgba(251,191,36,0.15)',  darkColor: '#FCD34D', darkBorder: 'rgba(251,191,36,0.3)' },
    APPROVED:  { label: 'Đã duyệt',  light: 'green',   darkBg: 'rgba(52,211,153,0.15)',  darkColor: '#6EE7B7', darkBorder: 'rgba(52,211,153,0.3)' },
    REJECTED:  { label: 'Từ chối',   light: 'red',     darkBg: 'rgba(248,113,113,0.15)', darkColor: '#FCA5A5', darkBorder: 'rgba(248,113,113,0.3)' },
    CANCELLED: { label: 'Đã hủy',    light: 'default', darkBg: 'rgba(148,163,184,0.15)', darkColor: '#94A3B8', darkBorder: 'rgba(148,163,184,0.3)' },
  };
  const cfg = map[status] ?? map.PENDING;
  return (
    <Tag
      color={isDark ? undefined : cfg.light}
      style={isDark ? { background: cfg.darkBg, color: cfg.darkColor, borderColor: cfg.darkBorder } : {}}
    >
      {cfg.label}
    </Tag>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MyOvertimePage() {
  const { textPrimary, textMuted, bgContainer, borderColor, linkColor, isDark } = useThemePalette();
  const { paginationProps } = usePagination(20);
  const qc = useQueryClient();

  const now = dayjs();
  const [month, setMonth] = useState(now.month() + 1);
  const [year, setYear]   = useState(now.year());

  // Modal: đăng ký OT
  const [addOpen, setAddOpen]         = useState(false);
  const [addForm]                     = Form.useForm();
  const [otFormFields, setOtFormFields] = useState<FormField[]>(DEFAULT_OT_FIELDS);

  // Modal: từ chối lý do (khi hủy không cần lý do, nhưng reject xem lý do)
  const [rejectReasonOpen, setRejectReasonOpen] = useState(false);
  const [selectedRecord, setSelectedRecord]     = useState<OvertimeRequest | null>(null);

  // Fetch BPM form schema (fallback về default nếu API chưa có)
  useEffect(() => {
    otApi.getFormSchema()
      .then((res) => setOtFormFields(res.fields))
      .catch(() => setOtFormFields(DEFAULT_OT_FIELDS));
  }, []);

  // Lấy thông tin Employee của user hiện tại
  const { data: myEmployee } = useQuery({
    queryKey: ['employee-me'],
    queryFn: employeesApi.me,
    retry: false,
  });

  // Danh sách OT của nhân viên này
  const { data: listData, isFetching } = useQuery({
    queryKey: ['my-ot-list', myEmployee?.id, month, year],
    queryFn: () => otApi.list({ employeeId: myEmployee!.id, month, year, page: 1, limit: 50 }),
    enabled: !!myEmployee?.id,
  });

  const records = listData?.data ?? [];
  const pending   = records.filter((r) => r.status === 'PENDING').length;
  const totalHours = records
    .filter((r) => r.status === 'APPROVED')
    .reduce((s, r) => s + Number(r.hours), 0);

  // ── Mutations ────────────────────────────────────────────────────────────────

  const invalidate = () => qc.invalidateQueries({ queryKey: ['my-ot-list'] });

  const createMut = useMutation({
    mutationFn: otApi.create,
    onSuccess: () => {
      message.success('Đăng ký OT đã được gửi, chờ manager duyệt');
      setAddOpen(false);
      addForm.resetFields();
      invalidate();
    },
    onError: () => message.error('Không thể gửi đăng ký OT'),
  });

  const cancelMut = useMutation({
    mutationFn: (id: string) => otApi.cancel(id),
    onSuccess: () => { message.success('Đã hủy đăng ký OT'); invalidate(); },
    onError: () => message.error('Không thể hủy'),
  });

  const handleSubmit = async () => {
    try {
      const values = await addForm.validateFields();
      if (!myEmployee?.id) { message.error('Không xác định được nhân viên'); return; }
      createMut.mutate({
        employeeId: myEmployee.id,
        date:      values.date?.format?.('YYYY-MM-DD') ?? values.date,
        fromTime:  values.fromTime?.format?.('HH:mm') ?? values.fromTime,
        toTime:    values.toTime?.format?.('HH:mm') ?? values.toTime,
        hours:     values.hours,
        reason:    values.reason || undefined,
      });
    } catch {
      // validation failed
    }
  };

  // ── Columns ──────────────────────────────────────────────────────────────────

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `Tháng ${i + 1}` }));
  const yearOptions  = [2024, 2025, 2026].map((y) => ({ value: y, label: `${y}` }));

  const columns: ColumnsType<OvertimeRequest> = [
    {
      title: 'Ngày OT',
      dataIndex: 'date',
      key: 'date',
      width: 120,
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
      width: 90,
      render: (v: number) => <Text style={{ color: linkColor, fontWeight: 600 }}>{v}h</Text>,
    },
    {
      title: 'Lý do',
      dataIndex: 'reason',
      key: 'reason',
      render: (v?: string | null) =>
        v
          ? <Tooltip title={v}><Text style={{ color: textPrimary, maxWidth: 200, display: 'inline-block' }} ellipsis>{v}</Text></Tooltip>
          : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (v: OvertimeRequest['status']) => <OtStatusTag status={v} isDark={isDark} />,
    },
    {
      title: 'Quy trình',
      dataIndex: 'processInstanceId',
      key: 'bpm',
      width: 140,
      render: (v?: string | null) =>
        v
          ? <Badge color="#3B82F6" text={<Text style={{ color: linkColor, fontSize: 12 }}><LinkOutlined style={{ marginRight: 4 }} />Đang qua BPM</Text>} />
          : <Text style={{ color: textMuted }}>Trực tiếp</Text>,
    },
    {
      title: 'Lý do từ chối',
      dataIndex: 'rejectedReason',
      key: 'rejectedReason',
      render: (v: string | null | undefined, row) =>
        row.status === 'REJECTED' && v
          ? (
              <Tooltip title={v}>
                <Text style={{ color: '#EF4444', maxWidth: 160, display: 'inline-block' }} ellipsis>
                  <CloseOutlined style={{ marginRight: 4 }} />{v}
                </Text>
              </Tooltip>
            )
          : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      title: 'Hành động',
      key: 'actions',
      width: 100,
      render: (_, row) =>
        row.status === 'PENDING' ? (
          <Tooltip title="Hủy đăng ký">
            <Button
              size="small"
              danger
              icon={<StopOutlined />}
              onClick={() =>
                confirmDelete({
                  title: 'Hủy đăng ký OT?',
                  content: `Ngày ${dayjs(row.date).format('DD/MM/YYYY')} — ${row.hours}h`,
                  okText: 'Hủy đăng ký',
                  cancelText: 'Giữ lại',
                  onConfirm: () => cancelMut.mutate(row.id),
                })
              }
              loading={cancelMut.isPending}
              disabled={cancelMut.isPending}
            />
          </Tooltip>
        ) : (
          <Text style={{ color: textMuted }}>—</Text>
        ),
    },
  ];

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Đăng ký làm thêm giờ (OT)"
        icon={<FieldTimeOutlined />}
        iconColor="#F97316"
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>
            Đăng ký OT
          </Button>
        }
      />

      {/* Stat Cards */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={8}>
          <StatCard label="Tổng đăng ký" value={records.length} color="#6366F1" icon={<FieldTimeOutlined />} />
        </Col>
        <Col xs={12} sm={8}>
          <StatCard label="Chờ duyệt" value={pending} color="#F59E0B" icon={<FieldTimeOutlined />} />
        </Col>
        <Col xs={12} sm={8}>
          <StatCard label="Giờ OT đã duyệt" value={`${totalHours}h`} color="#10B981" icon={<FieldTimeOutlined />} />
        </Col>
      </Row>

      {/* Filter */}
      <FilterBar>
        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          style={{ padding: '4px 8px', borderRadius: 6, border: `1px solid ${borderColor}`, background: bgContainer, color: textPrimary }}
        >
          {monthOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          style={{ padding: '4px 8px', borderRadius: 6, border: `1px solid ${borderColor}`, background: bgContainer, color: textPrimary }}
        >
          {yearOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </FilterBar>

      {/* Table */}
      <div style={{ background: bgContainer, borderRadius: 8, border: `1px solid ${borderColor}`, overflow: 'hidden' }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={records}
          loading={isFetching}
          pagination={paginationProps(records.length, 'đơn OT')}
          size="middle"
        />
      </div>

      {/* Modal: Đăng ký OT — form từ BPM */}
      <CenteredModal
        title="Đăng ký làm thêm giờ"
        open={addOpen}
        onClose={() => { setAddOpen(false); addForm.resetFields(); }}
        footer={
          <Space>
            <Button onClick={() => { setAddOpen(false); addForm.resetFields(); }}>Hủy</Button>
            <Button type="primary" loading={createMut.isPending} disabled={createMut.isPending} onClick={handleSubmit}>
              Gửi đăng ký
            </Button>
          </Space>
        }
      >
        <div style={{ marginBottom: 12, padding: '8px 12px', background: isDark ? 'rgba(99,102,241,0.1)' : '#EEF2FF', borderRadius: 6, border: `1px solid ${isDark ? 'rgba(99,102,241,0.3)' : '#C7D2FE'}` }}>
          <Text style={{ color: isDark ? '#A5B4FC' : '#4338CA', fontSize: 12 }}>
            Đơn sẽ được gửi qua quy trình duyệt BPM đến manager của bạn.
          </Text>
        </div>
        <Form form={addForm} layout="vertical">
          <DynamicFormFields fields={otFormFields} />
        </Form>
      </CenteredModal>

      {/* Modal: xem lý do từ chối */}
      <Modal
        title="Lý do từ chối"
        open={rejectReasonOpen}
        onCancel={() => { setRejectReasonOpen(false); setSelectedRecord(null); }}
        footer={<Button onClick={() => { setRejectReasonOpen(false); setSelectedRecord(null); }}>Đóng</Button>}
      >
        <Text style={{ color: textPrimary }}>{selectedRecord?.rejectedReason ?? '—'}</Text>
      </Modal>
    </div>
  );
}
