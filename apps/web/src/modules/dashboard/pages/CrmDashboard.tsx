import { Row, Col, Table, Tag } from 'antd';
import {
  FunnelPlotOutlined,
  TrophyOutlined,
  DollarOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useThemePalette } from '../../hooks/useThemePalette';
import { StatCard } from '../../components/ui/StatCard';
import { PageHeader } from '../../components/ui/PageHeader';
import { dashboardV3Api } from '../../api/dashboard-v3';
import { apiClient } from '../../api/client';

const STAGE_COLORS: Record<string, string> = {
  QUALIFICATION: '#6366F1', PROPOSAL: '#3B82F6', NEGOTIATION: '#F59E0B', WON: '#10B981', LOST: '#EF4444',
};

const STAGE_LABELS: Record<string, string> = {
  QUALIFICATION: 'Qualification', PROPOSAL: 'Proposal', NEGOTIATION: 'Negotiation', WON: 'Won', LOST: 'Lost',
};

interface DealAnalyticsStage { stage: string; count: number; totalValue: number }
interface WinRateData { winRate: number; won: number; total: number }
interface AgingDeal { id: string; title: string; stage: string; ageDays: number; value?: string }

function formatMillion(v: number) {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

export default function CrmDashboard() {
  const { bgContainer, borderColor, textPrimary, textMuted, isDark } = useThemePalette();
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ['dashboard-crm'],
    queryFn: dashboardV3Api.getCrm,
    refetchInterval: 60_000,
  });

  const { data: byStage } = useQuery<DealAnalyticsStage[]>({
    queryKey: ['crm-by-stage'],
    queryFn: () => apiClient.get<DealAnalyticsStage[]>('/crm/analytics/pipeline-by-stage').then(r => r.data),
  });

  // winRate derive từ crm summary — không cần query riêng
  const winRate: WinRateData = {
    winRate: data?.winRate ?? 0,
    avgCycleTimeDays: 0,
  };

  const { data: aging } = useQuery<AgingDeal[]>({
    queryKey: ['crm-aging'],
    queryFn: () => apiClient.get<AgingDeal[]>('/crm/analytics/aging').then(r => r.data),
  });

  const stageChartData = (byStage ?? []).map(s => ({
    stage: STAGE_LABELS[s.stage] ?? s.stage,
    stageKey: s.stage,
    count: s.count,
    color: STAGE_COLORS[s.stage] ?? '#94A3B8',
  }));

  const agingColumns = [
    {
      title: 'Deal',
      dataIndex: 'title',
      ellipsis: true,
      render: (v: string) => <span style={{ color: textPrimary, fontSize: 13 }}>{v}</span>,
    },
    {
      title: 'Stage',
      dataIndex: 'stage',
      width: 110,
      render: (v: string) => (
        <Tag style={isDark ? { background: `${STAGE_COLORS[v] ?? '#94A3B8'}22`, color: STAGE_COLORS[v] ?? '#94A3B8', borderColor: `${STAGE_COLORS[v] ?? '#94A3B8'}55`, fontSize: 11 } : { fontSize: 11 }}>
          {STAGE_LABELS[v] ?? v}
        </Tag>
      ),
    },
    {
      title: 'Ngày cũ',
      dataIndex: 'ageDays',
      width: 80,
      render: (v: number) => <span style={{ color: v > 30 ? '#EF4444' : textMuted, fontSize: 13, fontWeight: v > 30 ? 600 : 400 }}>{v}d</span>,
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Dashboard CRM"
        icon={<FunnelPlotOutlined />}
        iconColor="#3B82F6"
        greeting
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="Leads đang mở"
            value={data?.openLeads ?? 0}
            color="#6366F1"
            icon={<FunnelPlotOutlined />}
            onClick={() => navigate('/crm/leads?status=NEW')}
          />
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="Deals đang chạy"
            value={data?.activeDeals ?? 0}
            color="#3B82F6"
            icon={<TrophyOutlined />}
            onClick={() => navigate('/crm/deals')}
          />
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="Win Rate"
            value={`${winRate?.winRate ?? 0}%`}
            color="#10B981"
            icon={<TrophyOutlined />}
            subValue={winRate ? `${winRate.won}/${winRate.total} deals` : 'Chưa có dữ liệu'}
          />
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="Pipeline value"
            value={data ? formatMillion(data.totalPipelineValue) : '0'}
            color="#F97316"
            icon={<DollarOutlined />}
            subValue="VNĐ"
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <div style={{
            background: bgContainer,
            border: `1px solid ${borderColor}`,
            borderRadius: 12,
            padding: '16px 20px',
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: textPrimary, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <FunnelPlotOutlined style={{ color: '#3B82F6' }} />
              Phân bổ Deal theo giai đoạn
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stageChartData.length > 0 ? stageChartData : [{ stage: 'Chưa có dữ liệu', stageKey: '', count: 0, color: '#94A3B8' }]} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#E2E8F0'} />
                <XAxis dataKey="stage" tick={{ fontSize: 12, fill: textMuted as string }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: textMuted as string }} />
                <RTooltip
                  contentStyle={{
                    background: bgContainer,
                    border: `1px solid ${borderColor}`,
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" name="Deals" radius={[4, 4, 0, 0]}>
                  {stageChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Col>

        <Col xs={24} lg={10}>
          <div style={{
            background: bgContainer,
            border: `1px solid ${borderColor}`,
            borderRadius: 12,
            padding: '16px 20px',
            height: '100%',
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: textPrimary, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <ClockCircleOutlined style={{ color: '#EF4444' }} />
              Top deal cũ nhất
            </div>
            <Table
              dataSource={(aging ?? []).slice(0, 5)}
              columns={agingColumns}
              rowKey="id"
              size="small"
              pagination={false}
              locale={{ emptyText: <span style={{ color: textMuted }}>Không có dữ liệu</span> }}
            />
          </div>
        </Col>
      </Row>
    </div>
  );
}
