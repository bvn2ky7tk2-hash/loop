import { useState } from 'react';
import {
  Table, Button, Space, Tag, Typography, Select, Form,
  Input, Modal, Row, Col, Divider, Statistic, InputNumber, message,
  Tooltip,
} from 'antd';
import { CenteredModal } from '../../components/ui/CenteredModal';
import {
  PlusOutlined, DeleteOutlined, CheckOutlined, CloseOutlined,
  WalletOutlined, PlusCircleOutlined, BranchesOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  expensesApi,
  type Expense, type ExpenseStatus, type ExpenseCategory, type ExpenseItem,
} from '../../api/expenses';
import { projectsApi } from '../../api/projects';
import { useAuthStore } from '../../store/auth.store';
import { useThemeStore } from '../../store/theme.store';
import { formatCurrency } from '../../utils/format';

const { Text, Title } = Typography;
const { TextArea } = Input;

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<ExpenseStatus, string> = {
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
  PAID: 'Đã thanh toán',
};

const STATUS_COLOR: Record<ExpenseStatus, string> = {
  PENDING: 'orange',
  APPROVED: 'green',
  REJECTED: 'red',
  PAID: 'blue',
};

const CATEGORY_META: Record<ExpenseCategory, { label: string; icon: string; color: string }> = {
  TRAVEL:    { label: 'Di chuyển',   icon: '✈️',  color: '#0EA5E9' },
  MEALS:     { label: 'Ăn uống',    icon: '🍱',  color: '#F59E0B' },
  EQUIPMENT: { label: 'Thiết bị',   icon: '💻',  color: '#8B5CF6' },
  SOFTWARE:  { label: 'Phần mềm',   icon: '🛠️',  color: '#14B8A6' },
  TRAINING:  { label: 'Đào tạo',    icon: '📚',  color: '#10B981' },
  OTHER:     { label: 'Khác',       icon: '📦',  color: '#94A3B8' },
};

const CATEGORY_OPTIONS = Object.entries(CATEGORY_META).map(([k, v]) => ({
  value: k as ExpenseCategory,
  label: `${v.icon} ${v.label}`,
}));

const PRIVILEGED_ROLES = ['ADMIN', 'LEADERSHIP', 'PM', 'HR'];

function canApprove(role?: string): boolean {
  return PRIVILEGED_ROLES.includes(role ?? '');
}

// ─── Expense Drawer ───────────────────────────────────────────────────────────

interface ItemRow {
  key: number;
  description: string;
  amount: number;
}

