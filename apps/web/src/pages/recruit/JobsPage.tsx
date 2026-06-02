import { useState } from 'react';
import {
  Table, Button, Space, Typography, Select, Tag, Form, Row, Col,
  Input, InputNumber, Modal, message,
} from 'antd';
import { CenteredModal } from '../../components/ui/CenteredModal';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { FilterBar } from '../../components/FilterBar';
import { PlusOutlined, EditOutlined, DeleteOutlined, SolutionOutlined, StopOutlined, TeamOutlined, UsergroupAddOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useQuery } from '@tanstack/react-query';
import { useThemePalette } from '../../hooks/useThemePalette';
import { confirmDelete } from '../../components/ui/confirmDelete';
import { orgUnitsApi } from '../../api/org-units';
import {
  useGetJobs, useCreateJob, useUpdateJob, useCloseJob, useDeleteJob,
  type JobOpening, type JobFilterParams, type JobStatus, type EmployeeLevel,
} from '../../api/recruit';

const { Text } = Typography;
const { TextArea } = Input;

const STATUS_META: Record<JobStatus, { label: string; color: string; darkBg?: string; darkBorder?: string }> = {
  OPEN:    { label: 'Đang mở',   color: '#10B981', darkBg: 'rgba(16,185,129,0.15)', darkBorder: 'rgba(16,185,129,0.35)' },
  ON_HOLD: { label: 'Tạm dừng', color: '#F59E0B', darkBg: 'rgba(245,158,11,0.15)', darkBorder: 'rgba(245,158,11,0.35)' },
  CLOSED:  { label: 'Đã đóng',  color: '#64748B', darkBg: 'rgba(100,116,139,0.15)', darkBorder: 'rgba(100,116,139,0.35)' },
};

const LEVEL_META: Record<EmployeeLevel, { label: string; color: string; darkBg?: string; darkBorder?: string }> = {
  JUNIOR: { label: 'Junior', color: '#3B82F6', darkBg: 'rgba(59,130,246,0.15)', darkBorder: 'rgba(59,130,246,0.35)' },
  MID:    { label: 'Mid',    color: '#06B6D4', darkBg: 'rgba(6,182,212,0.15)', darkBorder: 'rgba(6,182,212,0.35)' },
  SENIOR: { label: 'Senior', color: '#8B5CF6', darkBg: 'rgba(139,92,246,0.15)', darkBorder: 'rgba(139,92,246,0.35)' },
  EXPERT: { label: 'Expert', color: '#EF4444', darkBg: 'rgba(239,68,68,0.15)', darkBorder: 'rgba(239,68,68,0.35)' },
};

const LEVEL_OPTIONS = Object.entries(LEVEL_META).map(([k, v]) => ({ value: k as EmployeeLevel, label: v.label }));
const STATUS_OPTIONS = Object.entries(STATUS_META).map(([k, v]) => ({ value: k as JobStatus, label: v.label }));

function fmtSalary(from?: string, to?: string): string {
  if (!from && !to) return '—';
  const f = from ? (Number(from) / 1_000_000).toFixed(0) + 'M' : '?';
  const t = to   ? (Number(to)   / 1_000_000).toFixed(0) + 'M' : '?';
  return `${f} – ${t}`;
}

