import { useState } from 'react';
import {
  Row, Col, Table, Button, Tag, Typography, Select, Form,
  Input, InputNumber, Drawer, Descriptions, Progress, Space,
  Tabs, Collapse, Tooltip, Popconfirm,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  TrophyOutlined, PlusOutlined, EditOutlined, DeleteOutlined,
  AimOutlined, LineChartOutlined, CheckCircleOutlined, ClockCircleOutlined,
  ApartmentOutlined, SyncOutlined,
} from '@ant-design/icons';
import { message } from 'antd';
import dayjs from 'dayjs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useThemePalette } from '../../hooks/useThemePalette';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { FilterBar } from '../../components/FilterBar';
import { CenteredModal } from '../../components/ui/CenteredModal';
import { confirmDelete } from '../../components/ui/confirmDelete';
import { okrApi, type OkrObjective, type OkrKeyResult, type KpiMetric, type OkrCycle, type OkrStatus } from '../../api/okr';
import { usersApi } from '../../api/users';
import { useAuthStore } from '../../store/auth.store';
import { formatCurrency } from '../../utils/format';

const { Text, Title } = Typography;
const { TextArea } = Input;

const CYCLE_LABEL: Record<OkrCycle, string> = {
  Q1: 'Q1', Q2: 'Q2', Q3: 'Q3', Q4: 'Q4', H1: 'H1', H2: 'H2', ANNUAL: 'Năm',
};
const STATUS_META: Record<OkrStatus, { label: string; color: string }> = {
  DRAFT:     { label: 'Nháp',       color: '#94A3B8' },
  ACTIVE:    { label: 'Đang chạy',  color: '#10B981' },
  COMPLETED: { label: 'Hoàn thành', color: '#6366F1' },
  CANCELLED: { label: 'Đã hủy',     color: '#EF4444' },
};

function krProgress(kr: OkrKeyResult) {
  const range = Number(kr.targetValue) - Number(kr.startValue);
  if (range === 0) return 100;
  return Math.min(100, Math.max(0, Math.round(((Number(kr.currentValue) - Number(kr.startValue)) / range) * 100)));
}

function objectiveProgress(obj: OkrObjective) {
  if (!obj.keyResults.length) return 0;
  return Math.round(obj.keyResults.reduce((s, kr) => s + krProgress(kr), 0) / obj.keyResults.length);
}

// ─── Key Result Row ────────────────────────────────────────────────────────────
function KrRow({ kr, objId, onUpdate, onDelete }: { kr: OkrKeyResult; objId: string; onUpdate: () => void; onDelete: () => void }) {
  const { textPrimary, textMuted, linkColor, isDark } = useThemePalette();
  const [editing, setEditing] = useState(false);
  const [form] = Form.useForm();
  const qc = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (v: any) => okrApi.updateKeyResult(kr.id, v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['okr-objectives'] }); setEditing(false); onUpdate(); },
  });

  const pct = krProgress(kr);
  const strokeColor = pct >= 70 ? '#10B981' : pct >= 40 ? '#F59E0B' : '#EF4444';

  if (editing) {
    return (
      <Form form={form} layout="inline" initialValues={{ currentValue: Number(kr.currentValue) }}
        onFinish={v => updateMutation.mutate(v)} style={{ marginBottom: 8 }}>
        <Form.Item name="currentValue" label={<Text style={{ color: textMuted, fontSize: 12 }}>Giá trị hiện tại</Text>}>
          <InputNumber min={Number(kr.startValue)} style={{ width: 120 }} />
        </Form.Item>
        <Button type="primary" size="small" htmlType="submit" loading={updateMutation.isPending}>Lưu</Button>
        <Button size="small" onClick={() => setEditing(false)}>Hủy</Button>
      </Form>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0', borderBottom: `1px solid ${isDark ? '#334155' : '#F1F5F9'}` }}>
      <div style={{ flex: 1 }}>
        <Text style={{ color: textPrimary, fontSize: 13 }}>{kr.title}</Text>
        {kr.unit && <Text style={{ color: textMuted, fontSize: 11, marginLeft: 6 }}>[{kr.unit}]</Text>}
      </div>
      <div style={{ width: 180 }}>
        <Progress percent={pct} strokeColor={strokeColor} size="small"
          format={() => <Text style={{ color: textPrimary, fontSize: 11 }}>{Number(kr.currentValue).toLocaleString()}/{Number(kr.targetValue).toLocaleString()}</Text>}
        />
      </div>
      <Space size={4}>
        <Button type="text" size="small" icon={<EditOutlined />} style={{ color: linkColor }} onClick={() => setEditing(true)} />
        <Popconfirm title="Xóa key result này?" onConfirm={onDelete} okText="Xóa" cancelText="Hủy">
          <Button type="text" size="small" icon={<DeleteOutlined />} style={{ color: '#EF4444' }} />
        </Popconfirm>
      </Space>
    </div>
  );
}

