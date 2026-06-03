import { useState } from 'react';
import {
  Row, Col, Tabs, Table, Select, Tag, Typography, Progress,
  Button, Form, InputNumber, Input, Space, Tooltip, Popconfirm,
} from 'antd';
import {
  FundOutlined, DollarOutlined, TrophyOutlined, AimOutlined,
  PlusOutlined, EditOutlined, DeleteOutlined, RiseOutlined,
} from '@ant-design/icons';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip,
  ResponsiveContainer, Legend, CartesianGrid,
} from 'recharts';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useThemePalette } from '../../hooks/useThemePalette';
import { usePagination } from '../../hooks/usePagination';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { CenteredModal } from '../../components/ui/CenteredModal';
import { FilterBar } from '../../components/FilterBar';
import { forecastApi, type DealStage, type RevenueTarget } from '../../api/forecast';

const { Text } = Typography;

const STAGE_LABEL: Record<DealStage, string> = {
  QUALIFICATION: 'Xác định nhu cầu',
  PROPOSAL:      'Đề xuất',
  NEGOTIATION:   'Đàm phán',
  WON:           'Thắng',
  LOST:          'Mất',
};

const STAGE_COLOR: Record<DealStage, string> = {
  QUALIFICATION: '#6366F1',
  PROPOSAL:      '#3B82F6',
  NEGOTIATION:   '#F59E0B',
  WON:           '#10B981',
  LOST:          '#EF4444',
};

const STAGE_DARK_STYLE: Record<DealStage, React.CSSProperties> = {
  QUALIFICATION: { background: 'rgba(99,102,241,0.15)', color: '#A5B4FC', borderColor: 'rgba(99,102,241,0.3)' },
  PROPOSAL:      { background: 'rgba(59,130,246,0.15)', color: '#93C5FD', borderColor: 'rgba(59,130,246,0.3)' },
  NEGOTIATION:   { background: 'rgba(245,158,11,0.15)', color: '#FCD34D', borderColor: 'rgba(245,158,11,0.3)' },
  WON:           { background: 'rgba(16,185,129,0.15)', color: '#6EE7B7', borderColor: 'rgba(16,185,129,0.3)' },
  LOST:          { background: 'rgba(239,68,68,0.15)',  color: '#FCA5A5', borderColor: 'rgba(239,68,68,0.3)' },
};

function fmt(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000)     return `${(v / 1_000_000).toFixed(0)}M`;
  return v.toLocaleString('vi-VN');
}

