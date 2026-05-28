import { useState } from 'react';
import {
  Table, Button, Space, Typography, Select, Tag, Form,
  Input, InputNumber, Modal, message, Descriptions, Steps, Divider,
} from 'antd';
import { CenteredModal } from '../../components/ui/CenteredModal';
import { PlusOutlined, EditOutlined, DeleteOutlined, UsergroupAddOutlined, ArrowRightOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { useThemeStore } from '../../store/theme.store';
import { usersApi } from '../../api/users';
import {
  useGetJobs, useGetCandidates, useCreateCandidate, useUpdateCandidate,
  useTransitionCandidateStage, useDeleteCandidate,
  type Candidate, type CandidateFilterParams, type CandidateStage, type LeadSource,
} from '../../api/recruit';

const { Title, Text } = Typography;
const { TextArea } = Input;

const STAGE_META: Record<CandidateStage, { label: string; color: string; step: number }> = {
  APPLIED:   { label: 'Đã nộp',      color: 'blue',    step: 0 },
  SCREENING: { label: 'Sàng lọc',    color: 'cyan',    step: 1 },
  INTERVIEW: { label: 'Phỏng vấn',   color: 'purple',  step: 2 },
  OFFER:     { label: 'Offer',        color: 'orange',  step: 3 },
  HIRED:     { label: 'Đã tuyển',    color: 'green',   step: 4 },
  REJECTED:  { label: 'Từ chối',     color: 'red',     step: 4 },
};

const NEXT_STAGE: Partial<Record<CandidateStage, CandidateStage>> = {
  APPLIED:   'SCREENING',
  SCREENING: 'INTERVIEW',
  INTERVIEW: 'OFFER',
  OFFER:     'HIRED',
};

const SOURCE_OPTIONS = [
  { value: 'WEBSITE',       label: 'Website' },
  { value: 'REFERRAL',      label: 'Giới thiệu' },
  { value: 'SOCIAL',        label: 'Mạng xã hội' },
  { value: 'EVENT',         label: 'Sự kiện' },
  { value: 'COLD_OUTREACH', label: 'Cold Outreach' },
  { value: 'OTHER',         label: 'Khác' },
];

const STAGE_OPTIONS = Object.entries(STAGE_META).map(([k, v]) => ({ value: k as CandidateStage, label: v.label }));

export default function CandidatesPage() {
  const { mode, preset } = useThemeStore();
  const isDark = mode === 'dark';
  const bgContainer = isDark ? '#1E293B' : '#ffffff';
  const bgCard      = isDark ? '#2D3F56' : '#FAFAFA';
  const borderColor = isDark ? '#334155' : '#E2E8F0';
  const textPrimary = isDark ? '#F1F5F9' : '#0F172A';
  const textMuted   = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';

  const [filters, setFilters]       = useState<CandidateFilterParams>({ page: 1, limit: 20 });
  const [drawerOpen, setDrawer]     = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editing, setEditing]       = useState<Candidate | null>(null);
  const [selected, setSelected]     = useState<Candidate | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading }          = useGetCandidates(filters);
  const { data: jobsData }           = useGetJobs({ limit: 200 });
  const { data: usersData = [] }     = useQuery({ queryKey: ['users'], queryFn: usersApi.list });
  const jobs = jobsData?.data ?? [];

  const createMutation   = useCreateCandidate();
  const updateMutation   = useUpdateCandidate();
  const stageMutation    = useTransitionCandidateStage();
  const deleteMutation   = useDeleteCandidate();

  const openCreate = () => {
    setEditing(null); form.resetFields();
    setDrawer(true);
  };

  const openEdit = (c: Candidate) => {
    setEditing(c);
    form.setFieldsValue({ name: c.name, email: c.email, phone: c.phone, source: c.source,
      expectedSalary: c.expectedSalary ? Number(c.expectedSalary) : undefined,
      jobOpeningId: c.jobOpeningId, assigneeId: c.assigneeId });
    setDrawer(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, data: values });
      message.success('Đã cập nhật');
    } else {
      await createMutation.mutateAsync(values);
      message.success('Đã thêm ứng viên');
    }
    setDrawer(false);
  };

  const handleAdvance = (c: Candidate) => {
    const next = NEXT_STAGE[c.stage];
    if (!next) return;
    Modal.confirm({
      title: `Chuyển "${c.name}" → ${STAGE_META[next].label}?`,
      onOk: async () => {
        await stageMutation.mutateAsync({ id: c.id, stage: next });
        message.success(`Đã chuyển sang ${STAGE_META[next].label}`);
      },
    });
  };

  const handleReject = (c: Candidate) => {
    Modal.confirm({
      title: `Từ chối ứng viên "${c.name}"?`,
      okType: 'danger',
      onOk: async () => {
        await stageMutation.mutateAsync({ id: c.id, stage: 'REJECTED' });
        message.success('Đã từ chối');
      },
    });
  };

  const handleDelete = (c: Candidate) => {
    Modal.confirm({
      title: `Xoá ứng viên "${c.name}"?`,
      okType: 'danger',
      onOk: async () => { await deleteMutation.mutateAsync(c.id); message.success('Đã xoá'); },
    });
  };

  const columns: ColumnsType<Candidate> = [
    {
      title: 'Ứng viên', dataIndex: 'name',
      render: (n: string, row: Candidate) => (
        <Button type="link" style={{ padding: 0, color: preset.primary }}
          onClick={() => { setSelected(row); setDetailOpen(true); }}>{n}</Button>
      ),
    },
    { title: 'Email', dataIndex: 'email', width: 200, render: (v?: string) => v ?? <Text style={{ color: textMuted }}>—</Text> },
    {
      title: 'Vị trí', key: 'job', width: 200,
      render: (_: unknown, row: Candidate) => <Text style={{ color: textPrimary }}>{row.jobOpening?.title ?? '—'}</Text>,
    },
    {
      title: 'Stage', dataIndex: 'stage', width: 130,
      render: (s: CandidateStage) => <Tag color={STAGE_META[s].color}>{STAGE_META[s].label}</Tag>,
    },
    {
      title: 'Lương kỳ vọng', dataIndex: 'expectedSalary', width: 150, align: 'right',
      render: (v?: string) => v ? `${(Number(v)/1_000_000).toFixed(0)}M ₫` : <Text style={{ color: textMuted }}>—</Text>,
    },
    { title: 'Ngày nộp', dataIndex: 'createdAt', width: 110, render: (v: string) => dayjs(v).format('DD/MM/YYYY') },
    {
      title: '', key: 'actions', width: 130, align: 'right',
      render: (_: unknown, row: Candidate) => (
        <Space>
          {NEXT_STAGE[row.stage] && row.stage !== 'HIRED' && row.stage !== 'REJECTED' && (
            <Button size="small" type="primary" icon={<ArrowRightOutlined />}
              style={{ background: '#0EA5E9', borderColor: '#0EA5E9' }}
              onClick={() => handleAdvance(row)} />
          )}
          {row.stage !== 'HIRED' && row.stage !== 'REJECTED' && (
            <Button size="small" danger onClick={() => handleReject(row)}>Từ chối</Button>
          )}
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)} />
          {row.stage === 'APPLIED' && (
            <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(row)} />
          )}
        </Space>
      ),
    },
  ];

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <UsergroupAddOutlined style={{ color: '#0EA5E9', fontSize: 20 }} />
          <Title level={4} style={{ margin: 0, color: textPrimary }}>Ứng viên</Title>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}
          style={{ background: preset.primary, borderColor: preset.primary }}>
          Thêm ứng viên
        </Button>
      </div>

      <div style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Select placeholder="Vị trí" style={{ width: 220 }} allowClear showSearch optionFilterProp="label"
          options={jobs.map(j => ({ value: j.id, label: j.title }))}
          onChange={v => setFilters(f => ({ ...f, jobOpeningId: v, page: 1 }))} />
        <Select placeholder="Stage" style={{ width: 150 }} allowClear options={STAGE_OPTIONS}
          onChange={v => setFilters(f => ({ ...f, stage: v, page: 1 }))} />
      </div>

      <div style={{ background: bgContainer, borderRadius: 8, border: `1px solid ${borderColor}` }}>
        <Table<Candidate>
          rowKey="id" columns={columns} dataSource={data?.data ?? []} loading={isLoading}
          pagination={{ current: filters.page, pageSize: filters.limit, total: data?.total ?? 0, showSizeChanger: true,
            onChange: (page, limit) => setFilters(f => ({ ...f, page, limit })) }}
          components={{ header: { cell: (props: React.HTMLAttributes<HTMLTableCellElement>) => (
            <th {...props} style={{ ...props.style, background: bgCard, color: textPrimary, borderBottom: `1px solid ${borderColor}` }} />
          )}}}
        />
      </div>

      {/* Create/Edit CenteredModal */}
      <CenteredModal title={editing ? 'Sửa ứng viên' : 'Thêm ứng viên'} open={drawerOpen} width={440}
        onClose={() => setDrawer(false)}
        extra={<Button type="primary" loading={isPending} onClick={handleSave}
          style={{ background: preset.primary, borderColor: preset.primary }}>{editing ? 'Cập nhật' : 'Lưu'}</Button>}>
        <Form form={form} layout="vertical">
          <Form.Item name="name"  label="Họ tên" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="email" label="Email" rules={[{ type: 'email' }]}><Input /></Form.Item>
          <Form.Item name="phone" label="Điện thoại"><Input /></Form.Item>
          {!editing && (
            <Form.Item name="jobOpeningId" label="Vị trí ứng tuyển" rules={[{ required: true }]}>
              <Select showSearch optionFilterProp="label" options={jobs.map(j => ({ value: j.id, label: j.title }))} />
            </Form.Item>
          )}
          <Form.Item name="source" label="Nguồn">
            <Select options={SOURCE_OPTIONS} allowClear />
          </Form.Item>
          <Form.Item name="expectedSalary" label="Lương kỳ vọng (VND)">
            <InputNumber style={{ width: '100%' }} formatter={v => v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''} />
          </Form.Item>
          <Form.Item name="assigneeId" label="HR phụ trách">
            <Select allowClear showSearch optionFilterProp="label"
              options={usersData.map((u: { id: string; name: string }) => ({ value: u.id, label: u.name }))} />
          </Form.Item>
          <Form.Item name="notes" label="Ghi chú"><TextArea rows={2} /></Form.Item>
        </Form>
      </CenteredModal>

      {/* Detail CenteredModal */}
      <CenteredModal title={selected?.name} open={detailOpen} width={480} onClose={() => setDetailOpen(false)}>
        {selected && (
          <>
            <Steps
              size="small" current={STAGE_META[selected.stage].step}
              status={selected.stage === 'REJECTED' ? 'error' : 'process'}
              items={[
                { title: 'Applied' }, { title: 'Screening' }, { title: 'Interview' },
                { title: 'Offer' },
                selected.stage === 'REJECTED' ? { title: 'Rejected' } : { title: 'Hired' },
              ]}
            />
            <Divider />
            <Descriptions column={1} bordered size="small"
              labelStyle={{ background: bgCard, color: textMuted }}
              contentStyle={{ background: bgContainer, color: textPrimary }}>
              <Descriptions.Item label="Email">{selected.email ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Điện thoại">{selected.phone ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Vị trí">{selected.jobOpening?.title ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Stage"><Tag color={STAGE_META[selected.stage].color}>{STAGE_META[selected.stage].label}</Tag></Descriptions.Item>
              <Descriptions.Item label="Lương KV">{selected.expectedSalary ? `${(Number(selected.expectedSalary)/1_000_000).toFixed(0)}M ₫` : '—'}</Descriptions.Item>
              <Descriptions.Item label="Ngày nộp">{dayjs(selected.createdAt).format('DD/MM/YYYY')}</Descriptions.Item>
            </Descriptions>
            {selected.notes && (
              <>
                <Divider orientation="left" style={{ fontSize: 13 }}>Ghi chú</Divider>
                <Text style={{ color: textMuted, whiteSpace: 'pre-wrap' }}>{selected.notes}</Text>
              </>
            )}
          </>
        )}
      </CenteredModal>
    </div>
  );
}
