import { useState } from 'react';
import {
  Table, Button, Space, Typography, Select, Tag, Form,
  Input, InputNumber, Modal, message,
} from 'antd';
import { CenteredModal } from '../../components/ui/CenteredModal';
import { PlusOutlined, EditOutlined, DeleteOutlined, SolutionOutlined, StopOutlined, TeamOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useQuery } from '@tanstack/react-query';
import { useThemePalette } from '../../hooks/useThemePalette';
import { confirmDelete } from '../../components/ui/confirmDelete';
import { orgUnitsApi } from '../../api/org-units';
import {
  useGetJobs, useCreateJob, useUpdateJob, useCloseJob, useDeleteJob,
  type JobOpening, type JobFilterParams, type JobStatus, type EmployeeLevel,
} from '../../api/recruit';

const { Title, Text } = Typography;
const { TextArea } = Input;

const STATUS_META: Record<JobStatus, { label: string; color: string }> = {
  OPEN:    { label: 'Đang mở',   color: 'green' },
  ON_HOLD: { label: 'Tạm dừng', color: 'orange' },
  CLOSED:  { label: 'Đã đóng',  color: 'default' },
};

const LEVEL_META: Record<EmployeeLevel, { label: string; color: string }> = {
  JUNIOR: { label: 'Junior', color: 'blue' },
  MID:    { label: 'Mid',    color: 'cyan' },
  SENIOR: { label: 'Senior', color: 'purple' },
  EXPERT: { label: 'Expert', color: 'red' },
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
  const { isDark, bgContainer, bgCard, borderColor, textPrimary, textMuted, linkColor, preset } = useThemePalette();

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
    { title: 'Level', dataIndex: 'level', width: 90,  render: (v: EmployeeLevel) => <Tag color={LEVEL_META[v].color}>{LEVEL_META[v].label}</Tag> },
    { title: 'HC',    dataIndex: 'headcount', width: 60, align: 'center', render: (v: number) => <Text style={{ color: textPrimary }}>{v}</Text> },
    { title: 'Lương', key: 'salary', width: 140, render: (_: unknown, r: JobOpening) => <Text style={{ color: textMuted }}>{fmtSalary(r.salaryFrom, r.salaryTo)}</Text> },
    { title: 'Ứng viên', key: 'cnt', width: 90, align: 'center', render: (_: unknown, r: JobOpening) => <Tag color="blue">{r._count?.candidates ?? 0}</Tag> },
    { title: 'Trạng thái', dataIndex: 'status', width: 120, render: (s: JobStatus) => <Tag color={STATUS_META[s].color}>{STATUS_META[s].label}</Tag> },
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

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SolutionOutlined style={{ color: '#0EA5E9', fontSize: 20 }} />
          <Title level={4} style={{ margin: 0, color: textPrimary }}>Job Openings</Title>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}
          style={{ background: preset.primary, borderColor: preset.primary }}>
          Tạo vị trí
        </Button>
      </div>

      <div style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Select placeholder="Trạng thái" style={{ width: 140 }} allowClear options={STATUS_OPTIONS}
          onChange={v => setFilters(f => ({ ...f, status: v, page: 1 }))} />
        <Select placeholder="Level" style={{ width: 120 }} allowClear options={LEVEL_OPTIONS}
          onChange={v => setFilters(f => ({ ...f, level: v, page: 1 }))} />
        <Select placeholder="Bộ phận" style={{ width: 200 }} allowClear showSearch optionFilterProp="label"
          options={(orgUnits as { id: string; name: string }[]).map(o => ({ value: o.id, label: o.name }))}
          onChange={v => setFilters(f => ({ ...f, orgUnitId: v, page: 1 }))} />
      </div>

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
