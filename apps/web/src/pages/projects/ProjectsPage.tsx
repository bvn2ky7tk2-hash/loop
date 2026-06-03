import { useState, useRef, useMemo, useEffect } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { CustomerSelect } from '../../components/selects';

const PROJECT_COL_DEFS = [
  { key: 'code',        label: 'Mã' },
  { key: 'name',        label: 'Tên dự án' },
  { key: 'type',        label: 'Loại' },
  { key: 'pm',          label: 'PM' },
  { key: 'status',      label: 'Trạng thái' },
  { key: 'memberCount', label: 'Thành viên' },
  { key: 'budgetCost',  label: 'Ngân sách' },
  { key: 'progress',    label: 'Tiến độ' },
  { key: 'endDate',     label: 'Kết thúc' },
];

const PROJECT_STATUS_OPTIONS = [
  { value: 'PLANNING', label: 'Lên kế hoạch' },
  { value: 'ACTIVE',   label: 'Đang hoạt động' },
  { value: 'ON_HOLD',  label: 'Tạm dừng' },
  { value: 'CLOSED',   label: 'Đã đóng' },
];
import {
  Table, Button, Modal, Form, Input, Select, DatePicker,
  Progress, Space, Tabs, InputNumber, App, Alert, Popconfirm, Tooltip,
  Descriptions, theme, Typography,
} from 'antd';
import { useThemePalette } from '../../hooks/useThemePalette';
import { TaskStatusPill } from '../../components/ui/TaskStatusPill';
import type { ProjectStatus } from '../../components/ui/TaskStatusPill';
import { PlusOutlined, DeleteOutlined, EditOutlined, SearchOutlined } from '@ant-design/icons';
import { useColumnVisibility } from '../../hooks/useColumnVisibility';
import { usePagination } from '../../hooks/usePagination';
import { ColumnToggle } from '../../components/ColumnToggle';
import { FilterBar } from '../../components/FilterBar';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi, type Project, type Allocation } from '../../api/projects';
import { employeesApi } from '../../api/employees';
import { usersApi } from '../../api/users';
import { orgUnitsApi } from '../../api/org-units';
import dayjs from 'dayjs';
import { formatNumber } from '../../utils/format';
import AllocationConflictModal, { type ConflictDay } from '../../components/AllocationConflictModal';
import { EmployeeInfoCell } from '../../components/ui/EmployeeInfoCell';

function flattenOrgUnits(nodes: { id: string; name: string; code: string; children?: { id: string; name: string; code: string; children?: unknown[] }[] }[], prefix = ''): { value: string; label: string }[] {
  return nodes.flatMap((n) => [
    { value: n.id, label: prefix + n.name },
    ...flattenOrgUnits((n.children ?? []) as typeof nodes, prefix + '  '),
  ]);
}


const { Text } = Typography;

