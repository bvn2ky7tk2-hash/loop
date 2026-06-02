import { useState } from 'react';
import {
  Button, Form, Input, DatePicker, Table, Popconfirm,
  App, Space, Tag, Typography, Row, Col,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, RocketOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useThemePalette } from '../../hooks/useThemePalette';
import { PageHeader } from '../../components/ui/PageHeader';
import { CenteredModal } from '../../components/ui/CenteredModal';
import { confirmDelete } from '../../components/ui/confirmDelete';
import {
  useAllChangelogs, useCreateChangelog, useDeleteChangelog,
  type ChangelogEntry,
} from '../../api/changelog';

const { Text, Title } = Typography;
const { TextArea } = Input;

export default function ChangelogAdminPage() {
  const { message } = App.useApp();
  const { textPrimary, textMuted, isDark } = useThemePalette();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const { data, isLoading } = useAllChangelogs();
  const createMut = useCreateChangelog();
  const deleteMut = useDeleteChangelog();

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      await createMut.mutateAsync({
        version:     values.version,
        title:       values.title,
        items:       (values.items as string).split('\n').map((s: string) => s.trim()).filter(Boolean),
        publishedAt: (values.publishedAt as dayjs.Dayjs).toISOString(),
      });
      message.success('Đã tạo changelog');
      form.resetFields();
      setOpen(false);
    } catch {
      message.error('Tạo thất bại');
    }
  };

  const handleDelete = (id: string, version: string) => {
    confirmDelete({
      itemName: `Changelog v${version}`,
      onConfirm: async () => {
        await deleteMut.mutateAsync(id);
        message.success('Đã xóa');
      },
    });
  };

  const columns: ColumnsType<ChangelogEntry> = [
    {
      title: 'Phiên bản',
      dataIndex: 'version',
      width: 120,
      render: (v: string) => (
        <Tag
          style={isDark
            ? { background: 'rgba(99,102,241,0.15)', color: '#A5B4FC', borderColor: 'rgba(99,102,241,0.3)' }
            : {}}
          color={isDark ? undefined : 'purple'}
        >
          v{v}
        </Tag>
      ),
    },
    {
      title: 'Tiêu đề',
      dataIndex: 'title',
      render: (v: string) => <Text style={{ color: textPrimary }}>{v}</Text>,
    },
    {
      title: 'Số mục',
      dataIndex: 'items',
      width: 100,
      render: (items: string[]) => (
        <Text style={{ color: textMuted }}>{items.length} mục</Text>
      ),
    },
    {
      title: 'Ngày phát hành',
      dataIndex: 'publishedAt',
      width: 140,
      render: (v: string) => (
        <Text style={{ color: textMuted }}>{dayjs(v).format('DD/MM/YYYY')}</Text>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 60,
      render: (_: unknown, record: ChangelogEntry) => (
        <Button
          type="text"
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => handleDelete(record.id, record.version)}
          loading={deleteMut.isPending}
        />
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Quản lý Changelog"
        icon={<RocketOutlined />}
        iconColor="#6366F1"
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
            Thêm changelog
          </Button>
        }
      />

      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={data?.data ?? []}
        columns={columns}
        pagination={{
          total: data?.total ?? 0,
          pageSize: 20,
          showSizeChanger: true,
          pageSizeOptions: [20, 50, 100, 200],
          showTotal: (t) => `${t} bản ghi`,
        }}
        expandable={{
          expandedRowRender: (record) => (
            <ul style={{ margin: '4px 0 4px 20px', padding: 0 }}>
              {(record.items as string[]).map((item, i) => (
                <li key={i} style={{ color: textPrimary, fontSize: 13, marginBottom: 2 }}>{item}</li>
              ))}
            </ul>
          ),
        }}
      />

      <CenteredModal
        open={open}
        title="Tạo changelog mới"
        onClose={() => { setOpen(false); form.resetFields(); }}
        footer={
          <Space style={{ justifyContent: 'flex-end', display: 'flex' }}>
            <Button onClick={() => { setOpen(false); form.resetFields(); }}>Huỷ</Button>
            <Button type="primary" loading={createMut.isPending} onClick={handleCreate}>Tạo</Button>
          </Space>
        }
        width={520}
      >
        <Form form={form} layout="vertical">
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item
                name="version"
                label="Phiên bản"
                rules={[{ required: true, message: 'Nhập version' }]}
              >
                <Input placeholder="1.5.0" />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item
                name="title"
                label="Tiêu đề"
                rules={[{ required: true, message: 'Nhập tiêu đề' }]}
              >
                <Input placeholder="Cập nhật tháng 6/2026" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="publishedAt"
            label="Ngày phát hành"
            rules={[{ required: true, message: 'Chọn ngày' }]}
          >
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item
            name="items"
            label="Danh sách thay đổi (mỗi dòng 1 mục)"
            rules={[{ required: true, message: 'Nhập ít nhất 1 mục' }]}
          >
            <TextArea
              rows={6}
              placeholder="Thêm tính năng X&#10;Sửa lỗi Y&#10;Cải thiện performance Z"
            />
          </Form.Item>
        </Form>
      </CenteredModal>
    </div>
  );
}
