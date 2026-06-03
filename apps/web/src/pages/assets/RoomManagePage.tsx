import { useState } from 'react';
import {
  Table, Tag, Button, Form, Input, InputNumber, Select, Space, Typography, App,
} from 'antd';
import {
  HomeOutlined, PlusOutlined, EditOutlined, DeleteOutlined,
  TeamOutlined, ToolOutlined, CheckCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useThemePalette } from '../../hooks/useThemePalette';
import { usePagination } from '../../hooks/usePagination';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { CenteredModal } from '../../components/ui/CenteredModal';
import { confirmDelete } from '../../components/ui/confirmDelete';
import {
  useRooms, useRoomStats, useCreateRoom, useUpdateRoom, useDeleteRoom,
  type MeetingRoom, type CreateRoomInput,
} from '../../api/room-booking';

const { Text } = Typography;

function RoomStatusTag({ status, isDark }: { status: MeetingRoom['status']; isDark: boolean }) {
  if (status === 'ACTIVE') {
    return (
      <Tag
        style={isDark ? { background: 'rgba(52,211,153,0.15)', color: '#6EE7B7', borderColor: 'rgba(52,211,153,0.3)' } : {}}
        color={isDark ? undefined : 'green'}
      >
        Hoạt động
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
      Không hoạt động
    </Tag>
  );
}

export default function RoomManagePage() {
  const { message } = App.useApp();
  const { textPrimary, textMuted, isDark, linkColor } = useThemePalette();

  const { paginationProps } = usePagination(20);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState<MeetingRoom | null>(null);
  const [form]                    = Form.useForm();

  const { data: roomsRaw, isLoading } = useRooms({ limit: 200 });
  const { data: stats }               = useRoomStats();
  const createMut                     = useCreateRoom();
  const updateMut                     = useUpdateRoom();
  const deleteMut                     = useDeleteRoom();

  const rooms: MeetingRoom[] = (roomsRaw as any)?.data ?? roomsRaw ?? [];

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (room: MeetingRoom) => {
    setEditing(room);
    form.setFieldsValue({
      name:      room.name,
      floor:     room.floor,
      capacity:  room.capacity,
      amenities: room.amenities,
      status:    room.status,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (values: CreateRoomInput) => {
    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, data: values });
        message.success('Cập nhật phòng thành công');
      } else {
        await createMut.mutateAsync(values);
        message.success('Thêm phòng thành công');
      }
      setModalOpen(false);
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? 'Có lỗi xảy ra');
    }
  };

  const handleDelete = (room: MeetingRoom) => {
    confirmDelete({
      itemName: room.name,
      onConfirm: async () => {
        try {
          await deleteMut.mutateAsync(room.id);
          message.success('Xóa phòng thành công');
        } catch (e: any) {
          message.error(e?.response?.data?.message ?? 'Có lỗi xảy ra');
        }
      },
    });
  };

  const columns: ColumnsType<MeetingRoom> = [
    {
      title: 'Tên phòng',
      dataIndex: 'name',
      render: (v: string) => <Text style={{ color: textPrimary, fontWeight: 600 }}>{v}</Text>,
    },
    {
      title: 'Tầng',
      dataIndex: 'floor',
      render: (v?: string) => v
        ? <Text style={{ color: textPrimary }}>{v}</Text>
        : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      title: 'Sức chứa',
      dataIndex: 'capacity',
      width: 120,
      render: (v: number) => <Text style={{ color: textPrimary }}>{v} người</Text>,
    },
    {
      title: 'Tiện nghi',
      dataIndex: 'amenities',
      render: (arr: string[]) => (
        <Space wrap size={4}>
          {arr.map((a) => (
            <Tag
              key={a}
              style={isDark ? { background: 'rgba(96,165,250,0.15)', color: '#93C5FD', borderColor: 'rgba(96,165,250,0.3)' } : {}}
              color={isDark ? undefined : 'blue'}
            >
              {a}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 130,
      render: (v: MeetingRoom['status']) => <RoomStatusTag status={v} isDark={isDark} />,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 90,
      render: (_: unknown, record: MeetingRoom) => (
        <Space>
          <Button
            type="text" size="small" icon={<EditOutlined />}
            style={{ color: linkColor }}
            onClick={() => openEdit(record)}
          />
          <Button
            type="text" size="small" icon={<DeleteOutlined />}
            danger onClick={() => handleDelete(record)}
          />
        </Space>
      ),
    },
  ];

  const totalRooms      = stats?.totalRooms  ?? rooms.length;
  const activeRooms     = stats?.activeRooms ?? rooms.filter((r) => r.status === 'ACTIVE').length;
  const maintenanceRooms = rooms.filter((r) => r.status === 'MAINTENANCE').length;

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Quản lý phòng họp"
        icon={<HomeOutlined />}
        iconColor="#6366F1"
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Thêm phòng
          </Button>
        }
      />

      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 160 }}>
          <StatCard label="Tổng phòng" value={totalRooms} color="#6366F1" icon={<HomeOutlined />} />
        </div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <StatCard label="Đang hoạt động" value={activeRooms} color="#10B981" icon={<CheckCircleOutlined />} />
        </div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <StatCard label="Đang bảo trì" value={maintenanceRooms} color="#F59E0B" icon={<ToolOutlined />} />
        </div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <StatCard
            label="Sức chứa TB"
            value={rooms.length ? Math.round(rooms.reduce((s, r) => s + r.capacity, 0) / rooms.length) : 0}
            subValue="người / phòng"
            color="#3B82F6"
            icon={<TeamOutlined />}
          />
        </div>
      </div>

      <Table<MeetingRoom>
        rowKey="id"
        columns={columns}
        dataSource={rooms}
        loading={isLoading}
        pagination={paginationProps(rooms.length, 'phòng')}
      />

      <CenteredModal
        title={editing ? `Sửa phòng: ${editing.name}` : 'Thêm phòng mới'}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        footer={
          <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
            <Button onClick={() => setModalOpen(false)}>Huỷ</Button>
            <Button
              type="primary"
              loading={createMut.isPending || updateMut.isPending}
              disabled={createMut.isPending || updateMut.isPending}
              onClick={() => form.submit()}
            >
              {editing ? 'Lưu thay đổi' : 'Thêm phòng'}
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="Tên phòng" rules={[{ required: true }]}>
            <Input placeholder="VD: Phòng Hoa, A3.01..." maxLength={200} />
          </Form.Item>
          <Form.Item name="floor" label="Tầng">
            <Input placeholder="VD: Tầng 2, Tầng 3..." maxLength={100} />
          </Form.Item>
          <Form.Item name="capacity" label="Sức chứa (người)">
            <InputNumber min={1} max={500} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="amenities" label="Tiện nghi">
            <Select mode="tags" placeholder="Nhập tiện nghi (Enter để thêm)" />
          </Form.Item>
          <Form.Item name="status" label="Trạng thái" initialValue="ACTIVE">
            <Select>
              <Select.Option value="ACTIVE">Hoạt động</Select.Option>
              <Select.Option value="INACTIVE">Không hoạt động</Select.Option>
              <Select.Option value="MAINTENANCE">Bảo trì</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </CenteredModal>
    </div>
  );
}
