import { useState } from 'react';
import {
  Table, Button, Space, Typography, Tag, Input, Form,
  InputNumber, Tabs, App, Tooltip, Row, Col,
} from 'antd';
import {
  TrophyOutlined, PlusOutlined, EditOutlined, DeleteOutlined,
  CheckOutlined, CloseOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useThemePalette } from '../../hooks/useThemePalette';
import { usePagination } from '../../hooks/usePagination';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { CenteredModal } from '../../components/ui/CenteredModal';
import { confirmDelete } from '../../components/ui/confirmDelete';
import { EmptyState } from '../../components/ui/EmptyState';
import { apiClient } from '../../api/client';

const { Text } = Typography;

// ─── Types ────────────────────────────────────────────────────────────────────

interface PerformanceBonusConfig {
  id: string;
  grade: string;
  scoreFrom: number;
  scoreTo: number;
  coefficient: number;
  isActive: boolean;
}

interface BonusPending {
  id: string;
  employeeId: string;
  employee?: { id: string; fullName: string; code: string };
  period: string;
  score: number;
  bonusAmount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

const GRADE_COLORS: Record<string, { bg: string; text: string; darkBg: string; darkText: string; darkBorder: string }> = {
  S: { bg: '#10B981', text: '#fff', darkBg: 'rgba(52,211,153,0.15)', darkText: '#6EE7B7', darkBorder: 'rgba(52,211,153,0.3)' },
  A: { bg: '#3B82F6', text: '#fff', darkBg: 'rgba(96,165,250,0.15)', darkText: '#93C5FD', darkBorder: 'rgba(96,165,250,0.3)' },
  B: { bg: '#8B5CF6', text: '#fff', darkBg: 'rgba(139,92,246,0.15)', darkText: '#C4B5FD', darkBorder: 'rgba(139,92,246,0.3)' },
  C: { bg: '#F59E0B', text: '#fff', darkBg: 'rgba(245,158,11,0.15)', darkText: '#FCD34D', darkBorder: 'rgba(245,158,11,0.3)' },
  D: { bg: '#EF4444', text: '#fff', darkBg: 'rgba(248,113,113,0.15)', darkText: '#FCA5A5', darkBorder: 'rgba(248,113,113,0.3)' },
};

export default function PerformanceBonusConfigPage() {
  const { isDark, textPrimary, textMuted, bgContainer, borderColor, linkColor } = useThemePalette();
  const { paginationProps: pendingPagination } = usePagination(20);
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<PerformanceBonusConfig | null>(null);
  const [form] = Form.useForm();

  // ── Queries ──
  const { data: configs = [], isLoading: configsLoading, isError: configsError } = useQuery({
    queryKey: ['performance-bonus-configs'],
    queryFn: () =>
      apiClient
        .get<PerformanceBonusConfig[]>('/hr/performance/bonus-configs')
        .then((r) => r.data)
        .catch(() => { throw new Error('API not available'); }),
    retry: false,
  });

  const { data: pendingBonuses = [], isLoading: pendingLoading, isError: pendingError } = useQuery({
    queryKey: ['performance-bonus-pending'],
    queryFn: () =>
      apiClient
        .get<BonusPending[]>('/hr/performance/bonuses', { params: { status: 'PENDING', limit: 50 } })
        .then((r) => r.data)
        .catch(() => [] as BonusPending[]),
    retry: false,
  });

  // ── Mutations ──
  const createMutation = useMutation({
    mutationFn: (data: Partial<PerformanceBonusConfig>) =>
      apiClient.post<PerformanceBonusConfig>('/hr/performance/bonus-configs', data).then((r) => r.data),
    onSuccess: () => {
      message.success('Tạo cấu hình thành công');
      queryClient.invalidateQueries({ queryKey: ['performance-bonus-configs'] });
      closeForm();
    },
    onError: () => message.error('Không thể tạo cấu hình'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PerformanceBonusConfig> }) =>
      apiClient.put<PerformanceBonusConfig>(`/hr/performance/bonus-configs/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      message.success('Cập nhật thành công');
      queryClient.invalidateQueries({ queryKey: ['performance-bonus-configs'] });
      closeForm();
    },
    onError: () => message.error('Không thể cập nhật'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/hr/performance/bonus-configs/${id}`),
    onSuccess: () => {
      message.success('Đã xóa cấu hình');
      queryClient.invalidateQueries({ queryKey: ['performance-bonus-configs'] });
    },
    onError: () => message.error('Không thể xóa'),
  });

