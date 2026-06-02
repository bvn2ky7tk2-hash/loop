import { useState, useEffect } from 'react';
import {
  DndContext, DragOverlay,
  PointerSensor, useSensor, useSensors, useDroppable, useDraggable,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
  Table, Button, Space, Typography, Select, Form, Input,
  InputNumber, DatePicker, Tag, Modal, message, Radio, Tooltip, Badge,
  Drawer, Descriptions, Divider, Steps,
} from 'antd';
import axios from 'axios';
import { CenteredModal } from '../../components/ui/CenteredModal';
import { CommentThread } from '../../components/comments/CommentThread';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, TrophyOutlined,
  AppstoreOutlined, UnorderedListOutlined, CheckCircleFilled, CloseCircleFilled,
  ProjectOutlined, TeamOutlined,
} from '@ant-design/icons';

const TaskListIcon = UnorderedListOutlined;
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { useThemePalette } from '../../hooks/useThemePalette';
import { usePagination } from '../../hooks/usePagination';
import { usersApi } from '../../api/users';
import {
  useGetDeals, useCreateDeal, useUpdateDeal, useMarkDealWon, useMarkDealLost, useDeleteDeal,
  useChangeDealStage, useGetCustomers,
  type Deal, type DealFilterDto, type DealStage,
} from '../../api/crm';
import { useAuthStore } from '../../store/auth.store';
import { confirmDelete } from '../../components/ui/confirmDelete';
import { ProjectSelect } from '../../components/selects';

const { Title, Text } = Typography;
const { TextArea } = Input;

const STAGES: { key: DealStage; label: string; color: string; bg: string }[] = [
  { key: 'QUALIFICATION', label: 'Xác định nhu cầu', color: '#0EA5E9', bg: 'rgba(14,165,233,0.08)' },
  { key: 'PROPOSAL',      label: 'Đề xuất',          color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
  { key: 'NEGOTIATION',   label: 'Đàm phán',         color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)' },
  { key: 'WON',           label: 'Thắng',            color: '#10B981', bg: 'rgba(16,185,129,0.08)' },
  { key: 'LOST',          label: 'Mất',              color: '#EF4444', bg: 'rgba(239,68,68,0.08)'  },
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
            <Tooltip title="Đánh dấu Thắng">
              <Button size="small" type="text" icon={<CheckCircleFilled style={{ color: '#10B981' }} />}
                onClick={() => onWon(deal)} />
            </Tooltip>
            <Tooltip title="Đánh dấu Mất">
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

// ─── Drag & drop wrappers ─────────────────────────────────────────────────────

type DealCardProps = Omit<Parameters<typeof DealCard>[0], 'deal'>;

function DraggableDeal({ deal, cardProps }: { deal: Deal; cardProps: DealCardProps }) {
  const disabled = deal.stage === 'WON' || deal.stage === 'LOST';
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: deal.id, data: { stage: deal.stage }, disabled,
  });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), zIndex: isDragging ? 999 : undefined, opacity: isDragging ? 0.5 : 1 }} {...attributes}>
      <div {...(!disabled ? listeners : {})} style={{ touchAction: 'none', cursor: disabled ? 'default' : 'grab' }}>
        <DealCard deal={deal} {...cardProps} />
      </div>
    </div>
  );
}

