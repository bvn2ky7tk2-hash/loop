import { useState } from 'react';
import {
  Button,
  Table,
  Tag,
  Switch,
  Typography,
  Row,
  Col,
  Form,
  Input,
  Select,
  InputNumber,
  Radio,
  Space,
  Tooltip,
  App,
} from 'antd';
import {
  MailOutlined,
  PlusOutlined,
  SendOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { useThemePalette } from '../../hooks/useThemePalette';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { FilterBar } from '../../components/FilterBar';
import { CenteredModal } from '../../components/ui/CenteredModal';
import { confirmDelete } from '../../components/ui/confirmDelete';
import { scheduledReportsApi, type ScheduledReport } from '../../api/scheduled-reports';

const { Text } = Typography;

const TEMPLATE_OPTIONS = [
  { value: 'payroll-summary', label: 'Tóm tắt lương' },
  { value: 'headcount', label: 'Headcount (Nhân sự)' },
  { value: 'okr-progress', label: 'OKR Progress' },
  { value: 'leave-summary', label: 'Tổng hợp nghỉ phép' },
  { value: 'expense-report', label: 'Báo cáo chi phí' },
];

const TEMPLATE_LABELS: Record<string, string> = Object.fromEntries(
  TEMPLATE_OPTIONS.map((o) => [o.value, o.label]),
);

const FREQUENCY_OPTIONS = [
  { value: 'WEEKLY', label: 'Hàng tuần' },
  { value: 'MONTHLY', label: 'Hàng tháng' },
  { value: 'QUARTERLY', label: 'Hàng quý' },
];

const DAY_OF_WEEK_OPTIONS = [
  { value: 1, label: 'Thứ 2' },
  { value: 2, label: 'Thứ 3' },
  { value: 3, label: 'Thứ 4' },
  { value: 4, label: 'Thứ 5' },
  { value: 5, label: 'Thứ 6' },
  { value: 6, label: 'Thứ 7' },
  { value: 0, label: 'Chủ nhật' },
];

export default function ScheduledReportsPage() {
  const { textPrimary, textMuted, bgCard, borderColor, isDark } = useThemePalette();
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [form] = Form.useForm();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<ScheduledReport | null>(null);
  const [search, setSearch] = useState('');
  const [frequencyWatch, setFrequencyWatch] = useState<string>('WEEKLY');

  const { data, isLoading } = useQuery({
    queryKey: ['scheduled-reports'],
    queryFn: () => scheduledReportsApi.list(1, 100),
  });

  const createMutation = useMutation({
    mutationFn: scheduledReportsApi.create,
    onSuccess: () => {
      message.success('Đã tạo báo cáo định kỳ');
      qc.invalidateQueries({ queryKey: ['scheduled-reports'] });
      setModalOpen(false);
      form.resetFields();
    },
    onError: () => message.error('Tạo thất bại'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ScheduledReport> }) =>
      scheduledReportsApi.update(id, data),
    onSuccess: () => {
      message.success('Đã cập nhật');
      qc.invalidateQueries({ queryKey: ['scheduled-reports'] });
      setModalOpen(false);
      form.resetFields();
      setEditingReport(null);
    },
    onError: () => message.error('Cập nhật thất bại'),
  });

  const deleteMutation = useMutation({
    mutationFn: scheduledReportsApi.delete,
    onSuccess: () => {
      message.success('Đã xoá');
      qc.invalidateQueries({ queryKey: ['scheduled-reports'] });
    },
    onError: () => message.error('Xoá thất bại'),
  });

  const sendNowMutation = useMutation({
    mutationFn: scheduledReportsApi.sendNow,
    onSuccess: () => message.success('Đã gửi report thành công!'),
    onError: () => message.error('Gửi thất bại'),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      scheduledReportsApi.update(id, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['scheduled-reports'] }),
  });

  const allReports = data?.data ?? [];
  const filtered = allReports.filter(
    (r) =>
      !search ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.template.toLowerCase().includes(search.toLowerCase()),
  );

  const totalCount = allReports.length;
  const activeCount = allReports.filter((r) => r.isActive).length;

  function openCreate() {
    setEditingReport(null);
    form.resetFields();
    form.setFieldsValue({ frequency: 'WEEKLY', hour: 8, format: 'EXCEL', isActive: true });
    setFrequencyWatch('WEEKLY');
    setModalOpen(true);
  }

  function openEdit(report: ScheduledReport) {
    setEditingReport(report);
    form.setFieldsValue({
      name: report.name,
      template: report.template,
      recipients: report.recipients,
      frequency: report.frequency,
      dayOfWeek: report.dayOfWeek,
      dayOfMonth: report.dayOfMonth,
      hour: report.hour,
      format: report.format,
      isActive: report.isActive,
    });
    setFrequencyWatch(report.frequency);
    setModalOpen(true);
  }

  function handleSubmit() {
    form.validateFields().then((values) => {
      // Clean up day fields based on frequency
      const payload: Partial<ScheduledReport> = {
        ...values,
        dayOfWeek: values.frequency === 'WEEKLY' ? values.dayOfWeek : null,
        dayOfMonth: values.frequency === 'MONTHLY' || values.frequency === 'QUARTERLY' ? values.dayOfMonth : null,
      };
      if (editingReport) {
        updateMutation.mutate({ id: editingReport.id, data: payload });
      } else {
        createMutation.mutate(payload);
      }
    });
  }

  const columns = [
    {
      title: 'Tên báo cáo',
      dataIndex: 'name',
      key: 'name',
      render: (v: string) => <Text style={{ color: textPrimary, fontWeight: 500 }}>{v}</Text>,
    },
    {
      title: 'Template',
      dataIndex: 'template',
      key: 'template',
      render: (v: string) => (
        <Tag
          style={
            isDark
              ? { background: 'rgba(96,165,250,0.15)', color: '#93C5FD', borderColor: 'rgba(96,165,250,0.3)' }
              : {}
          }
          color={isDark ? undefined : 'blue'}
        >
          {TEMPLATE_LABELS[v] ?? v}
        </Tag>
      ),
    },
    {
      title: 'Tần suất',
      dataIndex: 'frequency',
      key: 'frequency',
      render: (v: string) => {
        const label = FREQUENCY_OPTIONS.find((o) => o.value === v)?.label ?? v;
        return <Text style={{ color: textMuted }}>{label}</Text>;
      },
    },
    {
      title: 'Recipients',
      dataIndex: 'recipients',
      key: 'recipients',
      render: (v: string[]) => (
        <Tooltip title={v.join(', ')}>
          <Text style={{ color: textMuted }}>{v.length} người nhận</Text>
        </Tooltip>
      ),
    },
    {
      title: 'Format',
      dataIndex: 'format',
      key: 'format',
      render: (v: string) => (
        <Tag
          style={
            isDark
              ? { background: 'rgba(52,211,153,0.15)', color: '#6EE7B7', borderColor: 'rgba(52,211,153,0.3)' }
              : {}
          }
          color={isDark ? undefined : 'green'}
        >
          {v}
        </Tag>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (v: boolean, record: ScheduledReport) => (
        <Switch
          size="small"
          checked={v}
          onChange={(checked) => toggleActiveMutation.mutate({ id: record.id, isActive: checked })}
        />
      ),
    },
    {
      title: 'Gửi cuối',
      dataIndex: 'lastSentAt',
      key: 'lastSentAt',
      render: (v?: string | null) =>
        v ? (
          <Text style={{ color: textMuted }}>{dayjs(v).format('DD/MM/YYYY HH:mm')}</Text>
        ) : (
          <Text style={{ color: textMuted }}>—</Text>
        ),
    },
    {
      title: 'Đã gửi',
      dataIndex: 'sentCount',
      key: 'sentCount',
      render: (v: number) => <Text style={{ color: textMuted }}>{v} lần</Text>,
    },
    {
      title: 'Hành động',
      key: 'actions',
      render: (_: unknown, record: ScheduledReport) => (
        <Space size={4}>
          <Tooltip title="Gửi ngay">
            <Button
              size="small"
              icon={<SendOutlined />}
              loading={sendNowMutation.isPending}
              disabled={sendNowMutation.isPending}
              onClick={() => sendNowMutation.mutate(record.id)}
            />
          </Tooltip>
          <Tooltip title="Sửa">
            <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          </Tooltip>
          <Tooltip title="Xoá">
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() =>
                confirmDelete({
                  itemName: record.name,
                  onConfirm: () => deleteMutation.mutateAsync(record.id),
                })
              }
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Báo cáo định kỳ"
        icon={<MailOutlined />}
        iconColor="#6366F1"
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Thêm báo cáo
          </Button>
        }
      />

      {/* Stat Cards */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}>
          <StatCard label="Tổng báo cáo" value={totalCount} color="#6366F1" icon={<MailOutlined />} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard label="Đang bật" value={activeCount} color="#10B981" icon={<MailOutlined />} />
        </Col>
      </Row>

      {/* Weekly Digest Info */}
      <div
        style={{
          marginBottom: 20,
          padding: '14px 18px',
          background: bgCard,
          border: `1px solid ${borderColor}`,
          borderLeft: '4px solid #6366F1',
          borderRadius: 8,
        }}
      >
        <Text style={{ color: textPrimary, fontWeight: 600, display: 'block', marginBottom: 4 }}>
          📬 Weekly Digest — Tự động
        </Text>
        <Text style={{ color: textMuted, fontSize: 13 }}>
          Hệ thống tự động gửi email tóm tắt tuần cá nhân hóa theo role vào mỗi <strong>thứ 2 lúc 8h sáng</strong>.
          Nội dung tùy chỉnh theo từng vai trò (ADMIN / PM / LEADERSHIP / MEMBER). Không cần cấu hình thêm.
        </Text>
      </div>

      {/* Filter */}
      <FilterBar>
        <Input
          prefix={<MailOutlined />}
          placeholder="Tìm kiếm theo tên, template..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 280 }}
          allowClear
        />
      </FilterBar>

      {/* Table */}
      <Table
        rowKey="id"
        columns={columns}
        dataSource={filtered}
        loading={isLoading}
        pagination={{ pageSize: 20, showSizeChanger: true, pageSizeOptions: [20, 50, 100, 200], showTotal: (t) => `${t} bản ghi` }}
        scroll={{ x: 900 }}
      />

      {/* Create / Edit Modal */}
      <CenteredModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingReport(null);
          form.resetFields();
        }}
        title={editingReport ? 'Chỉnh sửa báo cáo' : 'Thêm báo cáo mới'}
        width={600}
        footer={
          <Space>
            <Button
              onClick={() => {
                setModalOpen(false);
                setEditingReport(null);
                form.resetFields();
              }}
            >
              Huỷ
            </Button>
            <Button
              type="primary"
              loading={createMutation.isPending || updateMutation.isPending}
              disabled={createMutation.isPending || updateMutation.isPending}
              onClick={handleSubmit}
            >
              {editingReport ? 'Lưu thay đổi' : 'Tạo báo cáo'}
            </Button>
          </Space>
        }
      >
        <Form
          form={form}
          layout="vertical"
          onValuesChange={(changed) => {
            if (changed.frequency) setFrequencyWatch(changed.frequency as string);
          }}
        >
          <Form.Item
            name="name"
            label="Tên báo cáo"
            rules={[{ required: true, message: 'Nhập tên báo cáo' }]}
          >
            <Input placeholder="VD: Báo cáo lương tháng — Kế toán" />
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="template"
                label="Template"
                rules={[{ required: true, message: 'Chọn template' }]}
              >
                <Select placeholder="Chọn loại báo cáo" options={TEMPLATE_OPTIONS} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="format"
                label="Định dạng"
                rules={[{ required: true }]}
              >
                <Radio.Group>
                  <Radio value="EXCEL">Excel (.xlsx)</Radio>
                  <Radio value="PDF">PDF (qua email)</Radio>
                </Radio.Group>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="recipients"
            label="Người nhận (email)"
            rules={[
              { required: true, message: 'Thêm ít nhất 1 email' },
              {
                validator: (_, value: string[]) => {
                  const invalid = (value ?? []).filter(
                    (e) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e),
                  );
                  return invalid.length === 0
                    ? Promise.resolve()
                    : Promise.reject(`Email không hợp lệ: ${invalid.join(', ')}`);
                },
              },
            ]}
          >
            <Select
              mode="tags"
              placeholder="Nhập email rồi nhấn Enter"
              tokenSeparators={[',']}
              open={false}
            />
          </Form.Item>

          <Row gutter={12}>
            <Col span={8}>
              <Form.Item
                name="frequency"
                label="Tần suất"
                rules={[{ required: true }]}
              >
                <Select options={FREQUENCY_OPTIONS} />
              </Form.Item>
            </Col>
            {frequencyWatch === 'WEEKLY' && (
              <Col span={8}>
                <Form.Item name="dayOfWeek" label="Ngày trong tuần">
                  <Select placeholder="Chọn thứ" options={DAY_OF_WEEK_OPTIONS} allowClear />
                </Form.Item>
              </Col>
            )}
            {(frequencyWatch === 'MONTHLY' || frequencyWatch === 'QUARTERLY') && (
              <Col span={8}>
                <Form.Item name="dayOfMonth" label="Ngày trong tháng (1-28)">
                  <InputNumber min={1} max={28} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            )}
            <Col span={8}>
              <Form.Item name="hour" label="Giờ gửi (0-23)">
                <InputNumber min={0} max={23} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </CenteredModal>
    </div>
  );
}
