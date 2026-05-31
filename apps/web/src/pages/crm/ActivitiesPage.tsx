import { useState } from 'react';
import {
  Table, Button, Tag, Typography, Select, Input, Form,
  DatePicker, InputNumber, Row, Col, Drawer, Descriptions, Space,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PhoneOutlined, MailOutlined, TeamOutlined, FileTextOutlined,
  PlusOutlined, EditOutlined, DeleteOutlined, CalendarOutlined,
  PlayCircleOutlined, EnvironmentOutlined, FormOutlined, CheckSquareOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useThemePalette } from '../../hooks/useThemePalette';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { FilterBar } from '../../components/FilterBar';
import { CenteredModal } from '../../components/ui/CenteredModal';
import { confirmDelete } from '../../components/ui/confirmDelete';
import { crmActivitiesApi, type CrmActivity, type ActivityType } from '../../api/crm-activities';
import { apiClient } from '../../api/client';
import type { Customer } from '../../api/crm';

const { Text } = Typography;
const { TextArea } = Input;

const TYPE_META: Record<ActivityType, { label: string; icon: React.ReactNode; color: string; darkBg: string; darkColor: string; darkBorder: string }> = {
  CALL:       { label: 'Cuộc gọi',   icon: <PhoneOutlined />,       color: 'blue',    darkBg: 'rgba(96,165,250,0.15)',   darkColor: '#93C5FD', darkBorder: 'rgba(96,165,250,0.3)' },
  EMAIL:      { label: 'Email',      icon: <MailOutlined />,         color: 'purple',  darkBg: 'rgba(167,139,250,0.15)', darkColor: '#C4B5FD', darkBorder: 'rgba(167,139,250,0.3)' },
  MEETING:    { label: 'Họp mặt',   icon: <TeamOutlined />,         color: 'green',   darkBg: 'rgba(52,211,153,0.15)',  darkColor: '#6EE7B7', darkBorder: 'rgba(52,211,153,0.3)' },
  NOTE:       { label: 'Ghi chú',    icon: <FileTextOutlined />,     color: 'orange',  darkBg: 'rgba(251,191,36,0.15)',  darkColor: '#FCD34D', darkBorder: 'rgba(251,191,36,0.3)' },
  DEMO:       { label: 'Demo',       icon: <PlayCircleOutlined />,   color: 'geekblue',darkBg: 'rgba(99,102,241,0.15)',  darkColor: '#A5B4FC', darkBorder: 'rgba(99,102,241,0.3)' },
  SITE_VISIT: { label: 'Thực địa',  icon: <EnvironmentOutlined />,  color: 'cyan',    darkBg: 'rgba(34,211,238,0.15)',  darkColor: '#67E8F9', darkBorder: 'rgba(34,211,238,0.3)' },
  SURVEY:     { label: 'Khảo sát',  icon: <FormOutlined />,         color: 'gold',    darkBg: 'rgba(245,158,11,0.15)',  darkColor: '#FCD34D', darkBorder: 'rgba(245,158,11,0.3)' },
  TASK:       { label: 'Task',       icon: <CheckSquareOutlined />,  color: 'lime',    darkBg: 'rgba(132,204,22,0.15)',  darkColor: '#BEF264', darkBorder: 'rgba(132,204,22,0.3)' },
};

