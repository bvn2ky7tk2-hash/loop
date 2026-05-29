import { Row, Col, Table } from 'antd';
import {
  NodeIndexOutlined,
  ThunderboltOutlined,
  RobotOutlined,
  ExclamationCircleOutlined,
  HomeOutlined,
  CarOutlined,
  ToolOutlined,
  LaptopOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useThemePalette } from '../../hooks/useThemePalette';
import { StatCard } from '../../components/ui/StatCard';
import { PageHeader } from '../../components/ui/PageHeader';
import { dashboardV3Api } from '../../api/dashboard-v3';
import { roomBookingApi, type RoomBooking } from '../../api/room-booking';
import { apiClient } from '../../api/client';

const { Text } = Typography;

export default function OpsDashboard() {
  const { bgContainer, borderColor, textPrimary, textMuted } = useThemePalette();

  // BPM/Ops stats
  const { data: opsData } = useQuery({
    queryKey:        ['dashboard-ops'],
    queryFn:         dashboardV3Api.getOps,
    refetchInterval: 30_000,
  });

  // Asset summary
  const { data: assetSummary } = useQuery({
    queryKey: ['assets', 'summary'],
    queryFn:  () => apiClient.get('/assets/summary').then((r) => r.data),
    refetchInterval: 60_000,
  });

  // Room stats hôm nay
  const { data: roomStats } = useQuery({
    queryKey: ['rooms', 'stats'],
    queryFn:  () => roomBookingApi.getRoomStats(),
    refetchInterval: 60_000,
  });

  // Xe yêu cầu hôm nay
  const { data: vehicleRequestsData } = useQuery({
    queryKey: ['vehicle-requests', 'today'],
    queryFn:  () => apiClient.get('/vehicle-requests', {
      params: { page: 1, limit: 10, date: dayjs().format('YYYY-MM-DD') },
    }).then((r) => r.data),
    refetchInterval: 60_000,
  });

  // Đặt phòng hôm nay (danh sách ngắn)
  const { data: todayBookingsData } = useQuery({
    queryKey: ['room-bookings', 'today'],
    queryFn:  () => roomBookingApi.listBookings({ page: 1, limit: 5, date: dayjs().format('YYYY-MM-DD') }),
    refetchInterval: 60_000,
  });

  const todayBookings: RoomBooking[] = Array.isArray(todayBookingsData?.data)
    ? todayBookingsData.data
    : Array.isArray(todayBookingsData)
    ? todayBookingsData
    : [];

  const todayVehicleCount = vehicleRequestsData?.total ?? vehicleRequestsData?.data?.length ?? 0;

  const statusItems = [
    { key: 'BPM Engine',   ok: (opsData?.failedJobs ?? 0) === 0 },
    { key: 'Queue Worker', ok: true },
    { key: 'Automation',   ok: (opsData?.automationRulesActive ?? 0) >= 0 },
    { key: 'Webhook',      ok: true },
  ];

  const bookingColumns: ColumnsType<RoomBooking> = [
    {
      title:     'Phòng',
      dataIndex: ['room', 'name'],
      key:       'room',
      render:    (v?: string) => (
        <Text style={{ color: textPrimary }}>{v ?? '—'}</Text>
      ),
    },
    {
      title:     'Tiêu đề',
      dataIndex: 'title',
      key:       'title',
      ellipsis:  true,
      render:    (v?: string) => (
        <Text style={{ color: textPrimary }}>{v ?? '—'}</Text>
      ),
    },
    {
      title:  'Bắt đầu',
      key:    'startTime',
      render: (_: unknown, r: RoomBooking) => (
        <Text style={{ color: textMuted }}>{dayjs(r.startTime).format('HH:mm')}</Text>
      ),
    },
    {
      title:  'Kết thúc',
      key:    'endTime',
      render: (_: unknown, r: RoomBooking) => (
        <Text style={{ color: textMuted }}>{dayjs(r.endTime).format('HH:mm')}</Text>
      ),
    },
    {
      title:     'Người đặt',
      dataIndex: ['bookedBy', 'name'],
      key:       'bookedBy',
      render:    (v?: string) => (
        <Text style={{ color: textMuted }}>{v ?? '—'}</Text>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Dashboard Vận hành"
        icon={<NodeIndexOutlined />}
        iconColor="#6366F1"
      />

      {/* Hàng 1: BPM/Ops stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={12} lg={6}>
          <StatCard label="Process instances" value={opsData?.activeProcesses ?? 0}  color="#6366F1" icon={<NodeIndexOutlined />} />
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <StatCard label="User tasks chờ"    value={opsData?.pendingUserTasks ?? 0} color="#F59E0B" icon={<ThunderboltOutlined />} />
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <StatCard label="Automation rules"  value={opsData?.automationRulesActive ?? 0} color="#10B981" icon={<RobotOutlined />} />
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <StatCard label="Lỗi / Failed jobs" value={opsData?.failedJobs ?? 0}       color="#EF4444" icon={<ExclamationCircleOutlined />} />
        </Col>
      </Row>

      {/* Hàng 2: Tài sản & booking hôm nay */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="Phòng họp hôm nay"
            value={roomStats?.todayBookings ?? 0}
            color="#3B82F6"
            icon={<HomeOutlined />}
            subValue={`${roomStats?.activeRooms ?? 0} phòng hoạt động`}
          />
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="Yêu cầu xe hôm nay"
            value={todayVehicleCount}
            color="#F97316"
            icon={<CarOutlined />}
          />
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="Bảo trì sắp tới"
            value={assetSummary?.underMaintenance ?? 0}
            color="#F59E0B"
            icon={<ToolOutlined />}
          />
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            label="Thiết bị đang cho mượn"
            value={assetSummary?.assigned ?? 0}
            color="#8B5CF6"
            icon={<LaptopOutlined />}
            subValue={`/ ${assetSummary?.total ?? 0} tổng`}
          />
        </Col>
      </Row>

      {/* Danh sách đặt phòng hôm nay */}
      <div style={{
        background:   bgContainer,
        border:       `1px solid ${borderColor}`,
        borderRadius: 12,
        padding:      '16px 20px',
        marginBottom: 16,
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: textPrimary, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <HomeOutlined style={{ color: '#3B82F6' }} />
          Đặt phòng hôm nay — {dayjs().format('DD/MM/YYYY')}
        </div>
        <Table<RoomBooking>
          rowKey="id"
          columns={bookingColumns}
          dataSource={todayBookings}
          pagination={false}
          size="small"
          locale={{ emptyText: <Text style={{ color: textMuted }}>Không có lịch đặt phòng hôm nay</Text> }}
        />
      </div>

      {/* Trạng thái hệ thống */}
      <div style={{
        background:   bgContainer,
        border:       `1px solid ${borderColor}`,
        borderRadius: 12,
        padding:      '16px 20px',
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: textPrimary, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
          <ThunderboltOutlined style={{ color: '#6366F1' }} />
          Trạng thái hệ thống
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {statusItems.map((item) => (
            <div
              key={item.key}
              style={{
                display:         'flex',
                alignItems:      'center',
                justifyContent:  'space-between',
                padding:         '8px 12px',
                borderRadius:    8,
                background:      item.ok ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                border:          `1px solid ${item.ok ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
              }}
            >
              <Text style={{ color: textPrimary, fontWeight: 500 }}>{item.key}</Text>
              <span style={{ fontSize: 12, fontWeight: 700, color: item.ok ? '#10B981' : '#EF4444' }}>
                {item.ok ? 'OK' : 'ERROR'}
              </span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, fontSize: 11, color: textMuted }}>
          Cập nhật mỗi 30 giây
        </div>
      </div>
    </div>
  );
}
