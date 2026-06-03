import { useState } from 'react';
import {
  Table, Button, Space, Typography, Select, DatePicker, Tag, message,
  Form, Input, InputNumber, Divider, Row, Col, Tooltip,
} from 'antd';
import { CenteredModal } from '../../components/ui/CenteredModal';
import { StatCard } from '../../components/ui/StatCard';
import { PageHeader } from '../../components/ui/PageHeader';
import {
  PlusOutlined, FileTextOutlined, DeleteOutlined, SendOutlined,
  CheckCircleOutlined, CloseCircleOutlined, WarningOutlined, DollarOutlined,
  MinusCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useThemePalette } from '../../hooks/useThemePalette';
import { confirmDelete } from '../../components/ui/confirmDelete';
import { useGetCustomers } from '../../api/crm';
import {
  useGetInvoices, useGetInvoiceSummary, useCreateInvoice, useChangeInvoiceStatus, useDeleteInvoice,
  type Invoice, type InvoiceStatus, type InvoiceType, type FilterInvoiceParams, type InvoiceItemInput,
} from '../../api/invoices';

const { Text } = Typography;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

const TYPE_META: Record<InvoiceType, { label: string; color: string }> = {
  SALES:    { label: 'Bán ra',   color: 'blue' },
  PURCHASE: { label: 'Mua vào',  color: 'orange' },
};

const STATUS_META: Record<InvoiceStatus, { label: string; color: string; icon?: React.ReactNode }> = {
  DRAFT:     { label: 'Nháp',       color: 'default' },
  SENT:      { label: 'Đã gửi',     color: 'blue',    icon: <SendOutlined /> },
  PAID:      { label: 'Đã thanh toán', color: 'green', icon: <CheckCircleOutlined /> },
  OVERDUE:   { label: 'Quá hạn',    color: 'red',     icon: <WarningOutlined /> },
  CANCELLED: { label: 'Huỷ',        color: 'default', icon: <CloseCircleOutlined /> },
};

const STATUS_OPTIONS = Object.entries(STATUS_META).map(([k, v]) => ({ value: k as InvoiceStatus, label: v.label }));
const TYPE_OPTIONS   = Object.entries(TYPE_META).map(([k, v]) => ({ value: k as InvoiceType, label: v.label }));

const VALID_TRANSITIONS: Partial<Record<InvoiceStatus, InvoiceStatus[]>> = {
  DRAFT:   ['SENT', 'CANCELLED'],
  SENT:    ['PAID', 'CANCELLED'],
  OVERDUE: ['PAID', 'CANCELLED'],
};

function formatMoney(v?: string | number | null): string {
  if (!v) return '—';
  return Number(v).toLocaleString('vi-VN') + ' ₫';
}


// ─── Line Items editor ────────────────────────────────────────────────────────