export default function ProjectsPage() {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const { textPrimary, textMuted } = useThemePalette();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState('');
  const [selected, setSelected] = useState<Project | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [memberOpen, setMemberOpen] = useState(false);
  const [conflictDays, setConflictDays] = useState<ConflictDay[] | null>(null);
  const pendingMemberData = useRef<(Partial<Allocation> & { employeeId: string }) | null>(null);
  const [editMemberOpen, setEditMemberOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Allocation | null>(null);
  const [editMemberConflictDays, setEditMemberConflictDays] = useState<ConflictDay[] | null>(null);
  const pendingEditMemberData = useRef<Partial<Allocation> | null>(null);
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [memberForm] = Form.useForm();
  const [editMemberForm] = Form.useForm();

  // Filters
  const [searchText, setSearchText]     = useState('');
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterType, setFilterType]     = useState<string | null>(null);
  const { resetPage, paginationProps } = usePagination(50);

  useEffect(() => { resetPage(); }, [searchText, filterStatus, filterType, resetPage]);

  const { isVisible, toggle, reset: resetCols } = useColumnVisibility('projects', PROJECT_COL_DEFS);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.list,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['project-members', selected?.id],
    queryFn: () => projectsApi.getMembers(selected!.id),
    enabled: !!selected,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeesApi.list(),
    enabled: memberOpen,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.list,
    enabled: createOpen || editOpen,
  });

  const { data: orgTree = [] } = useQuery({
    queryKey: ['org-units'],
    queryFn: orgUnitsApi.getTree,
    enabled: createOpen || editOpen,
  });

  const orgOptions = flattenOrgUnits(orgTree);

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (searchText && !p.name.toLowerCase().includes(searchText.toLowerCase()) &&
          !p.code.toLowerCase().includes(searchText.toLowerCase())) return false;
      if (filterStatus.length > 0 && !filterStatus.includes(p.status)) return false;
      if (filterType && p.type !== filterType) return false;
      return true;
    });
  }, [projects, searchText, filterStatus, filterType]);

  const createMutation = useMutation({
    mutationFn: projectsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      setCreateOpen(false);
      setCreateError('');
      createForm.resetFields();
      message.success('Tạo dự án thành công');
    },
    onError: (e: unknown) => {
      const data = (e as { response?: { data?: { message?: string; errors?: { validation?: string[] } } } })?.response?.data;
      const details = data?.errors?.validation;
      if (details && details.length > 0) {
        setCreateError(details.join('\n'));
      } else {
        setCreateError(data?.message ?? 'Lỗi không xác định');
      }
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Project> }) =>
      projectsApi.updateProject(id, data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      setSelected(updated as Project);
      setEditOpen(false);
      message.success('Đã cập nhật dự án');
    },
    onError: () => message.error('Cập nhật thất bại'),
  });

  const addMemberMutation = useMutation({
    mutationFn: (data: Partial<Allocation> & { employeeId: string }) =>
      projectsApi.addMember(selected!.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-members', selected?.id] });
      setMemberOpen(false);
      memberForm.resetFields();
      pendingMemberData.current = null;
      setConflictDays(null);
      message.success('Đã thêm thành viên');
    },
    onError: (e: unknown) => {
      const res = (e as { response?: { data?: { statusCode?: number; data?: { conflicts?: ConflictDay[] } } } })?.response?.data;
      if (res?.statusCode === 409 && res?.data?.conflicts?.length) {
        setConflictDays(res.data.conflicts);
      } else {
        message.error('Thêm thành viên thất bại');
      }
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) => projectsApi.removeMember(selected!.id, memberId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-members', selected?.id] });
      message.success('Đã xoá thành viên');
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: (data: Partial<Allocation> & { forceOverride?: boolean }) =>
      projectsApi.updateMember(selected!.id, editingMember!.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-members', selected?.id] });
      setEditMemberOpen(false);
      setEditingMember(null);
      editMemberForm.resetFields();
      pendingEditMemberData.current = null;
      setEditMemberConflictDays(null);
      message.success('Đã cập nhật phân bổ');
    },
    onError: (e: unknown) => {
      const res = (e as { response?: { data?: { statusCode?: number; data?: { conflicts?: ConflictDay[] } } } })?.response?.data;
      if (res?.statusCode === 409 && res?.data?.conflicts?.length) {
        setEditMemberConflictDays(res.data.conflicts);
      } else {
        message.error('Cập nhật thất bại');
      }
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      projectsApi.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: projectsApi.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      message.success('Đã xoá dự án');
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      message.error(msg ?? 'Xoá thất bại');
    },
  });

  const allColumns = [
    { key: 'code',     title: 'Mã', dataIndex: 'code', width: 90 },
    { key: 'name',     title: 'Tên dự án', dataIndex: 'name', render: (v: string, r: Project) => (
      <span onClick={() => setSelected(r)} style={{ fontWeight: 600, color: token.colorText, cursor: 'pointer' }}>{v}</span>
    )},
    { key: 'type',     title: 'Loại', dataIndex: 'type', width: 70 },
    {
      key: 'pm', title: 'PM', width: 150,
      render: (_: unknown, r: Project) => r.pm?.name
        ? <Text style={{ color: textPrimary }}>{r.pm.name}</Text>
        : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      key: 'status',
      title: 'Trạng thái', dataIndex: 'status', width: 200,
      render: (v: string, r: Project) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <TaskStatusPill status={v as ProjectStatus} size="sm" />
          <Select
            value={v}
            size="small"
            variant="borderless"
            style={{ width: 110, fontSize: 12 }}
            onChange={(val) => updateStatusMutation.mutate({ id: r.id, status: val })}
            options={PROJECT_STATUS_OPTIONS}
          />
        </div>
      ),
    },
    {
      key: 'memberCount', title: 'Thành viên', width: 100,
      render: (_: unknown, r: Project) => r._count !== undefined
        ? <span style={{ fontWeight: 500 }}>{r._count.members} TV</span>
        : '—',
    },
    {
      key: 'budgetCost', title: 'Ngân sách', width: 130,
      render: (_: unknown, r: Project) => r.budgetCost
        ? <span style={{ fontWeight: 500 }}>{formatNumber(r.budgetCost)} {r.currency ?? 'VND'}</span>
        : '—',
    },
    {
      key: 'progress',
      title: 'Tiến độ', dataIndex: 'progress', width: 80,
      render: (v: number) => (
        <span style={{ fontSize: 13, fontWeight: 600, color: Number(v) >= 67 ? '#10B981' : Number(v) >= 33 ? '#F59E0B' : '#EF4444' }}>
          {Number(v)}%
        </span>
      ),
    },
    {
      key: 'endDate',
      title: 'Kết thúc', dataIndex: 'endDate', width: 110,
      render: (v: string) => <Text style={{ color: textMuted }}>{dayjs(v).format('DD/MM/YYYY')}</Text>,
    },
    {
      key: 'actions',
      title: '', width: 70,
      render: (_: unknown, r: Project) => (
        <Space size={4}>
          <Tooltip title="Chi tiết / thành viên">
            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => setSelected(r)} />
          </Tooltip>
          <Popconfirm
            title="Xoá dự án?"
            description="Toàn bộ task, phân bổ và cảnh báo liên quan sẽ bị xoá."
            onConfirm={() => deleteMutation.mutate(r.id)}
            okText="Xoá" cancelText="Huỷ" okButtonProps={{ danger: true }}
          >
            <Tooltip title="Xoá dự án">
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const columns = allColumns.filter((c) => c.key === 'actions' || isVisible(c.key));

  const memberColumns = [
    {
      title: 'Nhân sự',
      key: 'employee',
      render: (_: unknown, r: Allocation) => r.employee
        ? <EmployeeInfoCell employee={r.employee} />
        : <span>—</span>,
    },
    { title: 'Vai trò', dataIndex: 'role' },
    {
      title: 'Cấp độ', dataIndex: 'level', width: 80,
      render: (v: string) => (
        <span style={{ fontSize: 11, background: '#EEF2FF', color: '#4338CA', borderRadius: 4, padding: '2px 6px', fontWeight: 500 }}>
          {v}
        </span>
      ),
    },
    {
      title: 'Phân bổ', dataIndex: 'allocationPct', width: 90,
      render: (v: number) => (
        <span style={{ fontSize: 13, fontWeight: 600, color: Number(v) >= 90 ? '#EF4444' : Number(v) >= 70 ? '#F59E0B' : '#10B981' }}>
          {Number(v)}%
        </span>
      ),
    },
    {
      title: 'Từ', dataIndex: 'startDate', width: 100,
      render: (v: string) => <Text style={{ color: textMuted }}>{dayjs(v).format('DD/MM/YY')}</Text>,
    },
    {
      title: 'Đến', dataIndex: 'endDate', width: 100,
      render: (v: string) => <Text style={{ color: textMuted }}>{dayjs(v).format('DD/MM/YY')}</Text>,
    },
    {
      title: '', key: 'actions', width: 72,
      render: (_: unknown, r: Allocation) => (
        <Space size={4}>
          <Tooltip title="Chỉnh sửa phân bổ">
            <Button
              size="small"
              type="text"
              icon={<EditOutlined />}
              onClick={() => {
                setEditingMember(r);
                editMemberForm.setFieldsValue({
                  role: r.role,
                  allocationPct: Number(r.allocationPct),
                  startDate: dayjs(r.startDate),
                  endDate: dayjs(r.endDate),
                  ratePerDay: r.ratePerDay != null ? Number(r.ratePerDay) : undefined,
                });
                setEditMemberOpen(true);
              }}
            />
          </Tooltip>
          <Popconfirm title="Xoá thành viên?" onConfirm={() => removeMemberMutation.mutate(r.id)} okText="Xoá" cancelText="Huỷ" okButtonProps={{ danger: true }}>
            <Button size="small" danger type="text" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="page-wrapper">
      <PageHeader
        title="Project Management"
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setCreateError(''); setCreateOpen(true); }}>
            Tạo dự án
          </Button>
        }
      />

      <FilterBar right={<ColumnToggle columns={PROJECT_COL_DEFS} isVisible={isVisible} toggle={toggle} reset={resetCols} />}>
        <Input
          prefix={<SearchOutlined style={{ color: '#94A3B8' }} />}
          placeholder="Tìm tên hoặc mã dự án..."
          style={{ width: 220 }}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
        />
        <Select
          mode="multiple"
          placeholder="Trạng thái"
          style={{ minWidth: 160 }}
          value={filterStatus}
          onChange={setFilterStatus}
          options={PROJECT_STATUS_OPTIONS}
          allowClear
          maxTagCount="responsive"
        />
        <Select
          placeholder="Loại"
          style={{ width: 110 }}
          value={filterType}
          onChange={setFilterType}
          options={[{ value: 'OSDC', label: 'OSDC' }, { value: 'PKG', label: 'PKG' }]}
          allowClear
        />
      </FilterBar>

      <Table
        dataSource={filteredProjects}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        size="middle"
        locale={{ emptyText: 'Không có dự án phù hợp' }}
        pagination={paginationProps(filteredProjects.length, 'dự án')}
      />

      <Modal
        title="Tạo dự án mới"
        open={createOpen}
        onCancel={() => { setCreateOpen(false); setCreateError(''); }}
        onOk={() => createForm.submit()}
        confirmLoading={createMutation.isPending}
        width={600}
      >
        {createError && (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 12 }}
            message="Dữ liệu không hợp lệ"
            description={
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {createError.split('\n').map((line, i) => <li key={i}>{line}</li>)}
              </ul>
            }
          />
        )}
        <Form form={createForm} layout="vertical" onFinish={(v) => createMutation.mutate({
          ...v,
          startDate: v.startDate?.format('YYYY-MM-DD'),
          endDate: v.endDate?.format('YYYY-MM-DD'),
        })}>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item name="code" label="Mã dự án" rules={[{ required: true, message: 'Nhập mã' }]} style={{ flex: 1 }}>
              <Input placeholder="PRJ001" />
            </Form.Item>
            <Form.Item name="type" label="Loại" rules={[{ required: true, message: 'Chọn loại' }]} style={{ flex: 1 }}>
              <Select options={[{ value: 'OSDC', label: 'OSDC' }, { value: 'PKG', label: 'PKG' }]} />
            </Form.Item>
          </Space>
          <Form.Item name="name" label="Tên dự án" rules={[{ required: true, message: 'Nhập tên' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="orgUnitId" label="Phòng ban" rules={[{ required: true, message: 'Chọn phòng ban' }]}>
            <Select
              showSearch
              placeholder="Chọn phòng ban..."
              filterOption={(input, opt) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())}
              options={orgOptions}
            />
          </Form.Item>
          <Form.Item name="pmId" label="Project Manager" rules={[{ required: true, message: 'Chọn PM' }]}>
            <Select
              showSearch
              placeholder="Chọn PM..."
              filterOption={(input, opt) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())}
              options={users.map((u) => ({ value: u.id, label: `${u.name} (${u.email})` }))}
            />
          </Form.Item>
          <Form.Item name="customerId" label="Khách hàng">
            <CustomerSelect allowClear />
          </Form.Item>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item name="startDate" label="Bắt đầu" rules={[{ required: true, message: 'Chọn ngày' }]} style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
            <Form.Item name="endDate" label="Kết thúc" rules={[{ required: true, message: 'Chọn ngày' }]} style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          </Space>
          <Form.Item name="budgetEffortMm" label="Budget (person-month)">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`Chi tiết: ${selected?.name ?? ''}`}
        open={!!selected}
        onCancel={() => setSelected(null)}
        footer={null}
        width={860}
      >
        {selected && (
          <Tabs
            items={[
              {
                key: 'info',
                label: 'Thông tin',
                children: (
                  <>
                    <div style={{ marginBottom: 12, textAlign: 'right' }}>
                      <Button
                        icon={<EditOutlined />}
                        onClick={() => {
                          editForm.setFieldsValue({
                            name: selected.name,
                            type: selected.type,
                            customerId: (selected as Project & { customerId?: string }).customerId,
                            pmId: selected.pmId,
                            startDate: selected.startDate ? dayjs(selected.startDate) : null,
                            endDate: selected.endDate ? dayjs(selected.endDate) : null,
                            budgetEffortMm: selected.budgetEffortMm,
                          });
                          setEditOpen(true);
                        }}
                      >
                        Chỉnh sửa thông tin
                      </Button>
                    </div>
                    <Descriptions column={2} bordered size="small">
                      <Descriptions.Item label="Mã dự án">{selected.code}</Descriptions.Item>
                      <Descriptions.Item label="Loại">
                        <span style={{ fontSize: 12, background: token.colorFillSecondary, color: token.colorTextSecondary, borderRadius: 4, padding: '2px 8px', fontWeight: 500 }}>
                          {selected.type}
                        </span>
                      </Descriptions.Item>
                      <Descriptions.Item label="Tên dự án" span={2}>{selected.name}</Descriptions.Item>
                      <Descriptions.Item label="Khách hàng">{selected.customer ?? '—'}</Descriptions.Item>
                      <Descriptions.Item label="Tiến độ">
                        <Progress percent={Number(selected.progress)} size="small" style={{ minWidth: 120 }} />
                      </Descriptions.Item>
                      <Descriptions.Item label="Ngày bắt đầu">
                        {selected.startDate ? dayjs(selected.startDate).format('DD/MM/YYYY') : '—'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Ngày kết thúc">
                        {selected.endDate ? dayjs(selected.endDate).format('DD/MM/YYYY') : '—'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Budget (MM)">{selected.budgetEffortMm ?? '—'}</Descriptions.Item>
                    </Descriptions>
                  </>
                ),
              },
              {
                key: 'members',
                label: 'Thành viên',
                children: (
                  <>
                    <div style={{ marginBottom: 12, textAlign: 'right' }}>
                      <Button icon={<PlusOutlined />} onClick={() => setMemberOpen(true)}>
                        Thêm thành viên
                      </Button>
                    </div>
                    <Table dataSource={members} columns={memberColumns} rowKey="id" size="small" />
                  </>
                ),
              },
            ]}
          />
        )}
      </Modal>

      {/* Modal chỉnh sửa thông tin dự án */}
      <Modal
        title={`Sửa dự án: ${selected?.code ?? ''}`}
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={() => editForm.submit()}
        confirmLoading={updateProjectMutation.isPending}
        width={600}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={(v) => updateProjectMutation.mutate({
            id: selected!.id,
            data: {
              ...v,
              startDate: v.startDate?.format('YYYY-MM-DD'),
              endDate: v.endDate?.format('YYYY-MM-DD'),
            },
          })}
        >
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item name="type" label="Loại dự án" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Select options={[{ value: 'OSDC', label: 'OSDC' }, { value: 'PKG', label: 'PKG' }]} />
            </Form.Item>
            <Form.Item name="customerId" label="Khách hàng" style={{ flex: 1 }}>
              <CustomerSelect allowClear />
            </Form.Item>
          </Space>
          <Form.Item name="name" label="Tên dự án" rules={[{ required: true, message: 'Nhập tên' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="pmId" label="Project Manager" rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="Chọn PM..."
              filterOption={(input, opt) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())}
              options={users.map((u) => ({ value: u.id, label: `${u.name} (${u.email})` }))}
            />
          </Form.Item>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item name="startDate" label="Ngày bắt đầu" rules={[{ required: true }]} style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
            <Form.Item name="endDate" label="Ngày kết thúc" rules={[{ required: true }]} style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          </Space>
          <Form.Item name="budgetEffortMm" label="Budget (person-month)">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Thêm thành viên dự án"
        open={memberOpen}
        onCancel={() => setMemberOpen(false)}
        onOk={() => memberForm.submit()}
        confirmLoading={addMemberMutation.isPending}
      >
        <Form
          form={memberForm}
          layout="vertical"
          onFinish={(v) => {
            const data = {
              ...v,
              startDate: v.startDate?.format('YYYY-MM-DD'),
              endDate: v.endDate?.format('YYYY-MM-DD'),
            };
            pendingMemberData.current = data;
            addMemberMutation.mutate(data);
          }}
        >
          <Form.Item name="employeeId" label="Nhân sự" rules={[{ required: true }]}>
            <Select
              showSearch
              filterOption={(input, option) =>
                (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
              }
              options={employees.map((e) => ({ value: e.id, label: `${e.code} - ${e.fullName}` }))}
            />
          </Form.Item>
          <Form.Item name="role" label="Vai trò">
            <Input placeholder="MEMBER" />
          </Form.Item>
          <Form.Item name="allocationPct" label="Phân bổ (%)" rules={[{ required: true }]}>
            <InputNumber min={1} max={100} style={{ width: '100%' }} />
          </Form.Item>
          <Space>
            <Form.Item name="startDate" label="Từ ngày" rules={[{ required: true }]}>
              <DatePicker />
            </Form.Item>
            <Form.Item name="endDate" label="Đến ngày" rules={[{ required: true }]}>
              <DatePicker />
            </Form.Item>
          </Space>
          <Form.Item name="ratePerDay" label="Đơn giá / ngày">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      <AllocationConflictModal
        open={!!conflictDays}
        conflicts={conflictDays ?? []}
        onAdjust={() => setConflictDays(null)}
        onForceOverride={() => {
          if (pendingMemberData.current) {
            addMemberMutation.mutate({ ...pendingMemberData.current, forceOverride: true } as Partial<Allocation> & { employeeId: string });
          }
          setConflictDays(null);
        }}
        onCancel={() => {
          setConflictDays(null);
          pendingMemberData.current = null;
        }}
      />

      <Modal
        title={`Chỉnh sửa phân bổ: ${editingMember?.employee?.fullName ?? ''}`}
        open={editMemberOpen}
        onCancel={() => { setEditMemberOpen(false); setEditingMember(null); editMemberForm.resetFields(); }}
        onOk={() => editMemberForm.submit()}
        confirmLoading={updateMemberMutation.isPending}
      >
        <Form
          form={editMemberForm}
          layout="vertical"
          onFinish={(v) => {
            const data = {
              ...v,
              startDate: v.startDate?.format('YYYY-MM-DD'),
              endDate: v.endDate?.format('YYYY-MM-DD'),
            };
            pendingEditMemberData.current = data as Partial<Allocation>;
            updateMemberMutation.mutate(data);
          }}
        >
          <Form.Item name="role" label="Vai trò">
            <Input placeholder="MEMBER" />
          </Form.Item>
          <Form.Item name="allocationPct" label="Phân bổ (%)" rules={[{ required: true }]}>
            <InputNumber min={1} max={100} style={{ width: '100%' }} />
          </Form.Item>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item name="startDate" label="Từ ngày" rules={[{ required: true }]} style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
            <Form.Item name="endDate" label="Đến ngày" rules={[{ required: true }]} style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          </Space>
          <Form.Item name="ratePerDay" label="Đơn giá / ngày">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      <AllocationConflictModal
        open={!!editMemberConflictDays}
        conflicts={editMemberConflictDays ?? []}
        onAdjust={() => setEditMemberConflictDays(null)}
        onForceOverride={() => {
          if (pendingEditMemberData.current) {
            updateMemberMutation.mutate({ ...pendingEditMemberData.current, forceOverride: true });
          }
          setEditMemberConflictDays(null);
        }}
        onCancel={() => {
          setEditMemberConflictDays(null);
          pendingEditMemberData.current = null;
        }}
      />
    </div>
  );
}