// ─── Overview Tab ────────────────────────────────────────────────────────────
function OverviewTab() {
  const [year, setYear] = useState(2026);
  const { isDark, textPrimary, textMuted, bgCard, bgContainer, borderColor } = useThemePalette();

  const { data: monthly = [] } = useQuery({
    queryKey: ['forecast-monthly', year],
    queryFn: () => forecastApi.monthly(year),
  });
  const { data: quarterly = [] } = useQuery({
    queryKey: ['forecast-quarterly', year],
    queryFn: () => forecastApi.quarterly(year),
  });
  const { data: pipeline = [] } = useQuery({
    queryKey: ['forecast-pipeline'],
    queryFn: () => forecastApi.pipeline(),
  });

  const chartData = monthly.map(m => ({
    name:       m.month,
    'Mục tiêu': Math.round(m.target / 1e9 * 10) / 10,
    'Dự báo':   Math.round(m.forecast / 1e9 * 10) / 10,
    'Thực tế':  Math.round(m.actual / 1e9 * 10) / 10,
  }));

  const qData = quarterly.map(q => ({
    name:       q.quarter,
    'Mục tiêu': Math.round(q.target / 1e9),
    'Dự báo':   Math.round(q.forecast / 1e9),
    'Thực tế':  Math.round(q.actual / 1e9),
  }));

  const activePipeline = pipeline.filter(p => !['WON', 'LOST'].includes(p.stage));
  const maxTotal = Math.max(...activePipeline.map(p => p.total), 1);

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Select
          value={year}
          onChange={setYear}
          options={[2025, 2026, 2027].map(y => ({ value: y, label: `Năm ${y}` }))}
          style={{ width: 120 }}
        />
      </div>

      {/* Monthly chart */}
      <div style={{ background: bgCard, border: `1px solid ${borderColor}`, borderRadius: 8, padding: 20, marginBottom: 20 }}>
        <Text style={{ color: textPrimary, fontWeight: 600, fontSize: 15, display: 'block', marginBottom: 16 }}>
          Doanh thu theo tháng (tỷ VNĐ)
        </Text>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ left: 0, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#E2E8F0'} />
            <XAxis dataKey="name" tick={{ fill: textMuted as string, fontSize: 12 }} />
            <YAxis tick={{ fill: textMuted as string, fontSize: 12 }} />
            <RTooltip
              contentStyle={{ background: bgContainer, border: `1px solid ${borderColor}`, borderRadius: 8 }}
              labelStyle={{ color: textPrimary }}
              formatter={(v) => [`${v}B VNĐ`] as unknown as [string, string]}
            />
            <Legend />
            <Bar dataKey="Mục tiêu" fill="#94A3B8" radius={[4,4,0,0]} />
            <Bar dataKey="Dự báo"   fill="#6366F1" radius={[4,4,0,0]} />
            <Bar dataKey="Thực tế"  fill="#10B981" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <Row gutter={16}>
        {/* Quarterly */}
        <Col xs={24} lg={14}>
          <div style={{ background: bgCard, border: `1px solid ${borderColor}`, borderRadius: 8, padding: 20 }}>
            <Text style={{ color: textPrimary, fontWeight: 600, fontSize: 15, display: 'block', marginBottom: 16 }}>
              Theo quý (tỷ VNĐ)
            </Text>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={qData}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#E2E8F0'} />
                <XAxis dataKey="name" tick={{ fill: textMuted as string, fontSize: 12 }} />
                <YAxis tick={{ fill: textMuted as string, fontSize: 12 }} />
                <RTooltip
                  contentStyle={{ background: bgContainer, border: `1px solid ${borderColor}`, borderRadius: 8 }}
                  formatter={(v) => [`${v}B VNĐ`] as unknown as [string, string]}
                />
                <Legend />
                <Bar dataKey="Mục tiêu" fill="#94A3B8" radius={[4,4,0,0]} />
                <Bar dataKey="Dự báo"   fill="#3B82F6" radius={[4,4,0,0]} />
                <Bar dataKey="Thực tế"  fill="#10B981" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Col>

        {/* Pipeline Funnel */}
        <Col xs={24} lg={10}>
          <div style={{ background: bgCard, border: `1px solid ${borderColor}`, borderRadius: 8, padding: 20, height: '100%' }}>
            <Text style={{ color: textPrimary, fontWeight: 600, fontSize: 15, display: 'block', marginBottom: 16 }}>
              Pipeline theo giai đoạn (đang hoạt động)
            </Text>
            {activePipeline.map(p => (
              <div key={p.stage} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ color: textPrimary, fontSize: 13 }}>{STAGE_LABEL[p.stage as DealStage]}</Text>
                  <Text style={{ color: textMuted, fontSize: 12 }}>{p.count} giao dịch · {fmt(p.total)}</Text>
                </div>
                <Progress
                  percent={Math.round((p.total / maxTotal) * 100)}
                  strokeColor={STAGE_COLOR[p.stage as DealStage]}
                  trailColor={isDark ? '#334155' : '#E2E8F0'}
                  showInfo={false}
                  size="small"
                />
              </div>
            ))}
          </div>
        </Col>
      </Row>
    </div>
  );
}

