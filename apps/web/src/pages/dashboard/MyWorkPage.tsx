import {
  Row, Col, Card, Typography, Space, Button, Progress, Spin, Empty, App,
} from 'antd';
import {
  AppstoreOutlined, ClockCircleOutlined, CheckCircleOutlined,
  FormOutlined, CalendarOutlined, LoginOutlined, LogoutOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { useThemePalette } from '../../hooks/useThemePalette';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { dashboardV3Api } from '../../api/dashboard-v3';
import { processesApi } from '../../api/processes.api';
import { leavesApi } from '../../api/leaves';
import { expensesApi } from '../../api/expenses';
import { tasksApi } from '../../api/tasks';
import { timesheetApi } from '../../api/timesheet';
import { useAuthStore } from '../../store/auth.store';

const { Text, Title } = Typography;

// ─── Section header helper ────────────────────────────────────────────────────

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  const { textPrimary } = useThemePalette();
  return (
    <Space style={{ marginBottom: 12 }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <Title level={5} style={{ margin: 0, color: textPrimary }}>{title}</Title>
    </Space>
  );
}

// ─── ActionItem row ───────────────────────────────────────────────────────────

interface ActionItemProps {
  label: string;
  sub?: string;
  color: string;
  onClick: () => void;
}

function ActionItem({ label, sub, color, onClick }: ActionItemProps) {
  const { textPrimary, textMuted, bgCard, borderColor } = useThemePalette();
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 14px',
        marginBottom: 6,
        background: bgCard,
        borderRadius: 8,
        border: `1px solid ${borderColor}`,
        cursor: 'pointer',
        transition: 'opacity 0.12s',
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: textPrimary, fontSize: 13, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {label}
        </Text>
        {sub && <Text style={{ color: textMuted, fontSize: 11 }}>{sub}</Text>}
      </div>
      <RightOutlined style={{ color: textMuted, fontSize: 10 }} />
    </div>
  );
}

// ─── MyWorkPage ───────────────────────────────────────────────────────────────