// ─── OKR Tab ──────────────────────────────────────────────────────────────────
function OkrTab() {
  const { textPrimary, textMuted, bgContainer, bgCard, borderColor, linkColor, isDark } = useThemePalette();
  const user = useAuthStore(s => s.user);
  const qc = useQueryClient();

  const [filterCycle, setFilterCycle] = useState<string>();
  const [filterYear, setFilterYear]   = useState<number>(dayjs().year());
  const [filterStatus, setFilterStatus] = useState<string>();
  const [modalOpen, setModalOpen]     = useState(false);
  const [editing, setEditing]         = useState<OkrObjective | null>(null);
  const [detail, setDetail]           = useState<OkrObjective | null>(null);
  const [krForm] = Form.useForm();
  const [objForm] = Form.useForm();

  const { data: objectives, isLoading } = useQuery({
    queryKey: ['okr-objectives', filterCycle, filterYear, filterStatus],
    queryFn: () => okrApi.listObjectives({ cycle: filterCycle, year: filterYear || undefined, status: filterStatus }),
  });
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: usersApi.list });

  const createObj = useMutation({
    mutationFn: (v: any) => okrApi.createObjective({ ...v, ownerId: v.ownerId ?? user?.id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['okr-objectives'] }); qc.invalidateQueries({ queryKey: ['okr-stats'] }); closeModal(); },
  });
  const updateObj = useMutation({
    mutationFn: ({ id, ...v }: any) => okrApi.updateObjective(id, v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['okr-objectives'] }); closeModal(); },
  });
  const deleteObj = useMutation({
    mutationFn: okrApi.deleteObjective,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['okr-objectives'] }); qc.invalidateQueries({ queryKey: ['okr-stats'] }); },
  });
  const addKr = useMutation({
    mutationFn: ({ objectiveId, ...v }: any) => okrApi.addKeyResult(objectiveId, v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['okr-objectives'] }); krForm.resetFields(); },
  });
  const deleteKr = useMutation({
    mutationFn: okrApi.deleteKeyResult,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['okr-objectives'] }),
  });
  const startReview = useMutation({
    mutationFn: (id: string) => okrApi.startReview(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['okr-objectives'] });
      message.success('Đã khởi tạo quy trình review OKR trong BPM Inbox');
    },
    onError: () => message.error('Chưa có process definition "okr-review" đang ACTIVE'),
  });

  function openCreate() { setEditing(null); objForm.resetFields(); objForm.setFieldsValue({ year: dayjs().year(), status: 'DRAFT' }); setModalOpen(true); }
  function openEdit(obj: OkrObjective) {
    setEditing(obj);
    objForm.setFieldsValue({ title: obj.title, description: obj.description, cycle: obj.cycle, year: obj.year, ownerId: obj.ownerId, status: obj.status });
    setModalOpen(true);
  }
  function closeModal() { setModalOpen(false); setEditing(null); objForm.resetFields(); }

  const columns: ColumnsType<OkrObjective> = [
    {
      title: <Text style={{ color: textMuted }}>Objective</Text>,
      render: (_: any, obj: OkrObjective) => (
        <div>
          <Button type="link" style={{ padding: 0, color: linkColor, textAlign: 'left', height: 'auto', whiteSpace: 'normal' }}
            onClick={() => setDetail(obj)}>{obj.title}</Button>
          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
            <Tag style={{ fontSize: 11 }}>{CYCLE_LABEL[obj.cycle]} {obj.year}</Tag>
            <Text style={{ color: textMuted, fontSize: 11 }}>{obj.owner.name}</Text>
          </div>
        </div>
      ),
    },
    {
      title: <Text style={{ color: textMuted }}>Trạng thái</Text>, width: 120,
      render: (_: any, obj: OkrObjective) => {
        const m = STATUS_META[obj.status];
        return <Tag style={{ background: `${m.color}20`, color: m.color, border: `1px solid ${m.color}40` }}>{m.label}</Tag>;
      },
    },
    {
      title: <Text style={{ color: textMuted }}>Tiến độ</Text>, width: 180,
      render: (_: any, obj: OkrObjective) => {
        const pct = objectiveProgress(obj);
        const color = pct >= 70 ? '#10B981' : pct >= 40 ? '#F59E0B' : '#EF4444';
        return (
          <div>
            <Progress percent={pct} strokeColor={color} size="small" />
            <Text style={{ color: textMuted, fontSize: 11 }}>{obj.keyResults.length} KR</Text>
          </div>
        );
      },
    },
    {
      title: '', width: 110, fixed: 'right' as const,
      render: (_: any, obj: OkrObjective) => (
        <Space>
          {obj.processInstanceId ? (
            <Tooltip title="Đang có quy trình BPM đang chạy">
              <Button type="text" size="small" icon={<SyncOutlined spin />} style={{ color: '#F59E0B' }} disabled />
            </Tooltip>
          ) : (
            <Tooltip title="Khởi tạo quy trình review OKR qua BPM">
              <Button type="text" size="small" icon={<ApartmentOutlined />} style={{ color: linkColor }}
                loading={startReview.isPending}
                onClick={() => startReview.mutate(obj.id)} />
            </Tooltip>
          )}
          <Button type="text" size="small" icon={<EditOutlined />} style={{ color: linkColor }} onClick={() => openEdit(obj)} />
          <Button type="text" size="small" icon={<DeleteOutlined />} style={{ color: '#EF4444' }}
            onClick={() => confirmDelete({ itemName: obj.title, onConfirm: () => deleteObj.mutate(obj.id) })} />
        </Space>
      ),
    },
  ];

  return (
    <>
      <FilterBar>
        <Select placeholder="Kỳ" allowClear style={{ width: 100 }} value={filterCycle} onChange={setFilterCycle}
          options={['Q1','Q2','Q3','Q4','H1','H2','ANNUAL'].map(c => ({ value: c, label: c }))} />
        <Select placeholder="Năm" style={{ width: 100 }} value={filterYear} onChange={setFilterYear}
          options={[2024,2025,2026,2027].map(y => ({ value: y, label: String(y) }))} />
        <Select placeholder="Trạng thái" allowClear style={{ width: 150 }} value={filterStatus} onChange={setFilterStatus}
          options={Object.entries(STATUS_META).map(([v, m]) => ({ value: v, label: m.label }))} />
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Thêm Objective</Button>
      </FilterBar>

      <div style={{ background: bgContainer, borderRadius: 8, border: `1px solid ${borderColor}` }}>
        <Table rowKey="id" columns={columns} dataSource={objectives?.data ?? []} loading={isLoading}
          pagination={{ pageSize: 20, total: objectives?.total, showTotal: t => <Text style={{ color: textMuted }}>Tổng {t}</Text> }} />
      </div>

      {/* Detail Drawer */}
      <Drawer open={!!detail} onClose={() => setDetail(null)} width={560}
        title={<Text style={{ color: textPrimary, fontWeight: 600 }}>{detail?.title}</Text>}
        styles={{ body: { background: bgContainer }, header: { background: bgCard, borderBottom: `1px solid ${borderColor}` } }}>
        {detail && (() => {
          const obj = (objectives?.data ?? []).find(o => o.id === detail.id) ?? detail;
          const pct = objectiveProgress(obj);
          return (
            <>
              <div style={{ marginBottom: 16 }}>
                <Tag style={{ background: `${STATUS_META[obj.status].color}20`, color: STATUS_META[obj.status].color, border: 'none' }}>
                  {STATUS_META[obj.status].label}
                </Tag>
                <Tag>{CYCLE_LABEL[obj.cycle]} {obj.year}</Tag>
              </div>
              <div style={{ marginBottom: 16 }}>
                <Text style={{ color: textMuted, fontSize: 12, display: 'block', marginBottom: 4 }}>Tiến độ tổng thể</Text>
                <Progress percent={pct} strokeColor={pct >= 70 ? '#10B981' : pct >= 40 ? '#F59E0B' : '#EF4444'} />
              </div>
              {obj.description && <Text style={{ color: textMuted, display: 'block', marginBottom: 16 }}>{obj.description}</Text>}

              <Title level={5} style={{ color: textPrimary }}>Key Results</Title>
              {obj.keyResults.map(kr => (
                <KrRow key={kr.id} kr={kr} objId={obj.id}
                  onUpdate={() => { qc.invalidateQueries({ queryKey: ['okr-objectives'] }); }}
                  onDelete={() => deleteKr.mutate(kr.id)} />
              ))}

              <div style={{ marginTop: 16 }}>
                <Text style={{ color: textMuted, fontSize: 12, display: 'block', marginBottom: 8 }}>+ Thêm Key Result</Text>
                <Form form={krForm} layout="inline"
                  onFinish={v => addKr.mutate({ objectiveId: obj.id, ...v })}>
                  <Form.Item name="title" rules={[{ required: true }]}>
                    <Input placeholder="Tên KR..." style={{ width: 200 }} />
                  </Form.Item>
                  <Form.Item name="targetValue" rules={[{ required: true }]}>
                    <InputNumber placeholder="Target" min={0} style={{ width: 100 }} />
                  </Form.Item>
                  <Form.Item name="unit">
                    <Input placeholder="Đơn vị" style={{ width: 80 }} />
                  </Form.Item>
                  <Button type="primary" size="small" htmlType="submit" loading={addKr.isPending}>Thêm</Button>
                </Form>
              </div>
            </>
          );
        })()}
      </Drawer>

      {/* Create/Edit Modal */}
      <CenteredModal open={modalOpen} onCancel={closeModal} title={editing ? 'Cập nhật Objective' : 'Thêm Objective mới'} footer={null} width={520}>
        <Form form={objForm} layout="vertical"
          onFinish={v => editing ? updateObj.mutate({ id: editing.id, ...v }) : createObj.mutate(v)}>
          <Form.Item name="title" label="Mục tiêu" rules={[{ required: true, message: 'Nhập mục tiêu' }]}>
            <Input placeholder="VD: Tăng tỷ lệ giữ chân khách hàng lên 90%" maxLength={300} />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <TextArea rows={2} placeholder="Mô tả thêm về mục tiêu..." />
          </Form.Item>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="cycle" label="Kỳ" rules={[{ required: true }]}>
                <Select options={['Q1','Q2','Q3','Q4','H1','H2','ANNUAL'].map(c => ({ value: c, label: c }))} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="year" label="Năm" rules={[{ required: true }]}>
                <InputNumber min={2020} max={2099} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="status" label="Trạng thái">
                <Select options={Object.entries(STATUS_META).map(([v, m]) => ({ value: v, label: m.label }))} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="ownerId" label="Người phụ trách">
            <Select showSearch placeholder="Chọn người..." allowClear
              filterOption={(input, opt) => (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
              options={users.map(u => ({ value: u.id, label: u.name }))} />
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={closeModal}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={createObj.isPending || updateObj.isPending}>
              {editing ? 'Lưu thay đổi' : 'Tạo Objective'}
            </Button>
          </div>
        </Form>
      </CenteredModal>
    </>
  );
}

// ─── KPI Tab ──────────────────────────────────────────────────────────────────
function KpiTab() {
  const { textPrimary, textMuted, bgContainer, bgCard, borderColor, linkColor, isDark } = useThemePalette();
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<KpiMetric | null>(null);
  const [recordModal, setRecordModal] = useState<KpiMetric | null>(null);
  const [form] = Form.useForm();
  const [recordForm] = Form.useForm();

  const { data: metrics = [], isLoading } = useQuery({ queryKey: ['kpi-metrics'], queryFn: () => okrApi.listMetrics() });

  const createMetric = useMutation({
    mutationFn: okrApi.createMetric,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['kpi-metrics'] }); qc.invalidateQueries({ queryKey: ['okr-stats'] }); closeModal(); },
  });
  const deleteMetric = useMutation({
    mutationFn: okrApi.deleteMetric,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['kpi-metrics'] }); qc.invalidateQueries({ queryKey: ['okr-stats'] }); },
  });
  const addRecord = useMutation({
    mutationFn: ({ metricId, ...v }: any) => okrApi.addKpiRecord(metricId, v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['kpi-metrics'] }); setRecordModal(null); recordForm.resetFields(); },
  });

  function closeModal() { setModalOpen(false); setEditing(null); form.resetFields(); }

  const FREQ_LABEL: Record<string, string> = { MONTHLY: 'Hàng tháng', QUARTERLY: 'Hàng quý', YEARLY: 'Hàng năm' };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); form.setFieldsValue({ frequency: 'MONTHLY' }); setModalOpen(true); }}>
          Thêm KPI
        </Button>
      </div>

      <Row gutter={[16, 16]}>
        {isLoading ? null : metrics.map(metric => {
          const lastRecord = metric.records[0];
          const lastValue  = lastRecord ? Number(lastRecord.value) : null;
          const target     = metric.targetValue != null ? Number(metric.targetValue) : null;
          const pct        = target && lastValue != null ? Math.min(100, Math.round((lastValue / target) * 100)) : null;
          const color      = pct == null ? '#94A3B8' : pct >= 80 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444';

          return (
            <Col xs={24} sm={12} lg={8} key={metric.id}>
              <div style={{ background: bgCard, border: `1px solid ${borderColor}`, borderRadius: 10, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div>
                    <Text style={{ color: textPrimary, fontWeight: 600, display: 'block' }}>{metric.name}</Text>
                    <Text style={{ color: textMuted, fontSize: 12 }}>{FREQ_LABEL[metric.frequency]}</Text>
                  </div>
                  <Space>
                    <Button type="text" size="small" icon={<PlusOutlined />} style={{ color: linkColor }}
                      onClick={() => { setRecordModal(metric); recordForm.resetFields(); recordForm.setFieldValue('period', dayjs().format('YYYY-MM')); }} />
                    <Button type="text" size="small" icon={<DeleteOutlined />} style={{ color: '#EF4444' }}
                      onClick={() => confirmDelete({ itemName: metric.name, onConfirm: () => deleteMetric.mutate(metric.id) })} />
                  </Space>
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
                  <Text style={{ fontSize: 26, fontWeight: 700, color }}>
                    {lastValue != null ? lastValue.toLocaleString() : '—'}
                  </Text>
                  {metric.unit && <Text style={{ color: textMuted }}>{metric.unit}</Text>}
                  {target && <Text style={{ color: textMuted, fontSize: 13 }}>/ {target.toLocaleString()}</Text>}
                </div>

                {pct != null && (
                  <Progress percent={pct} strokeColor={color} size="small" showInfo={false} />
                )}

                {lastRecord && (
                  <Text style={{ color: textMuted, fontSize: 11, display: 'block', marginTop: 4 }}>
                    Kỳ gần nhất: {lastRecord.period}
                  </Text>
                )}

                {metric.records.length > 1 && (
                  <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {metric.records.slice(0, 6).reverse().map(r => (
                      <Tooltip key={r.period} title={`${r.period}: ${Number(r.value).toLocaleString()}`}>
                        <div style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: target ? (Number(r.value) / target >= 0.8 ? '#10B981' : Number(r.value) / target >= 0.5 ? '#F59E0B' : '#EF4444') : '#6366F1',
                        }} />
                      </Tooltip>
                    ))}
                  </div>
                )}
              </div>
            </Col>
          );
        })}
      </Row>

      {/* Create Metric Modal */}
      <CenteredModal open={modalOpen} onCancel={closeModal} title="Thêm KPI metric" footer={null} width={480}>
        <Form form={form} layout="vertical" onFinish={v => createMetric.mutate(v)}>
          <Form.Item name="name" label="Tên KPI" rules={[{ required: true }]}>
            <Input placeholder="VD: Tỷ lệ giữ chân khách hàng" maxLength={200} />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <TextArea rows={2} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={10}>
              <Form.Item name="unit" label="Đơn vị">
                <Input placeholder="VD: %, người, triệu đ" />
              </Form.Item>
            </Col>
            <Col span={7}>
              <Form.Item name="targetValue" label="Target">
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col span={7}>
              <Form.Item name="frequency" label="Tần suất">
                <Select options={[
                  { value: 'MONTHLY',   label: 'Tháng' },
                  { value: 'QUARTERLY', label: 'Quý' },
                  { value: 'YEARLY',    label: 'Năm' },
                ]} />
              </Form.Item>
            </Col>
          </Row>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={closeModal}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={createMetric.isPending}>Tạo KPI</Button>
          </div>
        </Form>
      </CenteredModal>

      {/* Add Record Modal */}
      <CenteredModal open={!!recordModal} onCancel={() => setRecordModal(null)}
        title={`Nhập số liệu — ${recordModal?.name}`} footer={null} width={380}>
        <Form form={recordForm} layout="vertical"
          onFinish={v => addRecord.mutate({ metricId: recordModal!.id, ...v })}>
          <Form.Item name="period" label="Kỳ (YYYY-MM hoặc YYYY-QN)" rules={[{ required: true }]}>
            <Input placeholder="VD: 2026-05 hoặc 2026-Q2" />
          </Form.Item>
          <Form.Item name="value" label={`Giá trị${recordModal?.unit ? ` (${recordModal.unit})` : ''}`} rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item name="notes" label="Ghi chú">
            <TextArea rows={2} />
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setRecordModal(null)}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={addRecord.isPending}>Lưu</Button>
          </div>
        </Form>
      </CenteredModal>
    </>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function OkrPage() {
  const { textMuted } = useThemePalette();
  const { data: stats } = useQuery({ queryKey: ['okr-stats'], queryFn: okrApi.stats });

  return (
    <div style={{ padding: 24 }}>
      <PageHeader title="OKR & KPI" icon={<TrophyOutlined />} iconColor="#6366F1" />

      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={5}><StatCard label="Tổng Objectives" value={stats?.totalObj ?? 0} color="#6366F1" icon={<AimOutlined />} /></Col>
        <Col xs={12} sm={5}><StatCard label="Đang hoạt động" value={stats?.activeObj ?? 0} color="#10B981" icon={<CheckCircleOutlined />} /></Col>
        <Col xs={12} sm={5}><StatCard label="Key Results" value={stats?.totalKr ?? 0} color="#3B82F6" icon={<LineChartOutlined />} /></Col>
        <Col xs={12} sm={5}><StatCard label="Tiến độ TB" value={`${stats?.avgProgress ?? 0}%`} color="#F59E0B" icon={<TrophyOutlined />} /></Col>
        <Col xs={12} sm={4}><StatCard label="KPI đang theo dõi" value={stats?.kpiCount ?? 0} color="#F97316" icon={<ClockCircleOutlined />} /></Col>
      </Row>

      <Tabs defaultActiveKey="okr" items={[
        { key: 'okr', label: 'OKR Objectives', children: <OkrTab /> },
        { key: 'kpi', label: 'KPI Dashboard', children: <KpiTab /> },
      ]} />
    </div>
  );
}