// ─── Pipeline Tab ────────────────────────────────────────────────────────────
function PipelineTab() {
  const [stage, setStage] = useState<string | undefined>();
  const [month, setMonth] = useState<string | undefined>();
  const { isDark, textPrimary, textMuted, linkColor } = useThemePalette();
  const { page, pageSize, resetPage, paginationProps } = usePagination(20);

  const { data, isLoading } = useQuery({
    queryKey: ['forecast-deals', stage, month, page],
    queryFn: () => forecastApi.deals({ stage, month, page, limit: pageSize }),
  });

  const columns = [
    {
      title: 'Giao dịch',
      dataIndex: 'title',
      render: (v: string, r: any) => (
        <div>
          <Text style={{ color: textPrimary, fontWeight: 500 }}>{v}</Text>
          <br />
          <Text style={{ color: textMuted, fontSize: 12 }}>{r.code}</Text>
        </div>
      ),
    },
    {
      title: 'Giai đoạn',
      dataIndex: 'stage',
      width: 130,
      render: (v: DealStage) => (
        <Tag style={isDark ? STAGE_DARK_STYLE[v] : {}} color={isDark ? undefined : v === 'WON' ? 'success' : v === 'LOST' ? 'error' : 'processing'}>
          {STAGE_LABEL[v]}
        </Tag>
      ),
    },
    {
      title: 'Giá trị',
      dataIndex: 'value',
      width: 140,
      align: 'right' as const,
      render: (v: number) => <Text style={{ color: linkColor, fontWeight: 600 }}>{fmt(v)}</Text>,
    },
    {
      title: 'Xác suất',
      dataIndex: 'probability',
      width: 100,
      align: 'center' as const,
      render: (v: number) => <Text style={{ color: textMuted }}>{v}%</Text>,
    },
    {
      title: 'Dự báo',
      dataIndex: 'weightedValue',
      width: 140,
      align: 'right' as const,
      render: (v: number) => <Text style={{ color: '#10B981', fontWeight: 600 }}>{fmt(v)}</Text>,
    },
    {
      title: 'Dự kiến close',
      dataIndex: 'expectedCloseDate',
      width: 130,
      render: (v: string) => v
        ? <Text style={{ color: textMuted }}>{new Date(v).toLocaleDateString('vi-VN')}</Text>
        : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      title: 'Khách hàng',
      dataIndex: 'customer',
      render: (c?: { id: string; name: string }) => c
        ? <Text style={{ color: textPrimary }}>{c.name}</Text>
        : <Text style={{ color: textMuted }}>—</Text>,
    },
  ];

  const monthOptions = Array.from({ length: 9 }, (_, i) => {
    const d = new Date(2026, 3 + i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return { value: val, label: `T${d.getMonth() + 1}/${d.getFullYear()}` };
  });

  return (
    <>
      <FilterBar>
        <Select
          placeholder="Tất cả giai đoạn"
          allowClear
          value={stage}
          onChange={v => { setStage(v); resetPage(); }}
          options={Object.entries(STAGE_LABEL).map(([k, v]) => ({ value: k, label: v }))}
          style={{ width: 160 }}
        />
        <Select
          placeholder="Tháng"
          allowClear
          value={month}
          onChange={v => { setMonth(v); resetPage(); }}
          options={monthOptions}
          style={{ width: 140 }}
        />
      </FilterBar>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data?.data}
        loading={isLoading}
        pagination={paginationProps(data?.total, 'cơ hội')}
        size="middle"
      />
    </>
  );
}

