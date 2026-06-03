import { useMemo } from 'react';
import {
  Card, Col, Row, Table, Typography, Badge, Space,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  TeamOutlined, CheckCircleOutlined, HomeOutlined,
  StopOutlined, ClockCircleOutlined, PercentageOutlined,
} from '@ant-design/icons';
import { useThemePalette } from '../../hooks/useThemePalette';
import { usePagination } from '../../hooks/usePagination';
import { SparklineCard } from '../../components/ui/SparklineCard';
import { EmployeeInfoCell } from '../../components/ui/EmployeeInfoCell';
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
  BREAK:         { bg: '#F1F5F9', color: '#94A3B8' },
  OFF:           { bg: '#FEF2F2', color: '#DC2626' },
  BUSINESS_TRIP: { bg: '#F0F9FF', color: '#0369A1' },
};

export default function TimesheetManagerPage() {
  const { user } = useAuthStore();
  const { isDark, primary, bgContainer } = useThemePalette();
  const { paginationProps } = usePagination(50);
  const chartCardStyle = {
    borderRadius: 12,
    background: isDark ? bgContainer : `${primary}09`,
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

  const columns: ColumnsType<TeamMemberStatus> = [
    {
      title: 'Nhân sự',
      key: 'employee',
      render: (_: unknown, r: TeamMemberStatus) => (
        <EmployeeInfoCell
          employee={{
            fullName: r.name,
            code: r.employeeCode ?? undefined,
            orgUnit: r.orgUnit ?? undefined,
            position: r.position ?? undefined,
          }}
        />
      ),
    },
    {
      title: 'Trạng thái hiện tại',
      dataIndex: 'currentStatus',
      key: 'currentStatus',
      render: (status: WorkStatusType | null) => {
        if (!status) return <span style={{ fontSize: 11, fontWeight: 600, borderRadius: 9999, padding: '2px 8px', background: isDark ? 'rgba(148,163,184,0.15)' : '#F1F5F9', color: '#94A3B8' }}>Chưa cập nhật</span>;
        const cfg = STATUS_BADGE[status];
        return <span style={{ fontSize: 11, fontWeight: 600, borderRadius: 9999, padding: '2px 8px', background: cfg.bg, color: cfg.color }}>{STATUS_LABELS[status]}</span>;
      },
      filters: [
        { text: 'Đang làm việc', value: 'WORKING' },
        { text: 'Làm từ xa', value: 'WFH' },
        { text: 'Họp', value: 'MEETING' },
        { text: 'Nghỉ giải lao', value: 'BREAK' },
        { text: 'Nghỉ', value: 'OFF' },
        { text: 'Công tác', value: 'BUSINESS_TRIP' },
        { text: 'Chưa cập nhật', value: '__NONE__' },
      ],
      onFilter: (value, record) =>
        value === '__NONE__' ? record.currentStatus == null : record.currentStatus === value,
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
            pagination={paginationProps(teamStatus.length, 'nhân sự')}
            size="small"
            rowClassName={(record) => (!record.todayCheckIn ? 'ant-table-row-absent' : '')}
          />
        </Card>
      </Space>
    </div>
  );
}
