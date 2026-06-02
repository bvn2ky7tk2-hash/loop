import { useState } from 'react';
import {
  Tabs, Button, Table, Form, Input, InputNumber, Select,
  DatePicker, Space, Row, Col, Typography, Card, Tag, message,
} from 'antd';
import {
  PlusOutlined, CarOutlined, CheckOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

import { useThemePalette } from '../../hooks/useThemePalette';
import { usePagination } from '../../hooks/usePagination';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { FilterBar } from '../../components/FilterBar';
import { CenteredModal } from '../../components/ui/CenteredModal';
import { confirmDelete } from '../../components/ui/confirmDelete';

import {
  useVehicles, useVehicleRequests, useVehicleStats,
  useCreateRequest, useCancelRequest, useCompleteRequest,
  type Vehicle, type VehicleRequest, type CreateRequestInput,
} from '../../api/vehicle-booking';
import { VehicleStatusTag, RequestStatusTag } from './_vehicle-tags';

const { Text } = Typography;
const { TextArea } = Input;

export default function VehicleBookingPage() {
  const { textPrimary, textMuted, bgContainer, bgCard, borderColor, isDark, linkColor } = useThemePalette();

  const { paginationProps } = usePagination(20);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingForm] = Form.useForm();

  const { data: vehicles = [] }                              = useVehicles();
  const { data: requestsRaw, isLoading: requestsLoading }   = useVehicleRequests();
  const { data: stats }                                      = useVehicleStats();

  const requests: VehicleRequest[] = requestsRaw?.data ?? [];

  const createRequestMut  = useCreateRequest();
  const cancelRequestMut  = useCancelRequest();
  const completeRequestMut = useCompleteRequest();

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

  const myRequestColumns: ColumnsType<VehicleRequest> = [
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

  const availableVehicles = vehicles.filter((v) => v.status === 'AVAILABLE');

  const renderVehicleCard = (v: Vehicle) => (
    <Col xs={24} sm={12} lg={6} key={v.id}>
      <Card
        hoverable
        style={{ background: bgCard, border: `1px solid ${borderColor}`, borderRadius: 10 }}
        bodyStyle={{ padding: 16 }}
        onClick={() => {
          bookingForm.resetFields();
          bookingForm.setFieldValue('vehicleId', v.id);
          setBookingOpen(true);
        }}
      >
        <div
          style={{
            height: 100, borderRadius: 8, marginBottom: 12,
            background: isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
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
            onClick={() => { bookingForm.resetFields(); setBookingOpen(true); }}
          >
            Đặt xe
          </Button>
        }
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <StatCard label="Tổng xe" value={stats?.totalVehicles ?? 0} color="#6366F1" icon={<CarOutlined />} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard label="Sẵn sàng" value={stats?.available ?? 0} color="#10B981" icon={<CarOutlined />} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard label="Đang dùng" value={stats?.inUse ?? 0} color="#3B82F6" icon={<CarOutlined />} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard label="YC của tôi" value={requests.length} color="#F59E0B" icon={<CarOutlined />} />
        </Col>
      </Row>

      <div style={{ background: bgContainer, borderRadius: 8, border: `1px solid ${borderColor}`, padding: '16px 16px 0' }}>
        <Tabs
          defaultActiveKey="book"
          items={[
            {
              key:   'book',
              label: 'Chọn xe',
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
                  pagination={paginationProps(requests.length, 'yêu cầu')}
                  scroll={{ x: 800 }}
                  locale={{
                    emptyText: (
                      <div style={{ padding: '40px 0', textAlign: 'center' }}>
                        <CarOutlined style={{ fontSize: 48, color: '#94A3B8', marginBottom: 12, display: 'block' }} />
                        <div style={{ color: textMuted, fontSize: 14 }}>Chưa có yêu cầu nào</div>
                        <div style={{ color: textMuted, fontSize: 12, marginTop: 4 }}>Nhấn Đặt xe để tạo yêu cầu mới</div>
                      </div>
                    ),
                  }}
                />
              ),
            },
          ]}
        />
      </div>

      <CenteredModal
        title="Đặt xe công vụ"
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setBookingOpen(false)}>Hủy</Button>
            <Button
              type="primary"
              loading={createRequestMut.isPending}
              disabled={createRequestMut.isPending}
              onClick={() => bookingForm.submit()}
            >
              Gửi yêu cầu
            </Button>
          </div>
        }
      >
        <Form form={bookingForm} layout="vertical" onFinish={handleBookingSubmit}>
          <Form.Item name="vehicleId" label="Chọn xe" rules={[{ required: true, message: 'Vui lòng chọn xe' }]}>
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
              <Form.Item name="startTime" label="Thời gian bắt đầu" rules={[{ required: true, message: 'Chọn giờ bắt đầu' }]}>
                <DatePicker
                  showTime={{ format: 'HH:mm', minuteStep: 30 as any }}
                  format="DD/MM/YYYY HH:mm"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="endTime" label="Thời gian kết thúc" rules={[{ required: true, message: 'Chọn giờ kết thúc' }]}>
                <DatePicker
                  showTime={{ format: 'HH:mm', minuteStep: 30 as any }}
                  format="DD/MM/YYYY HH:mm"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="purpose" label="Mục đích chuyến đi" rules={[{ required: true, message: 'Nhập mục đích' }]}>
            <Input placeholder="VD: Gặp khách hàng tại Hà Nội..." maxLength={500} />
          </Form.Item>

          <Form.Item name="destination" label="Điểm đến" rules={[{ required: true, message: 'Nhập điểm đến' }]}>
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
    </div>
  );
}
