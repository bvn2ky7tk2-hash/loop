import { useState } from 'react';
import {
  Table, Button, Input, Select, Tag, Space, Form, Drawer, Rate, Tooltip,
} from 'antd';
import {
  PlusOutlined, SearchOutlined, ShopOutlined, EditOutlined, DeleteOutlined,
  StarOutlined, PhoneOutlined, MailOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useThemePalette } from '../../hooks/useThemePalette';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { FilterBar } from '../../components/FilterBar';
import { confirmDelete } from '../../components/ui/confirmDelete';
import { CenteredModal } from '../../components/ui/CenteredModal';
import { procurementApi, type Vendor } from '../../api/procurement';
import { Row, Col, Typography } from 'antd';

const { Text } = Typography;

const STATUS_COLOR: Record<string, string> = { ACTIVE: 'success', INACTIVE: 'default', BLOCKED: 'error' };
const STATUS_LABEL: Record<string, string> = { ACTIVE: 'Hoạt động', INACTIVE: 'Ngừng HĐ', BLOCKED: 'Chặn' };
const CATEGORIES = ['IT', 'Office Supplies', 'Marketing', 'Hardware', 'Software', 'Services', 'Logistics', 'Others'];

export default function VendorsPage() {
  const { textPrimary, textMuted, borderColor } = useThemePalette();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['vendors', search, statusFilter],
    queryFn:  () => procurementApi.listVendors({ search, status: statusFilter, limit: 100 }),
  });

  const { data: stats } = useQuery({
    queryKey: ['procurement-stats'],
    queryFn:  procurementApi.stats,
  });

  const save = useMutation({
    mutationFn: (vals: any) => editing
      ? procurementApi.updateVendor(editing.id, vals)
      : procurementApi.createVendor(vals),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vendors'] }); qc.invalidateQueries({ queryKey: ['procurement-stats'] }); closeModal(); },
  });

  const del = useMutation({
    mutationFn: procurementApi.deleteVendor,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vendors'] }); qc.invalidateQueries({ queryKey: ['procurement-stats'] }); },
  });

  const openCreate = () => { setEditing(null); form.resetFields(); setModalOpen(true); };
  const openEdit   = (v: Vendor) => { setEditing(v); form.setFieldsValue(v); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditing(null); form.resetFields(); };

  const columns = [
    { title: 'Mã', dataIndex: 'code', width: 100,
      render: (v: string) => <Text style={{ color: textMuted, fontFamily: 'monospace' }}>{v}</Text> },
    { title: 'Tên nhà cung cấp', dataIndex: 'name', width: 220,
      render: (v: string) => <Text style={{ color: textPrimary, fontWeight: 500 }}>{v}</Text> },
    { title: 'Nhóm', dataIndex: 'category', width: 130,
      render: (v?: string) => v ? <Tag>{v}</Tag> : <Text style={{ color: textMuted }}>—</Text> },
    { title: 'Liên hệ', key: 'contact', width: 200,
      render: (_: any, r: Vendor) => (
        <Space direction="vertical" size={2}>
          {r.contactName && <Text style={{ color: textPrimary, fontSize: 13 }}>{r.contactName}</Text>}
          {r.phone && (
            <Space size={4}>
              <PhoneOutlined style={{ color: textMuted, fontSize: 11 }} />
              <Text style={{ color: textMuted, fontSize: 12 }}>{r.phone}</Text>
            </Space>
          )}
          {r.email && (
            <Space size={4}>
              <MailOutlined style={{ color: textMuted, fontSize: 11 }} />
              <Text style={{ color: textMuted, fontSize: 12 }}>{r.email}</Text>
            </Space>
          )}
        </Space>
      ),
    },
    { title: 'Đánh giá', dataIndex: 'rating', width: 130,
      render: (v?: number) => v ? <Rate disabled defaultValue={v} style={{ fontSize: 12 }} /> : <Text style={{ color: textMuted }}>—</Text> },
    { title: 'Đơn hàng', key: 'pos', width: 90,
      render: (_: any, r: Vendor) => <Text style={{ color: textPrimary }}>{r._count?.purchaseOrders ?? 0}</Text> },
    { title: 'Trạng thái', dataIndex: 'status', width: 110,
      render: (v: string) => <Tag color={STATUS_COLOR[v]}>{STATUS_LABEL[v]}</Tag> },
    { title: '', key: 'actions', width: 80, fixed: 'right' as const,
      render: (_: any, r: Vendor) => (
        <Space>
          <Tooltip title="Sửa">
            <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          </Tooltip>
          <Tooltip title="Xóa">
            <Button size="small" danger icon={<DeleteOutlined />}
              onClick={() => confirmDelete({ itemName: r.name, onConfirm: () => del.mutate(r.id) })} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Nhà cung cấp"
        icon={<ShopOutlined />}
        iconColor="#6366F1"
        actions={<Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Thêm NCC</Button>}
      />

      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}><StatCard label="Tổng NCC" value={stats?.totalVendors ?? 0} color="#6366F1" icon={<ShopOutlined />} /></Col>
        <Col xs={12} sm={6}><StatCard label="Đang hoạt động" value={stats?.activeVendors ?? 0} color="#10B981" icon={<ShopOutlined />} /></Col>
        <Col xs={12} sm={6}><StatCard label="Tổng đơn hàng" value={stats?.totalPos ?? 0} color="#3B82F6" icon={<ShopOutlined />} /></Col>
        <Col xs={12} sm={6}><StatCard label="Chờ xử lý" value={stats?.pendingPos ?? 0} color="#F59E0B" icon={<ShopOutlined />} /></Col>
      </Row>

      <FilterBar>
        <Input prefix={<SearchOutlined />} placeholder="Tìm tên, mã..." value={search}
          onChange={e => setSearch(e.target.value)} style={{ width: 240 }} />
        <Select placeholder="Trạng thái" allowClear value={statusFilter} onChange={setStatusFilter} style={{ width: 140 }}>
          <Select.Option value="ACTIVE">Hoạt động</Select.Option>
          <Select.Option value="INACTIVE">Ngừng HĐ</Select.Option>
          <Select.Option value="BLOCKED">Chặn</Select.Option>
        </Select>
      </FilterBar>

      <div style={{ border: `1px solid ${borderColor}`, borderRadius: 8, overflow: 'hidden' }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={data?.data ?? []}
          loading={isLoading}
          pagination={{ pageSize: 20 }}
          scroll={{ x: 1000 }}
          size="small"
        />
      </div>

      <CenteredModal
        open={modalOpen}
        title={editing ? 'Sửa nhà cung cấp' : 'Thêm nhà cung cấp'}
        onCancel={closeModal}
        onOk={() => form.submit()}
        okText="Lưu"
        confirmLoading={save.isPending}
        width={620}
      >
        <Form form={form} layout="vertical" onFinish={vals => save.mutate(vals)}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="code" label="Mã NCC" rules={[{ required: true, message: 'Bắt buộc' }]}>
                <Input placeholder="VD001" />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item name="name" label="Tên nhà cung cấp" rules={[{ required: true, message: 'Bắt buộc' }]}>
                <Input placeholder="Công ty TNHH..." />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="category" label="Nhóm hàng">
                <Select placeholder="Chọn nhóm" allowClear options={CATEGORIES.map(c => ({ value: c, label: c }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="Trạng thái" initialValue="ACTIVE">
                <Select options={[
                  { value: 'ACTIVE', label: 'Hoạt động' },
                  { value: 'INACTIVE', label: 'Ngừng HĐ' },
                  { value: 'BLOCKED', label: 'Chặn' },
                ]} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="contactName" label="Người liên hệ">
                <Input placeholder="Nguyễn Văn A" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="Điện thoại">
                <Input placeholder="0901234567" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="email" label="Email">
                <Input placeholder="vendor@company.com" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="taxCode" label="Mã số thuế">
                <Input placeholder="0123456789" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="bankAccount" label="Số tài khoản">
                <Input placeholder="0123456789012" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="bankName" label="Ngân hàng">
                <Input placeholder="Vietcombank" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="address" label="Địa chỉ">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="rating" label="Đánh giá">
            <Rate allowClear />
          </Form.Item>
          <Form.Item name="notes" label="Ghi chú">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </CenteredModal>
    </div>
  );
}
