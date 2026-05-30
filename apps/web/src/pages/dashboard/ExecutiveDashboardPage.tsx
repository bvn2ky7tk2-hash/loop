import { useState } from 'react';
import { Row, Col, Typography, DatePicker, Card, List, Badge, Tooltip, Tag } from 'antd';
import {
  RiseOutlined,
  DollarOutlined,
  FundOutlined,
  PieChartOutlined,
  WarningOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  FieldTimeOutlined,
  WalletOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useThemePalette } from '../../hooks/useThemePalette';
import { SparklineCard } from '../../components/ui/SparklineCard';
import { PageHeader } from '../../components/ui/PageHeader';

const { Text } = Typography;
const { RangePicker } = DatePicker;

// ── Mock data ────────────────────────────────────────────────────────────────

const REVENUE_SPARKLINE = [
  { day: 'T1', value: 2100 },
  { day: 'T2', value: 2350 },
  { day: 'T3', value: 1980 },
  { day: 'T4', value: 2700 },
  { day: 'T5', value: 3100 },
  { day: 'T6', value: 2900 },
  { day: 'T7', value: 3400 },
];

const MARGIN_SPARKLINE = [
  { day: 'T1', value: 28 },
  { day: 'T2', value: 30 },
  { day: 'T3', value: 27 },
  { day: 'T4', value: 33 },
  { day: 'T5', value: 35 },
  { day: 'T6', value: 32 },
  { day: 'T7', value: 38 },
];

const PIPELINE_SPARKLINE = [
  { day: 'T1', value: 8500 },
  { day: 'T2', value: 9200 },
  { day: 'T3', value: 8800 },
  { day: 'T4', value: 10100 },
  { day: 'T5', value: 11200 },
  { day: 'T6', value: 10600 },
  { day: 'T7', value: 12400 },
];

const BUDGET_SPARKLINE = [
  { day: 'T1', value: 62 },
  { day: 'T2', value: 65 },
  { day: 'T3', value: 68 },
  { day: 'T4', value: 71 },
  { day: 'T5', value: 75 },
  { day: 'T6', value: 78 },
  { day: 'T7', value: 82 },
];

const PROJECT_PIE_DATA = [
  { name: 'Active', value: 14 },
  { name: 'Completed', value: 8 },
  { name: 'On-hold', value: 3 },
];
const PIE_COLORS = ['#10B981', '#6366F1', '#F59E0B'];

const AR_AGING_DATA = [
  { bucket: '0-30 ngày', amount: 4200 },
  { bucket: '31-60 ngày', amount: 2800 },
  { bucket: '61-90 ngày', amount: 1600 },
  { bucket: '> 90 ngày', amount: 900 },
];
const AR_COLORS = ['#10B981', '#F59E0B', '#F97316', '#EF4444'];

const EXPIRING_CONTRACTS = [
  { name: 'Nguyễn Văn An', type: 'Hợp đồng lao động', expiry: '2026-06-15' },
  { name: 'Trần Thị Bình', type: 'Hợp đồng lao động', expiry: '2026-06-22' },
  { name: 'Lê Hoàng Cường', type: 'Hợp đồng thời vụ', expiry: '2026-07-01' },
  { name: 'Phạm Thị Dung', type: 'Hợp đồng lao động', expiry: '2026-07-10' },
  { name: 'Võ Minh Đức', type: 'Hợp đồng tư vấn', expiry: '2026-07-18' },
];

const OVERDUE_INVOICES = [
  { code: 'INV-2026-041', customer: 'Công ty ABC', amount: 48_000_000, days: 35 },
  { code: 'INV-2026-037', customer: 'Tập đoàn XYZ', amount: 125_000_000, days: 52 },
  { code: 'INV-2026-029', customer: 'Cty TNHH DEF', amount: 23_500_000, days: 71 },
];

const PENDING_APPROVALS = [
  { module: 'Leave', label: 'Đơn nghỉ phép', count: 7, route: '/leaves', color: '#6366F1' },
  { module: 'OT', label: 'Đăng ký OT', count: 12, route: '/hr/overtime', color: '#F97316' },
  { module: 'Expense', label: 'Đề nghị thanh toán', count: 5, route: '/expenses', color: '#F59E0B' },
];