function DealColumn({
  stage, total, count, isDark, borderColor, textMuted, children,
}: {
  stage: { key: DealStage; label: string; color: string; bg: string };
  total: number; count: number; isDark: boolean; borderColor: string; textMuted: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.key });
  return (
    <div style={{
      minWidth: 240, maxWidth: 280, flex: '0 0 260px',
      background: isDark ? '#1A2744' : stage.bg,
      borderRadius: 10, border: `1px solid ${isOver ? stage.color : borderColor}`, overflow: 'hidden',
      transition: 'border-color 0.15s',
    }}>
      <div style={{ padding: '10px 12px 8px', borderBottom: `1px solid ${borderColor}`, background: isDark ? `${stage.color}18` : stage.bg }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontWeight: 600, color: stage.color, fontSize: 13 }}>{stage.label}</Text>
          <Badge count={count} style={{ backgroundColor: stage.color }} showZero />
        </div>
        {total > 0 && <div style={{ fontSize: 12, color: textMuted, marginTop: 2 }}>{total.toLocaleString('vi-VN')} ₫</div>}
      </div>
      <div ref={setNodeRef} style={{
        padding: '10px 10px 2px', minHeight: 80,
        background: isOver ? `${stage.color}0F` : 'transparent', transition: 'background 0.15s',
      }}>
        {children}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DealsPage() {
  const { isDark, bgContainer, borderColor, textPrimary, textMuted, linkColor, preset } = useThemePalette();
  const { user } = useAuthStore();

  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const { page, pageSize, resetPage, paginationProps } = usePagination(40);
  const [stageFilter, setStageFilter] = useState<DealFilterDto['stage']>();
  const [customerIdFilter, setCustomerIdFilter] = useState<string | undefined>();
  const [assigneeIdFilter, setAssigneeIdFilter] = useState<string | undefined>();
  const filters: DealFilterDto = { page, limit: pageSize, stage: stageFilter, customerId: customerIdFilter, assigneeId: assigneeIdFilter };

  useEffect(() => { resetPage(); }, [stageFilter, customerIdFilter, assigneeIdFilter, resetPage]);
  const [drawerOpen, setDrawerOpen]   = useState(false);
  const [wonModalOpen, setWonModal]   = useState(false);
  const [lostModalOpen, setLostModal] = useState(false);
  const [editing, setEditing]         = useState<Deal | null>(null);
  const [viewDeal, setViewDeal]       = useState<Deal | null>(null);
  const [actTarget, setActTarget]     = useState<Deal | null>(null);
  const [wonProjectMode, setWonProjectMode] = useState<'new' | 'existing'>('new');
  const [wonStep, setWonStep] = useState(0);
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
  const stageMutation  = useChangeDealStage();

  const deals = data?.data ?? [];

  // ─── Drag & drop ───────────────────────────────────────────────────────────
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function handleDragStart(e: DragStartEvent) {
    setActiveDeal(deals.find((d) => d.id === e.active.id) ?? null);
  }
  async function handleDragEnd(e: DragEndEvent) {
    setActiveDeal(null);
    const { active, over } = e;
    if (!over) return;
    const id = active.id as string;
    const target = over.id as DealStage;
    const deal = deals.find((d) => d.id === id);
    if (!deal || deal.stage === target) return;
    if (target === 'WON') { openWon(deal); return; }   // WON qua wizard tạo project
    if (target === 'LOST') { openLost(deal); return; }  // LOST cần lý do
    try {
      await stageMutation.mutateAsync({ id, stage: target });
      message.success(`Đã chuyển "${deal.title}" → ${STAGE_MAP[target]?.label ?? target}`);
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      message.error(msg ?? 'Không thể chuyển giai đoạn');
    }
  }

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
    if (!actTarget) return;
    // Bước cuối — submit toàn bộ form
    const values = await wonForm.validateFields();
    try {
      await axios.post(`/api/v1/crm/deals/${actTarget.id}/kickoff-wizard`, values);
      message.success('Deal Won! Kickoff wizard hoàn tất.');
    } catch {
      // Fallback: vẫn mark won qua mutation cũ nếu endpoint chưa có
      await wonMutation.mutateAsync({ id: actTarget.id, data: values });
      message.success('Deal đã được đánh dấu Won!');
    }
    setWonModal(false);
    setWonStep(0);
  };

  const handleLost = async () => {
    const values = await lostForm.validateFields();
    if (!actTarget) return;
    await lostMutation.mutateAsync({ id: actTarget.id, data: values });
    message.success('Deal đánh dấu Lost');
    setLostModal(false);
  };

  const openWon = (deal: Deal) => { setActTarget(deal); wonForm.resetFields(); setWonStep(0); setWonModal(true); };
  const openLost = (deal: Deal) => { setActTarget(deal); lostForm.resetFields(); setLostModal(true); };

  const handleDelete = (deal: Deal) => {
    confirmDelete({
      itemName: deal.title,
      onConfirm: async () => { await deleteMutation.mutateAsync(deal.id); message.success('Đã xoá'); },
    });
  };

  // ─── Kanban view ─────────────────────────────────────────────────────────

  const dealCardProps = { isDark, borderColor, textPrimary, textMuted, preset, onEdit: openEdit, onWon: openWon, onLost: openLost, onDelete: handleDelete };

  const KanbanView = () => (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '4px 0 8px', alignItems: 'flex-start' }}>
        {STAGES.map(stage => {
          const stageDeals = deals.filter(d => d.stage === stage.key);
          const total = stageDeals.reduce((s, d) => s + (d.value ? Number(d.value) : 0), 0);
          return (
            <DealColumn key={stage.key} stage={stage} total={total} count={stageDeals.length} isDark={isDark} borderColor={borderColor} textMuted={textMuted}>
              {stageDeals.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '16px 0', color: textMuted, fontSize: 12 }}>
                  {stage.key === 'WON' ? 'Kéo vào để chốt thắng' : stage.key === 'LOST' ? 'Kéo vào để đánh mất' : 'Chưa có deal'}
                </div>
              ) : stageDeals.map(deal => (
                <DraggableDeal key={deal.id} deal={deal} cardProps={dealCardProps} />
              ))}
            </DealColumn>
          );
        })}
      </div>
      <DragOverlay>
        {activeDeal && <DealCard deal={activeDeal} {...dealCardProps} />}
      </DragOverlay>
    </DndContext>
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
              <Tooltip title="Đánh dấu Thắng"><Button size="small" icon={<CheckCircleFilled style={{ color: '#10B981' }} />} onClick={() => openWon(row)} /></Tooltip>
              <Tooltip title="Đánh dấu Mất"><Button size="small" icon={<CloseCircleFilled style={{ color: '#EF4444' }} />} onClick={() => openLost(row)} /></Tooltip>
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
          <Title level={4} style={{ margin: 0, color: textPrimary }}>Pipeline / Cơ hội bán hàng</Title>
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
          onChange={(v) => setStageFilter(v)}
        />
        <Select
          placeholder="Khách hàng"
          style={{ width: 200 }}
          allowClear
          showSearch
          optionFilterProp="label"
          options={customers.map(c => ({ value: c.id, label: c.name }))}
          onChange={(v) => setCustomerIdFilter(v)}
        />
        <Select
          placeholder="Phụ trách"
          style={{ width: 200 }}
          allowClear
          showSearch
          optionFilterProp="label"
          options={usersData.map((u: { id: string; name: string }) => ({ value: u.id, label: u.name }))}
          onChange={(v) => setAssigneeIdFilter(v)}
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
            locale={{ emptyText: 'Chưa có deal nào' }}
            onRow={(record) => ({ onClick: (e) => { if ((e.target as HTMLElement).closest('button')) return; setViewDeal(record); }, style: { cursor: 'pointer' } })}
            pagination={paginationProps(data?.total ?? 0, 'cơ hội')}
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
          <Button type="primary" loading={isPending} disabled={isPending} onClick={handleSave}
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

      {/* Won Wizard Modal — 3 bước */}
      <Modal
        title={<Space><TrophyOutlined style={{ color: '#10B981' }} />Deal Won: "{actTarget?.title}"</Space>}
        open={wonModalOpen}
        onCancel={() => { setWonModal(false); setWonStep(0); setWonProjectMode('new'); }}
        width={560}
        footer={
          <Space style={{ justifyContent: 'flex-end', width: '100%', display: 'flex' }}>
            {wonStep > 0 && (
              <Button onClick={() => setWonStep(s => s - 1)}>Quay lại</Button>
            )}
            {wonStep < 2 ? (
              <Button
                type="primary"
                style={{ background: '#10B981', borderColor: '#10B981' }}
                onClick={async () => {
                  // Validate các field của bước hiện tại trước khi chuyển
                  try {
                    if (wonStep === 0) await wonForm.validateFields(['projectName', 'projectId', 'projectType', 'pmId', 'startDate']);
                    if (wonStep === 1) await wonForm.validateFields(['templateId']);
                  } catch { return; }
                  setWonStep(s => s + 1);
                }}
              >
                Tiếp theo
              </Button>
            ) : (
              <Button
                type="primary"
                loading={wonMutation.isPending}
                style={{ background: '#10B981', borderColor: '#10B981' }}
                onClick={handleWon}
              >
                Xác nhận Won
              </Button>
            )}
          </Space>
        }
      >
        <Steps
          current={wonStep}
          size="small"
          style={{ marginBottom: 24 }}
          items={[
            { title: 'Thông tin dự án', icon: <ProjectOutlined /> },
            { title: 'Công việc mẫu', icon: <TaskListIcon /> },
            { title: 'Cổng khách hàng', icon: <TeamOutlined /> },
          ]}
        />

        <Form form={wonForm} layout="vertical">
          {/* Bước 1 — Project Info */}
          {wonStep === 0 && (
            <>
              <Form.Item label="Project liên kết">
                <Radio.Group
                  value={wonProjectMode}
                  onChange={(e) => {
                    setWonProjectMode(e.target.value);
                    wonForm.setFieldsValue({ projectName: undefined, projectId: undefined });
                  }}
                >
                  <Radio value="new">Tạo project mới</Radio>
                  <Radio value="existing">Chọn project có sẵn</Radio>
                </Radio.Group>
              </Form.Item>

              {wonProjectMode === 'existing' ? (
                <Form.Item name="projectId" label="Project có sẵn">
                  <ProjectSelect
                    allowClear
                    filterByCustomerId={actTarget?.customerId}
                    placeholder="Chọn project..."
                  />
                </Form.Item>
              ) : (
                <>
                  <Form.Item name="projectName" label="Tên project mới (tuỳ chọn)">
                    <Input placeholder="Để trống nếu không tạo project" />
                  </Form.Item>
                  <Form.Item name="projectType" label="Loại project">
                    <Select allowClear options={[
                      { value: 'WEB', label: 'Web' },
                      { value: 'MOBILE', label: 'Mobile' },
                      { value: 'AI', label: 'AI' },
                      { value: 'OTHER', label: 'Khác' },
                    ]} />
                  </Form.Item>
                </>
              )}

              <Form.Item name="pmId" label="Project Manager">
                <Select
                  showSearch
                  optionFilterProp="label"
                  placeholder="Chọn PM phụ trách..."
                  options={usersData.map((u: { id: string; name: string }) => ({ value: u.id, label: u.name }))}
                />
              </Form.Item>

              <Form.Item name="startDate" label="Ngày bắt đầu">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </>
          )}

          {/* Bước 2 — Template Tasks */}
          {wonStep === 1 && (
            <>
              <Form.Item name="templateId" label="Template công việc">
                <Select
                  allowClear
                  placeholder="Chọn template (tuỳ chọn)..."
                  options={[
                    { value: 'web-standard', label: 'Web Standard (15 tasks)' },
                    { value: 'mobile-app',   label: 'Mobile App (12 tasks)' },
                    { value: 'erp-impl',     label: 'ERP Implementation (20 tasks)' },
                    { value: 'consulting',   label: 'Consulting (8 tasks)' },
                  ]}
                />
              </Form.Item>
              <div style={{ color: textMuted, fontSize: 13, marginTop: -8, marginBottom: 16 }}>
                Template sẽ tự động tạo các task mẫu cho project mới. Để trống nếu muốn tạo task thủ công.
              </div>
            </>
          )}

          {/* Bước 3 — Portal Access */}
          {wonStep === 2 && (
            <>
              <Form.Item
                name="portalEmail"
                label="Email truy cập Client Portal"
                rules={[{ type: 'email', message: 'Email không hợp lệ' }]}
              >
                <Input placeholder="client@company.com" />
              </Form.Item>
              <div style={{ color: textMuted, fontSize: 13, marginTop: -8 }}>
                Hệ thống sẽ gửi thư mời truy cập portal đến email này. Để trống nếu không cần cấp quyền ngay.
              </div>
            </>
          )}
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