function ExpenseDrawer({
  open,
  onClose,
  projects,
  isDark,
  bgContainer,
  bgCard,
  borderColor,
  textPrimary,
  textSecondary,
}: {
  open: boolean;
  onClose: () => void;
  projects: { id: string; name: string; code: string }[];
  isDark: boolean;
  bgContainer: string;
  bgCard: string;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
}) {
  const [form] = Form.useForm();
  const [items, setItems] = useState<ItemRow[]>([{ key: 0, description: '', amount: 0 }]);
  const qc = useQueryClient();

  const total = items.reduce((s, i) => s + (Number(i.amount) || 0), 0);

  const { mutate: create, isPending } = useMutation({
    mutationFn: expensesApi.create,
    onSuccess: () => {
      message.success('Tạo expense thành công');
      qc.invalidateQueries({ queryKey: ['expenses'] });
      form.resetFields();
      setItems([{ key: 0, description: '', amount: 0 }]);
      onClose();
    },
    onError: () => message.error('Tạo expense thất bại'),
  });

  function addItem() {
    setItems((prev) => [...prev, { key: Date.now(), description: '', amount: 0 }]);
  }

  function removeItem(key: number) {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }

  function updateItem(key: number, field: keyof ItemRow, value: string | number) {
    setItems((prev) =>
      prev.map((i) => (i.key === key ? { ...i, [field]: value } : i))
    );
  }

  function onFinish(values: Record<string, unknown>) {
    const validItems: ExpenseItem[] = items
      .filter((i) => i.description.trim())
      .map(({ description, amount }) => ({ description, amount: Number(amount) }));

    if (!validItems.length) {
      message.warning('Cần ít nhất 1 mục chi phí có mô tả');
      return;
    }

    create({
      title: values.title as string,
      category: values.category as ExpenseCategory,
      projectId: values.projectId as string | undefined,
      note: values.note as string | undefined,
      items: validItems,
    });
  }

  return (
    <CenteredModal
      title="Tạo yêu cầu chi phí"
      open={open}
      onClose={onClose}
      width={520}
      styles={{
        body: { background: bgContainer },
        header: {
          background: bgContainer,
          borderBottom: `1px solid ${borderColor}`,
          color: textPrimary,
        },
      }}
      footer={
        <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
          <Button onClick={onClose}>Huỷ</Button>
          <Button type="primary" loading={isPending} onClick={() => form.submit()}>
            Gửi yêu cầu
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item name="title" label="Tiêu đề" rules={[{ required: true, message: 'Nhập tiêu đề' }]}>
          <Input placeholder="Tên khoản chi phí..." />
        </Form.Item>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="category" label="Danh mục" rules={[{ required: true, message: 'Chọn danh mục' }]}>
              <Select placeholder="Chọn danh mục" options={CATEGORY_OPTIONS} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="projectId" label="Dự án (tuỳ chọn)">
              <Select
                allowClear
                showSearch
                placeholder="Chọn dự án"
                optionFilterProp="label"
                options={projects.map((p) => ({
                  value: p.id,
                  label: `${p.code} — ${p.name}`,
                }))}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="note" label="Ghi chú">
          <TextArea rows={2} placeholder="Mô tả thêm (không bắt buộc)" />
        </Form.Item>

        <Divider style={{ borderColor, margin: '12px 0' }} />

        <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text strong style={{ color: textPrimary }}>Chi tiết khoản mục</Text>
          <Button size="small" icon={<PlusCircleOutlined />} onClick={addItem}>
            Thêm mục
          </Button>
        </div>

        <div style={{
          background: bgCard, borderRadius: 8, border: `1px solid ${borderColor}`,
          padding: '8px 12px', marginBottom: 12,
        }}>
          {items.map((item, idx) => (
            <div
              key={item.key}
              style={{
                display: 'grid', gridTemplateColumns: '1fr 140px 32px',
                gap: 8, alignItems: 'center',
                marginBottom: idx < items.length - 1 ? 8 : 0,
              }}
            >
              <Input
                placeholder="Mô tả mục chi..."
                value={item.description}
                onChange={(e) => updateItem(item.key, 'description', e.target.value)}
                size="small"
              />
              <InputNumber
                placeholder="Số tiền"
                min={0}
                style={{ width: '100%' }}
                size="small"
                value={item.amount}
                formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(v) => Number(v?.replace(/,/g, '') ?? 0)}
                onChange={(v) => updateItem(item.key, 'amount', v ?? 0)}
              />
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() => removeItem(item.key)}
                disabled={items.length === 1}
              />
            </div>
          ))}
        </div>

        <div style={{
          textAlign: 'right', padding: '8px 12px',
          background: bgCard, borderRadius: 8,
          border: `1px solid ${borderColor}`,
        }}>
          <Text style={{ color: textSecondary, fontSize: 12 }}>Tổng cộng: </Text>
          <Text strong style={{ fontSize: 16, color: textPrimary }}>{formatCurrency(total)}</Text>
        </div>
      </Form>
    </CenteredModal>
  );
}

// ─── Main ExpensePage ─────────────────────────────────────────────────────────