export default function MyWorkPage() {
  const { message } = App.useApp();
  const navigate    = useNavigate();
  const { user }    = useAuthStore();
  const qc          = useQueryClient();
  const { textPrimary, textMuted, bgContainer, borderColor, isDark } = useThemePalette();

  // ── Data fetching ──────────────────────────────────────────────────────────
  const { data: meData } = useQuery({
    queryKey: ['dashboard-me'],
    queryFn:  dashboardV3Api.getMe,
    refetchInterval: 60_000,
  });

  const { data: userTasksData, isLoading: userTasksLoading } = useQuery({
    queryKey: ['my-work-user-tasks'],
    queryFn:  () => processesApi.listUserTasks({ page: 1, pageSize: 5 }),
    refetchInterval: 60_000,
  });

  const myEmployeeId = (meData as any)?.employeeId as string | undefined;
  const { data: leavesData, isLoading: leavesLoading } = useQuery({
    queryKey: ['my-work-leaves-pending', myEmployeeId],
    queryFn:  () => leavesApi.list({ employeeId: myEmployeeId!, status: 'PENDING', page: 1, pageSize: 5 }),
    enabled:  !!myEmployeeId,
    refetchInterval: 60_000,
  });

  const { data: expensesData, isLoading: expensesLoading } = useQuery({
    queryKey: ['my-work-expenses-pending'],
    queryFn:  () => expensesApi.list({ status: 'PENDING', submittedById: user?.id, page: 1, pageSize: 5 }),
    refetchInterval: 60_000,
  });

  const { data: todayTasks, isLoading: todayTasksLoading } = useQuery({
    queryKey: ['my-work-today-tasks'],
    queryFn:  () => tasksApi.myTasks(),
    refetchInterval: 60_000,
    select: (tasks) =>
      tasks.filter(
        (t) =>
          t.status === 'IN_PROGRESS' &&
          t.dueDate &&
          dayjs(t.dueDate).isSame(dayjs(), 'day'),
      ),
  });

  const { data: todaySummary, isLoading: timesheetLoading } = useQuery({
    queryKey: ['timesheet-today'],
    queryFn:  timesheetApi.todaySummary,
    refetchInterval: 30_000,
  });

  // Giờ làm tuần này từ timesheet period
  const weekStart = dayjs().startOf('week').format('YYYY-MM-DD');
  const weekEnd   = dayjs().endOf('week').format('YYYY-MM-DD');
  useQuery({
    queryKey: ['timesheet-week', weekStart, weekEnd],
    queryFn:  () => timesheetApi.periodDetail(weekStart, weekEnd),
    staleTime: 5 * 60_000,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const checkInMut = useMutation({
    mutationFn: () => timesheetApi.checkIn(),
    onSuccess: () => {
      message.success('Đã check-in thành công');
      qc.invalidateQueries({ queryKey: ['timesheet-today'] });
    },
    onError: () => message.error('Check-in thất bại'),
  });

  const checkOutMut = useMutation({
    mutationFn: () => timesheetApi.checkOut(),
    onSuccess: () => {
      message.success('Đã check-out thành công');
      qc.invalidateQueries({ queryKey: ['timesheet-today'] });
    },
    onError: () => message.error('Check-out thất bại'),
  });

  // ── Derived counts ─────────────────────────────────────────────────────────
  const pendingTasksCount   = userTasksData?.meta?.total ?? 0;
  const pendingLeavesCount  = leavesData?.total ?? 0;
  const pendingExpenseCount = expensesData?.total ?? 0;
  const leaveBalance        = meData?.leaveBalance ?? 0;

  const hasCheckedIn  = !!todaySummary?.checkIn;
  const hasCheckedOut = !!todaySummary?.checkOut;

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Công việc của tôi"
        icon={<AppstoreOutlined />}
        iconColor="#6366F1"
        subtitle={
          <Text style={{ fontSize: 12, color: textMuted }}>
            {dayjs().format('dddd, DD/MM/YYYY')}
          </Text>
        }
      />

      {/* ── StatCards ─────────────────────────────────────────────────────── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <StatCard
            label="Tasks chờ"
            value={pendingTasksCount}
            color="#F59E0B"
            icon={<FormOutlined />}
            onClick={() => navigate('/processes/inbox')}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            label="Đơn chờ duyệt"
            value={pendingLeavesCount + pendingExpenseCount}
            color="#EF4444"
            icon={<CheckCircleOutlined />}
            onClick={() => navigate('/approvals/inbox')}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            label="Phép còn"
            value={`${leaveBalance} ngày`}
            color="#10B981"
            icon={<CalendarOutlined />}
            onClick={() => navigate('/leaves')}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            label="Hôm nay"
            value={todaySummary?.workingHours
              ? `${todaySummary.workingHours.toFixed(1)}h`
              : hasCheckedIn ? 'Đang làm' : 'Chưa check-in'}
            color="#3B82F6"
            icon={<ClockCircleOutlined />}
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* ── Section 1: Cần xử lý ngay ───────────────────────────────────── */}
        <Col xs={24} lg={8}>
          <Card
            style={{
              background: bgContainer,
              border: `1px solid ${borderColor}`,
              borderRadius: 10,
              height: '100%',
            }}
            bodyStyle={{ padding: 16 }}
          >
            <SectionTitle icon="⚡" title="Cần xử lý ngay" />

            {/* BPM User Tasks */}
            {userTasksLoading && <Spin size="small" style={{ display: 'block', marginBottom: 8 }} />}
            {(userTasksData?.data ?? []).slice(0, 5).map((task) => (
              <ActionItem
                key={task.id}
                label={task.name}
                sub={task.instance?.definition?.name}
                color="#6366F1"
                onClick={() => navigate('/processes/inbox')}
              />
            ))}

            {/* Leave PENDING */}
            {leavesLoading && <Spin size="small" style={{ display: 'block', marginBottom: 8 }} />}
            {(leavesData?.data ?? []).slice(0, 5).map((leave) => (
              <ActionItem
                key={leave.id}
                label={`Nghỉ phép: ${leave.leaveType?.name ?? 'Unknown'}`}
                sub={`${dayjs(leave.startDate).format('DD/MM')} – ${dayjs(leave.endDate).format('DD/MM')} · ${leave.days} ngày`}
                color="#F59E0B"
                onClick={() => navigate('/leaves')}
              />
            ))}

            {/* Expense PENDING */}
            {expensesLoading && <Spin size="small" style={{ display: 'block', marginBottom: 8 }} />}
            {(expensesData?.data ?? []).slice(0, 5).map((expense) => (
              <ActionItem
                key={expense.id}
                label={expense.title}
                sub={`${expense.totalAmount?.toLocaleString('vi-VN')} ₫`}
                color="#EF4444"
                onClick={() => navigate('/expenses')}
              />
            ))}

            {!userTasksLoading && !leavesLoading && !expensesLoading &&
             (userTasksData?.data ?? []).length === 0 &&
             (leavesData?.data ?? []).length === 0 &&
             (expensesData?.data ?? []).length === 0 && (
              <Empty description="Không có việc cần xử lý" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
        </Col>

        {/* ── Section 2: Tasks hôm nay ─────────────────────────────────────── */}
        <Col xs={24} lg={8}>
          <Card
            style={{
              background: bgContainer,
              border: `1px solid ${borderColor}`,
              borderRadius: 10,
              height: '100%',
            }}
            bodyStyle={{ padding: 16 }}
          >
            <SectionTitle icon="📋" title="Tasks hôm nay" />

            {todayTasksLoading && <Spin size="small" />}

            {!todayTasksLoading && (todayTasks ?? []).length === 0 && (
              <Empty description="Không có task nào đến hạn hôm nay" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}

            {(todayTasks ?? []).map((task) => (
              <div
                key={task.id}
                onClick={() => navigate('/my-tasks')}
                style={{
                  padding: '10px 14px',
                  marginBottom: 6,
                  background: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC',
                  borderRadius: 8,
                  border: `1px solid ${borderColor}`,
                  cursor: 'pointer',
                }}
              >
                <Text style={{ color: textPrimary, fontSize: 13, display: 'block', marginBottom: 6 }}>
                  {task.title}
                </Text>
                <Progress
                  percent={task.progress ?? 0}
                  size="small"
                  strokeColor="#6366F1"
                  showInfo={true}
                  format={(p) => <Text style={{ color: textMuted, fontSize: 11 }}>{p}%</Text>}
                />
              </div>
            ))}

            {(todayTasks ?? []).length > 0 && (
              <Button
                type="link"
                size="small"
                onClick={() => navigate('/my-tasks')}
                style={{ marginTop: 4, paddingLeft: 0 }}
              >
                Xem tất cả tasks →
              </Button>
            )}
          </Card>
        </Col>

        {/* ── Section 3: Chấm công ────────────────────────────────────────── */}
        <Col xs={24} lg={8}>
          <Card
            style={{
              background: bgContainer,
              border: `1px solid ${borderColor}`,
              borderRadius: 10,
              height: '100%',
            }}
            bodyStyle={{ padding: 16 }}
          >
            <SectionTitle icon="🕐" title="Chấm công hôm nay" />

            {timesheetLoading && <Spin size="small" />}

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              {/* Check-in / Check-out status */}
              <div
                style={{
                  padding: 14,
                  background: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC',
                  borderRadius: 8,
                  border: `1px solid ${borderColor}`,
                }}
              >
                <Space direction="vertical" size={6} style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text style={{ color: textMuted, fontSize: 12 }}>Check-in</Text>
                    <Text style={{ color: textPrimary, fontSize: 13, fontWeight: 600 }}>
                      {todaySummary?.checkIn
                        ? dayjs(todaySummary.checkIn).format('HH:mm')
                        : '—'}
                    </Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text style={{ color: textMuted, fontSize: 12 }}>Check-out</Text>
                    <Text style={{ color: textPrimary, fontSize: 13, fontWeight: 600 }}>
                      {todaySummary?.checkOut
                        ? dayjs(todaySummary.checkOut).format('HH:mm')
                        : '—'}
                    </Text>
                  </div>
                  {todaySummary?.workingHours != null && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text style={{ color: textMuted, fontSize: 12 }}>Giờ làm</Text>
                      <Text style={{ color: '#10B981', fontSize: 13, fontWeight: 600 }}>
                        {todaySummary.workingHours.toFixed(1)}h
                      </Text>
                    </div>
                  )}
                </Space>
              </div>

              {/* Buttons */}
              <Row gutter={8}>
                <Col span={12}>
                  <Button
                    type="primary"
                    icon={<LoginOutlined />}
                    block
                    disabled={hasCheckedIn}
                    loading={checkInMut.isPending}
                    onClick={() => checkInMut.mutate()}
                    style={{ background: hasCheckedIn ? undefined : '#10B981', borderColor: hasCheckedIn ? undefined : '#10B981' }}
                  >
                    Check-in
                  </Button>
                </Col>
                <Col span={12}>
                  <Button
                    icon={<LogoutOutlined />}
                    block
                    disabled={!hasCheckedIn || hasCheckedOut}
                    loading={checkOutMut.isPending}
                    onClick={() => checkOutMut.mutate()}
                    danger={!hasCheckedOut && hasCheckedIn}
                  >
                    Check-out
                  </Button>
                </Col>
              </Row>

              <Button
                type="link"
                size="small"
                onClick={() => navigate('/timesheet')}
                style={{ paddingLeft: 0 }}
              >
                Xem bảng chấm công →
              </Button>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
