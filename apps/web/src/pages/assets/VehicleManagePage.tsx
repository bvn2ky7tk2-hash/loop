import { useState } from 'react';
import {
  Button, Table, Form, Input, InputNumber, Select, Space, Row, Col, Typography, message,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, CarOutlined, ToolOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

import { useThemePalette } from '../../hooks/useThemePalette';
import { usePagination } from '../../hooks/usePagination';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { CenteredModal } from '../../components/ui/CenteredModal';
import { confirmDelete } from '../../components/ui/confirmDelete';

import {
  useVehicles, useVehicleStats,
  useCreateVehicle, useUpdateVehicle, useDeleteVehicle,
  type Vehicle, type CreateVehicleInput,
} from '../../api/vehicle-booking';
import { VehicleStatusTag } from './_vehicle-tags';

const { Text } = Typography;

export default function VehicleManagePage() {
  const { textPrimary, textMuted, bgContainer, borderColor, isDark, linkColor, preset } = useThemePalette();

  const { paginationProps } = usePagination(20);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState<Vehicle | null>(null);
  const [vehicleForm]             = Form.useForm();

  const { data: vehicles = [], isLoading } = useVehicles();
  const { data: stats }                    = useVehicleStats();
  const createMut = useCreateVehicle();
  const updateMut = useUpdateVehicle();
  const deleteMut = useDeleteVehicle();

  const available    = vehicles.filter((v) => v.status === 'AVAILABLE').length;
  const inUse        = vehicles.filter((v) => v.status === 'IN_USE').length;
  const maintenance  = vehicles.filter((v) => v.status === 'MAINTENANCE').length;

  const openCreate = () => {
    setEditing(null);
    vehicleForm.resetFields();
    setModalOpen(true);
  };

  const openEdit = (v: Vehicle) => {
    setEditing(v);
    vehicleForm.setFieldsValue({
      name:        v.name,
      plateNumber: v.plateNumber,
      type:        v.type,
      seats:       v.seats,
      status:      v.status,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (values: CreateVehicleInput) => {
    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, data: values });
        message.success('Cập nhật xe thành công');
      } else {
        await createMut.mutateAsync(values);
        message.success('Thêm xe thành công');
      }
      setModalOpen(false);
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? 'Có lỗi xảy ra');
    }
  };

  const handleDelete = (v: Vehicle) => {
    confirmDelete({
      itemName: `${v.name} (${v.plateNumber})`,
      onConfirm: async () => {
        try {
          await deleteMut.mutateAsync(v.id);
          message.success('Xóa xe thành công');
        } catch (e: any) {
          message.error(e?.response?.data?.message ?? 'Có lỗi xảy ra');
        }
      },
    });
  };

  const columns: ColumnsType<Vehicle> = [
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
        <span
          style={isDark
            ? { background: 'rgba(96,165,250,0.15)', color: '#93C5FD', border: '1px solid rgba(96,165,250,0.3)', borderRadius: 4, padding: '1px 8px', fontSize: 12 }
            : { background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', borderRadius: 4, padding: '1px 8px', fontSize: 12 }}
        >
          {v}
        </span>
      ),
    },
    {
      title: 'Sức chứa',
      dataIndex: 'seats',
      width: 90,
      render: (v: number) => <Text style={{ color: textPrimary }}>{v} chỗ</Text>,
    },
    {
      title: 'Tài xế',
      render: (_: unknown, r: Vehicle) => r.driver
        ? <Text style={{ color: textPrimary }}>{r.driver.name}</Text>
        : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      title: 'Số lần đặt',
      render: (_: unknown, r: Vehicle) => (
        <Text style={{ color: textMuted }}>{r._count?.requests ?? 0}</Text>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      render: (v: Vehicle['status']) => <VehicleStatusTag status={v} isDark={isDark} />,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: Vehicle) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            size="small"
            style={{ color: linkColor }}
            onClick={() => openEdit(record)}
          />
          <Button
            type="text"
            icon={<DeleteOutlined />}
            size="small"
            danger
            onClick={() => handleDelete(record)}
          />
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Quản lý đội xe"
        icon={<ToolOutlined />}
        iconColor="#B45309"
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Thêm xe
          </Button>
        }
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <StatCard label="Tổng xe" value={stats?.totalVehicles ?? 0} color="#6366F1" icon={<CarOutlined />} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard label="Sẵn sàng" value={available} color="#10B981" icon={<CarOutlined />} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard label="Đang dùng" value={inUse} color="#3B82F6" icon={<CarOutlined />} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard label="Bảo trì" value={maintenance} color="#F59E0B" icon={<ToolOutlined />} />
        </Col>
      </Row>

      <div style={{ background: bgContainer, borderRadius: 8, border: `1px solid ${borderColor}`, padding: 16 }}>
        <Table<Vehicle>
          rowKey="id"
          columns={columns}
          dataSource={vehicles}
          loading={isLoading}
          pagination={paginationProps(vehicles.length, 'xe')}
          scroll={{ x: 800 }}
          locale={{
            emptyText: (
              <div style={{ padding: '40px 0', textAlign: 'center' }}>
                <CarOutlined style={{ fontSize: 48, color: '#94A3B8', marginBottom: 12, display: 'block' }} />
                <div style={{ color: textMuted, fontSize: 14 }}>Chưa có xe nào trong hệ thống</div>
                <div style={{ color: textMuted, fontSize: 12, marginTop: 4 }}>Nhấn Thêm xe để đăng ký xe mới</div>
              </div>
            ),
          }}
        />
      </div>

      <CenteredModal
        title={editing ? `Sửa xe: ${editing.name}` : 'Thêm xe mới'}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setModalOpen(false)}>Hủy</Button>
            <Button
              type="primary"
              loading={createMut.isPending || updateMut.isPending}
              disabled={createMut.isPending || updateMut.isPending}
              onClick={() => vehicleForm.submit()}
            >
              {editing ? 'Lưu thay đổi' : 'Thêm xe'}
            </Button>
          </div>
        }
      >
        <Form form={vehicleForm} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="Tên xe" rules={[{ required: true, message: 'Nhập tên xe' }]}>
            <Input placeholder="VD: Toyota Camry, Ford Transit..." maxLength={200} />
          </Form.Item>

          <Form.Item name="plateNumber" label="Biển số xe" rules={[{ required: true, message: 'Nhập biển số' }]}>
            <Input placeholder="VD: 51A-123.45" maxLength={20} />
          </Form.Item>

          <Form.Item name="type" label="Loại xe" rules={[{ required: true, message: 'Chọn loại xe' }]}>
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
    </div>
  );
}
