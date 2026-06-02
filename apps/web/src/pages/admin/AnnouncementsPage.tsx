import React, { useState } from 'react';
import {
  Table, Button, Tag, Typography, App, Form, Input, Select, DatePicker, Space, Row, Col,
} from 'antd';
import {
  BellOutlined, PlusOutlined, EditOutlined, DeleteOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { announcementsApi, type SystemAnnouncement } from '../../api/announcements';
import { useThemePalette } from '../../hooks/useThemePalette';
import { usePagination } from '../../hooks/usePagination';
import { PageHeader } from '../../components/ui/PageHeader';
import { CenteredModal } from '../../components/ui/CenteredModal';
import { confirmDelete } from '../../components/ui/confirmDelete';
import { StatCard } from '../../components/ui/StatCard';

const { Text } = Typography;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

const TYPE_LABELS: Record<string, string> = {
  INFO: 'Thông tin',
  WARNING: 'Cảnh báo',
  CRITICAL: 'Khẩn cấp',
};

const TYPE_COLORS: Record<string, string> = {
  INFO: 'blue',
  WARNING: 'gold',
  CRITICAL: 'red',
};

export default function AnnouncementsPage() {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const { textPrimary, textMuted, bgContainer, borderColor, isDark } = useThemePalette();
  const { resetPage, paginationProps } = usePagination(20);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SystemAnnouncement | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-announcements'],
    queryFn: () => announcementsApi.list(),
  });

  const rows = data?.data ?? [];

  const createMut = useMutation({
    mutationFn: announcementsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-announcements'] });
      qc.invalidateQueries({ queryKey: ['announcements-active'] });
      message.success('Đã tạo thông báo');
      setModalOpen(false);
      form.resetFields();
    },
    onError: () => message.error('Tạo thất bại'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Parameters<typeof announcementsApi.update>[1] }) =>
      announcementsApi.update(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-announcements'] });
      qc.invalidateQueries({ queryKey: ['announcements-active'] });
      message.success('Đã cập nhật');
      setModalOpen(false);
      setEditing(null);
      form.resetFields();
    },
    onError: () => message.error('Cập nhật thất bại'),
  });

  const deleteMut = useMutation({
    mutationFn: announcementsApi.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-announcements'] });
      qc.invalidateQueries({ queryKey: ['announcements-active'] });
      message.success('Đã xóa thông báo');
    },
    onError: () => message.error('Xóa thất bại'),
  });

  const now = new Date();
  const activeCount = rows.filter((r) => {
    const start = new Date(r.startAt);
    const end = r.endAt ? new Date(r.endAt) : null;
    return start <= now && (!end || end >= now);
  }).length;

  function openCreate() {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  }

  function openEdit(record: SystemAnnouncement) {
    setEditing(record);
    form.setFieldsValue({
      message: record.message,
      type: record.type,
      timeRange: [
        dayjs(record.startAt),
        record.endAt ? dayjs(record.endAt) : null,
      ],
    });
    setModalOpen(true);
  }

  async function handleSubmit() {
    const values = await form.validateFields();
    const [startAt, endAt] = values.timeRange ?? [];
    const dto = {
      message: values.message as string,
      type: values.type as string,
      startAt: (startAt as dayjs.Dayjs).toISOString(),
      endAt: endAt ? (endAt as dayjs.Dayjs).toISOString() : undefined,
    };

    if (editing) {
      updateMut.mutate({ id: editing.id, dto });
    } else {
      createMut.mutate(dto);
    }
  }

  const columns = [
    {
      title: <Text style={{ color: textPrimary }}>Nội dung</Text>,
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
      render: (v: string) => <Text style={{ color: textPrimary }}>{v}</Text>,
    },
    {
      title: <Text style={{ color: textPrimary }}>Loại</Text>,
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (v: string) => (
        <Tag
          color={isDark ? undefined : TYPE_COLORS[v]}
          style={isDark ? {
            background: v === 'CRITICAL' ? 'rgba(248,113,113,0.15)' : v === 'WARNING' ? 'rgba(245,158,11,0.15)' : 'rgba(96,165,250,0.15)',
            color: v === 'CRITICAL' ? '#FCA5A5' : v === 'WARNING' ? '#FCD34D' : '#93C5FD',
            borderColor: v === 'CRITICAL' ? 'rgba(248,113,113,0.3)' : v === 'WARNING' ? 'rgba(245,158,11,0.3)' : 'rgba(96,165,250,0.3)',
          } : {}}
        >
          {TYPE_LABELS[v] ?? v}
        </Tag>
      ),
    },
    {
      title: <Text style={{ color: textPrimary }}>Bắt đầu</Text>,
      dataIndex: 'startAt',
      key: 'startAt',
      width: 160,
      render: (v: string) => <Text style={{ color: textMuted }}>{dayjs(v).format('DD/MM/YYYY HH:mm')}</Text>,
    },
    {
      title: <Text style={{ color: textPrimary }}>Kết thúc</Text>,
      dataIndex: 'endAt',
      key: 'endAt',
      width: 160,
      render: (v?: string) => (
        <Text style={{ color: textMuted }}>{v ? dayjs(v).format('DD/MM/YYYY HH:mm') : '—'}</Text>
      ),
    },
    {
      title: <Text style={{ color: textPrimary }}>Trạng thái</Text>,
      key: 'status',
      width: 110,
      render: (_: unknown, record: SystemAnnouncement) => {
        const start = new Date(record.startAt);
        const end = record.endAt ? new Date(record.endAt) : null;
        const isActive = start <= now && (!end || end >= now);
        return <Tag color={isActive ? 'success' : 'default'}>{isActive ? 'Đang hiển thị' : 'Ẩn'}</Tag>;
      },
    },
    {
      title: <Text style={{ color: textPrimary }}>Hành động</Text>,
      key: 'actions',
      width: 120,
      render: (_: unknown, record: SystemAnnouncement) => (
        <Space>
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Button
            type="text"
            size="small"
            icon={<DeleteOutlined />}
            danger
            onClick={() =>
              confirmDelete({
                itemName: 'thông báo này',
                onConfirm: () => deleteMut.mutate(record.id),
              })
            }
          />
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="System Announcements"
        icon={<BellOutlined />}
        iconColor="#F59E0B"
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Thêm thông báo
          </Button>
        }
      />

      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}>
          <StatCard label="Tổng thông báo" value={rows.length} color="#6366F1" icon={<BellOutlined />} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard label="Đang hiển thị" value={activeCount} color="#10B981" icon={<BellOutlined />} />
        </Col>
      </Row>

      <div
        style={{
          background: bgContainer,
          border: `1px solid ${borderColor}`,
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        <Table<SystemAnnouncement>
          rowKey="id"
          columns={columns}
          dataSource={rows}
          loading={isLoading}
          pagination={paginationProps(rows.length, 'thông báo')}
        />
      </div>

      <CenteredModal
        title={editing ? 'Sửa thông báo' : 'Tạo thông báo mới'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditing(null); form.resetFields(); }}
        onOk={handleSubmit}
        confirmLoading={createMut.isPending || updateMut.isPending}
        okText={editing ? 'Lưu' : 'Tạo'}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="message"
            label="Nội dung thông báo"
            rules={[{ required: true, message: 'Vui lòng nhập nội dung' }]}
          >
            <TextArea rows={3} placeholder="Nội dung hiển thị cho người dùng..." maxLength={1000} showCount />
          </Form.Item>

          <Form.Item
            name="type"
            label="Loại"
            initialValue="INFO"
            rules={[{ required: true }]}
          >
            <Select>
              <Select.Option value="INFO">Thông tin (xanh)</Select.Option>
              <Select.Option value="WARNING">Cảnh báo (vàng)</Select.Option>
              <Select.Option value="CRITICAL">Khẩn cấp (đỏ)</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="timeRange"
            label="Thời gian hiển thị"
            rules={[{ required: true, message: 'Vui lòng chọn thời gian bắt đầu' }]}
          >
            <RangePicker
              showTime
              format="DD/MM/YYYY HH:mm"
              style={{ width: '100%' }}
              placeholder={['Bắt đầu', 'Kết thúc (không bắt buộc)']}
              allowEmpty={[false, true]}
            />
          </Form.Item>
        </Form>
      </CenteredModal>
    </div>
  );
}
