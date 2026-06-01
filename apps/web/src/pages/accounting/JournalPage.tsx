import { useState } from 'react';
import {
  Table, Button, Space, Typography, DatePicker, Input, Modal,
  Form, Select, InputNumber, Divider, message, Tag,
} from 'antd';
import { PlusOutlined, BookOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useThemePalette } from '../../hooks/useThemePalette';
import {
  useGetJournal, useGetAccounts, useCreateJournal,
  type JournalEntry, type JournalFilter,
} from '../../api/accounting';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

function formatMoney(v: string | number) {
  return Number(v).toLocaleString('vi-VN') + ' ₫';
}

export default function JournalPage() {
  const { isDark, bgContainer, bgCard, textPrimary, textMuted, borderColor, linkColor, preset } = useThemePalette();
  const textSecondary = isDark ? 'rgba(255,255,255,0.5)' : '#475569';

  const [filter, setFilter] = useState<JournalFilter>({ page: 1, limit: 50 });
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const { data, isLoading } = useGetJournal(filter);
  const { data: accounts = [] } = useGetAccounts();
  const createJournal = useCreateJournal();

  const accountOptions = accounts.map(a => ({
    value: a.code,
    label: `${a.code} — ${a.name}`,
  }));

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      await createJournal.mutateAsync({
        date:        values.date.format('YYYY-MM-DD'),
        description: values.description,
        reference:   values.reference,
        lines:       values.lines.map((l: { accountCode: string; debit: number; credit: number; description?: string }) => ({
          accountCode: l.accountCode,
          debit:       l.debit  ?? 0,
          credit:      l.credit ?? 0,
          description: l.description,
        })),
      });
      message.success('Tạo bút toán thành công');
      setModalOpen(false);
      form.resetFields();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      if (msg) message.error(msg);
    }
  };

  const columns: ColumnsType<JournalEntry> = [
    {
      title: 'Ngày',
      dataIndex: 'date',
      width: 110,
      render: (v: string) => <span style={{ color: textPrimary }}>{dayjs(v).format('DD/MM/YYYY')}</span>,
    },
    {
      title: 'Diễn giải',
      dataIndex: 'description',
      render: (v: string) => <span style={{ color: textPrimary }}>{v}</span>,
    },
    {
      title: 'Tham chiếu',
      dataIndex: 'reference',
      width: 140,
      render: (v: string | null) => v ? (
        <Tag style={{ fontFamily: 'monospace' }}>{v}</Tag>
      ) : '—',
    },
    {
      title: 'Tổng Nợ',
      width: 140,
      render: (_: unknown, rec: JournalEntry) => {
        const total = rec.lines.reduce((s, l) => s + Number(l.debit), 0);
        return <span style={{ color: '#EF4444', fontWeight: 500 }}>{formatMoney(total)}</span>;
      },
    },
    {
      title: 'Tổng Có',
      width: 140,
      render: (_: unknown, rec: JournalEntry) => {
        const total = rec.lines.reduce((s, l) => s + Number(l.credit), 0);
        return <span style={{ color: '#10B981', fontWeight: 500 }}>{formatMoney(total)}</span>;
      },
    },
    {
      title: 'Số dòng',
      width: 80,
      render: (_: unknown, rec: JournalEntry) => (
        <Tag color="blue">{rec.lines.length}</Tag>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space>
          <BookOutlined style={{ fontSize: 22, color: linkColor }} />
          <Title level={4} style={{ margin: 0, color: textPrimary }}>Sổ nhật ký kế toán</Title>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          Tạo bút toán
        </Button>
      </div>

      {/* Filters */}
      <div style={{ background: bgCard, borderRadius: 8, padding: '12px 16px', marginBottom: 16, border: `1px solid ${borderColor}` }}>
        <Space wrap>
          <RangePicker
            onChange={(_, [from, to]) => setFilter(f => ({ ...f, dateFrom: from || undefined, dateTo: to || undefined, page: 1 }))}
            format="DD/MM/YYYY"
          />
          <Input.Search
            placeholder="Tham chiếu..."
            style={{ width: 200 }}
            onSearch={v => setFilter(f => ({ ...f, reference: v || undefined, page: 1 }))}
            allowClear
          />
          <Select
            placeholder="Lọc theo TK..."
            style={{ width: 220 }}
            options={accountOptions}
            allowClear
            showSearch
            filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
            onChange={v => setFilter(f => ({ ...f, accountCode: v || undefined, page: 1 }))}
          />
        </Space>
      </div>

      <div style={{ background: bgContainer, borderRadius: 8, border: `1px solid ${borderColor}`, overflow: 'hidden' }}>
        <Table<JournalEntry>
          rowKey="id"
          dataSource={data?.data ?? []}
          columns={columns}
          loading={isLoading}
          locale={{
            emptyText: (
              <div style={{ padding: '40px 0', textAlign: 'center' }}>
                {/* Icon và text hiển thị khi chưa có bút toán nào */}
                <BookOutlined style={{ fontSize: 48, color: '#94A3B8', marginBottom: 12, display: 'block' }} />
                <div style={{ color: textMuted, fontSize: 14 }}>Chưa có bút toán nào</div>
                <div style={{ color: textMuted, fontSize: 12, marginTop: 4 }}>Nhấn nút Tạo bút toán để thêm mới</div>
              </div>
            ),
          }}
          pagination={{
            current: filter.page,
            pageSize: filter.limit,
            total: data?.total,
            onChange: (page, limit) => setFilter(f => ({ ...f, page, limit })),
            showTotal: (total) => <Text style={{ color: textSecondary }}>Tổng {total} bút toán</Text>,
          }}
          expandable={{
            expandedRowRender: (rec) => (
              <div style={{ padding: '8px 16px', background: bgCard }}>
                <Table
                  rowKey="id"
                  dataSource={rec.lines}
                  size="small"
                  pagination={false}
                  columns={[
                    { title: 'Tài khoản', dataIndex: 'accountCode', width: 100, render: (v: string) => <span style={{ fontFamily: 'monospace', color: linkColor }}>{v}</span> },
                    { title: 'Tên tài khoản', render: (_: unknown, l) => l.account?.name ? <Text style={{ color: textPrimary }}>{l.account.name}</Text> : <Text style={{ color: textMuted }}>—</Text> },
                    { title: 'Nợ', dataIndex: 'debit', align: 'right' as const, render: (v: string) => Number(v) > 0 ? <span style={{ color: '#EF4444' }}>{formatMoney(v)}</span> : <Text style={{ color: textMuted }}>—</Text> },
                    { title: 'Có', dataIndex: 'credit', align: 'right' as const, render: (v: string) => Number(v) > 0 ? <span style={{ color: '#10B981' }}>{formatMoney(v)}</span> : <Text style={{ color: textMuted }}>—</Text> },
                    { title: 'Diễn giải', dataIndex: 'description', render: (v: string | null) => v ? <Text style={{ color: textMuted, fontSize: 12 }}>{v}</Text> : <Text style={{ color: textMuted }}>—</Text> },
                  ]}
                />
              </div>
            ),
          }}
        />
      </div>

      {/* Create Journal Modal */}
      <Modal
        title={<span style={{ color: textPrimary }}>Tạo bút toán kế toán</span>}
        open={modalOpen}
        onOk={handleCreate}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        width={700}
        okText="Tạo bút toán"
        confirmLoading={createJournal.isPending}
        styles={{ content: { background: bgContainer }, header: { background: bgContainer } }}
      >
        <Form form={form} layout="vertical">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="date" label={<span style={{ color: textPrimary }}>Ngày</span>} rules={[{ required: true }]}>
              <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} defaultValue={dayjs()} />
            </Form.Item>
            <Form.Item name="reference" label={<span style={{ color: textPrimary }}>Tham chiếu</span>}>
              <Input placeholder="VD: INV-202601-0001" />
            </Form.Item>
          </div>
          <Form.Item name="description" label={<span style={{ color: textPrimary }}>Diễn giải</span>} rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Divider style={{ borderColor, margin: '12px 0' }}>
            <span style={{ color: textSecondary, fontSize: 12 }}>Chi tiết bút toán (Nợ = Có)</span>
          </Divider>

          <Form.List name="lines" initialValue={[{ accountCode: undefined, debit: 0, credit: 0 }, { accountCode: undefined, debit: 0, credit: 0 }]}>
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...rest }) => (
                  <div key={key} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
                    <Form.Item {...rest} name={[name, 'accountCode']} rules={[{ required: true, message: 'Chọn TK' }]} style={{ marginBottom: 0 }}>
                      <Select
                        options={accountOptions}
                        placeholder="Tài khoản"
                        showSearch
                        filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                      />
                    </Form.Item>
                    <Form.Item {...rest} name={[name, 'debit']} style={{ marginBottom: 0 }}>
                      <InputNumber min={0} style={{ width: '100%' }} placeholder="Nợ" formatter={v => v ? Number(v).toLocaleString('vi-VN') : ''} />
                    </Form.Item>
                    <Form.Item {...rest} name={[name, 'credit']} style={{ marginBottom: 0 }}>
                      <InputNumber min={0} style={{ width: '100%' }} placeholder="Có" formatter={v => v ? Number(v).toLocaleString('vi-VN') : ''} />
                    </Form.Item>
                    <Button
                      type="text" danger icon={<DeleteOutlined />}
                      onClick={() => fields.length > 2 && remove(name)}
                      disabled={fields.length <= 2}
                      style={{ marginTop: 4 }}
                    />
                  </div>
                ))}
                <Button type="dashed" onClick={() => add({ accountCode: undefined, debit: 0, credit: 0 })} block icon={<PlusOutlined />}>
                  Thêm dòng
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>
    </div>
  );
}