// ─── Targets Tab ─────────────────────────────────────────────────────────────
function TargetsTab() {
  const [periodType, setPeriodType] = useState<'MONTHLY' | 'QUARTERLY'>('MONTHLY');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RevenueTarget | null>(null);
  const [form] = Form.useForm();
  const qc = useQueryClient();
  const { textPrimary, textMuted, linkColor } = useThemePalette();

  const { data: targets = [], isLoading } = useQuery({
    queryKey: ['forecast-targets', periodType],
    queryFn: () => forecastApi.listTargets(periodType),
  });

  const mutateSave = useMutation({
    mutationFn: (vals: any) =>
      editing
        ? forecastApi.updateTarget(editing.id, { target: vals.target * 1e9, notes: vals.notes })
        : forecastApi.upsertTarget({ period: vals.period, periodType, target: vals.target * 1e9, notes: vals.notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['forecast-targets'] });
      qc.invalidateQueries({ queryKey: ['forecast-monthly'] });
      qc.invalidateQueries({ queryKey: ['forecast-quarterly'] });
      qc.invalidateQueries({ queryKey: ['forecast-stats'] });
      setModalOpen(false);
      form.resetFields();
      setEditing(null);
    },
  });

  const mutateDelete = useMutation({
    mutationFn: (id: string) => forecastApi.deleteTarget(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forecast-targets'] }),
  });

  const openEdit = (t: RevenueTarget) => {
    setEditing(t);
    form.setFieldsValue({ period: t.period, target: Number(t.target) / 1e9, notes: t.notes ?? '' });
    setModalOpen(true);
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const columns = [
    {
      title: 'Kỳ',
      dataIndex: 'period',
      render: (v: string) => <Text style={{ color: textPrimary, fontWeight: 600 }}>{v}</Text>,
    },
    {
      title: 'Mục tiêu',
      dataIndex: 'target',
      align: 'right' as const,
      render: (v: number) => <Text style={{ color: linkColor, fontWeight: 600 }}>{fmt(Number(v))} ({(Number(v) / 1e9).toFixed(1)}B)</Text>,
    },
    {
      title: 'Đơn vị',
      dataIndex: 'currency',
      width: 80,
      render: (v: string) => <Text style={{ color: textMuted }}>{v}</Text>,
    },
    {
      title: 'Ghi chú',
      dataIndex: 'notes',
      render: (v: string) => <Text style={{ color: textMuted }}>{v || '—'}</Text>,
    },
    {
      title: '',
      width: 80,
      render: (_: any, r: RevenueTarget) => (
        <Space>
          <Tooltip title="Sửa">
            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          </Tooltip>
          <Tooltip title="Xóa">
            <Popconfirm
              title="Xóa target này?"
              onConfirm={() => mutateDelete.mutate(r.id)}
              okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}
            >
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  const periodOptions = periodType === 'MONTHLY'
    ? Array.from({ length: 12 }, (_, i) => {
        const m = String(i + 1).padStart(2, '0');
        return { value: `2026-${m}`, label: `T${i + 1}/2026` };
      })
    : ['Q1', 'Q2', 'Q3', 'Q4'].map(q => ({ value: `2026-${q}`, label: `2026-${q}` }));

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Select
          value={periodType}
          onChange={v => setPeriodType(v as any)}
          options={[{ value: 'MONTHLY', label: 'Theo tháng' }, { value: 'QUARTERLY', label: 'Theo quý' }]}
          style={{ width: 150 }}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Thêm target
        </Button>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={targets}
        loading={isLoading}
        pagination={false}
        size="middle"
      />

      <CenteredModal
        title={editing ? 'Cập nhật Mục tiêu Doanh thu' : 'Thêm Mục tiêu Doanh thu'}
        open={modalOpen}
        onClose={() => { setModalOpen(false); form.resetFields(); setEditing(null); }}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => { setModalOpen(false); form.resetFields(); setEditing(null); }}>Hủy</Button>
            <Button type="primary" loading={mutateSave.isPending} onClick={form.submit}>
              {editing ? 'Cập nhật' : 'Lưu'}
            </Button>
          </div>
        }
      >
        <Form form={form} layout="vertical" onFinish={mutateSave.mutate}>
          {!editing && (
            <Form.Item name="period" label="Kỳ" rules={[{ required: true }]}>
              <Select options={periodOptions} placeholder="Chọn kỳ" />
            </Form.Item>
          )}
          <Form.Item name="target" label="Mục tiêu (tỷ VNĐ)" rules={[{ required: true }]}>
            <InputNumber min={0} step={0.5} precision={1} style={{ width: '100%' }} placeholder="vd: 25.0" />
          </Form.Item>
          <Form.Item name="notes" label="Ghi chú">
            <Input.TextArea rows={2} placeholder="Ghi chú thêm..." />
          </Form.Item>
        </Form>
      </CenteredModal>
    </>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function ForecastPage() {
  const { data: stats } = useQuery({
    queryKey: ['forecast-stats'],
    queryFn: forecastApi.stats,
  });

  const achievePct = stats?.targetAchievementPct;
  const achieveColor = achievePct == null ? '#94A3B8'
    : achievePct >= 100 ? '#10B981'
    : achievePct >= 70  ? '#F59E0B'
    : '#EF4444';

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Sales Forecasting"
        icon={<RiseOutlined />}
        iconColor="#6366F1"
        actions={null}
      />

      {/* Stat Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <StatCard
            label="Pipeline (đang hoạt động)"
            value={fmt(stats?.pipelineTotal ?? 0)}
            color="#6366F1"
            icon={<FundOutlined />}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            label="Dự báo có trọng số"
            value={fmt(stats?.weightedForecast ?? 0)}
            color="#3B82F6"
            icon={<AimOutlined />}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            label="Thắng trong năm"
            value={fmt(stats?.wonYtd ?? 0)}
            color="#10B981"
            icon={<TrophyOutlined />}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            label={`Target tháng này${achievePct != null ? ` · ${achievePct}%` : ''}`}
            value={fmt(stats?.targetThisMonth ?? 0)}
            subValue={stats?.wonThisMonth ? `Đã đạt: ${fmt(stats.wonThisMonth)}` : undefined}
            color={achieveColor}
            icon={<DollarOutlined />}
          />
        </Col>
      </Row>

      <Tabs
        defaultActiveKey="overview"
        items={[
          { key: 'overview',  label: 'Tổng quan',       children: <OverviewTab /> },
          { key: 'pipeline',  label: 'Giao dịch Pipeline',   children: <PipelineTab /> },
          { key: 'targets',   label: 'Mục tiêu Doanh thu',   children: <TargetsTab /> },
        ]}
      />
    </div>
  );
}
