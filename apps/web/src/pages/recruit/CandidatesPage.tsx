import { useState, useEffect } from 'react';
import {
  Table, Button, Space, Typography, Select, Tag, Form, Row, Col,
  Input, InputNumber, message, Descriptions, Steps, Divider,
} from 'antd';
import { CenteredModal } from '../../components/ui/CenteredModal';
import { CommentThread } from '../../components/comments/CommentThread';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { FilterBar } from '../../components/FilterBar';
import { PlusOutlined, EditOutlined, DeleteOutlined, UsergroupAddOutlined, ArrowRightOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { useThemePalette } from '../../hooks/useThemePalette';
import { usePagination } from '../../hooks/usePagination';
import { confirmDelete } from '../../components/ui/confirmDelete';
import { usersApi } from '../../api/users';
import {
  useGetJobs, useGetCandidates, useCreateCandidate, useUpdateCandidate,
  useTransitionCandidateStage, useDeleteCandidate,
  type Candidate, type CandidateFilterParams, type CandidateStage,
} from '../../api/recruit';

const { Text } = Typography;
const { TextArea } = Input;

const STAGE_META: Record<CandidateStage, { label: string; color: string; darkBg: string; darkBorder: string; step: number }> = {
  APPLIED:   { label: 'Đã nộp',      color: '#3B82F6', darkBg: 'rgba(59,130,246,0.15)', darkBorder: 'rgba(59,130,246,0.35)', step: 0 },
  SCREENING: { label: 'Sàng lọc',    color: '#06B6D4', darkBg: 'rgba(6,182,212,0.15)', darkBorder: 'rgba(6,182,212,0.35)', step: 1 },
  INTERVIEW: { label: 'Phỏng vấn',   color: '#8B5CF6', darkBg: 'rgba(139,92,246,0.15)', darkBorder: 'rgba(139,92,246,0.35)', step: 2 },
  OFFER:     { label: 'Offer',        color: '#F97316', darkBg: 'rgba(249,115,22,0.15)', darkBorder: 'rgba(249,115,22,0.35)', step: 3 },
  HIRED:     { label: 'Đã tuyển',    color: '#10B981', darkBg: 'rgba(16,185,129,0.15)', darkBorder: 'rgba(16,185,129,0.35)', step: 4 },
  REJECTED:  { label: 'Từ chối',     color: '#EF4444', darkBg: 'rgba(239,68,68,0.15)', darkBorder: 'rgba(239,68,68,0.35)', step: 4 },
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
  const { isDark, bgContainer, bgCard, borderColor, textPrimary, textMuted, linkColor, preset } = useThemePalette();

  const { page, pageSize, resetPage, paginationProps } = usePagination(20);
  const [filters, setFilters]       = useState<CandidateFilterParams>({});
  const [drawerOpen, setDrawer]     = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editing, setEditing]       = useState<Candidate | null>(null);
  const [selected, setSelected]     = useState<Candidate | null>(null);
  const [form] = Form.useForm();

  useEffect(() => { resetPage(); }, [filters.jobOpeningId, filters.stage, resetPage]);

  const { data, isLoading }          = useGetCandidates({ ...filters, page, limit: pageSize });
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
    confirmDelete({
      title: `Chuyển "${c.name}" → ${STAGE_META[next].label}?`,
      content: 'Xác nhận chuyển giai đoạn ứng viên.',
      okText: 'Chuyển',
      danger: false,
      onConfirm: async () => {
        await stageMutation.mutateAsync({ id: c.id, stage: next });
        message.success(`Đã chuyển sang ${STAGE_META[next].label}`);
      },
    });
  };

  const handleReject = (c: Candidate) => {
    confirmDelete({
      title: `Từ chối ứng viên "${c.name}"?`,
      okText: 'Từ chối',
      onConfirm: async () => {
        await stageMutation.mutateAsync({ id: c.id, stage: 'REJECTED' });
        message.success('Đã từ chối');
      },
    });
  };

  const handleDelete = (c: Candidate) => {
    confirmDelete({
      itemName: c.name,
      onConfirm: async () => { await deleteMutation.mutateAsync(c.id); message.success('Đã xoá'); },
    });
  };

  const columns: ColumnsType<Candidate> = [
    {
      title: 'Ứng viên', dataIndex: 'name',
      render: (n: string, row: Candidate) => (
        <Text style={{ color: textPrimary, cursor: 'pointer', fontWeight: 500 }}
          onClick={() => { setSelected(row); setDetailOpen(true); }}>{n}</Text>
      ),
    },
    { title: 'Email', dataIndex: 'email', width: 200, render: (v?: string) => v ? <Text style={{ color: textPrimary }}>{v}</Text> : <Text style={{ color: textMuted }}>—</Text> },
    {
      title: 'Vị trí', key: 'job', width: 200,
      render: (_: unknown, row: Candidate) => <Text style={{ color: textPrimary }}>{row.jobOpening?.title ?? '—'}</Text>,
    },
    {
      title: 'Stage', dataIndex: 'stage', width: 130,
      render: (s: CandidateStage) => {
        const meta = STAGE_META[s];
        return (
          <Tag
            style={isDark ? { background: meta.darkBg, color: meta.color, borderColor: meta.darkBorder } : {}}
            color={isDark ? undefined : (
              s === 'APPLIED' ? 'blue' :
              s === 'SCREENING' ? 'cyan' :
              s === 'INTERVIEW' ? 'purple' :
              s === 'OFFER' ? 'orange' :
              s === 'HIRED' ? 'green' : 'red'
            )}
          >
            {meta.label}
          </Tag>
        );
      },
    },
    {
      title: 'Lương kỳ vọng', dataIndex: 'expectedSalary', width: 150, align: 'right',
      render: (v?: string) => v ? <Text style={{ color: linkColor, fontWeight: 500 }}>{(Number(v)/1_000_000).toFixed(0)}M ₫</Text> : <Text style={{ color: textMuted }}>—</Text>,
    },
    { title: 'Ngày nộp', dataIndex: 'createdAt', width: 110, render: (v: string) => <Text style={{ color: textMuted }}>{dayjs(v).format('DD/MM/YYYY')}</Text> },
    {
      title: '', key: 'actions', width: 130, align: 'right',
      render: (_: unknown, row: Candidate) => (
        <Space>
          {NEXT_STAGE[row.stage] && row.stage !== 'HIRED' && row.stage !== 'REJECTED' && (
            <Button size="small" type="primary" icon={<ArrowRightOutlined />}
              style={{ background: preset.primary, borderColor: preset.primary }}
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

  const totalCount = data?.total ?? 0;
  const appliedCount = data?.data?.filter(c => c.stage === 'APPLIED').length ?? 0;
  const screeningCount = data?.data?.filter(c => c.stage === 'SCREENING').length ?? 0;
  const interviewCount = data?.data?.filter(c => c.stage === 'INTERVIEW').length ?? 0;

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Ứng viên"
        icon={<UsergroupAddOutlined />}
        iconColor="#3B82F6"
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}
            style={{ background: preset.primary, borderColor: preset.primary }}>
            Thêm ứng viên
          </Button>
        }
      />

      {/* Stat Cards */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}><StatCard label="Tổng ứng viên" value={totalCount} color="#6366F1" icon={<UsergroupAddOutlined />} /></Col>
        <Col xs={12} sm={6}><StatCard label="Đã nộp" value={appliedCount} color="#3B82F6" icon={<UsergroupAddOutlined />} /></Col>
        <Col xs={12} sm={6}><StatCard label="Sàng lọc" value={screeningCount} color="#06B6D4" icon={<UsergroupAddOutlined />} /></Col>
        <Col xs={12} sm={6}><StatCard label="Phỏng vấn" value={interviewCount} color="#8B5CF6" icon={<UsergroupAddOutlined />} /></Col>
      </Row>

      {/* Filter Bar */}
      <FilterBar>
        <Select placeholder="Vị trí" style={{ width: 220 }} allowClear showSearch optionFilterProp="label"
          options={jobs.map(j => ({ value: j.id, label: j.title }))}
          onChange={v => setFilters(f => ({ ...f, jobOpeningId: v }))} />
        <Select placeholder="Stage" style={{ width: 150 }} allowClear options={STAGE_OPTIONS}
          onChange={v => setFilters(f => ({ ...f, stage: v }))} />
      </FilterBar>

      {/* Table */}
      <div style={{ background: bgContainer, borderRadius: 8, border: `1px solid ${borderColor}` }}>
        <Table<Candidate>
          rowKey="id" columns={columns} dataSource={data?.data ?? []} loading={isLoading}
          pagination={paginationProps(data?.total, 'ứng viên')}
        />
      </div>

      {/* Create/Edit CenteredModal */}
      <CenteredModal title={editing ? 'Sửa ứng viên' : 'Thêm ứng viên'} open={drawerOpen} width={440}
        onClose={() => setDrawer(false)}
        extra={<Button type="primary" loading={isPending} disabled={isPending} onClick={handleSave}
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
              options={usersData.map((u) => ({ value: u.id, label: u.name }))} />
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
              <Descriptions.Item label="Stage">
                <Tag
                  style={isDark ? { background: STAGE_META[selected.stage].darkBg, color: STAGE_META[selected.stage].color, borderColor: STAGE_META[selected.stage].darkBorder } : {}}
                  color={isDark ? undefined : (
                    selected.stage === 'APPLIED' ? 'blue' :
                    selected.stage === 'SCREENING' ? 'cyan' :
                    selected.stage === 'INTERVIEW' ? 'purple' :
                    selected.stage === 'OFFER' ? 'orange' :
                    selected.stage === 'HIRED' ? 'green' : 'red'
                  )}
                >
                  {STAGE_META[selected.stage].label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Lương KV">{selected.expectedSalary ? <Text style={{ color: linkColor, fontWeight: 500 }}>{`${(Number(selected.expectedSalary)/1_000_000).toFixed(0)}M ₫`}</Text> : '—'}</Descriptions.Item>
              <Descriptions.Item label="Ngày nộp">{dayjs(selected.createdAt).format('DD/MM/YYYY')}</Descriptions.Item>
            </Descriptions>
            {selected.notes && (
              <>
                <Divider style={{ fontSize: 13 }}>Ghi chú</Divider>
                <Text style={{ color: textMuted, whiteSpace: 'pre-wrap' }}>{selected.notes}</Text>
              </>
            )}
            <Divider style={{ margin: '16px 0 8px' }}>Thảo luận</Divider>
            <CommentThread entityType="candidate" entityId={selected.id} />
          </>
        )}
      </CenteredModal>
    </div>
  );
}
