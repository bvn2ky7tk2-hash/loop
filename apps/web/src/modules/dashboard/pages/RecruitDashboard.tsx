import { Row, Col, Spin } from 'antd';
import {
  UsergroupAddOutlined,
  SolutionOutlined,
  CalendarOutlined,
  TrophyOutlined,
  UserAddOutlined,
  AppstoreAddOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip,
  ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import { useThemePalette } from '../../hooks/useThemePalette';
import { StatCard } from '../../components/ui/StatCard';
import { PageHeader } from '../../components/ui/PageHeader';
import { dashboardV3Api } from '../../api/dashboard-v3';

const STAGE_LABEL: Record<string, string> = {
  NEW:              'Mới',
  APPLIED:          'Đã ứng tuyển',
  SCREENING:        'Sơ loại',
  INTERVIEW:        'Phỏng vấn',
  TECHNICAL_TEST:   'Bài test',
  OFFER:            'Offer',
  HIRED:            'Đã tuyển',
  REJECTED:         'Từ chối',
  WITHDRAWN:        'Rút lui',
};

const STAGE_COLOR: Record<string, string> = {
  NEW:              '#94A3B8',
  APPLIED:          '#3B82F6',
  SCREENING:        '#F59E0B',
  INTERVIEW:        '#6366F1',
  TECHNICAL_TEST:   '#8B5CF6',
  OFFER:            '#F97316',
  HIRED:            '#10B981',
  REJECTED:         '#EF4444',
  WITHDRAWN:        '#94A3B8',
};

export default function RecruitDashboard() {
  const navigate = useNavigate();
  const { bgContainer, borderColor, textPrimary, textMuted, isDark } = useThemePalette();

  const { data, isLoading } = useQuery({
    queryKey:        ['dashboard-recruit'],
    queryFn:         dashboardV3Api.getRecruit,
    refetchInterval: 60_000,
  });

  const stageData = (data?.byStage ?? []).map(s => ({
    stage:  STAGE_LABEL[s.stage] ?? s.stage,
    count:  s.count,
    rawKey: s.stage,
  }));

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Dashboard Tuyển dụng"
        icon={<UsergroupAddOutlined />}
        iconColor="#0EA5E9"
        greeting
      />

      {/* ── Hàng 1: KPI chính ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="Vị trí đang tuyển"
            value={data?.openJobs ?? 0}
            color="#6366F1"
            icon={<SolutionOutlined />}
            onClick={() => navigate('/recruit/jobs')}
          />
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="Tổng ứng viên"
            value={data?.totalCandidates ?? 0}
            color="#3B82F6"
            icon={<UsergroupAddOutlined />}
            onClick={() => navigate('/recruit/candidates')}
          />
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="Ứng viên mới tháng này"
            value={data?.newCandidatesThisMonth ?? 0}
            color="#10B981"
            icon={<UserAddOutlined />}
          />
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="Phỏng vấn tuần này"
            value={data?.interviewsThisWeek ?? 0}
            color="#F59E0B"
            icon={<CalendarOutlined />}
            onClick={() => navigate('/recruit/interviews')}
          />
        </Col>
      </Row>

      {/* ── Hàng 2: Kết quả ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={12} lg={8}>
          <StatCard
            label="Tuyển thành công tháng này"
            value={data?.hiredThisMonth ?? 0}
            color="#8B5CF6"
            icon={<TrophyOutlined />}
            subValue="ứng viên đã onboard"
          />
        </Col>
        <Col xs={12} sm={12} lg={8}>
          <StatCard
            label="Pipeline"
            value={`${data?.byStage?.length ?? 0} giai đoạn`}
            color="#0EA5E9"
            icon={<AppstoreAddOutlined />}
            subValue={`${data?.totalCandidates ?? 0} ứng viên đang theo dõi`}
            onClick={() => navigate('/recruit/pipeline')}
          />
        </Col>
        {isLoading && (
          <Col xs={12} sm={12} lg={8}>
            <div style={{
              height: 100, display: 'flex', alignItems: 'center',
              justifyContent: 'center', background: bgContainer,
              border: `1px solid ${borderColor}`, borderRadius: 12,
            }}>
              <Spin size="small" />
            </div>
          </Col>
        )}
      </Row>

      {/* ── Chart: Pipeline theo giai đoạn ── */}
      <div style={{
        background: bgContainer,
        border: `1px solid ${borderColor}`,
        borderRadius: 12,
        padding: '16px 20px',
      }}>
        <div style={{
          fontSize: 14, fontWeight: 600, color: textPrimary as string,
          marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <AppstoreAddOutlined style={{ color: '#0EA5E9' }} />
          Ứng viên theo giai đoạn tuyển dụng
        </div>

        {isLoading ? (
          <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Spin size="small" />
          </div>
        ) : stageData.length === 0 ? (
          <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: textMuted as string, fontSize: 14 }}>
            Chưa có dữ liệu ứng viên
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={stageData}
              layout="vertical"
              margin={{ top: 4, right: 24, left: 80, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#E2E8F0'} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: textMuted as string }} />
              <YAxis dataKey="stage" type="category" tick={{ fontSize: 12, fill: textMuted as string }} width={76} />
              <RTooltip
                contentStyle={{
                  background: bgContainer, border: `1px solid ${borderColor}`,
                  borderRadius: 8, fontSize: 12,
                }}
                formatter={(value: number) => [value, 'Ứng viên']}
              />
              <Bar dataKey="count" name="Ứng viên" radius={[0, 4, 4, 0]}>
                {stageData.map((entry) => (
                  <Cell
                    key={entry.rawKey}
                    fill={STAGE_COLOR[entry.rawKey] ?? '#6366F1'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