  const approveBonusMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient.patch(`/hr/performance/bonuses/${id}/approve`).then((r) => r.data),
    onSuccess: () => {
      message.success('Đã phê duyệt bonus');
      queryClient.invalidateQueries({ queryKey: ['performance-bonus-pending'] });
    },
    onError: () => message.error('Không thể phê duyệt'),
  });

  const rejectBonusMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient.patch(`/hr/performance/bonuses/${id}/reject`).then((r) => r.data),
    onSuccess: () => {
      message.success('Đã từ chối bonus');
      queryClient.invalidateQueries({ queryKey: ['performance-bonus-pending'] });
    },
    onError: () => message.error('Không thể từ chối'),
  });

  // ── Helpers ──
  function closeForm() {
    setFormOpen(false);
    setEditRecord(null);
    form.resetFields();
  }

  function openCreate() {
    setEditRecord(null);
    form.resetFields();
    setFormOpen(true);
  }

  function openEdit(record: PerformanceBonusConfig) {
    setEditRecord(record);
    form.setFieldsValue({
      grade: record.grade,
      scoreFrom: record.scoreFrom,
      scoreTo: record.scoreTo,
      coefficient: record.coefficient,
    });
    setFormOpen(true);
  }

  async function handleSave() {
    const values = await form.validateFields();
    if (editRecord) {
      updateMutation.mutate({ id: editRecord.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  }

  // ── Config Table Columns ──
  const configColumns: ColumnsType<PerformanceBonusConfig> = [
    {
      title: 'Grade',
      dataIndex: 'grade',
      width: 90,
      render: (v: string) => {
        const meta = GRADE_COLORS[v];
        if (!meta) return <Tag>{v}</Tag>;
        return (
          <Tag
            color={isDark ? undefined : meta.bg}
            style={isDark ? { background: meta.darkBg, color: meta.darkText, borderColor: meta.darkBorder } : { background: meta.bg, color: meta.text, border: 'none' }}
          >
            {v}
          </Tag>
        );
      },
    },
    {
      title: 'Score từ',
      dataIndex: 'scoreFrom',
      width: 100,
      render: (v: number) => <Text style={{ color: textPrimary }}>{v}</Text>,
    },
    {
      title: 'Score đến',
      dataIndex: 'scoreTo',
      width: 100,
      render: (v: number) => <Text style={{ color: textPrimary }}>{v}</Text>,
    },
    {
      title: 'Hệ số',
      dataIndex: 'coefficient',
      width: 100,
      render: (v: number) => (
        <Text style={{ color: linkColor, fontWeight: 700 }}>{Number(v).toFixed(2)}×</Text>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      width: 110,
      render: (v: boolean) =>
        v ? (
          <Tag color="success">Đang áp dụng</Tag>
        ) : (
          <Tag color="default">Không áp dụng</Tag>
        ),
    },
    {
      title: 'Thao tác',
      width: 100,
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Sửa">
            <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          </Tooltip>
          <Tooltip title="Xóa">
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() =>
                confirmDelete({
                  itemName: `Grade ${record.grade}`,
                  onConfirm: () => deleteMutation.mutate(record.id),
                })
              }
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // ── Pending Bonus Columns ──
  const pendingColumns: ColumnsType<BonusPending> = [
    {
      title: 'Nhân viên',
      key: 'employee',
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text style={{ color: textPrimary, fontWeight: 600 }}>{r.employee?.fullName ?? r.employeeId}</Text>
          <Text style={{ color: textMuted, fontSize: 12 }}>{r.employee?.code}</Text>
        </Space>
      ),
    },
    {
      title: 'Kỳ',
      dataIndex: 'period',
      width: 110,
      render: (v: string) => <Tag style={isDark ? { background: 'rgba(96,165,250,0.15)', color: '#93C5FD', borderColor: 'rgba(96,165,250,0.3)' } : {}} color={isDark ? undefined : 'blue'}>{v}</Tag>,
    },
    {
      title: 'Điểm',
      dataIndex: 'score',
      width: 90,
      render: (v: number) => (
        <Text style={{ color: linkColor, fontWeight: 700 }}>{Number(v).toFixed(1)}</Text>
      ),
    },
    {
      title: 'Bonus amount',
      dataIndex: 'bonusAmount',
      width: 140,
      render: (v: number) => (
        <Text style={{ color: linkColor, fontWeight: 600 }}>
          {v.toLocaleString('vi-VN')} ₫
        </Text>
      ),
    },
    {
      title: 'Thao tác',
      width: 130,
      render: (_, r) => (
        <Space size={4}>
          <Tooltip title="Phê duyệt">
            <Button
              size="small"
              type="primary"
              icon={<CheckOutlined />}
              loading={approveBonusMutation.isPending}
              onClick={() => approveBonusMutation.mutate(r.id)}
            />
          </Tooltip>
          <Tooltip title="Từ chối">
            <Button
              size="small"
              danger
              icon={<CloseOutlined />}
              loading={rejectBonusMutation.isPending}
              onClick={() => rejectBonusMutation.mutate(r.id)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const activeConfigs = configs.filter((c) => c.isActive).length;

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Cấu hình Bonus Hiệu suất"
        icon={<TrophyOutlined />}
        iconColor="#8B5CF6"
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Thêm cấu hình
          </Button>
        }
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}>
          <StatCard
            label="Tổng cấu hình"
            value={configs.length}
            color="#8B5CF6"
            icon={<TrophyOutlined />}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            label="Đang áp dụng"
            value={activeConfigs}
            color="#10B981"
            icon={<CheckOutlined />}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            label="Chờ duyệt bonus"
            value={pendingBonuses.length}
            color="#F59E0B"
            icon={<TrophyOutlined />}
          />
        </Col>
      </Row>

      <Tabs
        defaultActiveKey="configs"
        items={[
          {
            key: 'configs',
            label: 'Bảng cấu hình',
            children: (
              <div
                style={{
                  background: bgContainer,
                  borderRadius: 12,
                  border: `1px solid ${borderColor}`,
                  overflow: 'hidden',
                }}
              >
                {configsError ? (
                  <EmptyState
                    style={{ padding: 48 }}
                    title="API đang phát triển — endpoint /hr/performance/bonus-configs chưa có"
                  />
                ) : (
                  <Table<PerformanceBonusConfig>
                    rowKey="id"
                    columns={configColumns}
                    dataSource={configs}
                    loading={configsLoading}
                    pagination={false}
                    locale={{ emptyText: <Text style={{ color: textMuted }}>Chưa có cấu hình bonus</Text> }}
                  />
                )}
              </div>
            ),
          },
          {
            key: 'pending',
            label: `Bonus chờ duyệt${pendingBonuses.length ? ` (${pendingBonuses.length})` : ''}`,
            children: (
              <div
                style={{
                  background: bgContainer,
                  borderRadius: 12,
                  border: `1px solid ${borderColor}`,
                  overflow: 'hidden',
                }}
              >
                {pendingError ? (
                  <EmptyState
                    style={{ padding: 48 }}
                    title="API đang phát triển — endpoint /hr/performance/bonuses chưa có"
                  />
                ) : (
                  <Table<BonusPending>
                    rowKey="id"
                    columns={pendingColumns}
                    dataSource={pendingBonuses}
                    loading={pendingLoading}
                    pagination={pendingPagination(pendingBonuses.length, 'bonus')}
                    locale={{ emptyText: <Text style={{ color: textMuted }}>Không có bonus chờ duyệt</Text> }}
                  />
                )}
              </div>
            ),
          },
        ]}
      />

      {/* Modal tạo/sửa cấu hình */}
      <CenteredModal
        open={formOpen}
        onClose={closeForm}
        title={editRecord ? 'Sửa cấu hình bonus' : 'Thêm cấu hình bonus'}
        width={480}
        footer={
          <Space>
            <Button onClick={closeForm}>Huỷ</Button>
            <Button
              type="primary"
              loading={createMutation.isPending || updateMutation.isPending}
              disabled={createMutation.isPending || updateMutation.isPending}
              onClick={handleSave}
            >
              {editRecord ? 'Lưu thay đổi' : 'Tạo cấu hình'}
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" requiredMark="optional">
          <Form.Item
            name="grade"
            label={<Text style={{ color: textPrimary }}>Grade</Text>}
            rules={[{ required: true, message: 'Vui lòng nhập Grade (VD: S, A, B, C, D)' }]}
          >
            <Input placeholder="VD: S, A, B, C, D" maxLength={10} />
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="scoreFrom"
                label={<Text style={{ color: textPrimary }}>Score từ</Text>}
                rules={[
                  { required: true, message: 'Bắt buộc' },
                  { type: 'number', min: 0, message: 'Phải >= 0' },
                ]}
              >
                <InputNumber style={{ width: '100%' }} min={0} max={100} placeholder="VD: 4.5" step={0.1} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="scoreTo"
                label={<Text style={{ color: textPrimary }}>Score đến</Text>}
                dependencies={['scoreFrom']}
                rules={[
                  { required: true, message: 'Bắt buộc' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || value > getFieldValue('scoreFrom')) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('Phải lớn hơn Score từ'));
                    },
                  }),
                ]}
              >
                <InputNumber style={{ width: '100%' }} min={0} max={100} placeholder="VD: 5.0" step={0.1} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="coefficient"
            label={<Text style={{ color: textPrimary }}>Hệ số (coefficient)</Text>}
            rules={[
              { required: true, message: 'Bắt buộc' },
              { type: 'number', min: 0.01, message: 'Phải > 0' },
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0.01}
              step={0.1}
              placeholder="VD: 1.5 (tức 150% lương)"
            />
          </Form.Item>
        </Form>
      </CenteredModal>
    </div>
  );
}
