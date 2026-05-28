import { useMemo } from 'react';
import {
  Card, Col, Row, Table, Typography, Badge, Space,
} from 'antd';
import {
  TeamOutlined, CheckCircleOutlined, HomeOutlined,
  StopOutlined, ClockCircleOutlined, PercentageOutlined,
} from '@ant-design/icons';
import { useThemeStore } from '../../store/theme.store';
import { SparklineCard } from '../../components/ui/SparklineCard';
import { useQuery } from '@tanstack/react-query';
import { timesheetApi, type TeamMemberStatus, type WorkStatusType } from '../../api/timesheet';
import { useAuthStore } from '../../store/auth.store';
import { Navigate } from 'react-router-dom';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';

dayjs.locale('vi');

const { Text } = Typography;

const ALLOWED_ROLES = ['PM', 'ADMIN', 'LEADERSHIP'];

const STATUS_LABELS: Record<WorkStatusType, string> = {
  WORKING: 'Đang làm việc',
  WFH: 'Làm từ xa',
  MEETING: 'Họp',
  BREAK: 'Nghỉ giải lao',
  OFF: 'Nghỉ',
  BUSINESS_TRIP: 'Công tác',
};

const STATUS_BADGE: Record<WorkStatusType, { bg: string; color: string }> = {
  WORKING:       { bg: '#ECFDF5', color: '#065F46' },
  WFH:           { bg: '#EEF2FF', color: '#4338CA' },
  MEETING:       { bg: '#FFFBEB', color: '#92400E' },
  BREAK:         { bg: '#F1F5F9', color: '#475569' },
  OFF:           { bg: '#FEF2F2', color: '#DC2626' },
  BUSINESS_TRIP: { bg: '#F0F9FF', color: '#0369A1' },
};

export default function TimesheetManagerPage() {
  const { user } = useAuthStore();
  const { mode, preset } = useThemeStore();
  const isDark = mode === 'dark';
  const primary = preset.primary;
  const chartCardStyle = {
    borderRadius: 12,
    background: isDark ? '#1E293B' : `${primary}09`,
    border: `1px solid ${isDark ? '#334155' : `${primary}28`}`,
  };

  if (user && !ALLOWED_ROLES.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  const { data: teamStatus = [], isLoading } = useQuery({
    queryKey: ['timesheet-team-status'],
    queryFn: timesheetApi.teamStatus,
    refetchInterval: 60_000,
  });

  const stats = useMemo(() => {
    const total = teamStatus.length;
    const present = teamStatus.filter((m) => m.todayCheckIn).length;
    const wfh = teamStatus.filter((m) => m.currentStatus === 'WFH').length;
    const absent = teamStatus.filter((m) => !m.todayCheckIn).length;
    const attendanceRate = total > 0 ? Math.round((present / total) * 100) : 0;
    return { total, present, wfh, absent, attendanceRate };
  }, [teamStatus]);

  const columns = [
    {
      title: 'Nhân sự',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: 'Trạng thái hiện tại',
      dataIndex: 'currentStatus',
      key: 'currentStatus',
      render: (status: WorkStatusType | null) => {
        if (!status) return <span style={{ fontSize: 11, fontWeight: 600, borderRadius: 9999, padding: '2px 8px', background: '#F1F5F9', color: '#475569' }}>Chưa cập nhật</span>;
        const cfg = STATUS_BADGE[status];
        return <span style={{ fontSize: 11, fontWeight: 600, borderRadius: 9999, padding: '2px 8px', background: cfg.bg, color: cfg.color }}>{STATUS_LABELS[status]}</span>;
      },
      filters: ([
        { text: 'Đang làm việc', value: 'WORKING' },
        { text: 'Làm từ xa', value: 'WFH' },
        { text: 'Họp', value: 'MEETING' },
        { text: 'Nghỉ giải lao', value: 'BREAK' },
        { text: 'Nghỉ', value: 'OFF' },
        { text: 'Công tác', value: 'BUSINESS_TRIP' },
        { text: 'Chưa cập nhật', value: null },
      ] as { text: string; value: WorkStatusType | null }[]),
      onFilter: (value: unknown, record: TeamMemberStatus) => record.currentStatus === value,
    },
    {
      title: 'Từ lúc',
      dataIndex: 'since',
      key: 'since',
      render: (since: string | null) =>
        since ? dayjs(since).format('HH:mm') : '—',
    },
    {
      title: 'Giờ vào',
      dataIndex: 'todayCheckIn',
      key: 'todayCheckIn',
      render: (t: string | null) =>
        t ? (
          <Space>
            <CheckCircleOutlined style={{ color: '#10B981' }} />
            {dayjs(t).format('HH:mm')}
          </Space>
        ) : (
          <Text type="secondary">Chưa vào</Text>
        ),
    },
    {
      title: 'Giờ ra',
      dataIndex: 'todayCheckOut',
      key: 'todayCheckOut',
      render: (t: string | null) =>
        t ? dayjs(t).format('HH:mm') : <Text type="secondary">—</Text>,
    },
  ];

  return (
    <div className="page-wrapper">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: 4 }}>Attendance Report</h1>
          <Text type="secondary">
            Cập nhật lúc {dayjs().format('HH:mm')} · tự động làm mới mỗi 60 giây
          </Text>
        </div>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={4}>
            <SparklineCard label="Tổng thành viên" value={stats.total} color={primary} icon={<TeamOutlined />} filled />
          </Col>
          <Col xs={24} sm={12} lg={5}>
            <SparklineCard label="Đã chấm công vào" value={stats.present} color="#10B981" icon={<CheckCircleOutlined />} filled />
          </Col>
          <Col xs={24} sm={12} lg={5}>
            <SparklineCard label="Làm từ xa (WFH)" value={stats.wfh} color={primary} icon={<HomeOutlined />} filled />
          </Col>
          <Col xs={24} sm={12} lg={5}>
            <SparklineCard label="Chưa chấm công" value={stats.absent} color="#EF4444" icon={<StopOutlined />} filled />
          </Col>
          <Col xs={24} sm={12} lg={5}>
            <SparklineCard
              label="Tỷ lệ chuyên cần"
              value={stats.attendanceRate}
              unit="%"
              color={stats.attendanceRate >= 90 ? '#10B981' : stats.attendanceRate >= 70 ? '#F59E0B' : '#EF4444'}
              icon={<PercentageOutlined />}
              filled
            />
          </Col>
        </Row>

        <Card
          style={chartCardStyle}
          title={
            <Space>
              <ClockCircleOutlined />
              Trạng thái real-time hôm nay
              <Badge
                count={stats.present}
                style={{ backgroundColor: '#10B981' }}
                title={`${stats.present} người đã vào`}
              />
            </Space>
          }
        >
          <Table<TeamMemberStatus>
            rowKey="userId"
            dataSource={teamStatus}
            columns={columns}
            loading={isLoading}
            pagination={{ pageSize: 20, showSizeChanger: false }}
            size="small"
            rowClassName={(record) => (!record.todayCheckIn ? 'ant-table-row-absent' : '')}
          />
        </Card>
      </Space>
    </div>
  );
}
