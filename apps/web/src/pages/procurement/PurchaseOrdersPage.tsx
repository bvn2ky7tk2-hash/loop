import { useState } from 'react';
import {
  Table, Button, Input, Select, Tag, Space, Form, Drawer, Typography,
  InputNumber, Divider, Steps, Tooltip, Descriptions, Empty,
} from 'antd';
import {
  PlusOutlined, SearchOutlined, FileTextOutlined, EditOutlined,
  DeleteOutlined, CheckOutlined, CloseOutlined, SendOutlined, EyeOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useThemePalette } from '../../hooks/useThemePalette';
import { usePagination } from '../../hooks/usePagination';
import { PageHeader } from '../../components/ui/PageHeader';
import { FilterBar } from '../../components/FilterBar';
import { confirmDelete } from '../../components/ui/confirmDelete';
import { CenteredModal } from '../../components/ui/CenteredModal';
import { procurementApi, type PurchaseOrder, type Vendor } from '../../api/procurement';

const { Text, Title } = Typography;

const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'default', SUBMITTED: 'processing', APPROVED: 'success',
  REJECTED: 'error', ORDERED: 'blue', PARTIALLY_RECEIVED: 'warning',
  RECEIVED: 'success', CANCELLED: 'error',
};
const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Nháp', SUBMITTED: 'Chờ duyệt', APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối', ORDERED: 'Đã đặt', PARTIALLY_RECEIVED: 'Nhận 1 phần',
  RECEIVED: 'Đã nhận', CANCELLED: 'Đã hủy',
};

function fmtMoney(v: number | string) {
  return Number(v).toLocaleString('vi-VN') + ' ₫';
}

