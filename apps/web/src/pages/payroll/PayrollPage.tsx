import { useState } from 'react';
import {
  Table, Button, Modal, Form, Input, DatePicker, Space, Tag, Typography,
  App, Popconfirm, Statistic, Row, Col, InputNumber, Divider, Empty,
} from 'antd';
import { CenteredModal } from '../../components/ui/CenteredModal';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined, ThunderboltOutlined, CheckOutlined,
  DollarOutlined, EditOutlined, TeamOutlined, CalendarOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { payrollApi, type PayrollPeriod, type PayrollRecord } from '../../api/payroll';
import { useThemeStore } from '../../store/theme.store';
import { formatCurrency } from '../../utils/format';

const { Text, Title } = Typography;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  DRAFT:      'Bản nháp',
  PROCESSING: 'Đang xử lý',
  APPROVED:   'Đã duyệt',
  PAID:       'Đã trả lương',
};
const STATUS_COLOR: Record<string, string> = {
  DRAFT:      'default',
  PROCESSING: 'orange',
  APPROVED:   'blue',
  PAID:       'success',
};

// ─── EditRecordDrawer ─────────────────────────────────────────────────────────

function EditRecordDrawer({
  record,
  onClose,
  isDark,
}: {
  record: PayrollRecord | null;
  onClose: () => void;
  isDark: boolean;
}) {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [form] = Form.useForm();

  const updateMut = useMutation({
    mutationFn: (values: { bonus?: number; deductions?: number; note?: string }) =>
      payrollApi.updateRecord(record!.id, values),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll-records', record?.periodId] });
      message.success('Đã cập nhật bản ghi lương');
      onClose();
    },
    onError: (e: Error) => message.error(e.message ?? 'Lỗi cập nhật'),
  });

  const border = isDark ? '#334155' : '#E2E8F0';
  const cardBg = isDark ? '#1E293B' : '#FAFAFA';

  if (!record) return null;

  const name = record.employee?.user?.name ?? '—';

  return (
    <CenteredModal
      open={!!record}
      onClose={onClose}
      title={`Chỉnh sửa lương — ${name}`}
      width={440}
      extra={
        <Button type="primary" loading={updateMut.isPending}
          onClick={() => form.validateFields().then(v => updateMut.mutate(v))}>
          Lưu
        </Button>
      }
    >
      {/* Thông tin cố định */}
      <div style={{ padding: '12px 16px', background: cardBg, borderRadius: 8, border: `1px solid ${border}`, marginBottom: 20 }}>
        <Row gutter={16}>
          <Col span={12}>
            <Statistic title="Ngày công" value={record.workDays} suffix="ngày" valueStyle={{ fontSize: 18 }} />
          </Col>
          <Col span={12}>
            <Statistic title="Nghỉ phép" value={record.leaveDays} suffix="ngày" valueStyle={{ fontSize: 18 }} />
          </Col>
        </Row>
        <Divider style={{ margin: '10px 0' }} />
        <Row gutter={16}>
          <Col span={12}>
            <Statistic title="OT" value={record.overtimeHours} suffix="giờ" valueStyle={{ fontSize: 18 }} />
          </Col>
          <Col span={12}>
            <Statistic title="Lương cơ bản" value={record.baseSalary}
              formatter={v => formatCurrency(Number(v))} valueStyle={{ fontSize: 16, color: preset.primary }} />
          </Col>
        </Row>
      </div>

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          bonus:      record.bonus,
          deductions: record.deductions,
          note:       record.note ?? '',
        }}
      >
        <Form.Item name="bonus" label="Thưởng (đ)">
          <InputNumber
            style={{ width: '100%' }} min={0} step={100000}
            formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={v => Number(v?.replace(/,/g, '') ?? 0)}
          />
        </Form.Item>
        <Form.Item name="deductions" label="Khấu trừ (đ)">
          <InputNumber
            style={{ width: '100%' }} min={0} step={100000}
            formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={v => Number(v?.replace(/,/g, '') ?? 0)}
          />
        </Form.Item>
        <Form.Item name="note" label="Ghi chú">
          <Input.TextArea rows={2} placeholder="Ghi chú thêm..." />
        </Form.Item>
      </Form>
    </CenteredModal>
  );
}