export default function ExpensePage() {
  const { mode, preset } = useThemeStore();
  const isDark = mode === 'dark';
  const textPrimary   = isDark ? '#F1F5F9' : '#0F172A';
  const textSecondary = isDark ? 'rgba(255,255,255,0.5)' : '#475569';
  const bgContainer   = isDark ? '#1E293B' : '#ffffff';
  const bgCard        = isDark ? '#2D3F56' : '#FAFAFA';
  const bgSubPanel    = isDark ? '#1A2744' : '#F8FAFC';
  const borderColor   = isDark ? '#334155' : '#E2E8F0';

  const user = useAuthStore((s) => s.user);
  const isPrivileged = canApprove(user?.role);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus | undefined>();
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | undefined>();
  const [page, setPage] = useState(1);
  const [rejectModal, setRejectModal] = useState<{ id: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const qc = useQueryClient();

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.list,
  });

  const params = {
    page,
    pageSize: 20,
    status: statusFilter,
    category: categoryFilter,
  };

  const { data, isLoading } = useQuery({
    queryKey: ['expenses', params],
    queryFn: () => expensesApi.list(params),
  });

  const { mutate: approve } = useMutation({
    mutationFn: ({ id, status, rejectedReason }: { id: string; status: 'APPROVED' | 'REJECTED' | 'PAID'; rejectedReason?: string }) =>
      expensesApi.approve(id, { status, rejectedReason }),
    onSuccess: () => {
      message.success('Cập nhật trạng thái thành công');
      qc.invalidateQueries({ queryKey: ['expenses'] });
    },
    onError: () => message.error('Thao tác thất bại'),
  });

  const { mutate: remove } = useMutation({
    mutationFn: expensesApi.remove,
    onSuccess: () => {
      message.success('Đã xoá expense');
      qc.invalidateQueries({ queryKey: ['expenses'] });
    },
  });

  function handleApprove(id: string) {
    approve({ id, status: 'APPROVED' });
  }

  function handleMarkPaid(id: string) {
    approve({ id, status: 'PAID' });
  }

  function handleReject(id: string) {
    setRejectModal({ id });
    setRejectReason('');
  }

  function confirmReject() {
    if (!rejectModal) return;
    approve({ id: rejectModal.id, status: 'REJECTED', rejectedReason: rejectReason });
    setRejectModal(null);
  }

  const columns: ColumnsType<Expense> = [
    {
      title: 'Tiêu đề', dataIndex: 'title', ellipsis: true,
      render: (t: string) => <Text strong style={{ color: textPrimary }}>{t}</Text>,
    },
    {
      title: 'Danh mục', dataIndex: 'category', width: 140,
      render: (c: ExpenseCategory) => {
        const meta = CATEGORY_META[c];
        return (
          <Tag
            style={{
              borderRadius: 12,
              borderColor: meta.color,
              color: meta.color,
              background: `${meta.color}18`,
            }}
          >
            {meta.icon} {meta.label}
          </Tag>
        );
      },
    },
    {
      title: 'Dự án', dataIndex: ['project', 'name'], width: 140, ellipsis: true,
      render: (name?: string) => name ?? <Text type="secondary">—</Text>,
    },
    {
      title: 'Tổng tiền', dataIndex: 'totalAmount', width: 160,
      render: (v: number) => (
        <Text strong style={{ color: preset.primary }}>
          {formatCurrency(v)}
        </Text>
      ),
    },
    {
      title: 'Status', dataIndex: 'status', width: 150,
      render: (s: ExpenseStatus, record: Expense) => {
        if (record.processInstanceId && s === 'PENDING') {
          return (
            <Tooltip title="View in Process Monitor">
              <Tag
                color="blue"
                icon={<BranchesOutlined />}
                style={{ cursor: 'pointer' }}
                onClick={() =>
                  window.open(`/processes/instances/${record.processInstanceId}`, '_blank')
                }
              >
                In Review
              </Tag>
            </Tooltip>
          );
        }
        return <Tag color={STATUS_COLOR[s]}>{STATUS_LABEL[s]}</Tag>;
      },
    },
    {
      title: 'Người nộp', dataIndex: ['submittedBy', 'name'], width: 140, ellipsis: true,
      render: (name?: string) => name ?? <Text type="secondary">—</Text>,
    },
    {
      title: 'Ngày tạo', dataIndex: 'createdAt', width: 110,
      render: (d: string) => dayjs(d).format('DD/MM/YYYY'),
    },
    {
      title: 'Thao tác', width: 130,
      render: (_: unknown, record: Expense) => {
        const actions: React.ReactNode[] = [];
        if (isPrivileged && record.status === 'PENDING') {
          actions.push(
            <Tooltip key="approve" title="Duyệt">
              <Button
                size="small"
                type="primary"
                icon={<CheckOutlined />}
                onClick={(e) => { e.stopPropagation(); handleApprove(record.id); }}
              />
            </Tooltip>,
            <Tooltip key="reject" title="Từ chối">
              <Button
                size="small"
                danger
                icon={<CloseOutlined />}
                onClick={(e) => { e.stopPropagation(); handleReject(record.id); }}
              />
            </Tooltip>,
          );
        }
        if (isPrivileged && record.status === 'APPROVED') {
          actions.push(
            <Tooltip key="paid" title="Đánh dấu đã thanh toán">
              <Button
                size="small"
                style={{ borderColor: '#1677ff', color: '#1677ff' }}
                onClick={(e) => { e.stopPropagation(); handleMarkPaid(record.id); }}
              >
                Paid
              </Button>
            </Tooltip>,
          );
        }
        if (record.status === 'PENDING') {
          actions.push(
            <Tooltip key="delete" title="Xoá">
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  Modal.confirm({
                    title: 'Xoá expense?',
                    content: 'Thao tác này không thể hoàn tác.',
                    okButtonProps: { danger: true },
                    onOk: () => remove(record.id),
                  });
                }}
              />
            </Tooltip>,
          );
        }
        return <Space size={4}>{actions}</Space>;
      },
    },
  ];

  // Summary stats
  const totalPending  = data?.data.filter((e) => e.status === 'PENDING').reduce((s, e) => s + Number(e.totalAmount), 0) ?? 0;
  const totalApproved = data?.data.filter((e) => e.status === 'APPROVED').reduce((s, e) => s + Number(e.totalAmount), 0) ?? 0;
  const totalPaid     = data?.data.filter((e) => e.status === 'PAID').reduce((s, e) => s + Number(e.totalAmount), 0) ?? 0;

  return (
    <div style={{ padding: 24 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 20,
      }}>
        <Title level={3} style={{ margin: 0, color: textPrimary }}>
          <WalletOutlined style={{ marginRight: 8, color: preset.primary }} />
          Chi phí
        </Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setDrawerOpen(true)}
        >
          Tạo yêu cầu
        </Button>
      </div>

      {/* Summary cards */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        {[
          { label: 'Chờ duyệt', value: totalPending, color: '#FA8C16' },
          { label: 'Đã duyệt', value: totalApproved, color: '#52C41A' },
          { label: 'Đã thanh toán', value: totalPaid, color: '#1677ff' },
        ].map((item) => (
          <Col key={item.label} xs={24} sm={8}>
            <div style={{
              background: bgCard,
              border: `1px solid ${borderColor}`,
              borderRadius: 10, padding: '16px 20px',
            }}>
              <Statistic
                title={<span style={{ color: textSecondary, fontSize: 13 }}>{item.label}</span>}
                value={item.value}
                formatter={(v) => formatCurrency(Number(v))}
                valueStyle={{ color: item.color, fontSize: 18 }}
              />
            </div>
          </Col>
        ))}
      </Row>

      {/* Filters */}
      <Space wrap style={{ marginBottom: 16 }}>
        <Select
          allowClear
          placeholder="Trạng thái"
          style={{ width: 150 }}
          onChange={(v) => { setStatusFilter(v); setPage(1); }}
          options={Object.entries(STATUS_LABEL).map(([k, v]) => ({ value: k, label: v }))}
        />
        <Select
          allowClear
          placeholder="Danh mục"
          style={{ width: 160 }}
          onChange={(v) => { setCategoryFilter(v); setPage(1); }}
          options={CATEGORY_OPTIONS}
        />
      </Space>

      <Table
        dataSource={data?.data}
        loading={isLoading}
        rowKey="id"
        columns={columns}
        pagination={{
          total: data?.total,
          pageSize: 20,
          current: page,
          onChange: setPage,
          showSizeChanger: false,
        }}
        style={{ background: bgContainer }}
        expandable={{
          expandedRowRender: (record) => (
            <div style={{
              background: bgSubPanel, border: `1px solid ${borderColor}`,
              borderRadius: 8, padding: '12px 16px', margin: '4px 0',
            }}>
              <Text strong style={{ color: textPrimary, marginBottom: 8, display: 'block' }}>
                Chi tiết mục ({record.items.length})
              </Text>
              {record.items.map((item, idx) => (
                <div key={idx} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '4px 0',
                  borderBottom: idx < record.items.length - 1 ? `1px solid ${borderColor}` : 'none',
                }}>
                  <Text style={{ color: textSecondary }}>{item.description}</Text>
                  <Text strong style={{ color: textPrimary }}>{formatCurrency(item.amount)}</Text>
                </div>
              ))}
              <div style={{ textAlign: 'right', marginTop: 8, paddingTop: 8, borderTop: `1px solid ${borderColor}` }}>
                <Text style={{ color: textSecondary }}>Tổng: </Text>
                <Text strong style={{ color: preset.primary, fontSize: 15 }}>
                  {formatCurrency(record.totalAmount)}
                </Text>
              </div>
              {record.note && (
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Ghi chú: {record.note}</Text>
                </div>
              )}
            </div>
          ),
        }}
      />

      <ExpenseDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        projects={projects}
        isDark={isDark}
        bgContainer={bgContainer}
        bgCard={bgCard}
        borderColor={borderColor}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
      />

      <Modal
        title="Lý do từ chối"
        open={!!rejectModal}
        onOk={confirmReject}
        onCancel={() => setRejectModal(null)}
        okText="Xác nhận từ chối"
        okButtonProps={{ danger: true }}
      >
        <TextArea
          rows={3}
          placeholder="Nhập lý do từ chối..."
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
        />
      </Modal>
    </div>
  );
}