export default function ActivitiesPage() {
  const { isDark, textPrimary, textMuted, bgContainer, bgCard, borderColor, linkColor } = useThemePalette();
  const qc = useQueryClient();

  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CrmActivity | null>(null);
  const [detail, setDetail] = useState<CrmActivity | null>(null);
  const [form] = Form.useForm();

  const { data: stats } = useQuery({ queryKey: ['crm-activity-stats'], queryFn: crmActivitiesApi.stats });
  const { data, isLoading } = useQuery({
    queryKey: ['crm-activities', typeFilter, page],
    queryFn: () => crmActivitiesApi.list({ type: typeFilter, page, limit: 20 }),
  });
  const { data: customers } = useQuery({
    queryKey: ['customers-simple'],
    queryFn: () => apiClient.get<{ data: Customer[]; total: number }>('/crm/customers', { params: { limit: 200 } }).then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (v: any) => crmActivitiesApi.create(v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['crm-activities'] }); qc.invalidateQueries({ queryKey: ['crm-activity-stats'] }); closeModal(); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, ...v }: any) => crmActivitiesApi.update(id, v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['crm-activities'] }); closeModal(); },
  });
  const deleteMutation = useMutation({
    mutationFn: crmActivitiesApi.remove,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['crm-activities'] }); qc.invalidateQueries({ queryKey: ['crm-activity-stats'] }); },
  });

  function openCreate() { setEditing(null); form.resetFields(); form.setFieldValue('type', 'CALL'); setModalOpen(true); }
  function openEdit(r: CrmActivity) {
    setEditing(r);
    form.setFieldsValue({
      type: r.type, subject: r.subject, content: r.content, customerId: r.customerId,
      dealId: r.dealId, duration: r.duration, outcome: r.outcome, nextAction: r.nextAction,
      scheduledAt: r.scheduledAt ? dayjs(r.scheduledAt) : undefined,
      completedAt: r.completedAt ? dayjs(r.completedAt) : undefined,
      nextActionDueAt: r.nextActionDueAt ? dayjs(r.nextActionDueAt) : undefined,
    });
    setModalOpen(true);
  }
  function closeModal() { setModalOpen(false); setEditing(null); form.resetFields(); }

  function handleSubmit(values: any) {
    const payload = {
      ...values,
      scheduledAt:     values.scheduledAt     ? values.scheduledAt.toISOString()     : undefined,
      completedAt:     values.completedAt     ? values.completedAt.toISOString()     : undefined,
      nextActionDueAt: values.nextActionDueAt ? values.nextActionDueAt.toISOString() : undefined,
    };
    if (editing) updateMutation.mutate({ id: editing.id, ...payload });
    else         createMutation.mutate(payload);
  }

  const filtered = (data?.data ?? []).filter(a =>
    !search || a.subject.toLowerCase().includes(search.toLowerCase()) ||
    (a.customer?.name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const columns: ColumnsType<CrmActivity> = [
    {
      title: <Text style={{ color: textMuted }}>Ngày</Text>,
      dataIndex: 'createdAt', width: 120,
      render: (v: string) => <Text style={{ color: textMuted }}>{dayjs(v).format('DD/MM/YYYY')}</Text>,
    },
    {
      title: <Text style={{ color: textMuted }}>Loại</Text>,
      dataIndex: 'type', width: 120,
      render: (v: ActivityType) => {
        const m = TYPE_META[v];
        return (
          <Tag
            icon={m.icon}
            style={isDark ? { background: m.darkBg, color: m.darkColor, borderColor: m.darkBorder } : {}}
            color={isDark ? undefined : m.color}
          >
            {m.label}
          </Tag>
        );
      },
    },
    {
      title: <Text style={{ color: textMuted }}>Chủ đề</Text>,
      dataIndex: 'subject',
      render: (v: string, r) => (
        <Button type="link" style={{ padding: 0, color: linkColor, textAlign: 'left' }} onClick={() => setDetail(r)}>
          {v}
        </Button>
      ),
    },
    {
      title: <Text style={{ color: textMuted }}>Khách hàng</Text>,
      dataIndex: ['customer', 'name'], width: 180,
      render: (v?: string) => v ? <Text style={{ color: textPrimary }}>{v}</Text> : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      title: <Text style={{ color: textMuted }}>Việc tiếp theo</Text>,
      dataIndex: 'nextAction', width: 200,
      render: (v?: string, r?: CrmActivity) => {
        if (!v) return <Text style={{ color: textMuted }}>—</Text>;
        const overdue = r?.nextActionDueAt && dayjs(r.nextActionDueAt).isBefore(dayjs(), 'day');
        return (
          <Space direction="vertical" size={0}>
            <Text style={{ color: overdue ? '#EF4444' : textPrimary, fontSize: 13 }}>{v}</Text>
            {r?.nextActionDueAt && (
              <Text style={{ color: overdue ? '#EF4444' : textMuted, fontSize: 11 }}>
                <CalendarOutlined style={{ marginRight: 3 }} />
                {dayjs(r.nextActionDueAt).format('DD/MM/YYYY')}
              </Text>
            )}
          </Space>
        );
      },
    },
    {
      title: <Text style={{ color: textMuted }}>Người ghi</Text>,
      dataIndex: ['createdBy', 'name'], width: 140,
      render: (v?: string) => <Text style={{ color: textMuted }}>{v ?? '—'}</Text>,
    },
    {
      title: '', width: 80, fixed: 'right' as const,
      render: (_: any, r: CrmActivity) => (
        <Space>
          <Button type="text" size="small" icon={<EditOutlined />} style={{ color: linkColor }} onClick={() => openEdit(r)} />
          <Button type="text" size="small" icon={<DeleteOutlined />} style={{ color: '#EF4444' }}
            onClick={() => confirmDelete({ itemName: r.subject, onConfirm: () => deleteMutation.mutate(r.id) })} />
        </Space>
      ),
    },
  ];

  const watchedType = Form.useWatch('type', form);

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="CRM Activities"
        icon={<PhoneOutlined />}
        iconColor="#6366F1"
        actions={<Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Ghi hoạt động</Button>}
      />

      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}><StatCard label="Tổng" value={stats?.total ?? 0} color="#6366F1" icon={<FileTextOutlined />} /></Col>
        <Col xs={12} sm={6}><StatCard label="Cuộc gọi" value={stats?.byType?.CALL ?? 0} color="#3B82F6" icon={<PhoneOutlined />} /></Col>
        <Col xs={12} sm={6}><StatCard label="Họp mặt" value={stats?.byType?.MEETING ?? 0} color="#10B981" icon={<TeamOutlined />} /></Col>
        <Col xs={12} sm={6}><StatCard label="Việc hôm nay" value={stats?.todayDue ?? 0} color="#F59E0B" icon={<CalendarOutlined />} /></Col>
      </Row>

      <FilterBar>
        <Input
          prefix={<PhoneOutlined style={{ color: textMuted }} />}
          placeholder="Tìm chủ đề, khách hàng..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ width: 260 }}
        />
        <Select
          placeholder="Loại hoạt động"
          allowClear style={{ width: 160 }}
          value={typeFilter}
          onChange={v => { setTypeFilter(v); setPage(1); }}
          options={[
            { value: 'CALL',       label: 'Cuộc gọi' },
            { value: 'EMAIL',      label: 'Email' },
            { value: 'MEETING',    label: 'Họp mặt' },
            { value: 'NOTE',       label: 'Ghi chú' },
            { value: 'DEMO',       label: 'Demo' },
            { value: 'SITE_VISIT', label: 'Thực địa' },
            { value: 'SURVEY',     label: 'Khảo sát' },
            { value: 'TASK',       label: 'Task' },
          ]}
        />
      </FilterBar>

      <div style={{ background: bgContainer, borderRadius: 8, border: `1px solid ${borderColor}` }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={filtered}
          loading={isLoading}
          scroll={{ x: 900 }}
          pagination={{
            current: page,
            pageSize: 20,
            total: data?.total ?? 0,
            onChange: setPage,
            showTotal: t => <Text style={{ color: textMuted }}>Tổng {t} hoạt động</Text>,
          }}
        />
      </div>

      {/* Detail Drawer */}
      <Drawer
        open={!!detail}
        onClose={() => setDetail(null)}
        title={<Text style={{ color: textPrimary, fontWeight: 600 }}>{detail?.subject}</Text>}
        width={520}
        styles={{ body: { background: bgContainer }, header: { background: bgCard, borderBottom: `1px solid ${borderColor}` } }}
      >
        {detail && (
          <>
            <div style={{ marginBottom: 16 }}>
              {(() => { const m = TYPE_META[detail.type]; return (
                <Tag icon={m.icon}
                  style={isDark ? { background: m.darkBg, color: m.darkColor, borderColor: m.darkBorder } : {}}
                  color={isDark ? undefined : m.color}>{m.label}</Tag>
              ); })()}
            </div>
            <Descriptions column={1} bordered size="small"
              labelStyle={{ color: textMuted, background: bgCard, width: 160 }}
              contentStyle={{ color: textPrimary, background: bgContainer }}>
              <Descriptions.Item label="Khách hàng">{detail.customer?.name ?? '—'}</Descriptions.Item>
              {detail.scheduledAt && <Descriptions.Item label="Lịch hẹn">{dayjs(detail.scheduledAt).format('DD/MM/YYYY HH:mm')}</Descriptions.Item>}
              {detail.completedAt && <Descriptions.Item label="Hoàn thành">{dayjs(detail.completedAt).format('DD/MM/YYYY HH:mm')}</Descriptions.Item>}
              {detail.duration != null && <Descriptions.Item label="Thời lượng">{detail.duration} phút</Descriptions.Item>}
              {detail.content && <Descriptions.Item label="Nội dung"><Text style={{ color: textPrimary, whiteSpace: 'pre-wrap' }}>{detail.content}</Text></Descriptions.Item>}
              {detail.outcome && <Descriptions.Item label="Kết quả"><Text style={{ color: textPrimary, whiteSpace: 'pre-wrap' }}>{detail.outcome}</Text></Descriptions.Item>}
              {detail.nextAction && <Descriptions.Item label="Việc tiếp theo"><Text style={{ color: textPrimary }}>{detail.nextAction}</Text></Descriptions.Item>}
              {detail.nextActionDueAt && <Descriptions.Item label="Hạn">{dayjs(detail.nextActionDueAt).format('DD/MM/YYYY')}</Descriptions.Item>}
              <Descriptions.Item label="Người ghi">{detail.createdBy.name}</Descriptions.Item>
              <Descriptions.Item label="Ngày tạo">{dayjs(detail.createdAt).format('DD/MM/YYYY HH:mm')}</Descriptions.Item>
            </Descriptions>
            <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
              <Button icon={<EditOutlined />} onClick={() => { setDetail(null); openEdit(detail); }}>Chỉnh sửa</Button>
              <Button danger icon={<DeleteOutlined />} onClick={() =>
                confirmDelete({ itemName: detail.subject, onConfirm: () => { deleteMutation.mutate(detail.id); setDetail(null); } })
              }>Xóa</Button>
            </div>
          </>
        )}
      </Drawer>

      {/* Create / Edit Modal */}
      <CenteredModal
        open={modalOpen}
        onCancel={closeModal}
        title={editing ? 'Cập nhật hoạt động' : 'Ghi hoạt động mới'}
        footer={null}
        width={580}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="type" label="Loại" rules={[{ required: true }]}>
                <Select options={[
                  { value: 'CALL',       label: 'Cuộc gọi' },
                  { value: 'EMAIL',      label: 'Email' },
                  { value: 'MEETING',    label: 'Họp mặt' },
                  { value: 'NOTE',       label: 'Ghi chú' },
                  { value: 'DEMO',       label: 'Demo' },
                  { value: 'SITE_VISIT', label: 'Thực địa' },
                  { value: 'SURVEY',     label: 'Khảo sát' },
                  { value: 'TASK',       label: 'Task' },
                ]} />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item name="subject" label="Chủ đề" rules={[{ required: true, message: 'Nhập chủ đề' }]}>
                <Input placeholder="VD: Gọi điện chốt demo Q3" maxLength={200} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="customerId" label="Khách hàng">
            <Select
              showSearch allowClear placeholder="Chọn khách hàng"
              filterOption={(input, opt) => (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
              options={(customers?.data ?? []).map((c: any) => ({ value: c.id, label: c.name }))}
            />
          </Form.Item>

          <Form.Item name="content" label="Nội dung">
            <TextArea rows={3} placeholder="Mô tả nội dung cuộc trao đổi..." />
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="scheduledAt" label="Lịch hẹn">
                <DatePicker showTime style={{ width: '100%' }} format="DD/MM/YYYY HH:mm" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="completedAt" label="Hoàn thành lúc">
                <DatePicker showTime style={{ width: '100%' }} format="DD/MM/YYYY HH:mm" />
              </Form.Item>
            </Col>
          </Row>

          {watchedType === 'CALL' && (
            <Form.Item name="duration" label="Thời lượng (phút)">
              <InputNumber min={0} max={999} style={{ width: '100%' }} placeholder="VD: 30" />
            </Form.Item>
          )}

          <Form.Item name="outcome" label="Kết quả / Ghi chú">
            <TextArea rows={2} placeholder="Kết quả đạt được sau buổi trao đổi..." />
          </Form.Item>

          <Row gutter={12}>
            <Col span={14}>
              <Form.Item name="nextAction" label="Việc cần làm tiếp">
                <Input placeholder="VD: Gửi proposal, đặt lịch demo..." maxLength={300} />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="nextActionDueAt" label="Hạn">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <Button onClick={closeModal}>Hủy</Button>
            <Button type="primary" htmlType="submit"
              loading={createMutation.isPending || updateMutation.isPending}
              disabled={createMutation.isPending || updateMutation.isPending}>
              {editing ? 'Lưu thay đổi' : 'Lưu hoạt động'}
            </Button>
          </div>
        </Form>
      </CenteredModal>
    </div>
  );
}