// ── Component ────────────────────────────────────────────────────────────────

export default function ExecutiveDashboardPage() {
  const { isDark, textPrimary, textMuted, bgContainer, bgCard, borderColor, linkColor } = useThemePalette();
  const navigate = useNavigate();

  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf('year'),
    dayjs(),
  ]);

  const axisColor = isDark ? '#888' : '#555';
  const gridColor = isDark ? '#334155' : '#f0f0f0';
  const tooltipBg = isDark ? '#1f2937' : '#ffffff';

  const chartCardStyle: React.CSSProperties = {
    borderRadius: 12,
    background: bgContainer,
    border: `1px solid ${borderColor}`,
  };

  const totalOverdue = OVERDUE_INVOICES.reduce((s, i) => s + i.amount, 0);

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Executive Command Center"
        icon={<FundOutlined />}
        iconColor="#6366F1"
        actions={
          <RangePicker
            value={dateRange}
            onChange={(v) => v && setDateRange(v as [dayjs.Dayjs, dayjs.Dayjs])}
            format="DD/MM/YYYY"
            allowClear={false}
          />
        }
      />

      {/* ── Row 1: Business Performance ────────────────────────────────────── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <SparklineCard
            label="Revenue YTD vs Target"
            value="34.8B"
            unit="VNĐ"
            delta={12}
            data={REVENUE_SPARKLINE}
            variant="bar"
            color="#10B981"
            icon={<RiseOutlined />}
            filled
            style={{ cursor: 'pointer' }}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <SparklineCard
            label="Gross Margin %"
            value="38"
            unit="%"
            delta={5}
            data={MARGIN_SPARKLINE}
            variant="line"
            color="#6366F1"
            icon={<PieChartOutlined />}
            filled
            style={{ cursor: 'pointer' }}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <SparklineCard
            label="Pipeline Value"
            value="124M"
            unit="VNĐ"
            delta={8}
            data={PIPELINE_SPARKLINE}
            variant="bar"
            color="#F97316"
            icon={<FundOutlined />}
            filled
            style={{ cursor: 'pointer' }}
            // Navigate to CRM deals
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <SparklineCard
            label="Budget Utilization %"
            value="82"
            unit="%"
            delta={-3}
            data={BUDGET_SPARKLINE}
            variant="line"
            color="#F59E0B"
            icon={<DollarOutlined />}
            filled
            style={{ cursor: 'pointer' }}
          />
        </Col>
      </Row>

      {/* ── Row 2: Operations charts ─────────────────────────────────────────── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {/* Project portfolio status — PieChart */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <span style={{ color: textPrimary, fontSize: 14, fontWeight: 600 }}>
                <ProjectPortfolioIcon /> Project Portfolio Status
              </span>
            }
            style={chartCardStyle}
          >
            <Row align="middle">
              <Col xs={24} sm={14}>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={PROJECT_PIE_DATA}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={42}
                      label={({ name, percent }) =>
                        `${name} ${Math.round((percent ?? 0) * 100)}%`
                      }
                      labelLine={false}
                    >
                      {PROJECT_PIE_DATA.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i]} />
                      ))}
                    </Pie>
                    <RTooltip
                      formatter={(v: number) => [v, 'Dự án']}
                      contentStyle={{
                        background: tooltipBg,
                        border: `1px solid ${borderColor}`,
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Legend
                      iconType="circle"
                      iconSize={10}
                      formatter={(v) => <span style={{ color: textPrimary, fontSize: 12 }}>{v}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Col>
              <Col xs={24} sm={10}>
                {PROJECT_PIE_DATA.map((item, i) => (
                  <div
                    key={item.name}
                    style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, alignItems: 'center' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 5, background: PIE_COLORS[i], flexShrink: 0 }} />
                      <Text style={{ color: textMuted, fontSize: 13 }}>{item.name}</Text>
                    </div>
                    <Text style={{ color: textPrimary, fontWeight: 700, fontSize: 16 }}>{item.value}</Text>
                  </div>
                ))}
                <div style={{ borderTop: `1px solid ${borderColor}`, paddingTop: 10, marginTop: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text style={{ color: textMuted, fontSize: 13 }}>Tổng dự án</Text>
                    <Text style={{ color: textPrimary, fontWeight: 700, fontSize: 18 }}>
                      {PROJECT_PIE_DATA.reduce((s, d) => s + d.value, 0)}
                    </Text>
                  </div>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>

        {/* AR Aging — BarChart */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <span style={{ color: textPrimary, fontSize: 14, fontWeight: 600 }}>
                <FileTextOutlined style={{ marginRight: 6, color: '#EF4444' }} />
                AR Aging (Công nợ phải thu)
              </span>
            }
            style={chartCardStyle}
          >
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={AR_AGING_DATA} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="bucket" tick={{ fill: axisColor, fontSize: 11 }} />
                <YAxis
                  tick={{ fill: axisColor, fontSize: 11 }}
                  tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`}
                />
                <RTooltip
                  formatter={(v: number) =>
                    [`${new Intl.NumberFormat('vi-VN').format(v)} VNĐ`, 'Tổng nợ']
                  }
                  contentStyle={{
                    background: tooltipBg,
                    border: `1px solid ${borderColor}`,
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                  {AR_AGING_DATA.map((_, i) => (
                    <Cell key={i} fill={AR_COLORS[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* ── Row 3: Risks & Actions ───────────────────────────────────────────── */}
      <Row gutter={[16, 16]}>
        {/* Contracts expiring in 60 days */}
        <Col xs={24} lg={8}>
          <Card
            title={
              <span style={{ color: textPrimary, fontSize: 14, fontWeight: 600 }}>
                <WarningOutlined style={{ marginRight: 6, color: '#F59E0B' }} />
                Hợp đồng hết hạn trong 60 ngày
              </span>
            }
            extra={
              <Tooltip title="Xem tất cả hợp đồng">
                <Text
                  style={{ color: linkColor, fontSize: 12, cursor: 'pointer' }}
                  onClick={() => navigate('/contracts')}
                >
                  Xem thêm
                </Text>
              </Tooltip>
            }
            style={chartCardStyle}
            styles={{ body: { padding: '8px 16px 16px' } }}
          >
            <List
              size="small"
              dataSource={EXPIRING_CONTRACTS}
              renderItem={(item) => {
                const daysLeft = dayjs(item.expiry).diff(dayjs(), 'day');
                const urgent = daysLeft <= 20;
                return (
                  <List.Item
                    style={{ borderColor: borderColor, padding: '8px 0' }}
                    extra={
                      <Tag
                        style={
                          urgent
                            ? isDark
                              ? { background: 'rgba(248,113,113,0.15)', color: '#FCA5A5', borderColor: 'rgba(248,113,113,0.3)' }
                              : {}
                            : isDark
                              ? { background: 'rgba(245,158,11,0.15)', color: '#FCD34D', borderColor: 'rgba(245,158,11,0.3)' }
                              : {}
                        }
                        color={isDark ? undefined : urgent ? 'red' : 'orange'}
                      >
                        {daysLeft} ngày
                      </Tag>
                    }
                  >
                    <div>
                      <Text style={{ color: textPrimary, fontSize: 13, fontWeight: 600 }}>{item.name}</Text>
                      <div>
                        <Text style={{ color: textMuted, fontSize: 11 }}>{item.type}</Text>
                        <Text style={{ color: textMuted, fontSize: 11 }}> · {dayjs(item.expiry).format('DD/MM/YYYY')}</Text>
                      </div>
                    </div>
                  </List.Item>
                );
              }}
            />
          </Card>
        </Col>

        {/* Overdue invoices */}
        <Col xs={24} lg={8}>
          <Card
            title={
              <span style={{ color: textPrimary, fontSize: 14, fontWeight: 600 }}>
                <FileTextOutlined style={{ marginRight: 6, color: '#EF4444' }} />
                Hoá đơn quá hạn
              </span>
            }
            extra={
              <Tooltip title="Xem tất cả hóa đơn">
                <Text
                  style={{ color: linkColor, fontSize: 12, cursor: 'pointer' }}
                  onClick={() => navigate('/invoices')}
                >
                  Xem thêm
                </Text>
              </Tooltip>
            }
            style={chartCardStyle}
            styles={{ body: { padding: '8px 16px 16px' } }}
          >
            {/* Summary header */}
            <div
              style={{
                background: isDark ? 'rgba(239,68,68,0.12)' : '#FEF2F2',
                borderRadius: 8,
                padding: '10px 14px',
                marginBottom: 12,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: isDark ? '#FCA5A5' : '#DC2626', fontWeight: 600, fontSize: 13 }}>
                Tổng quá hạn
              </Text>
              <Text style={{ color: isDark ? '#FCA5A5' : '#DC2626', fontWeight: 800, fontSize: 16 }}>
                {new Intl.NumberFormat('vi-VN').format(totalOverdue)} ₫
              </Text>
            </div>

            <List
              size="small"
              dataSource={OVERDUE_INVOICES}
              renderItem={(item) => (
                <List.Item
                  style={{ borderColor: borderColor, padding: '8px 0' }}
                  extra={
                    <Tag
                      style={isDark ? { background: 'rgba(248,113,113,0.15)', color: '#FCA5A5', borderColor: 'rgba(248,113,113,0.3)' } : {}}
                      color={isDark ? undefined : 'red'}
                    >
                      {item.days} ngày
                    </Tag>
                  }
                >
                  <div>
                    <Text style={{ color: linkColor, fontSize: 13, fontWeight: 600 }}>{item.code}</Text>
                    <div>
                      <Text style={{ color: textMuted, fontSize: 11 }}>{item.customer}</Text>
                      <Text style={{ color: textPrimary, fontSize: 12, marginLeft: 8 }}>
                        {new Intl.NumberFormat('vi-VN').format(item.amount)} ₫
                      </Text>
                    </div>
                  </div>
                </List.Item>
              )}
            />
          </Card>
        </Col>

        {/* Pending approvals */}
        <Col xs={24} lg={8}>
          <Card
            title={
              <span style={{ color: textPrimary, fontSize: 14, fontWeight: 600 }}>
                <ClockCircleOutlined style={{ marginRight: 6, color: '#6366F1' }} />
                Chờ phê duyệt
              </span>
            }
            style={chartCardStyle}
            styles={{ body: { padding: '8px 16px 16px' } }}
          >
            {PENDING_APPROVALS.map((item) => (
              <div
                key={item.module}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  borderRadius: 10,
                  marginBottom: 10,
                  background: bgCard,
                  border: `1px solid ${borderColor}`,
                  cursor: 'pointer',
                  transition: 'opacity 0.15s',
                }}
                onClick={() => navigate(item.route)}
                role="button"
                tabIndex={0}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 9,
                      background: `${item.color}20`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {item.module === 'Leave' && <CheckCircleOutlined style={{ color: item.color, fontSize: 16 }} />}
                    {item.module === 'OT' && <FieldTimeOutlined style={{ color: item.color, fontSize: 16 }} />}
                    {item.module === 'Expense' && <WalletOutlined style={{ color: item.color, fontSize: 16 }} />}
                  </div>
                  <div>
                    <Text style={{ color: textPrimary, fontWeight: 600, fontSize: 14, display: 'block' }}>
                      {item.label}
                    </Text>
                    <Text style={{ color: textMuted, fontSize: 12 }}>Đang chờ xử lý</Text>
                  </div>
                </div>
                <Badge
                  count={item.count}
                  style={{ backgroundColor: item.color, fontWeight: 700, fontSize: 13, minWidth: 28, height: 28, lineHeight: '28px', borderRadius: 14 }}
                />
              </div>
            ))}

            <div
              style={{
                padding: '12px 14px',
                borderRadius: 8,
                background: isDark ? 'rgba(99,102,241,0.10)' : '#EEF2FF',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: isDark ? '#A5B4FC' : '#4338CA', fontWeight: 600, fontSize: 13 }}>
                Tổng cộng
              </Text>
              <Text style={{ color: isDark ? '#A5B4FC' : '#4338CA', fontWeight: 800, fontSize: 20 }}>
                {PENDING_APPROVALS.reduce((s, i) => s + i.count, 0)}
              </Text>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

// Small inline icon component to avoid import duplication
function ProjectPortfolioIcon() {
  return <FundOutlined style={{ marginRight: 6, color: '#6366F1' }} />;
}