export default function PurchaseOrdersPage() {
  const { textPrimary, textMuted, bgCard, borderColor } = useThemePalette();
  const qc = useQueryClient();
  const { resetPage, paginationProps } = usePagination(50);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [createOpen, setCreateOpen] = useState(false);
  const [detailPo, setDetailPo] = useState<PurchaseOrder | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['pos', search, statusFilter],
    queryFn:  () => procurementApi.listPos({ search, status: statusFilter, limit: 100 }),
  });

  const { data: vendors } = useQuery({
    queryKey: ['vendors-all'],
    queryFn:  () => procurementApi.listVendors({ limit: 200 }),
  });

  const createMut = useMutation({
    mutationFn: (vals: any) => {
      const items = (vals.items || []).map((i: any) => ({
        description: i.description,
        unit:        i.unit,
        quantity:    Number(i.quantity),
        unitPrice:   Number(i.unitPrice),
      }));
      return procurementApi.createPo({
        vendorId:     vals.vendorId,
        notes:        vals.notes,
        currency:     'VND',
        deliveryDate: vals.deliveryDate ? dayjs(vals.deliveryDate).toISOString() : undefined,
        items,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pos'] }); qc.invalidateQueries({ queryKey: ['procurement-stats'] }); setCreateOpen(false); form.resetFields(); },
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => procurementApi.updateStatus(id, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pos'] }); setDetailPo(null); },
  });

  const delMut = useMutation({
    mutationFn: procurementApi.deletePo,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pos'] }); qc.invalidateQueries({ queryKey: ['procurement-stats'] }); },
  });

  const columns = [
    { title: 'Số PO', dataIndex: 'poNumber', width: 160,
      render: (v: string) => <Text style={{ color: textPrimary, fontFamily: 'monospace', fontWeight: 500 }}>{v}</Text> },
    { title: 'Nhà cung cấp', key: 'vendor', width: 180,
      render: (_: any, r: PurchaseOrder) => <Text style={{ color: textPrimary }}>{r.vendor?.name ?? '—'}</Text> },
    { title: 'Người yêu cầu', key: 'requester', width: 140,
      render: (_: any, r: PurchaseOrder) => <Text style={{ color: textMuted }}>{r.requester?.name ?? '—'}</Text> },
    { title: 'Ngày giao', dataIndex: 'deliveryDate', width: 120,
      render: (v?: string) => v ? <Text style={{ color: textMuted }}>{dayjs(v).format('DD/MM/YYYY')}</Text> : <Text style={{ color: textMuted }}>—</Text> },
    { title: 'Tổng tiền', dataIndex: 'totalAmount', width: 150, align: 'right' as const,
      render: (v: number) => <Text style={{ color: textPrimary, fontWeight: 500 }}>{fmtMoney(v)}</Text> },
    { title: 'Trạng thái', dataIndex: 'status', width: 130,
      render: (v: string) => <Tag color={STATUS_COLOR[v]}>{STATUS_LABEL[v]}</Tag> },
    { title: '', key: 'actions', width: 100, fixed: 'right' as const,
      render: (_: any, r: PurchaseOrder) => (
        <Space>
          <Tooltip title="Chi tiết">
            <Button size="small" icon={<EyeOutlined />} onClick={() => setDetailPo(r)} />
          </Tooltip>
          {['DRAFT', 'REJECTED', 'CANCELLED'].includes(r.status) && (
            <Tooltip title="Xóa">
              <Button size="small" danger icon={<DeleteOutlined />}
                onClick={() => confirmDelete({ itemName: r.poNumber, onConfirm: () => delMut.mutate(r.id) })} />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Đơn mua hàng"
        icon={<FileTextOutlined />}
        iconColor="#3B82F6"
        actions={<Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>Tạo đơn</Button>}
      />

      <FilterBar>
        <Input prefix={<SearchOutlined />} placeholder="Tìm số PO..." value={search}
          onChange={e => setSearch(e.target.value)} style={{ width: 220 }} />
        <Select placeholder="Trạng thái" allowClear value={statusFilter} onChange={setStatusFilter} style={{ width: 160 }}>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <Select.Option key={k} value={k}>{v}</Select.Option>)}
        </Select>
      </FilterBar>

      <div style={{ border: `1px solid ${borderColor}`, borderRadius: 8, overflow: 'hidden' }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={data?.data ?? []}
          loading={isLoading}
          pagination={paginationProps(data?.total ?? data?.data?.length ?? 0, 'đơn hàng')}
          scroll={{ x: 900 }}
          size="small"
        />
      </div>

      {/* Create PO Modal */}
      <CenteredModal
        open={createOpen}
        title="Tạo đơn mua hàng"
        onCancel={() => { setCreateOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        okText="Tạo đơn"
        confirmLoading={createMut.isPending}
        width={720}
      >
        <Form form={form} layout="vertical" onFinish={vals => createMut.mutate(vals)}>
          <Form.Item name="vendorId" label="Nhà cung cấp" rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="Chọn nhà cung cấp"
              filterOption={(input, opt) => (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
              options={(vendors?.data ?? []).map(v => ({ value: v.id, label: `${v.code} — ${v.name}` }))}
            />
          </Form.Item>
          <Form.Item name="deliveryDate" label="Ngày giao dự kiến">
            <Input type="date" />
          </Form.Item>
          <Form.Item name="notes" label="Ghi chú">
            <Input.TextArea rows={2} />
          </Form.Item>

          <Divider>Danh sách hàng hoá</Divider>
          <Form.List name="items" initialValue={[{}]}>
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} align="baseline" style={{ display: 'flex', marginBottom: 8 }} wrap>
                    <Form.Item {...restField} name={[name, 'description']} rules={[{ required: true, message: 'Bắt buộc' }]}>
                      <Input placeholder="Mô tả hàng hoá" style={{ width: 240 }} />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'unit']}>
                      <Input placeholder="ĐVT" style={{ width: 80 }} />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'quantity']} rules={[{ required: true, message: 'SL' }]}>
                      <InputNumber placeholder="SL" min={0.001} style={{ width: 80 }} />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'unitPrice']} rules={[{ required: true, message: 'Đơn giá' }]}>
                      <InputNumber placeholder="Đơn giá" min={0} style={{ width: 130 }} formatter={v => v ? Number(v).toLocaleString('vi-VN') : ''} />
                    </Form.Item>
                    <Button danger size="small" onClick={() => remove(name)} disabled={fields.length === 1}>✕</Button>
                  </Space>
                ))}
                <Button type="dashed" onClick={() => add({})} icon={<PlusOutlined />} size="small">
                  Thêm dòng
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </CenteredModal>

      {/* PO Detail Drawer */}
      <Drawer
        open={!!detailPo}
        onClose={() => setDetailPo(null)}
        title={detailPo?.poNumber ?? 'Chi tiết đơn mua hàng'}
        width={580}
      >
        {detailPo && (
          <>
            <Tag color={STATUS_COLOR[detailPo.status]} style={{ marginBottom: 16, fontSize: 13 }}>
              {STATUS_LABEL[detailPo.status]}
            </Tag>

            <Descriptions bordered size="small" column={1} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Nhà cung cấp">{detailPo.vendor?.name}</Descriptions.Item>
              <Descriptions.Item label="Người yêu cầu">{detailPo.requester?.name}</Descriptions.Item>
              {detailPo.approver && <Descriptions.Item label="Người duyệt">{detailPo.approver.name}</Descriptions.Item>}
              {detailPo.deliveryDate && (
                <Descriptions.Item label="Ngày giao">{dayjs(detailPo.deliveryDate).format('DD/MM/YYYY')}</Descriptions.Item>
              )}
              <Descriptions.Item label="Tổng tiền">
                <Text style={{ fontWeight: 600, fontSize: 15 }}>{fmtMoney(Number(detailPo.totalAmount))}</Text>
              </Descriptions.Item>
              {detailPo.notes && <Descriptions.Item label="Ghi chú">{detailPo.notes}</Descriptions.Item>}
            </Descriptions>

            {/* Items */}
            <Title level={5}>Danh sách hàng hoá</Title>
            <Table
              size="small"
              pagination={false}
              dataSource={detailPo.items ?? []}
              rowKey="id"
              columns={[
                { title: 'Mô tả', dataIndex: 'description', render: (v: string) => <Text style={{ color: textPrimary }}>{v}</Text> },
                { title: 'SL', dataIndex: 'quantity', width: 70, render: (v: number) => <Text style={{ color: textPrimary }}>{Number(v)}</Text> },
                { title: 'ĐVT', dataIndex: 'unit', width: 60, render: (v?: string) => <Text style={{ color: textMuted }}>{v ?? '—'}</Text> },
                { title: 'Đơn giá', dataIndex: 'unitPrice', width: 120, render: (v: number) => <Text style={{ color: textPrimary }}>{fmtMoney(v)}</Text> },
                { title: 'Thành tiền', dataIndex: 'totalPrice', width: 130, render: (v: number) => <Text style={{ color: textPrimary, fontWeight: 500 }}>{fmtMoney(v)}</Text> },
              ]}
            />

            {/* Actions */}
            <Divider />
            <Space wrap>
              {detailPo.status === 'DRAFT' && (
                <Button type="primary" icon={<SendOutlined />}
                  onClick={() => statusMut.mutate({ id: detailPo.id, status: 'SUBMITTED' })}>
                  Gửi duyệt
                </Button>
              )}
              {detailPo.status === 'SUBMITTED' && (
                <>
                  <Button type="primary" icon={<CheckOutlined />} style={{ background: '#10B981', borderColor: '#10B981' }}
                    onClick={() => statusMut.mutate({ id: detailPo.id, status: 'APPROVED' })}>
                    Phê duyệt
                  </Button>
                  <Button danger icon={<CloseOutlined />}
                    onClick={() => statusMut.mutate({ id: detailPo.id, status: 'REJECTED' })}>
                    Từ chối
                  </Button>
                </>
              )}
              {detailPo.status === 'APPROVED' && (
                <Button type="primary" icon={<FileTextOutlined />}
                  onClick={() => statusMut.mutate({ id: detailPo.id, status: 'ORDERED' })}>
                  Đánh dấu Đã đặt hàng
                </Button>
              )}
              {['ORDERED', 'PARTIALLY_RECEIVED'].includes(detailPo.status) && (
                <Button type="primary" icon={<CheckOutlined />} style={{ background: '#10B981', borderColor: '#10B981' }}
                  onClick={() => statusMut.mutate({ id: detailPo.id, status: 'RECEIVED' })}>
                  Xác nhận Đã nhận
                </Button>
              )}
              {['DRAFT', 'SUBMITTED'].includes(detailPo.status) && (
                <Button danger
                  onClick={() => statusMut.mutate({ id: detailPo.id, status: 'CANCELLED' })}>
                  Hủy đơn
                </Button>
              )}
            </Space>
          </>
        )}
      </Drawer>
    </div>
  );
}
