import { Row, Col, Spin, Tag } from 'antd';
import {
  ClockCircleOutlined,
  CalendarOutlined,
  FieldTimeOutlined,
  CreditCardOutlined,
  ThunderboltOutlined,
  FileTextOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { useThemePalette } from '../../hooks/useThemePalette';
import { StatCard } from '../../components/ui/StatCard';
import { PageHeader } from '../../components/ui/PageHeader';
import { SectionCard } from '../../components/ui/SectionCard';
import { dashboardV3Api } from '../../api/dashboard-v3';
import { formatCurrency } from '../../utils/format';

const PERIOD_STATUS_LABEL: Record<string, { label: string; color: string }> = {
  DRAFT:      { label: 'Nháp',          color: 'default' },
  PROCESSING: { label: 'Đang xử lý',   color: 'blue' },
  REVIEW:     { label: 'Chờ duyệt',    color: 'orange' },
  APPROVED:   { label: 'Đã duyệt',     color: 'green' },
  PAID:       { label: 'Đã thanh toán', color: 'green' },
};

export default function AttendanceDashboard() {
  const navigate = useNavigate();
  const { bgContainer, borderColor, textPrimary, textMuted, isDark } = useThemePalette();

  const { data, isLoading } = useQuery({
    queryKey:        ['dashboard-attendance'],
    queryFn:         dashboardV3Api.getAttendance,
    refetchInterval: 60_000,
  });

  const { data: trend = [], isLoading: trendLoading } = useQuery({
    queryKey:        ['dashboard-attendance-trend'],
    queryFn:         dashboardV3Api.getAttendanceTrend,
    refetchInterval: 120_000,
  });

  const trendFormatted = trend.map(t => ({
    ...t,
    label: dayjs(t.date).format('DD/MM'),
  }));

  const periodInfo = PERIOD_STATUS_LABEL[data?.latestPeriodStatus ?? ''];

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Dashboard Chấm công & Lương"
        icon={<ClockCircleOutlined />}
        iconColor="#D97706"
        greeting
      />

      {/* ── Hàng 1: Đơn từ & Chấm công ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="Nghỉ phép chờ duyệt"
            value={data?.pendingLeaves ?? 0}
            color="#F59E0B"
            icon={<CalendarOutlined />}
            onClick={() => navigate('/hr/leaves')}
          />
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="OT chờ duyệt"
            value={data?.pendingOT ?? 0}
            color="#F97316"
            icon={<FieldTimeOutlined />}
            onClick={() => navigate('/hr/overtime')}
          />
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="Chấm công muộn tháng này"
            value={data?.lateThisMonth ?? 0}
            color="#EF4444"
            icon={<ExclamationCircleOutlined />}
            subValue="lượt đi muộn"
            onClick={() => navigate('/hr/attendance')}
          />
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="Giờ OT đã duyệt tháng này"
            value={`${(data?.otHoursThisMonth ?? 0).toFixed(1)}h`}
            color="#6366F1"
            icon={<ThunderboltOutlined />}
          />
        </Col>
      </Row>

      {/* ── Hàng 2: Lương ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={12} lg={8}>
          <StatCard
            label="Tổng lương ròng tháng này"
            value={formatCurrency(data?.monthlyPayrollTotal ?? 0)}
            color="#10B981"
            icon={<CreditCardOutlined />}
            onClick={() => navigate('/payroll')}
          />
        </Col>
        <Col xs={12} sm={12} lg={8}>
          <StatCard
            label="Kỳ lương gần nhất"
            value={data?.latestPeriodName ?? '—'}
            color="#3B82F6"
            icon={<FileTextOutlined />}
            subValue={
              periodInfo
                ? `Trạng thái: ${periodInfo.label}`
                : data?.latestPeriodStatus ?? ''
            }
            onClick={() => navigate('/payroll')}
          />
        </Col>
        <Col xs={12} sm={12} lg={8}>
          {isLoading ? (
            <div style={{
              height: 100, display: 'flex', alignItems: 'center',
              justifyContent: 'center', background: bgContainer,
              border: `1px solid ${borderColor}`, borderRadius: 12,
            }}>
              <Spin size="small" />
            </div>
          ) : (
            <div style={{
              background: bgContainer,
              border: `1px solid ${borderColor}`,
              borderRadius: 12,
              padding: '14px 20px',
              height: '100%',
              minHeight: 100,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: 8,
            }}>
              <div style={{ fontSize: 12, color: textMuted as string, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Trạng thái kỳ lương
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, color: textPrimary as string }}>
                  {data?.latestPeriodName ?? '—'}
                </span>
                {periodInfo && (
                  <Tag color={periodInfo.color}>{periodInfo.label}</Tag>
                )}
              </div>
            </div>
          )}
        </Col>
      </Row>

      {/* ── Chart: Xu hướng chấm công 7 ngày ── */}
      <SectionCard
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ClockCircleOutlined style={{ color: '#D97706' }} />
            Xu hướng chấm công 7 ngày gần nhất
          </span>
        }
      >
        {trendLoading ? (
          <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Spin size="small" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={trendFormatted}
              margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#E2E8F0'} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: textMuted as string }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: textMuted as string }} />
              <RTooltip
                contentStyle={{
                  background: bgContainer, border: `1px solid ${borderColor}`,
                  borderRadius: 8, fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="present" name="Có mặt" fill="#10B981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="late"    name="Đi muộn" fill="#EF4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </SectionCard>
    </div>
  );
}