export default function JobsPage() {
  const { isDark, bgContainer, borderColor, textPrimary, textMuted, linkColor, preset } = useThemePalette();

  const [filters, setFilters] = useState<JobFilterParams>({ page: 1, limit: 20 });
  const [drawerOpen, setDrawer] = useState(false);
  const [editing, setEditing]   = useState<JobOpening | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading }          = useGetJobs(filters);
  const { data: orgUnitsRaw = [] }   = useQuery({ queryKey: ['org-units'], queryFn: orgUnitsApi.list });
  const orgUnits = Array.isArray(orgUnitsRaw) ? orgUnitsRaw : (orgUnitsRaw as { data?: unknown[] }).data ?? [];

  const createMutation = useCreateJob();
  const updateMutation = useUpdateJob();
  const closeMutation  = useCloseJob();
  const deleteMutation = useDeleteJob();

  const openCreate = () => {
    setEditing(null); form.resetFields();
    form.setFieldsValue({ level: 'MID', headcount: 1 });
    setDrawer(true);
  };

  const openEdit = (job: JobOpening) => {
    setEditing(job);
    form.setFieldsValue({
      title: job.title, orgUnitId: job.orgUnitId, level: job.level,
      headcount: job.headcount, requirements: job.requirements,
      salaryFrom: job.salaryFrom ? Number(job.salaryFrom) : undefined,
      salaryTo:   job.salaryTo   ? Number(job.salaryTo)   : undefined,
    });
    setDrawer(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, data: values });
      message.success('Đã cập nhật');
    } else {
      await createMutation.mutateAsync(values);
      message.success('Đã tạo vị trí tuyển dụng');
    }
    setDrawer(false);
  };

  const handleClose = (job: JobOpening) => {
    Modal.confirm({
      title: `Đóng vị trí "${job.title}"?`,
      content: 'Sau khi đóng sẽ không nhận thêm ứng viên.',
      okType: 'danger',
      onOk: async () => { await closeMutation.mutateAsync(job.id); message.success('Đã đóng vị trí'); },
    });
  };

  const handleDelete = (job: JobOpening) => {
    confirmDelete({
      itemName: job.title,
      onConfirm: async () => { await deleteMutation.mutateAsync(job.id); message.success('Đã xoá'); },
    });
  };

  const columns: ColumnsType<JobOpening> = [
    { title: 'Mã', dataIndex: 'code', width: 130, render: (v: string) => <Text code style={{ color: linkColor }}>{v}</Text> },
    {
      title: 'Vị trí', dataIndex: 'title',
      render: (t: string, row: JobOpening) => (
        <Space direction="vertical" size={0}>
          <Text style={{ color: textPrimary, fontWeight: 500 }}>{t}</Text>
          {row.orgUnit && <Text style={{ fontSize: 12, color: textMuted }}>{row.orgUnit.name}</Text>}
        </Space>
      ),
    },
    {
      title: 'Level', dataIndex: 'level', width: 90,
      render: (v: EmployeeLevel) => {
        const meta = LEVEL_META[v];
        return (
          <Tag
            style={isDark ? { background: meta.darkBg, color: meta.color, borderColor: meta.darkBorder } : {}}
            color={isDark ? undefined : (v === 'JUNIOR' ? 'blue' : v === 'MID' ? 'cyan' : v === 'SENIOR' ? 'purple' : 'red')}
          >
            {meta.label}
          </Tag>
        );
      },
    },
    { title: 'HC',    dataIndex: 'headcount', width: 60, align: 'center', render: (v: number) => <Text style={{ color: textPrimary }}>{v}</Text> },
    { title: 'Lương', key: 'salary', width: 140, render: (_: unknown, r: JobOpening) => <Text style={{ color: linkColor, fontWeight: 500 }}>{fmtSalary(r.salaryFrom, r.salaryTo)}</Text> },
    {
      title: 'Ứng viên', key: 'cnt', width: 90, align: 'center',
      render: (_: unknown, r: JobOpening) => {
        const count = r._count?.candidates ?? 0;
        return (
          <Tag
            style={isDark ? { background: 'rgba(59,130,246,0.15)', color: '#93C5FD', borderColor: 'rgba(59,130,246,0.3)' } : {}}
            color={isDark ? undefined : 'blue'}
          >
            {count}
          </Tag>
        );
      },
    },
    {
      title: 'Trạng thái', dataIndex: 'status', width: 120,
      render: (s: JobStatus) => {
        const meta = STATUS_META[s];
        return (
          <Tag
            style={isDark ? { background: meta.darkBg, color: meta.color, borderColor: meta.darkBorder } : {}}
            color={isDark ? undefined : (s === 'OPEN' ? 'green' : s === 'ON_HOLD' ? 'orange' : 'default')}
          >
            {meta.label}
          </Tag>
        );
      },
    },
    {
      title: '', key: 'actions', width: 100, align: 'right',
      render: (_: unknown, row: JobOpening) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)} />
          {row.status === 'OPEN' && <Button size="small" icon={<StopOutlined />} onClick={() => handleClose(row)} />}
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(row)} />
        </Space>
      ),
    },
  ];

  const isPending = createMutation.isPending || updateMutation.isPending;

  const totalJobs = data?.total ?? 0;
  const openJobs = data?.data?.filter(j => j.status === 'OPEN').length ?? 0;
  const onHoldJobs = data?.data?.filter(j => j.status === 'ON_HOLD').length ?? 0;
  const totalCandidates = data?.data?.reduce((sum, j) => sum + (j._count?.candidates ?? 0), 0) ?? 0;

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Vị trí tuyển dụng"
        icon={<SolutionOutlined />}
        iconColor="#3B82F6"
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}
            style={{ background: preset.primary, borderColor: preset.primary }}>
            Tạo vị trí
          </Button>
        }
      />

      {/* Stat Cards */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}><StatCard label="Tổng vị trí" value={totalJobs} color="#6366F1" icon={<SolutionOutlined />} /></Col>
        <Col xs={12} sm={6}><StatCard label="Đang mở" value={openJobs} color="#10B981" icon={<SolutionOutlined />} /></Col>
        <Col xs={12} sm={6}><StatCard label="Tạm dừng" value={onHoldJobs} color="#F59E0B" icon={<SolutionOutlined />} /></Col>
        <Col xs={12} sm={6}><StatCard label="Tổng ứng viên" value={totalCandidates} color="#8B5CF6" icon={<UsergroupAddOutlined />} /></Col>
      </Row>

      {/* Filter Bar */}
      <FilterBar>
        <Select placeholder="Trạng thái" style={{ width: 140 }} allowClear options={STATUS_OPTIONS}
          onChange={v => setFilters(f => ({ ...f, status: v, page: 1 }))} />
        <Select placeholder="Level" style={{ width: 120 }} allowClear options={LEVEL_OPTIONS}
          onChange={v => setFilters(f => ({ ...f, level: v, page: 1 }))} />
        <Select placeholder="Bộ phận" style={{ width: 200 }} allowClear showSearch optionFilterProp="label"
          options={(orgUnits as { id: string; name: string }[]).map(o => ({ value: o.id, label: o.name }))}
          onChange={v => setFilters(f => ({ ...f, orgUnitId: v, page: 1 }))} />
      </FilterBar>

      {/* Table */}
      <div style={{ background: bgContainer, borderRadius: 8, border: `1px solid ${borderColor}` }}>
        <Table<JobOpening>
          rowKey="id"
          columns={columns}
          dataSource={data?.data ?? []}
          loading={isLoading}
          locale={{
            emptyText: (
              <div style={{ padding: '40px 0', textAlign: 'center' }}>
                {/* Icon và text khi chưa có vị trí tuyển dụng nào */}
                <TeamOutlined style={{ fontSize: 48, color: '#94A3B8', marginBottom: 12, display: 'block' }} />
                <div style={{ color: textMuted, fontSize: 14 }}>Chưa có vị trí tuyển dụng nào</div>
                <div style={{ color: textMuted, fontSize: 12, marginTop: 4 }}>Nhấn nút Tạo vị trí để đăng tuyển mới</div>
              </div>
            ),
          }}
          pagination={{ current: filters.page, pageSize: filters.limit, total: data?.total ?? 0, showSizeChanger: true,
            pageSizeOptions: [20, 50, 100, 200], showTotal: (t) => `${t} vị trí tuyển`,
            onChange: (page, limit) => setFilters(f => ({ ...f, page, limit })) }}
        />
      </div>

      <CenteredModal title={editing ? 'Sửa vị trí' : 'Tạo vị trí tuyển dụng'} open={drawerOpen} width={480}
        onClose={() => setDrawer(false)}
        extra={<Button type="primary" loading={isPending} disabled={isPending} onClick={handleSave}
          style={{ background: preset.primary, borderColor: preset.primary }}>{editing ? 'Cập nhật' : 'Tạo'}</Button>}>
        <Form form={form} layout="vertical">
          {!editing && (
            <Form.Item name="code" label="Mã vị trí" rules={[{ required: true }]}><Input placeholder="JOB-2026-001" /></Form.Item>
          )}
          <Form.Item name="title" label="Tên vị trí" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="orgUnitId" label="Bộ phận" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label"
              options={(orgUnits as { id: string; name: string }[]).map(o => ({ value: o.id, label: o.name }))} />
          </Form.Item>
          <Space.Compact style={{ width: '100%' }}>
            <Form.Item name="level" label="Level" style={{ flex: 1, marginBottom: 0 }}>
              <Select options={LEVEL_OPTIONS} />
            </Form.Item>
            <Form.Item name="headcount" label="Số lượng" style={{ width: 100, marginBottom: 0 }}>
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
          </Space.Compact>
          <Form.Item name="requirements" label="Yêu cầu" style={{ marginTop: 16 }}>
            <TextArea rows={3} />
          </Form.Item>
          <Space.Compact style={{ width: '100%' }}>
            <Form.Item name="salaryFrom" label="Lương từ (VND)" style={{ flex: 1, marginBottom: 0 }}>
              <InputNumber style={{ width: '100%' }} formatter={v => v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''} />
            </Form.Item>
            <Form.Item name="salaryTo" label="đến" style={{ flex: 1, marginBottom: 0 }}>
              <InputNumber style={{ width: '100%' }} formatter={v => v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''} />
            </Form.Item>
          </Space.Compact>
        </Form>
      </CenteredModal>
    </div>
  );
}
