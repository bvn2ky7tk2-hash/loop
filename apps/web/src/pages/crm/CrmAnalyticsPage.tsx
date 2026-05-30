import { useState } from 'react';
import { Row, Col, Table, Typography, Tag, Avatar, Space } from 'antd';
import {
  FunnelPlotOutlined,
  TrophyOutlined,
  DollarOutlined,
  RiseOutlined,
  ClockCircleOutlined,
  UserOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip,
  ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import { useThemePalette } from '../../hooks/useThemePalette';
import { SparklineCard } from '../../components/ui/SparklineCard';
import { PageHeader } from '../../components/ui/PageHeader';

const { Text } = Typography;

// TODO: fetch /crm/analytics/summary
const MOCK_TOTAL_DEALS = 142;
const MOCK_WIN_RATE = 34;
const MOCK_AVG_DEAL_SIZE = '85M';
const MOCK_PIPELINE_VALUE = '12.1B';

const MOCK_SPARKLINE_DEALS = [
  { day: 'T2', value: 18 }, { day: 'T3', value: 22 }, { day: 'T4', value: 19 },
  { day: 'T5', value: 26 }, { day: 'T6', value: 24 }, { day: 'T7', value: 28 },
  { day: 'CN', value: 5 },
];
const MOCK_SPARKLINE_WINRATE = [
  { day: 'T1', value: 28 }, { day: 'T2', value: 31 }, { day: 'T3', value: 30 },
  { day: 'T4', value: 34 }, { day: 'T5', value: 33 }, { day: 'T6', value: 36 },
  { day: 'T7', value: 34 },
];
const MOCK_SPARKLINE_AVG = [
  { day: 'T1', value: 70 }, { day: 'T2', value: 80 }, { day: 'T3', value: 75 },
  { day: 'T4', value: 90 }, { day: 'T5', value: 85 }, { day: 'T6', value: 92 },
  { day: 'T7', value: 85 },
];
const MOCK_SPARKLINE_PIPELINE = [
  { day: 'T1', value: 9 }, { day: 'T2', value: 10 }, { day: 'T3', value: 9 },
  { day: 'T4', value: 11 }, { day: 'T5', value: 12 }, { day: 'T6', value: 12 },
  { day: 'T7', value: 12 },
];

// TODO: fetch /crm/analytics/funnel
const MOCK_FUNNEL = [
  { stage: 'Prospect',     count: 58, value: 2_900_000_000, color: '#6366F1' },
  { stage: 'Qualification',count: 41, value: 4_100_000_000, color: '#3B82F6' },
  { stage: 'Proposal',     count: 27, value: 5_400_000_000, color: '#F59E0B' },
  { stage: 'Negotiation',  count: 16, value: 6_400_000_000, color: '#F97316' },
  { stage: 'Won',          count: 14, value: 7_000_000_000, color: '#10B981' },
  { stage: 'Lost',         count:  9, value: 1_800_000_000, color: '#EF4444' },
];

// TODO: fetch /crm/analytics/at-risk (deals không activity > 30 ngày)
const MOCK_AT_RISK = [
  { id: '1', title: 'ERP upgrade — Công ty ABC',    stage: 'Negotiation', ageDays: 45, value: '2.5B', owner: 'Minh Hoàng' },
  { id: '2', title: 'Cloud migration — CTCP XYZ',   stage: 'Proposal',    ageDays: 38, value: '1.8B', owner: 'Thu Hương' },
  { id: '3', title: 'CRM implementation — Bắc Nam', stage: 'Qualification',ageDays:35, value: '900M', owner: 'Thanh Long' },
  { id: '4', title: 'Security audit — VinhPhat',    stage: 'Proposal',    ageDays: 32, value: '450M', owner: 'Ngọc Ánh' },
  { id: '5', title: 'BI dashboard — Delta Group',   stage: 'Negotiation', ageDays: 31, value: '1.2B', owner: 'Khánh Toàn' },
];

// TODO: fetch /crm/analytics/recent-activities
const MOCK_ACTIVITIES = [
  { id: '1', type: 'call',    actor: 'Minh Hoàng', target: 'ABC Corp',      time: '10 phút trước',  color: '#6366F1' },
  { id: '2', type: 'email',   actor: 'Thu Hương',  target: 'XYZ Ltd',       time: '25 phút trước',  color: '#3B82F6' },
  { id: '3', type: 'meeting', actor: 'Thanh Long', target: 'Bắc Nam Co.',   time: '1 giờ trước',    color: '#F59E0B' },
  { id: '4', type: 'note',    actor: 'Ngọc Ánh',   target: 'VinhPhat Inc.', time: '2 giờ trước',    color: '#10B981' },
  { id: '5', type: 'deal',    actor: 'Khánh Toàn', target: 'Delta Group',   time: '3 giờ trước',    color: '#F97316' },
];

// TODO: fetch /crm/analytics/top-sales
const MOCK_TOP_SALES = [
  { id: '1', name: 'Minh Hoàng',  wonValue: '5.2B', deals: 12, winRate: 48 },
  { id: '2', name: 'Thu Hương',   wonValue: '4.8B', deals: 10, winRate: 44 },
  { id: '3', name: 'Thanh Long',  wonValue: '3.9B', deals:  9, winRate: 39 },
  { id: '4', name: 'Ngọc Ánh',    wonValue: '3.1B', deals:  8, winRate: 36 },
  { id: '5', name: 'Khánh Toàn',  wonValue: '2.7B', deals:  7, winRate: 35 },
];

function formatValue(v: number) {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}M`;
  return String(v);
}

const STAGE_COLOR_MAP: Record<string, string> = {
  Prospect: '#6366F1', Qualification: '#3B82F6', Proposal: '#F59E0B',
  Negotiation: '#F97316', Won: '#10B981', Lost: '#EF4444',
};

const ACTIVITY_LABEL: Record<string, string> = {
  call: 'Gọi điện', email: 'Email', meeting: 'Gặp mặt', note: 'Ghi chú', deal: 'Deal',
};

export default function CrmAnalyticsPage() {
  const { bgContainer, borderColor, textPrimary, textMuted, isDark } = useThemePalette();
  const [_selectedStage, setSelectedStage] = useState<string | null>(null);

  const cardStyle = {
    background: bgContainer,
    border: `1px solid ${borderColor}`,
    borderRadius: 12,
    padding: '16px 20px',
  };

  const sectionTitle = (icon: React.ReactNode, label: string, color: string) => (
    <div style={{ fontSize: 14, fontWeight: 600, color: textPrimary, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ color }}>{icon}</span>
      {label}
    </div>
  );

  // At-risk table columns
  const atRiskColumns = [
    {
      title: 'Deal',
      dataIndex: 'title',
      ellipsis: true,
      render: (v: string) => <Text style={{ color: textPrimary, fontSize: 13 }}>{v}</Text>,
    },
    {
      title: 'Stage',
      dataIndex: 'stage',
      width: 120,
      render: (v: string) => {
        const c = STAGE_COLOR_MAP[v] ?? '#94A3B8';
        return (
          <Tag
            style={isDark ? { background: `${c}22`, color: c, borderColor: `${c}55`, fontSize: 11 } : { fontSize: 11 }}
            color={isDark ? undefined : 'default'}
          >
            {v}
          </Tag>
        );
      },
    },
    {
      title: 'Không có hoạt động',
      dataIndex: 'ageDays',
      width: 150,
      render: (v: number) => (
        <Text style={{ color: v > 40 ? '#EF4444' : v > 30 ? '#F59E0B' : textMuted, fontSize: 13, fontWeight: v > 30 ? 600 : 400 }}>
          {v} ngày
        </Text>
      ),
    },
    {
      title: 'Giá trị',
      dataIndex: 'value',
      width: 90,
      render: (v: string) => <Text style={{ color: textPrimary, fontSize: 13, fontWeight: 600 }}>{v}</Text>,
    },
    {
      title: 'Owner',
      dataIndex: 'owner',
      width: 120,
      render: (v: string) => <Text style={{ color: textMuted, fontSize: 13 }}>{v}</Text>,
    },
  ];

  // Top sales columns
  const topSalesColumns = [
    {
      title: '#',
      dataIndex: 'id',
      width: 36,
      render: (_: unknown, __: unknown, index: number) => (
        <Text style={{ color: index < 3 ? '#F59E0B' : textMuted, fontWeight: 700, fontSize: 14 }}>
          {index + 1}
        </Text>
      ),
    },
    {
      title: 'Sales',
      dataIndex: 'name',
      render: (v: string) => (
        <Space>
          <Avatar size={28} icon={<UserOutlined />} style={{ background: '#6366F1' }} />
          <Text style={{ color: textPrimary, fontSize: 13 }}>{v}</Text>
        </Space>
      ),
    },
    {
      title: 'Doanh số Won',
      dataIndex: 'wonValue',
      width: 120,
      render: (v: string) => <Text style={{ color: '#10B981', fontWeight: 700, fontSize: 13 }}>{v}</Text>,
    },
    {
      title: 'Deals',
      dataIndex: 'deals',
      width: 70,
      render: (v: number) => <Text style={{ color: textPrimary, fontSize: 13 }}>{v}</Text>,
    },
    {
      title: 'Win %',
      dataIndex: 'winRate',
      width: 80,
      render: (v: number) => (
        <Text style={{ color: v >= 40 ? '#10B981' : v >= 30 ? '#F59E0B' : '#EF4444', fontWeight: 600, fontSize: 13 }}>
          {v}%
        </Text>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="CRM Analytics"
        icon={<FunnelPlotOutlined />}
        iconColor="#DC2626"
      />

      {/* Row 1 — 4 SparklineCard filled */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <SparklineCard
            label="Tổng Deals"
            value={MOCK_TOTAL_DEALS}
            delta={8}
            data={MOCK_SPARKLINE_DEALS}
            variant="bar"
            color="#6366F1"
            icon={<FunnelPlotOutlined />}
            filled
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <SparklineCard
            label="Win Rate"
            value={`${MOCK_WIN_RATE}%`}
            delta={3}
            data={MOCK_SPARKLINE_WINRATE}
            variant="line"
            color="#10B981"
            icon={<TrophyOutlined />}
            filled
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <SparklineCard
            label="Avg Deal Size"
            value={MOCK_AVG_DEAL_SIZE}
            unit="VNĐ"
            delta={5}
            data={MOCK_SPARKLINE_AVG}
            variant="bar"
            color="#3B82F6"
            icon={<DollarOutlined />}
            filled
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <SparklineCard
            label="Pipeline Value"
            value={MOCK_PIPELINE_VALUE}
            unit="VNĐ"
            delta={12}
            data={MOCK_SPARKLINE_PIPELINE}
            variant="line"
            color="#F97316"
            icon={<RiseOutlined />}
            filled
          />
        </Col>
      </Row>

      {/* Row 2 — Funnel chart */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24}>
          <div style={cardStyle}>
            {sectionTitle(<FunnelPlotOutlined />, 'Phễu bán hàng theo giai đoạn', '#6366F1')}
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={MOCK_FUNNEL}
                margin={{ top: 4, right: 24, left: 0, bottom: 0 }}
                onClick={(d) => d && setSelectedStage(d.activeLabel ?? null)}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#E2E8F0'} vertical={false} />
                <XAxis
                  dataKey="stage"
                  tick={{ fontSize: 12, fill: textMuted as string }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="count"
                  orientation="left"
                  tick={{ fontSize: 11, fill: textMuted as string }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  label={{ value: 'Số deals', angle: -90, position: 'insideLeft', fontSize: 11, fill: textMuted as string, dy: 40 }}
                />
                <YAxis
                  yAxisId="value"
                  orientation="right"
                  tick={{ fontSize: 11, fill: textMuted as string }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => formatValue(v)}
                  label={{ value: 'Giá trị', angle: 90, position: 'insideRight', fontSize: 11, fill: textMuted as string, dy: -40 }}
                />
                <RTooltip
                  contentStyle={{
                    background: bgContainer,
                    border: `1px solid ${borderColor}`,
                    borderRadius: 8,
                    fontSize: 12,
                    color: textPrimary as string,
                  }}
                  formatter={(value: number, name: string) =>
                    name === 'count'
                      ? [`${value} deals`, 'Số lượng']
                      : [formatValue(value), 'Giá trị']
                  }
                />
                <Bar yAxisId="count" dataKey="count" name="count" radius={[6, 6, 0, 0]} maxBarSize={64}>
                  {MOCK_FUNNEL.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
                <Bar yAxisId="value" dataKey="value" name="value" radius={[4, 4, 0, 0]} maxBarSize={40} opacity={0.35}>
                  {MOCK_FUNNEL.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Col>
      </Row>

      {/* Row 3 — Deals at risk + Recent activities */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={14}>
          <div style={{ ...cardStyle, height: '100%' }}>
            {sectionTitle(<ClockCircleOutlined />, 'Deals at risk (>30 ngày không có hoạt động)', '#EF4444')}
            <Table
              dataSource={MOCK_AT_RISK}
              columns={atRiskColumns}
              rowKey="id"
              size="small"
              pagination={false}
              locale={{ emptyText: <Text style={{ color: textMuted }}>Không có dữ liệu</Text> }}
            />
          </div>
        </Col>

        <Col xs={24} lg={10}>
          <div style={{ ...cardStyle, height: '100%' }}>
            {sectionTitle(<ThunderboltOutlined />, 'Hoạt động gần đây', '#F59E0B')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {MOCK_ACTIVITIES.map((act) => (
                <div key={act.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: `${act.color}22`,
                    border: `1.5px solid ${act.color}55`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                    fontSize: 13, color: act.color,
                  }}>
                    <UserOutlined />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 13, color: textPrimary, fontWeight: 600 }}>{act.actor}</Text>
                      <Tag
                        style={isDark
                          ? { background: `${act.color}22`, color: act.color, borderColor: `${act.color}55`, fontSize: 10, padding: '0 5px' }
                          : { fontSize: 10 }}
                        color={isDark ? undefined : 'default'}
                      >
                        {ACTIVITY_LABEL[act.type] ?? act.type}
                      </Tag>
                    </div>
                    <Text style={{ fontSize: 12, color: textMuted }}>{act.target}</Text>
                  </div>
                  <Text style={{ fontSize: 11, color: textMuted, flexShrink: 0 }}>{act.time}</Text>
                </div>
              ))}
            </div>
          </div>
        </Col>
      </Row>

      {/* Row 4 — Top Sales leaderboard */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <div style={cardStyle}>
            {sectionTitle(<TrophyOutlined />, 'Top 5 Sales — Doanh số Won', '#F59E0B')}
            <Table
              dataSource={MOCK_TOP_SALES}
              columns={topSalesColumns}
              rowKey="id"
              size="small"
              pagination={false}
              locale={{ emptyText: <Text style={{ color: textMuted }}>Không có dữ liệu</Text> }}
            />
          </div>
        </Col>

        <Col xs={24} lg={10}>
          <div style={cardStyle}>
            {sectionTitle(<RiseOutlined />, 'Win Rate theo Sales', '#10B981')}
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={MOCK_TOP_SALES}
                layout="vertical"
                margin={{ top: 2, right: 24, left: 8, bottom: 0 }}
              >
                <XAxis type="number" tick={{ fontSize: 11, fill: textMuted as string }} tickFormatter={(v) => `${v}%`} domain={[0, 60]} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: textPrimary as string }} width={90} />
                <RTooltip
                  contentStyle={{
                    background: bgContainer,
                    border: `1px solid ${borderColor}`,
                    borderRadius: 8, fontSize: 12, color: textPrimary as string,
                  }}
                  formatter={(v: number) => [`${v}%`, 'Win Rate']}
                />
                <Bar dataKey="winRate" radius={[0, 4, 4, 0]} maxBarSize={18}>
                  {MOCK_TOP_SALES.map((entry, i) => (
                    <Cell key={i} fill={entry.winRate >= 40 ? '#10B981' : entry.winRate >= 35 ? '#F59E0B' : '#EF4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Col>
      </Row>
    </div>
  );
}
