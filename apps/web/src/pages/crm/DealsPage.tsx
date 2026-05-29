import { useState } from 'react';
import {
  Table, Button, Space, Typography, Select, Form, Input,
  InputNumber, DatePicker, Tag, Modal, message, Radio, Tooltip, Badge,
  Drawer, Descriptions, Divider,
} from 'antd';
import { CenteredModal } from '../../components/ui/CenteredModal';
import { CommentThread } from '../../components/comments/CommentThread';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, TrophyOutlined,
  AppstoreOutlined, UnorderedListOutlined, CheckCircleFilled, CloseCircleFilled,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { useThemeStore } from '../../store/theme.store';
import { usersApi } from '../../api/users';
import {
  useGetDeals, useCreateDeal, useUpdateDeal, useMarkDealWon, useMarkDealLost, useDeleteDeal,
  useGetCustomers,
  type Deal, type DealFilterDto, type DealStage,
} from '../../api/crm';
import { useAuthStore } from '../../store/auth.store';

const { Title, Text } = Typography;
const { TextArea } = Input;

const STAGES: { key: DealStage; label: string; color: string; bg: string }[] = [
  { key: 'QUALIFICATION', label: 'Qualification', color: '#0EA5E9', bg: 'rgba(14,165,233,0.08)' },
  { key: 'PROPOSAL',      label: 'Proposal',      color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
  { key: 'NEGOTIATION',   label: 'Negotiation',   color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)' },
  { key: 'WON',           label: 'Won',           color: '#10B981', bg: 'rgba(16,185,129,0.08)' },
  { key: 'LOST',          label: 'Lost',          color: '#EF4444', bg: 'rgba(239,68,68,0.08)'  },
];

const STAGE_MAP = Object.fromEntries(STAGES.map(s => [s.key, s]));

function formatMoney(v?: string | number | null): string {
  if (!v) return '—';
  return Number(v).toLocaleString('vi-VN') + ' ₫';
}

// ─── Kanban Card ─────────────────────────────────────────────────────────────

function DealCard({
  deal, isDark, borderColor, textPrimary, textMuted, preset,
  onEdit, onWon, onLost, onDelete,
}: {
  deal: Deal;
  isDark: boolean;
  borderColor: string;
  textPrimary: string;
  textMuted: string;
  preset: { primary: string };
  onEdit: (d: Deal) => void;
  onWon:  (d: Deal) => void;
  onLost: (d: Deal) => void;
  onDelete: (d: Deal) => void;
}) {
  const bg = isDark ? '#2D3F56' : '#fff';
  const linkColor = isDark ? '#93C5FD' : preset.primary;

  return (
    <div style={{
      background: bg,
      border: `1px solid ${borderColor}`,
      borderRadius: 8,
      padding: '10px 12px',
      marginBottom: 8,
      cursor: 'pointer',
    }}>
      <div style={{ fontWeight: 600, fontSize: 13, color: textPrimary, marginBottom: 4 }}>
        {deal.title}
      </div>
      {deal.customer && (
        <div style={{ fontSize: 12, color: textMuted, marginBottom: 4 }}>{deal.customer.name}</div>
      )}
      {deal.value && (
        <div style={{ fontSize: 13, color: linkColor, fontWeight: 500, marginBottom: 6 }}>
          {formatMoney(deal.value)}
        </div>
      )}
      {deal.expectedCloseDate && (
        <div style={{ fontSize: 11, color: textMuted }}>
          Đóng: {dayjs(deal.expectedCloseDate).format('DD/MM/YYYY')}
        </div>
      )}
      <div style={{ display: 'flex', gap: 4, marginTop: 8, justifyContent: 'flex-end' }}>
        {deal.stage !== 'WON' && deal.stage !== 'LOST' && (
          <>
            <Tooltip title="Mark Won">
              <Button size="small" type="text" icon={<CheckCircleFilled style={{ color: '#10B981' }} />}
                onClick={() => onWon(deal)} />
            </Tooltip>
            <Tooltip title="Mark Lost">
              <Button size="small" type="text" icon={<CloseCircleFilled style={{ color: '#EF4444' }} />}
                onClick={() => onLost(deal)} />
            </Tooltip>
          </>
        )}
        <Button size="small" type="text" icon={<EditOutlined />} onClick={() => onEdit(deal)} />
        <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => onDelete(deal)} />
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DealsPage() {
  const { mode, preset } = useThemeStore();
  const isDark = mode === 'dark';
  const { user } = useAuthStore();

  const bgContainer = isDark ? '#1E293B' : '#ffffff';
  const bgCard      = isDark ? '#2D3F56' : '#FAFAFA';
  const bgSubPanel  = isDark ? '#1A2744' : '#F8FAFC';
  const borderColor = isDark ? '#334155' : '#E2E8F0';
  const textPrimary = isDark ? '#F1F5F9' : '#0F172A';
  const textMuted   = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
  const linkColor   = isDark ? '#93C5FD' : preset.primary;

  const [viewMode, setViewMode]       = useState<'kanban' | 'list'>('kanban');
  const [filters, setFilters]         = useState<DealFilterDto>({ page: 1, limit: 40 });
  const [drawerOpen, setDrawerOpen]   = useState(false);
  const [wonModalOpen, setWonModal]   = useState(false);
  const [lostModalOpen, setLostModal] = useState(false);
  const [editing, setEditing]         = useState<Deal | null>(null);
  const [viewDeal, setViewDeal]       = useState<Deal | null>(null);
  const [actTarget, setActTarget]     = useState<Deal | null>(null);
  const [form] = Form.useForm();
  const [wonForm] = Form.useForm();
  const [lostForm] = Form.useForm();

  const { data, isLoading }      = useGetDeals(filters);
  const { data: usersData = [] } = useQuery({ queryKey: ['users'], queryFn: usersApi.list });
  const { data: customersData }  = useGetCustomers({ limit: 200 });
  const customers = customersData?.data ?? [];

  const createMutation = useCreateDeal();
  const updateMutation = useUpdateDeal();
  const wonMutation    = useMarkDealWon();
  const lostMutation   = useMarkDealLost();
  const deleteMutation = useDeleteDeal();

  const deals = data?.data ?? [];

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldValue('assigneeId', user?.id);
    form.setFieldValue('currency', 'VND');
    setDrawerOpen(true);
  };

  const openEdit = (deal: Deal) => {
    setEditing(deal);
    form.setFieldsValue({
      title: deal.title,
      customerId: deal.customerId,
      value: deal.value ? Number(deal.value) : undefined,
      currency: deal.currency,
      probability: deal.probability,
      expectedCloseDate: deal.expectedCloseDate ? dayjs(deal.expectedCloseDate) : undefined,
      assigneeId: deal.assigneeId,
    });
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    if (values.expectedCloseDate) {
      values.expectedCloseDate = (values.expectedCloseDate as dayjs.Dayjs).toISOString();
    }
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, data: values });
      message.success('Đã cập nhật deal');
    } else {
      await createMutation.mutateAsync(values);
      message.success('Đã thêm deal');
    }
    setDrawerOpen(false);
  };

  const handleWon = async () => {
    const values = await wonForm.validateFields();
    if (!actTarget) return;
    await wonMutation.mutateAsync({ id: actTarget.id, data: values });
    message.success('Deal đã được đánh dấu Won!');
    setWonModal(false);
  };

  const handleLost = async () => {
    const values = await lostForm.validateFields();
    if (!actTarget) return;
    await lostMutation.mutateAsync({ id: actTarget.id, data: values });
    message.success('Deal đánh dấu Lost');
    setLostModal(false);
  };

  const openWon = (deal: Deal) => { setActTarget(deal); wonForm.resetFields(); setWonModal(true); };
  const openLost = (deal: Deal) => { setActTarget(deal); lostForm.resetFields(); setLostModal(true); };

  const handleDelete = (deal: Deal) => {
    Modal.confirm({
      title: `Xoá deal "${deal.title}"?`,
      okType: 'danger',
      onOk: async () => { await deleteMutation.mutateAsync(deal.id); message.success('Đã xoá'); },
    });
  };

  // ─── Kanban view ─────────────────────────────────────────────────────────

  const KanbanView = () => (
    <div style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '4px 0 8px' }}>
      {STAGES.map(stage => {
        const stageDeals = deals.filter(d => d.stage === stage.key);
        const total = stageDeals.reduce((s, d) => s + (d.value ? Number(d.value) : 0), 0);

        return (
          <div key={stage.key} style={{
            minWidth: 240, maxWidth: 280, flex: '0 0 260px',
            background: isDark ? '#1A2744' : stage.bg,
            borderRadius: 10,
            border: `1px solid ${borderColor}`,
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '10px 12px 8px',
              borderBottom: `1px solid ${borderColor}`,
              background: isDark ? `${stage.color}18` : stage.bg,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontWeight: 600, color: stage.color, fontSize: 13 }}>{stage.label}</Text>
                <Badge count={stageDeals.length} style={{ backgroundColor: stage.color }} />
              </div>
              {total > 0 && (
                <div style={{ fontSize: 12, color: textMuted, marginTop: 2 }}>
                  {total.toLocaleString('vi-VN')} ₫
                </div>
              )}
            </div>
            <div style={{ padding: '10px 10px 2px', minHeight: 60 }}>
              {stageDeals.map(deal => (
                <DealCard
                  key={deal.id}
                  deal={deal}
                  isDark={isDark}
                  borderColor={borderColor}
                  textPrimary={textPrimary}
                  textMuted={textMuted}
                  preset={preset}
                  onEdit={openEdit}
                  onWon={openWon}
                  onLost={openLost}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );

  // ─── List view ───────────────────────────────────────────────────────────

  const columns: ColumnsType<Deal> = [
    { title: 'Mã', dataIndex: 'code', width: 110, render: (v: string) => <Text code style={{ color: linkColor }}>{v}</Text> },
    {
      title: 'Tên deal', dataIndex: 'title',
      render: (t: string, row: Deal) => (
        <Space direction="vertical" size={0}>
          <Text style={{ color: textPrimary, fontWeight: 500 }}>{t}</Text>
          {row.customer && <Text style={{ fontSize: 12, color: textMuted }}>{row.customer.name}</Text>}
        </Space>
      ),
    },
    {
      title: 'Giai đoạn', dataIndex: 'stage', width: 140,
      render: (s: DealStage) => <Tag color={STAGE_MAP[s]?.color}>{STAGE_MAP[s]?.label ?? s}</Tag>,
    },
    {
      title: 'Giá trị', dataIndex: 'value', width: 140, align: 'right',
      render: (v?: string) => <Text style={{ color: textPrimary }}>{formatMoney(v)}</Text>,
    },
    {
      title: 'Xác suất', dataIndex: 'probability', width: 90, align: 'center',
      render: (v?: number) => v != null ? <Text style={{ color: textMuted }}>{v}%</Text> : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      title: 'Đóng dự kiến', dataIndex: 'expectedCloseDate', width: 140,
      render: (v?: string) => v ? <Text style={{ color: textMuted }}>{dayjs(v).format('DD/MM/YYYY')}</Text> : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      title: '', key: 'actions', width: 120, align: 'right',
      render: (_: unknown, row: Deal) => (
        <Space>
          {row.stage !== 'WON' && row.stage !== 'LOST' && (
            <>
              <Tooltip title="Won"><Button size="small" icon={<CheckCircleFilled style={{ color: '#10B981' }} />} onClick={() => openWon(row)} /></Tooltip>
              <Tooltip title="Lost"><Button size="small" icon={<CloseCircleFilled style={{ color: '#EF4444' }} />} onClick={() => openLost(row)} /></Tooltip>
            </>
          )}
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)} />
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(row)} />
        </Space>
      ),
    },
  ];

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <TrophyOutlined style={{ color: '#DC2626', fontSize: 20 }} />
          <Title level={4} style={{ margin: 0, color: textPrimary }}>Pipeline / Deals</Title>
        </div>
        <Space>
          <Radio.Group
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
            buttonStyle="solid"
            size="small"
          >
            <Radio.Button value="kanban"><AppstoreOutlined /></Radio.Button>
            <Radio.Button value="list"><UnorderedListOutlined /></Radio.Button>
          </Radio.Group>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}
            style={{ background: preset.primary, borderColor: preset.primary }}>
            Thêm deal
          </Button>
        </Space>
      </div>

      <div style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Select
          placeholder="Giai đoạn"
          style={{ width: 160 }}
          allowClear
          options={STAGES.map(s => ({ value: s.key, label: s.label }))}
          onChange={(v) => setFilters(f => ({ ...f, stage: v, page: 1 }))}
        />
        <Select
          placeholder="Khách hàng"
          style={{ width: 200 }}
          allowClear
          showSearch
          optionFilterProp="label"
          options={customers.map(c => ({ value: c.id, label: c.name }))}
          onChange={(v) => setFilters(f => ({ ...f, customerId: v, page: 1 }))}
        />
        <Select
          placeholder="Phụ trách"
          style={{ width: 200 }}
          allowClear
          showSearch
          optionFilterProp="label"
          options={usersData.map((u: { id: string; name: string }) => ({ value: u.id, label: u.name }))}
          onChange={(v) => setFilters(f => ({ ...f, assigneeId: v, page: 1 }))}
        />
      </div>

      {viewMode === 'kanban' ? (
        isLoading ? <div style={{ textAlign: 'center', padding: 40 }}>Đang tải...</div> : <KanbanView />
      ) : (
        <div style={{ background: bgContainer, borderRadius: 8, border: `1px solid ${borderColor}` }}>
          <Table<Deal>
            rowKey="id"
            columns={columns}
            dataSource={deals}
            loading={isLoading}
            onRow={(record) => ({ onClick: (e) => { if ((e.target as HTMLElement).closest('button')) return; setViewDeal(record); }, style: { cursor: 'pointer' } })}
            pagination={{
              current: filters.page,
              pageSize: filters.limit,
              total: data?.total ?? 0,
              onChange: (page, limit) => setFilters(f => ({ ...f, page, limit })),
              showSizeChanger: true,
            }}
          />
        </div>
      )}

      {/* Create/Edit CenteredModal */}
      <CenteredModal
        title={editing ? 'Sửa deal' : 'Thêm deal mới'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={480}
        extra={
          <Button type="primary" loading={isPending} onClick={handleSave}
            style={{ background: preset.primary, borderColor: preset.primary }}>
            {editing ? 'Cập nhật' : 'Lưu'}
          </Button>
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="Tên deal" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="customerId" label="Khách hàng" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label"
              options={customers.map(c => ({ value: c.id, label: c.name }))} />
          </Form.Item>
          <Form.Item name="assigneeId" label="Phụ trách" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label"
              options={usersData.map((u: { id: string; name: string }) => ({ value: u.id, label: u.name }))} />
          </Form.Item>
          <Space.Compact style={{ width: '100%' }}>
            <Form.Item name="value" label="Giá trị" style={{ flex: 1, marginBottom: 0 }}>
              <InputNumber style={{ width: '100%' }} formatter={(v) => v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''} />
            </Form.Item>
            <Form.Item name="currency" label="&nbsp;" style={{ width: 80, marginBottom: 0 }}>
              <Select options={[{ value: 'VND' }, { value: 'USD' }]} />
            </Form.Item>
          </Space.Compact>
          <Form.Item name="probability" label="Xác suất (%)" style={{ marginTop: 16 }}>
            <InputNumber min={0} max={100} style={{ width: '100%' }} addonAfter="%" />
          </Form.Item>
          <Form.Item name="expectedCloseDate" label="Ngày đóng dự kiến">
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
        </Form>
      </CenteredModal>

      {/* View-detail Drawer */}
      <Drawer
        open={!!viewDeal}
        onClose={() => setViewDeal(null)}
        width={520}
        title={<span style={{ color: textPrimary, fontWeight: 600 }}>Chi tiết Deal</span>}
        styles={{ body: { background: bgContainer }, header: { background: bgContainer } }}
      >
        {viewDeal && (
          <>
            <Descriptions column={1} bordered size="small" labelStyle={{ color: textMuted }} contentStyle={{ color: textPrimary }}>
              <Descriptions.Item label="Tên deal">{viewDeal.title}</Descriptions.Item>
              <Descriptions.Item label="Giai đoạn"><Tag>{viewDeal.stage}</Tag></Descriptions.Item>
              {viewDeal.value != null && <Descriptions.Item label="Giá trị">{Number(viewDeal.value).toLocaleString('vi-VN')} ₫</Descriptions.Item>}
              {viewDeal.customer && <Descriptions.Item label="Khách hàng">{viewDeal.customer.name}</Descriptions.Item>}
              {viewDeal.assignee && <Descriptions.Item label="Phụ trách">{viewDeal.assignee.name}</Descriptions.Item>}
              {viewDeal.expectedCloseDate && <Descriptions.Item label="Dự kiến đóng">{dayjs(viewDeal.expectedCloseDate).format('DD/MM/YYYY')}</Descriptions.Item>}
            </Descriptions>
            <Divider style={{ margin: '16px 0 8px' }}>Thảo luận</Divider>
            <CommentThread entityType="deal" entityId={viewDeal.id} />
          </>
        )}
      </Drawer>

      {/* Won Modal */}
      <Modal
        title={<Space><TrophyOutlined style={{ color: '#10B981' }} />Deal Won: "{actTarget?.title}"</Space>}
        open={wonModalOpen}
        onCancel={() => setWonModal(false)}
        onOk={handleWon}
        confirmLoading={wonMutation.isPending}
        okText="Xác nhận Won"
        okButtonProps={{ style: { background: '#10B981', borderColor: '#10B981' } }}
      >
        <Form form={wonForm} layout="vertical">
          <Form.Item name="projectName" label="Tạo Project mới (tuỳ chọn)">
            <Input placeholder="Tên project — để trống nếu không tạo" />
          </Form.Item>
          <Form.Item name="projectType" label="Loại project">
            <Select allowClear options={[
              { value: 'WEB', label: 'Web' },
              { value: 'MOBILE', label: 'Mobile' },
              { value: 'AI', label: 'AI' },
              { value: 'OTHER', label: 'Khác' },
            ]} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Lost Modal */}
      <Modal
        title={`Deal Lost: "${actTarget?.title}"`}
        open={lostModalOpen}
        onCancel={() => setLostModal(false)}
        onOk={handleLost}
        confirmLoading={lostMutation.isPending}
        okType="danger"
        okText="Xác nhận Lost"
      >
        <Form form={lostForm} layout="vertical">
          <Form.Item name="lostReason" label="Lý do" rules={[{ required: true, message: 'Vui lòng nhập lý do' }]}>
            <TextArea rows={3} placeholder="VD: Giá cao, khách chọn đối thủ..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
