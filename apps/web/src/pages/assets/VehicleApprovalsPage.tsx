import { useState } from 'react';
import {
  Button, Table, Form, Modal, Select, Space, Row, Col, Typography, message, Input,
} from 'antd';
import {
  CarOutlined, CheckOutlined, CloseOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

import { useThemePalette } from '../../hooks/useThemePalette';
import { usePagination } from '../../hooks/usePagination';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { FilterBar } from '../../components/FilterBar';

import {
  useVehicleRequests, useVehicleStats,
  useApproveRequest, useRejectRequest,
  type VehicleRequest,
} from '../../api/vehicle-booking';
import { RequestStatusTag } from './_vehicle-tags';

const { Text } = Typography;

const STATUS_OPTIONS = [
  { value: '',            label: 'Tất cả trạng thái' },
  { value: 'PENDING',     label: 'Chờ duyệt' },
  { value: 'APPROVED',    label: 'Đã duyệt' },
  { value: 'REJECTED',    label: 'Từ chối' },
  { value: 'IN_PROGRESS', label: 'Đang đi' },
  { value: 'COMPLETED',   label: 'Hoàn thành' },
  { value: 'CANCELLED',   label: 'Đã hủy' },
];

export default function VehicleApprovalsPage() {
  const { textPrimary, textMuted, bgContainer, borderColor, isDark } = useThemePalette();

  const { paginationProps } = usePagination(20);
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [rejectOpen, setRejectOpen]     = useState(false);
  const [rejectId, setRejectId]         = useState('');
  const [rejectForm]                    = Form.useForm();

  const { data: requestsRaw, isLoading } = useVehicleRequests();
  const { data: stats }                  = useVehicleStats();
  const approveRequestMut = useApproveRequest();
  const rejectRequestMut  = useRejectRequest();

  const allRequests: VehicleRequest[] = requestsRaw?.data ?? [];
  const filtered = statusFilter
    ? allRequests.filter((r) => r.status === statusFilter)
    : allRequests;

  const pendingCount   = allRequests.filter((r) => r.status === 'PENDING').length;
  const approvedCount  = allRequests.filter((r) => r.status === 'APPROVED').length;
  const rejectedCount  = allRequests.filter((r) => r.status === 'REJECTED').length;

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

  const columns: ColumnsType<VehicleRequest> = [
    {
      title: 'Người đặt',
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
      title: 'Khách',
      dataIndex: 'passengerCount',
      width: 70,
      render: (v: number) => <Text style={{ color: textPrimary }}>{v}</Text>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      render: (v: VehicleRequest['status']) => <RequestStatusTag status={v} isDark={isDark} />,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 140,
      render: (_: unknown, r: VehicleRequest) => {
        if (r.status !== 'PENDING') return null;
        return (
          <Space>
            <Button
              size="small"
              icon={<CheckOutlined />}
              style={{ color: '#10B981', borderColor: '#10B981' }}
              loading={approveRequestMut.isPending}
              onClick={() => handleApprove(r.id)}
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
        );
      },
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Duyệt yêu cầu xe"
        icon={<CarOutlined />}
        iconColor="#F59E0B"
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <StatCard label="Chờ duyệt" value={pendingCount} color="#F59E0B" icon={<CarOutlined />} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard label="Đã duyệt" value={approvedCount} color="#10B981" icon={<CarOutlined />} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard label="Từ chối" value={rejectedCount} color="#EF4444" icon={<CarOutlined />} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard label="Hôm nay" value={stats?.todayRequests ?? 0} color="#3B82F6" icon={<CarOutlined />} />
        </Col>
      </Row>

      <div style={{ background: bgContainer, borderRadius: 8, border: `1px solid ${borderColor}`, padding: 16 }}>
        <FilterBar>
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 180 }}
            options={STATUS_OPTIONS}
          />
        </FilterBar>

        <Table<VehicleRequest>
          rowKey="id"
          columns={columns}
          dataSource={filtered}
          loading={isLoading}
          pagination={paginationProps(filtered.length, 'yêu cầu')}
          scroll={{ x: 900 }}
          locale={{
            emptyText: (
              <div style={{ padding: '40px 0', textAlign: 'center' }}>
                <CarOutlined style={{ fontSize: 48, color: '#94A3B8', marginBottom: 12, display: 'block' }} />
                <div style={{ color: textMuted, fontSize: 14 }}>
                  {statusFilter === 'PENDING' ? 'Không có yêu cầu nào chờ duyệt' : 'Không có dữ liệu'}
                </div>
              </div>
            ),
          }}
        />
      </div>

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
            <Input.TextArea rows={3} placeholder="Nhập lý do từ chối..." maxLength={500} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