function LineItemsEditor({ value = [], onChange }: { value?: InvoiceItemInput[]; onChange?: (v: InvoiceItemInput[]) => void }) {
  const addRow = () => onChange?.([...value, { description: '', quantity: 1, unitPrice: 0, taxRate: 10 }]);
  const removeRow = (i: number) => onChange?.(value.filter((_, idx) => idx !== i));
  const updateRow = (i: number, field: keyof InvoiceItemInput, v: string | number) => {
    const next = value.map((row, idx) => idx === i ? { ...row, [field]: v } : row);
    onChange?.(next);
  };

  const subtotal = value.reduce((s, r) => s + (r.quantity || 0) * (r.unitPrice || 0), 0);
  const tax      = value.reduce((s, r) => s + (r.quantity || 0) * (r.unitPrice || 0) * ((r.taxRate || 0) / 100), 0);

  return (
    <div>
      {value.map((row, i) => (
        <Row key={i} gutter={6} style={{ marginBottom: 6 }} align="middle">
          <Col flex="1">
            <Input
              placeholder="Mô tả"
              value={row.description}
              onChange={e => updateRow(i, 'description', e.target.value)}
            />
          </Col>
          <Col style={{ width: 80 }}>
            <InputNumber
              min={0.01} style={{ width: '100%' }} placeholder="SL"
              value={row.quantity}
              onChange={v => updateRow(i, 'quantity', v ?? 0)}
            />
          </Col>
          <Col style={{ width: 130 }}>
            <InputNumber
              min={0} style={{ width: '100%' }} placeholder="Đơn giá"
              formatter={v => v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
              value={row.unitPrice}
              onChange={v => updateRow(i, 'unitPrice', v ?? 0)}
            />
          </Col>
          <Col style={{ width: 70 }}>
            <InputNumber
              min={0} max={100} style={{ width: '100%' }} placeholder="VAT%"
              value={row.taxRate ?? 0}
              onChange={v => updateRow(i, 'taxRate', v ?? 0)}
            />
          </Col>
          <Col>
            <Button type="text" danger icon={<MinusCircleOutlined />} onClick={() => removeRow(i)} />
          </Col>
        </Row>
      ))}
      <Button type="dashed" icon={<PlusOutlined />} onClick={addRow} style={{ width: '100%', marginBottom: 8 }}>
        Thêm dòng
      </Button>
      <div style={{ textAlign: 'right', fontSize: 13 }}>
        <Space direction="vertical" size={2}>
          <Text>Chưa thuế: <strong>{subtotal.toLocaleString('vi-VN')} ₫</strong></Text>
          <Text>Thuế: <strong>{tax.toLocaleString('vi-VN')} ₫</strong></Text>
          <Text style={{ fontSize: 15 }}>Tổng: <strong>{(subtotal + tax).toLocaleString('vi-VN')} ₫</strong></Text>
        </Space>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function InvoicesPage() {
  const { bgContainer, borderColor, textPrimary, textMuted, linkColor, preset } = useThemePalette();

  const [filters, setFilters]   = useState<FilterInvoiceParams>({ page: 1, limit: 20 });
  const [drawerOpen, setDrawer] = useState(false);
  const [form] = Form.useForm<{
    type: InvoiceType; customerId?: string; projectId?: string;
    issueDate: dayjs.Dayjs; dueDate: dayjs.Dayjs; currency?: string; notes?: string;
    items: InvoiceItemInput[];
  }>();

  const { data, isLoading }     = useGetInvoices(filters);
  const { data: summary }       = useGetInvoiceSummary();
  const { data: customersData } = useGetCustomers({ limit: 200 });
  const customers = customersData?.data ?? [];

  const createMutation       = useCreateInvoice();
  const changeStatusMutation = useChangeInvoiceStatus();
  const deleteMutation       = useDeleteInvoice();

  const openCreate = () => {
    form.resetFields();
    form.setFieldsValue({
      type: 'SALES', currency: 'VND',
      issueDate: dayjs(), dueDate: dayjs().add(30, 'day'),
      items: [{ description: '', quantity: 1, unitPrice: 0, taxRate: 10 }],
    });
    setDrawer(true);
  };

  const handleCreate = async () => {
    const values = await form.validateFields();
    await createMutation.mutateAsync({
      ...values,
      issueDate: values.issueDate.format('YYYY-MM-DD'),
      dueDate:   values.dueDate.format('YYYY-MM-DD'),
    });
    message.success('Đã tạo hóa đơn');
    setDrawer(false);
  };

  const handleChangeStatus = (id: string, status: InvoiceStatus, label: string) => {
    confirmDelete({
      title: `Chuyển sang "${label}"?`,
      content: 'Xác nhận cập nhật trạng thái hóa đơn.',
      okText: 'Chuyển',
      danger: false,
      onConfirm: async () => {
        await changeStatusMutation.mutateAsync({ id, status });
        message.success(`Đã cập nhật: ${label}`);
      },
    });
  };

  const handleDelete = (inv: Invoice) => {
    confirmDelete({
      itemName: inv.code,
      onConfirm: async () => { await deleteMutation.mutateAsync(inv.id); message.success('Đã xoá'); },
    });
  };

  const columns: ColumnsType<Invoice> = [
    {
      title: 'Mã HĐ', dataIndex: 'code', width: 160,
      render: (v: string) => <Text code style={{ color: linkColor }}>{v}</Text>,
    },
    {
      title: 'Loại', dataIndex: 'type', width: 100,
      render: (t: InvoiceType) => <Tag color={TYPE_META[t].color}>{TYPE_META[t].label}</Tag>,
    },
    {
      title: 'Khách hàng', dataIndex: ['customer', 'name'], width: 200,
      render: (_: unknown, row: Invoice) => row.customer?.name ? <Text style={{ color: textPrimary }}>{row.customer.name}</Text> : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      title: 'Tổng tiền', dataIndex: 'totalAmount', width: 160, align: 'right',
      render: (v: string) => <Text style={{ color: textPrimary, fontWeight: 600 }}>{formatMoney(v)}</Text>,
    },
    {
      title: 'Trạng thái', dataIndex: 'status', width: 140,
      render: (s: InvoiceStatus) => (
        <Tag color={STATUS_META[s].color} icon={STATUS_META[s].icon}>
          {STATUS_META[s].label}
        </Tag>
      ),
    },
    {
      title: 'Phát hành', dataIndex: 'issueDate', width: 120,
      render: (v: string) => <Text style={{ color: textMuted }}>{dayjs(v).format('DD/MM/YYYY')}</Text>,
    },
    {
      title: 'Đến hạn', dataIndex: 'dueDate', width: 120,
      render: (v: string, row: Invoice) => {
        const isOd = row.status === 'OVERDUE';
        return (
          <Text style={{ color: isOd ? '#EF4444' : textPrimary }}>
            {isOd && <WarningOutlined style={{ marginRight: 4 }} />}
            {dayjs(v).format('DD/MM/YYYY')}
          </Text>
        );
      },
    },
    {
      title: '', key: 'actions', width: 120, align: 'right',
      render: (_: unknown, row: Invoice) => {
        const transitions = VALID_TRANSITIONS[row.status] ?? [];
        return (
          <Space>
            {transitions.map(s => (
              <Tooltip key={s} title={STATUS_META[s].label}>
                <Button size="small"
                  type={s === 'PAID' ? 'primary' : s === 'CANCELLED' ? 'default' : 'default'}
                  danger={s === 'CANCELLED'}
                  style={s === 'PAID' ? { background: '#10B981', borderColor: '#10B981' } : undefined}
                  icon={STATUS_META[s].icon}
                  onClick={() => handleChangeStatus(row.id, s, STATUS_META[s].label)}
                />
              </Tooltip>
            ))}
            {['DRAFT', 'CANCELLED'].includes(row.status) && (
              <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(row)} />
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <PageHeader
        title="Hóa đơn"
        icon={<FileTextOutlined />}
        iconColor="#0D9488"
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}
            style={{ background: preset.primary, borderColor: preset.primary }}>
            Tạo hóa đơn
          </Button>
        }
      />

      {/* Summary cards */}
      {summary && (
        <Row gutter={12} style={{ marginBottom: 20 }}>
          <Col xs={24} sm={12} md={6}>
            <StatCard label="Nháp" value={summary.draft.count} subValue={formatMoney(summary.draft.total)}
              color="#8B9EC5" icon={<FileTextOutlined />} />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <StatCard label="Chưa thu (Đã gửi)" value={summary.sent.count} subValue={formatMoney(summary.sent.total)}
              color="#3B82F6" icon={<SendOutlined />} />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <StatCard label="Đã thanh toán (tháng này)" value={summary.paidThisMonth.count} subValue={formatMoney(summary.paidThisMonth.total)}
              color="#10B981" icon={<DollarOutlined />} />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <StatCard label="Quá hạn" value={summary.overdue.count} subValue={formatMoney(summary.overdue.total)}
              color="#EF4444" icon={<WarningOutlined />} />
          </Col>
        </Row>
      )}

      {/* Filters */}
      <div style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Select placeholder="Loại" style={{ width: 130 }} allowClear options={TYPE_OPTIONS}
          onChange={v => setFilters(f => ({ ...f, type: v, page: 1 }))} />
        <Select placeholder="Trạng thái" style={{ width: 160 }} allowClear options={STATUS_OPTIONS}
          onChange={v => setFilters(f => ({ ...f, status: v, page: 1 }))} />
        <Select placeholder="Khách hàng" style={{ width: 200 }} allowClear showSearch optionFilterProp="label"
          options={customers.map(c => ({ value: c.id, label: c.name }))}
          onChange={v => setFilters(f => ({ ...f, customerId: v, page: 1 }))} />
        <RangePicker format="DD/MM/YYYY"
          onChange={dates => setFilters(f => ({
            ...f,
            dateFrom: dates?.[0]?.format('YYYY-MM-DD'),
            dateTo:   dates?.[1]?.format('YYYY-MM-DD'),
            page: 1,
          }))} />
      </div>

      {/* Table */}
      <div style={{ background: bgContainer, borderRadius: 8, border: `1px solid ${borderColor}` }}>
        <Table<Invoice>
          rowKey="id"
          columns={columns}
          dataSource={data?.data ?? []}
          loading={isLoading}
          locale={{ emptyText: 'Chưa có hóa đơn nào' }}
          pagination={{
            current:     filters.page,
            pageSize:    filters.limit,
            total:       data?.total ?? 0,
            onChange:    (page, limit) => setFilters(f => ({ ...f, page, limit })),
            showSizeChanger: true,
            pageSizeOptions: [20, 50, 100, 200],
            showTotal: (t) => `${t} hóa đơn`,
          }}
        />
      </div>

      {/* Create Drawer */}
      <CenteredModal
        title="Tạo hóa đơn mới"
        open={drawerOpen}
        onClose={() => setDrawer(false)}
        width={640}
        extra={
          <Button type="primary" loading={createMutation.isPending} disabled={createMutation.isPending} onClick={handleCreate}
            style={{ background: preset.primary, borderColor: preset.primary }}>
            Tạo hóa đơn
          </Button>
        }
      >
        <Form form={form} layout="vertical">
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="type" label="Loại hóa đơn" rules={[{ required: true }]}>
                <Select options={TYPE_OPTIONS} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="currency" label="Tiền tệ">
                <Select options={[{ value: 'VND', label: 'VND' }, { value: 'USD', label: 'USD' }]} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            noStyle
            shouldUpdate={(prev, curr) => prev.type !== curr.type}
          >
            {({ getFieldValue }) => (
              <Form.Item
                name="customerId"
                label="Khách hàng"
                rules={[{
                  required: getFieldValue('type') === 'SALES',
                  message: 'Vui lòng chọn khách hàng cho hóa đơn bán ra',
                }]}
              >
                <Select allowClear showSearch optionFilterProp="label" placeholder="Chọn khách hàng"
                  options={customers.map(c => ({ value: c.id, label: c.name }))} />
              </Form.Item>
            )}
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="issueDate" label="Ngày phát hành" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="dueDate" label="Ngày đến hạn" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="notes" label="Ghi chú">
            <TextArea rows={2} />
          </Form.Item>

          <Divider titlePlacement="left" style={{ color: textMuted, fontSize: 13 }}>Dòng mục</Divider>

          <Form.Item name="items" rules={[{ required: true, message: 'Cần ít nhất 1 dòng mục' }]}>
            <LineItemsEditor />
          </Form.Item>
        </Form>
      </CenteredModal>
    </div>
  );
}
