import { useState } from 'react';
import {
  Tabs, Button, Table, Tag, Form, Input, InputNumber, Select,
  DatePicker, Space, Row, Col, Typography, Card, Grid, Modal, message,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  CarOutlined, CheckOutlined, CloseOutlined, StopOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

import { useThemePalette } from '../../hooks/useThemePalette';
import { usePermissions } from '../../hooks/usePermissions';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { FilterBar } from '../../components/FilterBar';
import { CenteredModal } from '../../components/ui/CenteredModal';
import { confirmDelete } from '../../components/ui/confirmDelete';

import {
  useVehicles, useVehicleRequests, useVehicleStats,
  useCreateVehicle, useUpdateVehicle, useDeleteVehicle,
  useCreateRequest, useApproveRequest, useRejectRequest,
  useCancelRequest, useCompleteRequest,
  type Vehicle, type VehicleRequest, type CreateVehicleInput, type CreateRequestInput,
} from '../../api/vehicle-booking';

const { Text } = Typography;
const { TextArea } = Input;
const { useBreakpoint } = Grid;

// ─── Tag trạng thái xe ─────────────────────────────────────────────────────

function VehicleStatusTag({ status, isDark }: { status: Vehicle['status']; isDark: boolean }) {
  if (status === 'AVAILABLE') {
    return (
      <Tag
        style={isDark ? { background: 'rgba(52,211,153,0.15)', color: '#6EE7B7', borderColor: 'rgba(52,211,153,0.3)' } : {}}
        color={isDark ? undefined : 'green'}
      >
        Sẵn sàng
      </Tag>
    );
  }
  if (status === 'IN_USE') {
    return (
      <Tag
        style={isDark ? { background: 'rgba(96,165,250,0.15)', color: '#93C5FD', borderColor: 'rgba(96,165,250,0.3)' } : {}}
        color={isDark ? undefined : 'blue'}
      >
        Đang dùng
      </Tag>
    );
  }
  if (status === 'MAINTENANCE') {
    return (
      <Tag
        style={isDark ? { background: 'rgba(251,191,36,0.15)', color: '#FCD34D', borderColor: 'rgba(251,191,36,0.3)' } : {}}
        color={isDark ? undefined : 'orange'}
      >
        Bảo trì
      </Tag>
    );
  }
  return (
    <Tag
      style={isDark ? { background: 'rgba(148,163,184,0.15)', color: '#CBD5E1', borderColor: 'rgba(148,163,184,0.3)' } : {}}
      color={isDark ? undefined : 'default'}
    >
      Đã nghỉ hưu
    </Tag>
  );
}

// ─── Tag trạng thái yêu cầu ───────────────────────────────────────────────

function RequestStatusTag({ status, isDark }: { status: VehicleRequest['status']; isDark: boolean }) {
  const map: Record<VehicleRequest['status'], { label: string; style: any; color: string }> = {
    PENDING:     { label: 'Chờ duyệt',    style: isDark ? { background: 'rgba(251,191,36,0.15)', color: '#FCD34D', borderColor: 'rgba(251,191,36,0.3)' } : {}, color: 'orange' },
    APPROVED:    { label: 'Đã duyệt',     style: isDark ? { background: 'rgba(52,211,153,0.15)', color: '#6EE7B7', borderColor: 'rgba(52,211,153,0.3)' } : {}, color: 'green' },
    REJECTED:    { label: 'Từ chối',      style: isDark ? { background: 'rgba(248,113,113,0.15)', color: '#FCA5A5', borderColor: 'rgba(248,113,113,0.3)' } : {}, color: 'red' },
    IN_PROGRESS: { label: 'Đang đi',      style: isDark ? { background: 'rgba(96,165,250,0.15)', color: '#93C5FD', borderColor: 'rgba(96,165,250,0.3)' } : {}, color: 'blue' },
    COMPLETED:   { label: 'Hoàn thành',   style: isDark ? { background: 'rgba(96,165,250,0.12)', color: '#6EE7B7', borderColor: 'rgba(52,211,153,0.25)' } : {}, color: 'cyan' },
    CANCELLED:   { label: 'Đã hủy',       style: isDark ? { background: 'rgba(148,163,184,0.15)', color: '#CBD5E1', borderColor: 'rgba(148,163,184,0.3)' } : {}, color: 'default' },
  };
  const cfg = map[status];
  return <Tag style={isDark ? cfg.style : {}} color={isDark ? undefined : cfg.color}>{cfg.label}</Tag>;
}

// ─── Component chính ─────────────────────────────────────────────────────────

export default function VehicleBookingPage() {
  const { textPrimary, textMuted, bgContainer, bgCard, borderColor, isDark, preset, linkColor } = useThemePalette();
  const { hasRole } = usePermissions();
  const isAdmin      = hasRole('ADMIN');
  const isLeadership = hasRole('LEADERSHIP') || isAdmin;
  const screens      = useBreakpoint();

  // ── State ──────────────────────────────────────────────────────────────────
  const [bookingOpen, setBookingOpen]     = useState(false);
  const [vehicleOpen, setVehicleOpen]     = useState(false);
  const [rejectOpen, setRejectOpen]       = useState(false);
  const [rejectId, setRejectId]           = useState<string>('');
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [bookingForm]  = Form.useForm();
  const [vehicleForm]  = Form.useForm();
  const [rejectForm]   = Form.useForm();

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: vehicles = [],  isLoading: vehiclesLoading }  = useVehicles();
  const { data: requestsRaw,    isLoading: requestsLoading }  = useVehicleRequests();
  const { data: stats }                                        = useVehicleStats();

  const requests: VehicleRequest[] = requestsRaw?.data ?? [];

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createVehicleMut  = useCreateVehicle();
  const updateVehicleMut  = useUpdateVehicle();
  const deleteVehicleMut  = useDeleteVehicle();
  const createRequestMut  = useCreateRequest();
  const approveRequestMut = useApproveRequest();
  const rejectRequestMut  = useRejectRequest();
  const cancelRequestMut  = useCancelRequest();
  const completeRequestMut = useCompleteRequest();

  // ── Handlers — Xe ─────────────────────────────────────────────────────────

  const openCreateVehicle = () => {
    setEditingVehicle(null);
    vehicleForm.resetFields();
    setVehicleOpen(true);
  };

  const openEditVehicle = (v: Vehicle) => {
    setEditingVehicle(v);
    vehicleForm.setFieldsValue({
      name:        v.name,
      plateNumber: v.plateNumber,
      type:        v.type,
      seats:       v.seats,
      status:      v.status,
    });
    setVehicleOpen(true);
  };

  const handleVehicleSubmit = async (values: CreateVehicleInput) => {
    try {
      if (editingVehicle) {
        await updateVehicleMut.mutateAsync({ id: editingVehicle.id, data: values });
        message.success('Cập nhật xe thành công');
      } else {
        await createVehicleMut.mutateAsync(values);
        message.success('Thêm xe thành công');
      }
      setVehicleOpen(false);
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? 'Có lỗi xảy ra');
    }
  };

  const handleDeleteVehicle = (v: Vehicle) => {
    confirmDelete({
      itemName: `${v.name} (${v.plateNumber})`,
      onConfirm: async () => {
        try {
          await deleteVehicleMut.mutateAsync(v.id);
          message.success('Xóa xe thành công');
        } catch (e: any) {
          message.error(e?.response?.data?.message ?? 'Có lỗi xảy ra');
        }
      },
    });
  };

  // ── Handlers — Yêu cầu ────────────────────────────────────────────────────

  const handleBookingSubmit = async (values: any) => {
    try {
      const payload: CreateRequestInput = {
        vehicleId:      values.vehicleId,
        purpose:        values.purpose,
        destination:    values.destination,
        startTime:      values.startTime.toISOString(),
        endTime:        values.endTime.toISOString(),
        passengerCount: values.passengerCount ?? 1,
        note:           values.note,
      };
      await createRequestMut.mutateAsync(payload);
      message.success('Đặt xe thành công, đang chờ duyệt');
      setBookingOpen(false);
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? 'Đặt xe thất bại');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await approveRequestMut.mutateAsync(id);
      message.success('Đã duyệt yêu cầu');
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? 'Có lỗi xảy ra');
    }
  };

  const openReject = (id: string) => {
    setRejectId(id);
    rejectForm.resetFields();
    setRejectOpen(true);
  };

  const handleRejectSubmit = async (values: { reason: string }) => {
    try {
      await rejectRequestMut.mutateAsync({ id: rejectId, reason: values.reason });
      message.success('Đã từ chối yêu cầu');
      setRejectOpen(false);
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? 'Có lỗi xảy ra');
    }
  };

  const handleCancel = (id: string) => {
    confirmDelete({
      title:   'Hủy yêu cầu đặt xe?',
      content: 'Yêu cầu sẽ bị hủy. Thao tác này không thể hoàn tác.',
      onConfirm: async () => {
        try {
          await cancelRequestMut.mutateAsync(id);
          message.success('Đã hủy yêu cầu');
        } catch (e: any) {
          message.error(e?.response?.data?.message ?? 'Có lỗi xảy ra');
        }
      },
    });
  };

  const handleComplete = async (id: string) => {
    try {
      await completeRequestMut.mutateAsync(id);
      message.success('Đã hoàn tất chuyến đi');
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? 'Có lỗi xảy ra');
    }
  };

  // ── Columns — Yêu cầu của tôi ─────────────────────────────────────────────

  const myRequestColumns: ColumnsType<VehicleRequest> = [
    {
      title: 'Xe',
      dataIndex: ['vehicle', 'name'],
      render: (_: unknown, r: VehicleRequest) => r.vehicle ? (
        <div>
          <Text style={{ color: textPrimary, fontWeight: 600 }}>{r.vehicle.name}</Text>
          <br />
          <Text style={{ color: textMuted, fontSize: 12 }}>{r.vehicle.plateNumber}</Text>
        </div>
      ) : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      title: 'Mục đích',
      dataIndex: 'purpose',
      render: (v: string) => <Text style={{ color: textPrimary }}>{v}</Text>,
    },
    {
      title: 'Điểm đến',
      dataIndex: 'destination',
      render: (v: string) => <Text style={{ color: textPrimary }}>{v}</Text>,
    },
    {
      title: 'Thời gian',
      key: 'time',
      render: (_: unknown, r: VehicleRequest) => (
        <Text style={{ color: textMuted, fontSize: 12 }}>
          {dayjs(r.startTime).format('DD/MM HH:mm')} → {dayjs(r.endTime).format('DD/MM HH:mm')}
        </Text>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      render: (v: VehicleRequest['status']) => <RequestStatusTag status={v} isDark={isDark} />,
    },
    {
      title: 'Hành động',
      key: 'actions',
      render: (_: unknown, r: VehicleRequest) => (
        <Space>
          {r.status === 'PENDING' && (
            <Button size="small" danger onClick={() => handleCancel(r.id)}>
              Hủy
            </Button>
          )}
          {(r.status === 'APPROVED' || r.status === 'IN_PROGRESS') && (
            <Button
              size="small"
              icon={<CheckOutlined />}
              style={{ color: '#10B981', borderColor: '#10B981' }}
              onClick={() => handleComplete(r.id)}
            >
              Hoàn thành
            </Button>
          )}
        </Space>
      ),
    },
  ];

  // ── Columns — Duyệt yêu cầu ───────────────────────────────────────────────

  const approvalColumns: ColumnsType<VehicleRequest> = [
    {
      title: 'Người đặt',
      dataIndex: ['requestedBy', 'name'],
      render: (_: unknown, r: VehicleRequest) => (
        <Text style={{ color: textPrimary }}>{r.requestedBy?.name ?? '—'}</Text>
      ),
    },
    {
      title: 'Xe',
      render: (_: unknown, r: VehicleRequest) => r.vehicle ? (
        <div>
          <Text style={{ color: textPrimary, fontWeight: 600 }}>{r.vehicle.name}</Text>
          <br />
          <Text style={{ color: textMuted, fontSize: 12 }}>{r.vehicle.plateNumber}</Text>
        </div>
      ) : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      title: 'Mục đích',
      dataIndex: 'purpose',
      render: (v: string) => <Text style={{ color: textPrimary }}>{v}</Text>,
    },
    {
      title: 'Điểm đến',
      dataIndex: 'destination',
      render: (v: string) => <Text style={{ color: textPrimary }}>{v}</Text>,
    },
    {
      title: 'Thời gian',
      key: 'time',
      render: (_: unknown, r: VehicleRequest) => (
        <Text style={{ color: textMuted, fontSize: 12 }}>
          {dayjs(r.startTime).format('DD/MM HH:mm')} → {dayjs(r.endTime).format('DD/MM HH:mm')}
        </Text>
      ),
    },
    {
      title: 'Số khách',
      dataIndex: 'passengerCount',
      render: (v: number) => <Text style={{ color: textPrimary }}>{v}</Text>,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_: unknown, r: VehicleRequest) => (
        <Space>
          <Button
            size="small"
            icon={<CheckOutlined />}
            style={{ color: '#10B981', borderColor: '#10B981' }}
            onClick={() => handleApprove(r.id)}
            loading={approveRequestMut.isPending}
          >
            Duyệt
          </Button>
          <Button
            size="small"
            danger
            icon={<CloseOutlined />}
            onClick={() => openReject(r.id)}
          >
            Từ chối
          </Button>
        </Space>
      ),
    },
  ];

  // ── Columns — Quản lý xe ───────────────────────────────────────────────────

  const vehicleColumns: ColumnsType<Vehicle> = [
    {
      title: 'Tên xe',
      dataIndex: 'name',
      render: (v: string) => <Text style={{ color: textPrimary, fontWeight: 600 }}>{v}</Text>,
    },
    {
      title: 'Biển số',
      dataIndex: 'plateNumber',
      render: (v: string) => <Text style={{ color: linkColor, fontWeight: 600 }}>{v}</Text>,
    },
    {
      title: 'Loại xe',
      dataIndex: 'type',
      render: (v: string) => (
        <Tag
          style={isDark ? { background: 'rgba(96,165,250,0.15)', color: '#93C5FD', borderColor: 'rgba(96,165,250,0.3)' } : {}}
          color={isDark ? undefined : 'blue'}
        >
          {v}
        </Tag>
      ),
    },
    {
      title: 'Sức chứa',
      dataIndex: 'seats',
      render: (v: number) => <Text style={{ color: textPrimary }}>{v} chỗ</Text>,
    },
    {
      title: 'Tài xế',
      render: (_: unknown, r: Vehicle) => r.driver
        ? <Text style={{ color: textPrimary }}>{r.driver.name}</Text>
        : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      render: (v: Vehicle['status']) => <VehicleStatusTag status={v} isDark={isDark} />,
    },
    ...(isAdmin ? [{
      title: 'Thao tác',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: Vehicle) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            size="small"
            style={{ color: isDark ? '#93C5FD' : preset.primary }}
            onClick={() => openEditVehicle(record)}
          />
          <Button
            type="text"
            icon={<DeleteOutlined />}
            size="small"
            danger
            onClick={() => handleDeleteVehicle(record)}
          />
        </Space>
      ),
    }] : []),
  ];

  // ── Vehicle Cards (Tab đặt xe) ─────────────────────────────────────────────

  const availableVehicles = vehicles.filter((v) => v.status === 'AVAILABLE');

  const renderVehicleCard = (v: Vehicle) => (
    <Col xs={24} sm={12} lg={6} key={v.id}>
      <Card
        hoverable
        style={{
          background:   bgCard,
          border:       `1px solid ${borderColor}`,
          borderRadius: 10,
          cursor:       'pointer',
        }}
        bodyStyle={{ padding: 16 }}
        onClick={() => {
          bookingForm.resetFields();
          bookingForm.setFieldValue('vehicleId', v.id);
          setBookingOpen(true);
        }}
      >
        {/* Placeholder ảnh */}
        <div
          style={{
            height:        100,
            borderRadius:  8,
            background:    isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)',
            display:       'flex',
            alignItems:    'center',
            justifyContent:'center',
            marginBottom:  12,
          }}
        >
          <CarOutlined style={{ fontSize: 40, color: '#6366F1' }} />
        </div>

        <Text style={{ color: textPrimary, fontWeight: 700, fontSize: 15, display: 'block', marginBottom: 4 }}>
          {v.name}
        </Text>
        <Text style={{ color: linkColor, fontSize: 13, display: 'block', marginBottom: 4 }}>
          {v.plateNumber}
        </Text>
        <Space wrap size={4} style={{ marginBottom: 8 }}>
          <Tag
            style={isDark ? { background: 'rgba(96,165,250,0.15)', color: '#93C5FD', borderColor: 'rgba(96,165,250,0.3)' } : {}}
            color={isDark ? undefined : 'blue'}
          >
            {v.type}
          </Tag>
          <Tag
            style={isDark ? { background: 'rgba(52,211,153,0.15)', color: '#6EE7B7', borderColor: 'rgba(52,211,153,0.3)' } : {}}
            color={isDark ? undefined : 'green'}
          >
            {v.seats} chỗ
          </Tag>
        </Space>
        <VehicleStatusTag status={v.status} isDark={isDark} />
      </Card>
    </Col>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  const pendingRequests = requests.filter((r) => r.status === 'PENDING');

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Đặt xe công vụ"
        icon={<CarOutlined />}
        iconColor="#3B82F6"
        actions={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              bookingForm.resetFields();
              setBookingOpen(true);
            }}
          >
            Đặt xe
          </Button>
        }
      />

      {/* Stat cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <StatCard
            label="Tổng xe"
            value={stats?.totalVehicles ?? 0}
            color="#6366F1"
            icon={<CarOutlined />}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            label="Sẵn sàng"
            value={stats?.available ?? 0}
            color="#10B981"
            icon={<CarOutlined />}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            label="Đang dùng"
            value={stats?.inUse ?? 0}
            color="#3B82F6"
            icon={<CarOutlined />}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            label="Chờ duyệt"
            value={stats?.pendingRequests ?? 0}
            color="#F59E0B"
            icon={<StopOutlined />}
          />
        </Col>
      </Row>

      {/* Tabs */}
      <div style={{ background: bgContainer, borderRadius: 8, border: `1px solid ${borderColor}`, padding: '16px 16px 0' }}>
        <Tabs
          defaultActiveKey="book"
          items={[
            {
              key:   'book',
              label: 'Đặt xe',
              children: (
                <div style={{ paddingBottom: 16 }}>
                  <FilterBar>
                    <Text style={{ color: textMuted, fontSize: 13 }}>
                      Click vào xe để đặt lịch
                    </Text>
                  </FilterBar>

                  {availableVehicles.length > 0 ? (
                    <Row gutter={[16, 16]}>
                      {availableVehicles.map(renderVehicleCard)}
                    </Row>
                  ) : (
                    <div style={{ textAlign: 'center', padding: 40 }}>
                      <CarOutlined style={{ fontSize: 48, color: textMuted, display: 'block', marginBottom: 12 }} />
                      <Text style={{ color: textMuted }}>Hiện không có xe khả dụng</Text>
                    </div>
                  )}
                </div>
              ),
            },
            {
              key:   'my-requests',
              label: 'Yêu cầu của tôi',
              children: (
                <Table<VehicleRequest>
                  rowKey="id"
                  columns={myRequestColumns}
                  dataSource={requests}
                  loading={requestsLoading}
                  pagination={{ pageSize: 20 }}
                  scroll={{ x: 800 }}
                  locale={{
                    emptyText: (
                      <div style={{ padding: '40px 0', textAlign: 'center' }}>
                        {/* Icon và text hiển thị khi chưa có yêu cầu xe nào */}
                        <CarOutlined style={{ fontSize: 48, color: '#94A3B8', marginBottom: 12, display: 'block' }} />
                        <div style={{ color: textMuted, fontSize: 14 }}>Chưa có yêu cầu xe nào</div>
                        <div style={{ color: textMuted, fontSize: 12, marginTop: 4 }}>Nhấn nút Đặt xe để tạo yêu cầu mới</div>
                      </div>
                    ),
                  }}
                />
              ),
            },
            ...(isLeadership ? [{
              key:   'approval',
              label: `Duyệt yêu cầu${pendingRequests.length > 0 ? ` (${pendingRequests.length})` : ''}`,
              children: (
                <Table<VehicleRequest>
                  rowKey="id"
                  columns={approvalColumns}
                  dataSource={pendingRequests}
                  loading={requestsLoading}
                  pagination={{ pageSize: 20 }}
                  scroll={{ x: 900 }}
                  locale={{
                    emptyText: (
                      <div style={{ padding: '40px 0', textAlign: 'center' }}>
                        {/* Icon và text khi không có yêu cầu nào chờ duyệt */}
                        <CarOutlined style={{ fontSize: 48, color: '#94A3B8', marginBottom: 12, display: 'block' }} />
                        <div style={{ color: textMuted, fontSize: 14 }}>Không có yêu cầu nào chờ duyệt</div>
                      </div>
                    ),
                  }}
                />
              ),
            }] : []),
            ...(isAdmin ? [{
              key:   'manage',
              label: 'Quản lý xe',
              children: (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={openCreateVehicle}
                    >
                      Thêm xe
                    </Button>
                  </div>
                  <Table<Vehicle>
                    rowKey="id"
                    columns={vehicleColumns}
                    dataSource={vehicles}
                    loading={vehiclesLoading}
                    pagination={{ pageSize: 20 }}
                    scroll={{ x: 800 }}
                    locale={{
                      emptyText: (
                        <div style={{ padding: '40px 0', textAlign: 'center' }}>
                          {/* Icon và text khi chưa có xe nào trong hệ thống */}
                          <CarOutlined style={{ fontSize: 48, color: '#94A3B8', marginBottom: 12, display: 'block' }} />
                          <div style={{ color: textMuted, fontSize: 14 }}>Chưa có xe nào trong hệ thống</div>
                          <div style={{ color: textMuted, fontSize: 12, marginTop: 4 }}>Nhấn nút Thêm xe để đăng ký xe mới</div>
                        </div>
                      ),
                    }}
                  />
                </div>
              ),
            }] : []),
          ]}
        />
      </div>

      {/* Modal đặt xe */}
      <CenteredModal
        title="Đặt xe công vụ"
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setBookingOpen(false)}>Hủy</Button>
            <Button type="primary" loading={createRequestMut.isPending} onClick={() => bookingForm.submit()}>
              Gửi yêu cầu
            </Button>
          </div>
        }
      >
        <Form form={bookingForm} layout="vertical" onFinish={handleBookingSubmit}>
          <Form.Item
            name="vehicleId"
            label="Chọn xe"
            rules={[{ required: true, message: 'Vui lòng chọn xe' }]}
          >
            <Select placeholder="Chọn xe khả dụng">
              {vehicles
                .filter((v) => v.status === 'AVAILABLE')
                .map((v) => (
                  <Select.Option key={v.id} value={v.id}>
                    {v.name} — {v.plateNumber} ({v.type}, {v.seats} chỗ)
                  </Select.Option>
                ))}
            </Select>
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="startTime"
                label="Thời gian bắt đầu"
                rules={[{ required: true, message: 'Chọn giờ bắt đầu' }]}
              >
                <DatePicker
                  showTime={{ format: 'HH:mm', minuteStep: 30 as any }}
                  format="DD/MM/YYYY HH:mm"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="endTime"
                label="Thời gian kết thúc"
                rules={[{ required: true, message: 'Chọn giờ kết thúc' }]}
              >
                <DatePicker
                  showTime={{ format: 'HH:mm', minuteStep: 30 as any }}
                  format="DD/MM/YYYY HH:mm"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="purpose"
            label="Mục đích chuyến đi"
            rules={[{ required: true, message: 'Nhập mục đích' }]}
          >
            <Input placeholder="VD: Gặp khách hàng tại Hà Nội..." maxLength={500} />
          </Form.Item>

          <Form.Item
            name="destination"
            label="Điểm đến"
            rules={[{ required: true, message: 'Nhập điểm đến' }]}
          >
            <Input placeholder="VD: 123 Lê Lợi, Quận 1, TP.HCM" maxLength={300} />
          </Form.Item>

          <Form.Item name="passengerCount" label="Số hành khách" initialValue={1}>
            <InputNumber min={1} max={50} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="note" label="Ghi chú">
            <TextArea rows={3} placeholder="Thông tin thêm (không bắt buộc)" maxLength={500} />
          </Form.Item>
        </Form>
      </CenteredModal>

      {/* Modal thêm/sửa xe (ADMIN) */}
      <CenteredModal
        title={editingVehicle ? `Sửa xe: ${editingVehicle.name}` : 'Thêm xe mới'}
        open={vehicleOpen}
        onClose={() => setVehicleOpen(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setVehicleOpen(false)}>Hủy</Button>
            <Button
              type="primary"
              loading={createVehicleMut.isPending || updateVehicleMut.isPending}
              onClick={() => vehicleForm.submit()}
            >
              {editingVehicle ? 'Lưu thay đổi' : 'Thêm xe'}
            </Button>
          </div>
        }
      >
        <Form form={vehicleForm} layout="vertical" onFinish={handleVehicleSubmit}>
          <Form.Item name="name" label="Tên xe" rules={[{ required: true, message: 'Nhập tên xe' }]}>
            <Input placeholder="VD: Toyota Camry, Ford Transit..." maxLength={200} />
          </Form.Item>

          <Form.Item name="plateNumber" label="Biển số xe" rules={[{ required: true, message: 'Nhập biển số' }]}>
            <Input placeholder="VD: 51A-123.45" maxLength={20} />
          </Form.Item>

          <Form.Item name="type" label="Loại xe" rules={[{ required: true, message: 'Nhập loại xe' }]}>
            <Select placeholder="Chọn loại xe">
              <Select.Option value="Xe con">Xe con</Select.Option>
              <Select.Option value="Xe 7 chỗ">Xe 7 chỗ</Select.Option>
              <Select.Option value="Xe 16 chỗ">Xe 16 chỗ</Select.Option>
              <Select.Option value="Xe tải">Xe tải</Select.Option>
              <Select.Option value="Xe bus">Xe bus</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="seats" label="Số chỗ ngồi" initialValue={4}>
            <InputNumber min={1} max={100} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="status" label="Trạng thái" initialValue="AVAILABLE">
            <Select>
              <Select.Option value="AVAILABLE">Sẵn sàng</Select.Option>
              <Select.Option value="MAINTENANCE">Bảo trì</Select.Option>
              <Select.Option value="RETIRED">Đã nghỉ hưu</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </CenteredModal>

      {/* Modal từ chối */}
      <Modal
        title="Từ chối yêu cầu"
        open={rejectOpen}
        onCancel={() => setRejectOpen(false)}
        onOk={() => rejectForm.submit()}
        confirmLoading={rejectRequestMut.isPending}
        okText="Từ chối"
        okButtonProps={{ danger: true }}
        centered
      >
        <Form form={rejectForm} layout="vertical" onFinish={handleRejectSubmit}>
          <Form.Item
            name="reason"
            label="Lý do từ chối"
            rules={[{ required: true, message: 'Vui lòng nhập lý do' }]}
          >
            <TextArea rows={3} placeholder="Nhập lý do từ chối yêu cầu này..." maxLength={500} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