// ─── PeriodDetailDrawer ────────────────────────────────────────────────────────

function PeriodDetailDrawer({
  period,
  onClose,
  isDark,
}: {
  period: PayrollPeriod | null;
  onClose: () => void;
  isDark: boolean;
}) {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [editRecord, setEditRecord] = useState<PayrollRecord | null>(null);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['payroll-records', period?.id, page],
    queryFn: () => payrollApi.getPeriodRecords(period!.id, page, 50),
    enabled: !!period,
  });

  const generateMut = useMutation({
    mutationFn: () => payrollApi.generatePayroll(period!.id),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['payroll-records', period?.id] });
      qc.invalidateQueries({ queryKey: ['payroll-periods'] });
      message.success(`Đã tính lương cho ${res.generated} nhân viên`);
    },
    onError: (e: Error) => message.error(e.message ?? 'Lỗi tính lương'),
  });

  const approveMut = useMutation({
    mutationFn: () => payrollApi.approvePeriod(period!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll-periods'] });
      message.success('Đã phê duyệt kỳ lương');
      onClose();
    },
    onError: (e: Error) => message.error(e.message ?? 'Lỗi phê duyệt'),
  });

  const markPaidMut = useMutation({
    mutationFn: () => payrollApi.markPaid(period!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll-periods'] });
      message.success('Đã đánh dấu đã trả lương');
      onClose();
    },
    onError: (e: Error) => message.error(e.message ?? 'Lỗi'),
  });

  const border = isDark ? '#334155' : '#E2E8F0';
  const subBg  = isDark ? '#1A2744' : '#F8FAFC';

  const records = data?.data ?? [];
  const totalNet = records.reduce((s, r) => s + Number(r.netSalary), 0);

  const canGenerate = period?.status === 'DRAFT';
  const canApprove  = period?.status === 'PROCESSING';
  const canPay      = period?.status === 'APPROVED';

  const cols: ColumnsType<PayrollRecord> = [
    {
      title: 'Nhân viên',
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{r.employee?.user?.name ?? '—'}</div>
          <div style={{ fontSize: 11, color: isDark ? 'rgba(255,255,255,0.4)' : '#94A3B8' }}>{r.employee?.user?.email}</div>
        </div>
      ),
    },
    {
      title: 'Công / Nghỉ / OT',
      width: 130,
      align: 'center',
      render: (_, r) => (
        <div style={{ fontSize: 12, lineHeight: 1.8, textAlign: 'center' }}>
          <div><Tag color="blue" style={{ fontSize: 11 }}>{r.workDays}c</Tag></div>
          {r.leaveDays > 0 && <div><Tag color="orange" style={{ fontSize: 11 }}>{r.leaveDays}n</Tag></div>}
          {r.overtimeHours > 0 && <div><Tag color="purple" style={{ fontSize: 11 }}>{r.overtimeHours}h OT</Tag></div>}
        </div>
      ),
    },
    {
      title: 'Lương cơ bản',
      dataIndex: 'baseSalary',
      width: 140,
      align: 'right',
      render: (v: number) => <Text style={{ fontSize: 13 }}>{formatCurrency(Number(v))}</Text>,
    },
    {
      title: 'Thưởng',
      dataIndex: 'bonus',
      width: 110,
      align: 'right',
      render: (v: number) => Number(v) > 0
        ? <Text style={{ color: '#059669', fontSize: 13 }}>+{formatCurrency(Number(v))}</Text>
        : <Text type="secondary">—</Text>,
    },
    {
      title: 'Khấu trừ',
      dataIndex: 'deductions',
      width: 110,
      align: 'right',
      render: (v: number) => Number(v) > 0
        ? <Text style={{ color: '#DC2626', fontSize: 13 }}>-{formatCurrency(Number(v))}</Text>
        : <Text type="secondary">—</Text>,
    },
    {
      title: 'Thực nhận',
      dataIndex: 'netSalary',
      width: 140,
      align: 'right',
      render: (v: number) => (
        <Text strong style={{ color: preset.primary, fontSize: 14 }}>{formatCurrency(Number(v))}</Text>
      ),
    },
    {
      title: '',
      width: 50,
      render: (_, r) => (
        <Button
          size="small" icon={<EditOutlined />}
          disabled={period?.status === 'PAID'}
          onClick={() => setEditRecord(r)}
        />
      ),
    },
  ];

  return (
    <>
      <CenteredModal
        open={!!period}
        onClose={onClose}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span>{period?.name}</span>
            {period && <Tag color={STATUS_COLOR[period.status]}>{STATUS_LABEL[period.status]}</Tag>}
          </div>
        }
        width={900}
        extra={
          <Space>
            {canGenerate && (
              <Popconfirm
                title="Tính lương cho toàn bộ nhân viên?"
                description="Sẽ tính dựa trên bảng chấm công và đơn giá ngày công hiệu lực."
                onConfirm={() => generateMut.mutate()}
                okText="Tính lương" cancelText="Huỷ"
              >
                <Button type="primary" icon={<ThunderboltOutlined />} loading={generateMut.isPending}>
                  Tính lương
                </Button>
              </Popconfirm>
            )}
            {canApprove && (
              <Popconfirm
                title="Phê duyệt kỳ lương?"
                description="Sau khi duyệt, không thể thay đổi số liệu."
                onConfirm={() => approveMut.mutate()}
                okText="Phê duyệt" cancelText="Huỷ"
              >
                <Button type="primary" icon={<CheckOutlined />} loading={approveMut.isPending}>
                  Phê duyệt
                </Button>
              </Popconfirm>
            )}
            {canPay && (
              <Popconfirm
                title="Đánh dấu đã trả lương?"
                onConfirm={() => markPaidMut.mutate()}
                okText="Xác nhận" cancelText="Huỷ"
              >
                <Button type="primary" icon={<DollarOutlined />} loading={markPaidMut.isPending}
                  style={{ background: '#059669', borderColor: '#059669' }}>
                  Đã trả lương
                </Button>
              </Popconfirm>
            )}
          </Space>
        }
      >
        {/* Tóm tắt */}
        {records.length > 0 && (
          <div style={{
            padding: '12px 16px', background: subBg, borderRadius: 8,
            border: `1px solid ${border}`, marginBottom: 16, display: 'flex', gap: 32, flexWrap: 'wrap',
          }}>
            <Statistic title="Số nhân viên" value={records.length} prefix={<TeamOutlined />} valueStyle={{ fontSize: 20 }} />
            <Statistic title="Tổng chi trả" value={totalNet}
              formatter={v => formatCurrency(Number(v))}
              valueStyle={{ fontSize: 20, color: preset.primary }}
            />
            {period?.processedBy && (
              <Statistic title="Người duyệt" value={period.processedBy.name} valueStyle={{ fontSize: 16 }} />
            )}
          </div>
        )}

        {/* Bảng bản ghi */}
        <Table
          loading={isLoading}
          dataSource={records}
          rowKey="id"
          columns={cols}
          size="small"
          scroll={{ x: 800 }}
          pagination={{
            current: page,
            total: data?.total ?? 0,
            pageSize: 50,
            onChange: setPage,
            showTotal: t => `${t} nhân viên`,
          }}
          locale={{ emptyText: <Empty description="Chưa có dữ liệu. Nhấn 'Tính lương' để tạo bản ghi." /> }}
        />
      </CenteredModal>

      <EditRecordDrawer
        record={editRecord}
        onClose={() => setEditRecord(null)}
        isDark={isDark}
      />
    </>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function PayrollPage() {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const { mode, preset } = useThemeStore();
  const isDark = mode === 'dark';
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriod | null>(null);
  const [form] = Form.useForm();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['payroll-periods', page],
    queryFn: () => payrollApi.listPeriods(page, 20),
  });

  const createMut = useMutation({
    mutationFn: payrollApi.createPeriod,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll-periods'] });
      message.success('Đã tạo kỳ lương');
      setCreateOpen(false);
      form.resetFields();
    },
    onError: (e: Error) => message.error(e.message ?? 'Lỗi tạo kỳ lương'),
  });

  const border = isDark ? '#334155' : '#E2E8F0';

  const cols: ColumnsType<PayrollPeriod> = [
    {
      title: 'Kỳ lương',
      dataIndex: 'name',
      render: (name: string, r) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{name}</div>
          <div style={{ fontSize: 12, color: isDark ? 'rgba(255,255,255,0.4)' : '#64748B' }}>
            <CalendarOutlined style={{ marginRight: 4 }} />
            {dayjs(r.startDate).format('DD/MM/YYYY')} – {dayjs(r.endDate).format('DD/MM/YYYY')}
          </div>
        </div>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 140,
      render: (s: string) => <Tag color={STATUS_COLOR[s]}>{STATUS_LABEL[s]}</Tag>,
    },
    {
      title: 'Nhân viên',
      dataIndex: '_count',
      width: 100,
      align: 'center',
      render: (c: PayrollPeriod['_count']) => (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{c?.records ?? 0}</div>
          <div style={{ fontSize: 11, color: isDark ? 'rgba(255,255,255,0.4)' : '#94A3B8' }}>người</div>
        </div>
      ),
    },
    {
      title: 'Người duyệt',
      dataIndex: 'processedBy',
      render: (p: PayrollPeriod['processedBy']) => p
        ? <Text style={{ fontSize: 13 }}>{p.name}</Text>
        : <Text type="secondary">—</Text>,
    },
    {
      title: 'Ngày duyệt',
      dataIndex: 'processedAt',
      width: 120,
      render: (d?: string) => d
        ? dayjs(d).format('DD/MM/YYYY')
        : <Text type="secondary">—</Text>,
    },
    {
      title: 'Thao tác',
      width: 110,
      render: (_, r) => (
        <Button size="small" onClick={() => setSelectedPeriod(r)}>
          Xem chi tiết
        </Button>
      ),
    },
  ];

  return (
    <App>
      <div style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <Title level={4} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
              <DollarOutlined />
              Payroll
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Quản lý kỳ lương, tính lương tự động từ bảng chấm công và phê duyệt chi trả
            </Text>
          </div>
          <Button icon={<PlusOutlined />} type="primary" onClick={() => setCreateOpen(true)}>
            Tạo kỳ lương
          </Button>
        </div>

        <Divider style={{ margin: '0 0 16px' }} />

        <Table
          loading={isLoading}
          dataSource={data?.data ?? []}
          rowKey="id"
          columns={cols}
          size="small"
          style={{ border: `1px solid ${border}`, borderRadius: 8 }}
          pagination={{
            current: page,
            total: data?.total ?? 0,
            pageSize: 20,
            onChange: setPage,
            showTotal: t => `${t} kỳ lương`,
          }}
          onRow={r => ({ onClick: () => setSelectedPeriod(r), style: { cursor: 'pointer' } })}
        />

        {/* Modal tạo kỳ lương */}
        <Modal
          open={createOpen}
          title="Tạo kỳ lương mới"
          onCancel={() => { setCreateOpen(false); form.resetFields(); }}
          onOk={() => form.validateFields().then(values => createMut.mutate({
            name:      values.name,
            startDate: values.dateRange[0].format('YYYY-MM-DD'),
            endDate:   values.dateRange[1].format('YYYY-MM-DD'),
          }))}
          confirmLoading={createMut.isPending}
          okText="Tạo" cancelText="Huỷ"
        >
          <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
            <Form.Item name="name" label="Tên kỳ lương"
              rules={[{ required: true, message: 'Nhập tên kỳ lương' }]}
              extra="Ví dụ: Lương tháng 5/2026">
              <Input placeholder="Lương tháng 5/2026" />
            </Form.Item>
            <Form.Item name="dateRange" label="Khoảng thời gian"
              rules={[{ required: true, message: 'Chọn thời gian' }]}>
              <DatePicker.RangePicker
                style={{ width: '100%' }}
                format="DD/MM/YYYY"
                placeholder={['Ngày bắt đầu', 'Ngày kết thúc']}
              />
            </Form.Item>
          </Form>
        </Modal>

        {/* Drawer chi tiết kỳ lương */}
        <PeriodDetailDrawer
          period={selectedPeriod}
          onClose={() => setSelectedPeriod(null)}
          isDark={isDark}
        />
      </div>
    </App>
  );
}
