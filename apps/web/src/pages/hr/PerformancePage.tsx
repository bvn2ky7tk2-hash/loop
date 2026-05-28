import { useState } from 'react';
import {
  Table, Button, Space, Typography, Tag, Modal, Form,
  Input, InputNumber, Select, Rate, Drawer, Descriptions, message,
} from 'antd';
import { PlusOutlined, TrophyOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useQuery } from '@tanstack/react-query';
import { useThemeStore } from '../../store/theme.store';
import {
  useGetPerformanceReviews, useCreatePerformanceReview, useUpdatePerformanceReview,
  type PerformanceReview, type ReviewStatus,
} from '../../api/hr-ext';
import { employeesApi } from '../../api/employees';

const { Title, Text } = Typography;
const { TextArea } = Input;

const PERIODS = ['2026-H1', '2026-H2', '2025-H1', '2025-H2', '2026-Q1', '2026-Q2', '2026-Q3', '2026-Q4'];

const STATUS_META: Record<ReviewStatus, { label: string; color: string }> = {
  DRAFT:     { label: 'Nháp',       color: 'default' },
  SUBMITTED: { label: 'Đã nộp',    color: 'blue'    },
  APPROVED:  { label: 'Đã duyệt',  color: 'green'   },
};

export default function PerformancePage() {
  const { mode, preset } = useThemeStore();
  const isDark = mode === 'dark';

  const bgContainer  = isDark ? '#1E293B' : '#ffffff';
  const bgCard       = isDark ? '#2D3F56' : '#FAFAFA';
  const textPrimary  = isDark ? '#F1F5F9' : '#0F172A';
  const textSecondary = isDark ? 'rgba(255,255,255,0.5)' : '#475569';
  const borderColor  = isDark ? '#334155' : '#E2E8F0';

  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [periodFilter, setPeriodFilter] = useState<string | undefined>(undefined);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailReview, setDetailReview] = useState<PerformanceReview | null>(null);
  const [form] = Form.useForm();

  const { data: reviewsData, isLoading } = useGetPerformanceReviews({ limit: 50, status: statusFilter, period: periodFilter });
  const { data: employees = [] } = useQuery({ queryKey: ['employees'], queryFn: employeesApi.list });
  const createReview = useCreatePerformanceReview();
  const updateReview = useUpdatePerformanceReview();

  const reviews = reviewsData?.data ?? [];
  const empOptions = employees.map((e: { id: string; code: string; fullName: string }) => ({
    value: e.id, label: `${e.code} — ${e.fullName}`,
  }));

  const handleCreate = async () => {
    const values = await form.validateFields();
    await createReview.mutateAsync(values);
    message.success('Tạo đánh giá thành công');
    setCreateOpen(false);
    form.resetFields();
  };

  const handleSubmit = async (id: string) => {
    await updateReview.mutateAsync({ id, status: 'SUBMITTED' });
    message.success('Đã nộp đánh giá');
    setDetailReview(null);
  };

  const handleApprove = async (id: string) => {
    await updateReview.mutateAsync({ id, status: 'APPROVED' });
    message.success('Đã duyệt đánh giá');
    setDetailReview(null);
  };

  const columns: ColumnsType<PerformanceReview> = [
    {
      title: 'Nhân viên',
      render: (_, r) => <span style={{ color: textPrimary, fontWeight: 500 }}>{r.employee?.fullName ?? r.employeeId}</span>,
    },
    {
      title: 'Người đánh giá',
      render: (_, r) => <span style={{ color: textSecondary }}>{r.reviewer?.fullName ?? r.reviewerId}</span>,
    },
    {
      title: 'Kỳ đánh giá', dataIndex: 'period', width: 110,
      render: v => <Tag color="blue">{v}</Tag>,
    },
    {
      title: 'Điểm', dataIndex: 'score', width: 100, align: 'center' as const,
      render: v => v ? (
        <span style={{ color: preset.primary, fontWeight: 700, fontSize: 16 }}>{Number(v).toFixed(1)}</span>
      ) : '—',
    },
    {
      title: 'Trạng thái', dataIndex: 'status', width: 120,
      render: (v: ReviewStatus) => <Tag color={STATUS_META[v].color}>{STATUS_META[v].label}</Tag>,
    },
    {
      title: 'Hành động', width: 130,
      render: (_, r) => (
        <Button size="small" onClick={() => setDetailReview(r)}>Chi tiết</Button>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space>
          <TrophyOutlined style={{ fontSize: 22, color: preset.primary }} />
          <Title level={4} style={{ margin: 0, color: textPrimary }}>Đánh giá hiệu suất</Title>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
          Tạo đánh giá
        </Button>
      </div>

      {/* Filters */}
      <div style={{ background: bgCard, borderRadius: 8, padding: '12px 16px', marginBottom: 16, border: `1px solid ${borderColor}` }}>
        <Space wrap>
          <Select
            placeholder="Kỳ đánh giá" style={{ width: 140 }} allowClear
            options={PERIODS.map(p => ({ value: p, label: p }))}
            onChange={setPeriodFilter}
          />
          <Select
            placeholder="Trạng thái" style={{ width: 150 }} allowClear
            options={Object.entries(STATUS_META).map(([k, v]) => ({ value: k, label: v.label }))}
            onChange={setStatusFilter}
          />
        </Space>
      </div>

      <div style={{ background: bgContainer, borderRadius: 8, border: `1px solid ${borderColor}`, overflow: 'hidden' }}>
        <Table<PerformanceReview>
          rowKey="id" dataSource={reviews} columns={columns}
          loading={isLoading} pagination={{ pageSize: 20 }} size="middle"
        />
      </div>

      {/* Create Modal */}
      <Modal
        title={<span style={{ color: textPrimary }}>Tạo đánh giá hiệu suất</span>}
        open={createOpen}
        onOk={handleCreate}
        onCancel={() => { setCreateOpen(false); form.resetFields(); }}
        okText="Tạo" confirmLoading={createReview.isPending}
        styles={{ content: { background: bgContainer }, header: { background: bgContainer } }}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="employeeId" label={<span style={{ color: textPrimary }}>Nhân viên được đánh giá</span>} rules={[{ required: true }]}>
            <Select options={empOptions} showSearch filterOption={(i, o) => (o?.label ?? '').toLowerCase().includes(i.toLowerCase())} placeholder="Chọn nhân viên" />
          </Form.Item>
          <Form.Item name="reviewerId" label={<span style={{ color: textPrimary }}>Người đánh giá</span>} rules={[{ required: true }]}>
            <Select options={empOptions} showSearch filterOption={(i, o) => (o?.label ?? '').toLowerCase().includes(i.toLowerCase())} placeholder="Chọn người đánh giá" />
          </Form.Item>
          <Form.Item name="period" label={<span style={{ color: textPrimary }}>Kỳ đánh giá</span>} rules={[{ required: true }]}>
            <Select options={PERIODS.map(p => ({ value: p, label: p }))} placeholder="VD: 2026-H1" />
          </Form.Item>
          <Form.Item name="score" label={<span style={{ color: textPrimary }}>Điểm (1–5)</span>}>
            <InputNumber min={1} max={5} step={0.5} style={{ width: '100%' }} placeholder="Nhập điểm từ 1 đến 5" />
          </Form.Item>
          <Form.Item name="strengths" label={<span style={{ color: textPrimary }}>Điểm mạnh</span>}>
            <TextArea rows={2} />
          </Form.Item>
          <Form.Item name="improvements" label={<span style={{ color: textPrimary }}>Cần cải thiện</span>}>
            <TextArea rows={2} />
          </Form.Item>
          <Form.Item name="goals" label={<span style={{ color: textPrimary }}>Mục tiêu tiếp theo</span>}>
            <TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Detail Drawer */}
      <Drawer
        open={!!detailReview}
        onClose={() => setDetailReview(null)}
        title={<span style={{ color: textPrimary }}>Chi tiết đánh giá — {detailReview?.period}</span>}
        width={520}
        styles={{ body: { background: bgContainer }, header: { background: bgContainer } }}
        extra={
          <Space>
            {detailReview?.status === 'DRAFT' && (
              <Button type="primary" onClick={() => handleSubmit(detailReview.id)}>Nộp đánh giá</Button>
            )}
            {detailReview?.status === 'SUBMITTED' && (
              <Button type="primary" onClick={() => handleApprove(detailReview.id)}>Phê duyệt</Button>
            )}
          </Space>
        }
      >
        {detailReview && (
          <Descriptions column={1} bordered size="small" labelStyle={{ color: textSecondary }} contentStyle={{ color: textPrimary }}>
            <Descriptions.Item label="Nhân viên">{detailReview.employee?.fullName}</Descriptions.Item>
            <Descriptions.Item label="Người đánh giá">{detailReview.reviewer?.fullName}</Descriptions.Item>
            <Descriptions.Item label="Kỳ đánh giá"><Tag color="blue">{detailReview.period}</Tag></Descriptions.Item>
            <Descriptions.Item label="Điểm">
              {detailReview.score ? (
                <span style={{ color: preset.primary, fontWeight: 700, fontSize: 18 }}>{Number(detailReview.score).toFixed(1)} / 5</span>
              ) : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              <Tag color={STATUS_META[detailReview.status].color}>{STATUS_META[detailReview.status].label}</Tag>
            </Descriptions.Item>
            {detailReview.strengths && (
              <Descriptions.Item label="Điểm mạnh"><Text style={{ color: textPrimary }}>{detailReview.strengths}</Text></Descriptions.Item>
            )}
            {detailReview.improvements && (
              <Descriptions.Item label="Cần cải thiện"><Text style={{ color: textPrimary }}>{detailReview.improvements}</Text></Descriptions.Item>
            )}
            {detailReview.goals && (
              <Descriptions.Item label="Mục tiêu"><Text style={{ color: textPrimary }}>{detailReview.goals}</Text></Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Drawer>
    </div>
  );
}
