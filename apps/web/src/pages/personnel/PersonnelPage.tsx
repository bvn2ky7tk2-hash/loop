import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table, Button, Modal, Form, Input, Select, Space,
  Typography, Descriptions, Timeline, InputNumber,
  DatePicker, App, Alert, Tooltip, Tabs, Divider,
  Tree, Tag, Popconfirm, Spin, Popover, theme,
} from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { downloadExport } from '../../utils/exportApi';
import { CenteredModal } from '../../components/ui/CenteredModal';
import { EmployeeInfoCell } from '../../components/ui/EmployeeInfoCell';
import type { TreeDataNode } from 'antd';
import {
  PlusOutlined, EditOutlined, SearchOutlined,
  DeleteOutlined, ApartmentOutlined, TeamOutlined,
  BankOutlined, UserOutlined, MenuFoldOutlined, MenuUnfoldOutlined,
  PlayCircleOutlined, IdcardOutlined, InfoCircleOutlined, CrownOutlined,
} from '@ant-design/icons';
import { useColumnVisibility } from '../../hooks/useColumnVisibility';
import { ColumnToggle } from '../../components/ColumnToggle';
import { FilterBar } from '../../components/FilterBar';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeesApi, type Employee } from '../../api/employees';
import { orgUnitsApi, type OrgUnitTree } from '../../api/org-units';
import { payrollApi, type EmployeeTaxProfile, type Dependent } from '../../api/payroll';
import { jobTitlesApi, positionsApi } from '../../api/hr-core';
import { OrgUnitSelect, ProvinceWardSelect } from '../../components/selects';
import { apiClient } from '../../api/client';
import dayjs from 'dayjs';
import { formatNumber } from '../../utils/format';
import { useThemePalette } from '../../hooks/useThemePalette';

const { Title, Text } = Typography;

const LEVELS = ['JUNIOR', 'MID', 'SENIOR', 'EXPERT'];

// Semantic hue only — bg is derived as 12% alpha so it adapts to dark mode
const LEVEL_HUE: Record<string, string> = {
  JUNIOR: '#52C41A',
  MID:    '#6366F1',
  SENIOR: '#FA8C16',
  EXPERT: '#8B5CF6',
};

const ORG_LEVEL_HUE   = ['#8B5CF6', '#3B82F6', '#16A34A', '#EA580C'];
const ORG_LEVEL_ICONS = [BankOutlined, ApartmentOutlined, TeamOutlined, UserOutlined];

const PERSONNEL_COL_DEFS = [
  { key: 'code',      label: 'Mã' },
  { key: 'fullName',  label: 'Họ tên' },
  { key: 'orgUnit',   label: 'Phòng ban' },
  { key: 'jobTitle',  label: 'Chức danh' },
  { key: 'position',  label: 'Vị trí' },
  { key: 'level',     label: 'Cấp độ' },
  { key: 'techStack', label: 'Tech Stack' },
  { key: 'startDate', label: 'Ngày vào làm' },
  { key: 'projects',  label: 'Dự án' },
];

// ── Pure helpers ──────────────────────────────────────────────────────────────

function filterOrgTree(nodes: OrgUnitTree[], search: string): OrgUnitTree[] {
  if (!search.trim()) return nodes;
  const q = search.toLowerCase();
  function filter(list: OrgUnitTree[]): OrgUnitTree[] {
    return list.reduce<OrgUnitTree[]>((acc, n) => {
      const kids = filter(n.children ?? []);
      const hit  = n.name.toLowerCase().includes(q) || n.code.toLowerCase().includes(q);
      if (hit || kids.length) acc.push({ ...n, children: kids });
      return acc;
    }, []);
  }
  return filter(nodes);
}

function getAllIds(nodes: OrgUnitTree[]): string[] {
  return nodes.flatMap((n) => [n.id, ...getAllIds(n.children)]);
}

function getSubtreeIds(nodes: OrgUnitTree[], targetId: string): string[] {
  for (const n of nodes) {
    if (n.id === targetId) return getAllIds([n]);
    const found = getSubtreeIds(n.children, targetId);
    if (found.length) return found;
  }
  return [];
}

function flattenOrgUnits(nodes: OrgUnitTree[], prefix = ''): { value: string; label: string }[] {
  return nodes.flatMap((n) => [
    { value: n.id, label: prefix + n.name },
    ...flattenOrgUnits(n.children ?? [], prefix + '  '),
  ]);
}

function countOrgs(nodes: OrgUnitTree[]): number {
  return nodes.reduce((s, n) => s + 1 + countOrgs(n.children), 0);
}

function ProjectsCell({ employee }: { employee: Employee }) {
  const [open, setOpen] = useState(false);
  const { token } = theme.useToken();
  const today = dayjs().format('YYYY-MM-DD');

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['employee-projects-popover', employee.id],
    queryFn: () => employeesApi.getProjectHistory(employee.id),
    enabled: open,
    staleTime: 60_000,
  });

  const activeProjects = history.filter(
    (h: { endDate?: string | null }) => !h.endDate || h.endDate >= today,
  );

  const n = employee.activeProjectCount ?? 0;
  if (n === 0) return <span style={{ fontSize: 12, color: token.colorTextTertiary }}>—</span>;

  const color = n >= 3 ? '#EF4444' : n >= 2 ? '#F59E0B' : '#10B981';

  const content = isLoading ? (
    <div style={{ padding: '4px 8px' }}><Spin size="small" /></div>
  ) : (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxWidth: 240 }}>
      {activeProjects.map((h: { id: string; project: { code: string; name: string } }) => (
        <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontSize: 10, fontWeight: 600, borderRadius: 4, padding: '1px 5px',
            background: token.colorFillSecondary, color: token.colorTextSecondary,
          }}>{h.project.code}</span>
          <span style={{ fontSize: 12, color: token.colorText }}>{h.project.name}</span>
        </div>
      ))}
    </div>
  );

  return (
    <Popover
      open={open} onOpenChange={setOpen}
      content={content} title="Dự án đang tham gia"
      trigger="hover" placement="left"
    >
      <span style={{ fontSize: 12, fontWeight: 600, color, cursor: 'default' }}>
        {n} dự án
      </span>
    </Popover>
  );
}

// ── TaxProfileTab ─────────────────────────────────────────────────────────────

function TaxProfileTab({ employeeId }: { employeeId: string }) {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const { token } = theme.useToken();
  const [taxForm] = Form.useForm();
  const [depForm] = Form.useForm();
  const [depOpen, setDepOpen] = useState(false);
  const [terminateTarget, setTerminateTarget] = useState<Dependent | null>(null);
  const [terminateDate, setTerminateDate] = useState<dayjs.Dayjs | null>(null);
  const [terminateOpen, setTerminateOpen] = useState(false);

  const { data: taxProfile, isLoading } = useQuery({
    queryKey: ['tax-profile', employeeId],
    queryFn: () => payrollApi.getEmployeeTaxProfile(employeeId),
  });

  const { data: dependents = [], isLoading: depLoading } = useQuery({
    queryKey: ['dependents', employeeId],
    queryFn: () => payrollApi.listDependents(employeeId),
  });

  const upsertMutation = useMutation({
    mutationFn: (data: Parameters<typeof payrollApi.upsertEmployeeTaxProfile>[1]) =>
      payrollApi.upsertEmployeeTaxProfile(employeeId, data),
    onSuccess: () => {
      message.success('Đã lưu thông tin thuế');
      void qc.invalidateQueries({ queryKey: ['tax-profile', employeeId] });
    },
    onError: () => message.error('Lưu thất bại'),
  });

  const addDepMutation = useMutation({
    mutationFn: (data: Parameters<typeof payrollApi.addDependent>[1]) =>
      payrollApi.addDependent(employeeId, data),
    onSuccess: () => {
      message.success('Đã thêm người phụ thuộc');
      setDepOpen(false);
      depForm.resetFields();
      void qc.invalidateQueries({ queryKey: ['dependents', employeeId] });
      void qc.invalidateQueries({ queryKey: ['tax-profile', employeeId] });
    },
    onError: () => message.error('Thêm thất bại'),
  });

  const terminateMutation = useMutation({
    mutationFn: ({ id, date }: { id: string; date: string }) =>
      payrollApi.terminateDependent(employeeId, id, { registeredTo: date }),
    onSuccess: () => {
      message.success('Đã kết thúc giảm trừ');
      setTerminateOpen(false);
      void qc.invalidateQueries({ queryKey: ['dependents', employeeId] });
    },
    onError: () => message.error('Thao tác thất bại'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => payrollApi.deleteDependent(employeeId, id),
    onSuccess: () => {
      message.success('Đã xóa người phụ thuộc');
      void qc.invalidateQueries({ queryKey: ['dependents', employeeId] });
      void qc.invalidateQueries({ queryKey: ['tax-profile', employeeId] });
    },
    onError: () => message.error('Xóa thất bại'),
  });

  if (isLoading) return <Spin style={{ display: 'block', marginTop: 24 }} />;

  const initialValues = taxProfile
    ? { taxId: taxProfile.taxId ?? '', residencyStatus: taxProfile.residencyStatus, wageZone: taxProfile.wageZone }
    : { residencyStatus: 'RESIDENT', wageZone: 1 };

  const depCols = [
    { title: 'Họ tên', dataIndex: 'name', key: 'name' },
    { title: 'Quan hệ', dataIndex: 'relationship', key: 'relationship' },
    { title: 'MST người phụ thuộc', dataIndex: 'taxId', key: 'taxId', render: (v?: string) => v ?? '—' },
    {
      title: 'Từ ngày',
      dataIndex: 'registeredFrom',
      key: 'registeredFrom',
      render: (v: string) => <Text style={{ color: textMuted }}>{dayjs(v).format('DD/MM/YYYY')}</Text>,
    },
    {
      title: 'Đến ngày',
      dataIndex: 'registeredTo',
      key: 'registeredTo',
      render: (v?: string) => v
        ? <Text style={{ color: textMuted }}>{dayjs(v).format('DD/MM/YYYY')}</Text>
        : <Tag color="green">Đang tính</Tag>,
    },
    {
      title: '',
      key: 'actions',
      width: 100,
      render: (_: unknown, dep: Dependent) => (
        <Space>
          {!dep.registeredTo && (
            <Button
              size="small" type="link"
              onClick={() => { setTerminateTarget(dep); setTerminateOpen(true); }}
            >
              Kết thúc
            </Button>
          )}
          <Popconfirm
            title="Xóa người phụ thuộc?"
            onConfirm={() => deleteMutation.mutate(dep.id)}
            okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}
          >
            <Button size="small" type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const activeCount = dependents.filter((d) => !d.registeredTo || dayjs(d.registeredTo).isAfter(dayjs())).length;

  return (
    <div style={{ paddingTop: 8 }}>
      {/* ── Tax Profile Form ── */}
      <div style={{
        background: token.colorFillAlter, borderRadius: 8,
        padding: '16px 20px', marginBottom: 20,
        border: `1px solid ${token.colorBorderSecondary}`,
      }}>
        <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 13 }}>
          Thông tin thuế & bảo hiểm
        </div>
        <Form
          form={taxForm}
          layout="inline"
          initialValues={initialValues}
          onFinish={(v) => upsertMutation.mutate(v)}
          style={{ flexWrap: 'wrap', gap: 8 }}
        >
          <Form.Item name="taxId" label="MST cá nhân">
            <Input placeholder="0123456789" style={{ width: 160 }} />
          </Form.Item>
          <Form.Item name="residencyStatus" label="Tình trạng cư trú" rules={[{ required: true }]}>
            <Select style={{ width: 160 }} options={[
              { value: 'RESIDENT',     label: 'Cư trú' },
              { value: 'NON_RESIDENT', label: 'Không cư trú' },
            ]} />
          </Form.Item>
          <Form.Item name="wageZone" label="Vùng lương" rules={[{ required: true }]}>
            <Select style={{ width: 120 }} options={[
              { value: 1, label: 'Vùng 1' },
              { value: 2, label: 'Vùng 2' },
              { value: 3, label: 'Vùng 3' },
              { value: 4, label: 'Vùng 4' },
            ]} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={upsertMutation.isPending} disabled={upsertMutation.isPending}>
              Lưu
            </Button>
          </Form.Item>
        </Form>
      </div>

      {/* ── Dependents ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>
          Người phụ thuộc
          {activeCount > 0 && (
            <Tag color="blue" style={{ marginLeft: 8 }}>{activeCount} đang tính giảm trừ</Tag>
          )}
        </span>
        <Button icon={<PlusOutlined />} size="small" onClick={() => setDepOpen(true)}>
          Thêm NPT
        </Button>
      </div>

      <Table
        dataSource={dependents}
        columns={depCols}
        rowKey="id"
        size="small"
        loading={depLoading}
        pagination={false}
        locale={{ emptyText: 'Chưa có người phụ thuộc' }}
      />

      {/* ── Add Dependent Modal ── */}
      <Modal
        title="Thêm người phụ thuộc"
        open={depOpen}
        onCancel={() => { setDepOpen(false); depForm.resetFields(); }}
        onOk={() => depForm.submit()}
        confirmLoading={addDepMutation.isPending}
        width={480}
      >
        <Form
          form={depForm}
          layout="vertical"
          onFinish={(v) => addDepMutation.mutate({
            ...v,
            registeredFrom: v.registeredFrom.format('YYYY-MM-DD'),
          })}
        >
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item name="name" label="Họ và tên" rules={[{ required: true, message: 'Nhập tên' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="relationship" label="Quan hệ" rules={[{ required: true, message: 'Nhập quan hệ' }]}>
              <Select options={[
                { value: 'Con ruột', label: 'Con ruột' },
                { value: 'Con nuôi', label: 'Con nuôi' },
                { value: 'Vợ/Chồng', label: 'Vợ/Chồng' },
                { value: 'Bố/Mẹ đẻ', label: 'Bố/Mẹ đẻ' },
                { value: 'Bố/Mẹ vợ/chồng', label: 'Bố/Mẹ vợ/chồng' },
              ]} />
            </Form.Item>
          </Space>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item name="taxId" label="MST người phụ thuộc">
              <Input placeholder="Tùy chọn" />
            </Form.Item>
            <Form.Item name="registeredFrom" label="Ngày bắt đầu tính" rules={[{ required: true, message: 'Chọn ngày' }]}>
              <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
            </Form.Item>
          </Space>
        </Form>
      </Modal>

      {/* ── Terminate Modal ── */}
      <Modal
        title={`Kết thúc giảm trừ: ${terminateTarget?.name}`}
        open={terminateOpen}
        onCancel={() => { setTerminateOpen(false); setTerminateDate(null); }}
        onOk={() => {
          if (!terminateTarget || !terminateDate) return;
          terminateMutation.mutate({ id: terminateTarget.id, date: terminateDate.format('YYYY-MM-DD') });
        }}
        confirmLoading={terminateMutation.isPending}
        okText="Xác nhận"
      >
        <p>Chọn ngày kết thúc tính giảm trừ gia cảnh:</p>
        <DatePicker
          format="DD/MM/YYYY"
          value={terminateDate}
          onChange={setTerminateDate}
          style={{ width: '100%' }}
        />
      </Modal>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function PersonnelPage() {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const { token } = theme.useToken();
  const { textPrimary, textMuted } = useThemePalette();
  const navigate = useNavigate();

  // Org state
  const [selectedOrgId, setSelectedOrgId]   = useState<string | null>(null);
  const [orgSearch, setOrgSearch]            = useState('');
  const [hoveredNodeId, setHoveredNodeId]    = useState<string | null>(null);
  const [createOrgOpen, setCreateOrgOpen]    = useState(false);
  const [editOrgTarget, setEditOrgTarget]    = useState<OrgUnitTree | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [panelWidth, setPanelWidth]          = useState(264);
  const [createOrgForm] = Form.useForm();
  const [editOrgForm]   = Form.useForm();

  // Watch headJobTitleId trong edit org form để auto-load lãnh đạo
  const watchEditOrgHeadJobTitle = Form.useWatch('headJobTitleId', editOrgForm);

  const isDragging    = useRef(false);
  const dragStartX    = useRef(0);
  const dragStartWidth = useRef(0);

  // Employee state
  const [createOpen, setCreateOpen]     = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [detailId, setDetailId]         = useState<string | null>(null);
  const [rateOpen, setRateOpen]         = useState(false);
  const [createError, setCreateError]   = useState('');
  const [searchText, setSearchText]     = useState('');
  const [filterLevel, setFilterLevel]   = useState<string[]>([]);
  const [filterFree, setFilterFree]         = useState(false);
  const [filterTechStack, setFilterTechStack] = useState<string[]>([]);
  const [createForm] = Form.useForm();
  const [editForm]   = Form.useForm();
  const [rateForm]   = Form.useForm();

  // Onboarding state
  const [onboardingLoading, setOnboardingLoading] = useState<string | null>(null);

  const { isVisible, toggle, reset: resetCols } = useColumnVisibility('personnel', PERSONNEL_COL_DEFS);

  // ── Queries ──────────────────────────────────────────────────────────────────

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: employeesApi.list,
  });

  const { data: orgTree = [], isLoading: orgLoading } = useQuery({
    queryKey: ['org-units'],
    queryFn: orgUnitsApi.getTree,
  });

  const { data: detail } = useQuery({
    queryKey: ['employee', detailId],
    queryFn: () => employeesApi.get(detailId!),
    enabled: !!detailId,
  });

  const { data: rates = [] } = useQuery({
    queryKey: ['employee-rates', detailId],
    queryFn: () => employeesApi.getRates(detailId!),
    enabled: !!detailId,
  });

  const { data: projectHistory = [] } = useQuery({
    queryKey: ['employee-projects', detailId],
    queryFn: () => employeesApi.getProjectHistory(detailId!),
    enabled: !!detailId,
  });

  // Job titles & positions for edit modal
  const { data: jobTitlesData } = useQuery({
    queryKey: ['job-titles-active'],
    queryFn: () => jobTitlesApi.list({ isActive: true, limit: 200 }),
    staleTime: 5 * 60_000,
  });
  const jobTitleOptions = (jobTitlesData?.data ?? []).map((jt) => ({ value: jt.id, label: jt.name }));

  // Positions của đơn vị đang sửa — để tìm lãnh đạo tự động
  const { data: editOrgPositions } = useQuery({
    queryKey: ['positions-by-org-unit', editOrgTarget?.id],
    queryFn: () => positionsApi.list({ orgUnitId: editOrgTarget!.id, isActive: true, limit: 200 }),
    enabled: !!editOrgTarget?.id,
    staleTime: 5 * 60_000,
  });

  // Auto-tính lãnh đạo đơn vị: employee thuộc unit + position.jobTitleId khớp
  const autoOrgLeader = useMemo(() => {
    if (!editOrgTarget || !watchEditOrgHeadJobTitle) return null;
    const matchIds = new Set(
      (editOrgPositions?.data ?? [])
        .filter((p) => p.jobTitleId === watchEditOrgHeadJobTitle)
        .map((p) => p.id),
    );
    if (matchIds.size === 0) return null;
    return (
      employees.find(
        (e) => e.orgUnitId === editOrgTarget.id && e.positionId && matchIds.has(e.positionId),
      ) ?? null
    );
  }, [editOrgTarget, watchEditOrgHeadJobTitle, editOrgPositions?.data, employees]);

  const editOrgUnitId = editEmployee?.orgUnitId;
  const { data: positionsData } = useQuery({
    queryKey: ['positions-by-unit', editOrgUnitId],
    queryFn: () => positionsApi.list({ orgUnitId: editOrgUnitId, isActive: true, limit: 200 }),
    enabled: !!editOrgUnitId,
    staleTime: 5 * 60_000,
  });
  const { data: allPositionsData } = useQuery({
    queryKey: ['positions-all'],
    queryFn: () => positionsApi.list({ isActive: true, limit: 500 }),
    staleTime: 5 * 60_000,
  });
  const positionOptions = (positionsData?.data ?? []).map((p) => ({
    value: p.id,
    label: p.jobTitle ? `${p.jobTitle.name} — ${p.code}` : p.code,
  }));

  // Fetch process definitions to find employee-onboarding
  const { data: onboardingDefinition } = useQuery({
    queryKey: ['process-definitions-onboarding'],
    queryFn: async () => {
      const res = await apiClient.get<{
        data: { id: string; key: string; name: string; status: string }[];
      }>('/processes/definitions', { params: { pageSize: 100 } });
      const defs = res.data?.data ?? (res.data as unknown as { id: string; key: string; name: string; status: string }[]);
      return defs.find((d) => d.key === 'employee-onboarding') ?? null;
    },
    staleTime: 5 * 60_000,
  });

  // ── Org mutations ─────────────────────────────────────────────────────────────

  const createOrgMutation = useMutation({
    mutationFn: orgUnitsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-units'] });
      message.success('Đã tạo đơn vị');
      setCreateOrgOpen(false);
      createOrgForm.resetFields();
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      message.error(err.response?.data?.message ?? 'Tạo thất bại'),
  });

  const updateOrgMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof orgUnitsApi.update>[1] }) =>
      orgUnitsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-units'] });
      message.success('Đã cập nhật');
      setEditOrgTarget(null);
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      message.error(err.response?.data?.message ?? 'Cập nhật thất bại'),
  });

  const deleteOrgMutation = useMutation({
    mutationFn: orgUnitsApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-units'] });
      setSelectedOrgId(null);
      message.success('Đã xoá đơn vị');
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      message.error(err.response?.data?.message ?? 'Xoá thất bại'),
  });

  // ── Employee mutations ────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: employeesApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      setCreateOpen(false);
      setCreateError('');
      createForm.resetFields();
      message.success('Thêm nhân sự thành công');
    },
    onError: (e: unknown) => {
      const data = (e as { response?: { data?: { message?: string; errors?: { validation?: string[] } } } })?.response?.data;
      const details = data?.errors?.validation;
      setCreateError(details ? details.join('\n') : (data?.message ?? 'Lỗi không xác định'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Employee> }) =>
      employeesApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      qc.invalidateQueries({ queryKey: ['employee', editEmployee?.id] });
      qc.invalidateQueries({ queryKey: ['org-units'] });
      setEditEmployee(null);
      message.success('Đã cập nhật nhân sự');
    },
    onError: (e: unknown) => {
      const data = (e as { response?: { data?: { message?: string; errors?: { validation?: string[] } } } })?.response?.data;
      const details = data?.errors?.validation;
      message.error(details ? details[0] : (data?.message ?? 'Lỗi không xác định'));
    },
  });

  const addRateMutation = useMutation({
    mutationFn: (data: { ratePerDay: number; effectiveDate: string }) =>
      employeesApi.addRate(detailId!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee-rates', detailId] });
      setRateOpen(false);
      rateForm.resetFields();
      message.success('Đã thêm mức lương');
    },
  });

  // ── Onboarding ────────────────────────────────────────────────────────────────

  async function startOnboarding(employee: Employee) {
    if (!onboardingDefinition || onboardingDefinition.status !== 'ACTIVE') return;
    setOnboardingLoading(employee.id);
    try {
      await apiClient.post('/processes/instances', {
        definitionId: onboardingDefinition.id,
        variables: {
          employeeId:   employee.id,
          employeeName: employee.fullName,
        },
      });
      void message.success('Onboarding started');
    } catch (e: unknown) {
      const errMsg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      void message.error(errMsg ?? 'Failed to start onboarding');
    } finally {
      setOnboardingLoading(null);
    }
  }

  function getOnboardingTooltip(employee: Employee): string {
    if (!onboardingDefinition) return 'No onboarding process configured';
    if (onboardingDefinition.status !== 'ACTIVE') return 'No onboarding process configured';
    return `Start onboarding for ${employee.fullName}`;
  }

  function isOnboardingDisabled(): boolean {
    return !onboardingDefinition || onboardingDefinition.status !== 'ACTIVE';
  }

  // ── Derived data ──────────────────────────────────────────────────────────────

  const orgOptions      = useMemo(() => flattenOrgUnits(orgTree), [orgTree]);
  const filteredOrgTree = useMemo(() => filterOrgTree(orgTree, orgSearch), [orgTree, orgSearch]);
  const totalOrgCount   = useMemo(() => countOrgs(orgTree), [orgTree]);

  const allTechStacks = useMemo(
    () => Array.from(new Set(employees.flatMap((e) => e.techStack ?? []))).sort(),
    [employees],
  );

  const filteredEmployees = useMemo(() => {
    const orgIds = selectedOrgId ? getSubtreeIds(orgTree, selectedOrgId) : [];
    return employees.filter((e) => {
      if (searchText) {
        const q = searchText.toLowerCase();
        if (!e.fullName.toLowerCase().includes(q) && !e.code.toLowerCase().includes(q)) return false;
      }
      if (filterLevel.length > 0 && !filterLevel.includes(e.level)) return false;
      if (filterTechStack.length > 0 && !filterTechStack.some((t) => e.techStack?.includes(t))) return false;
      if (selectedOrgId && !orgIds.includes(e.orgUnitId ?? '')) return false;
      if (filterFree && (e.activeProjectCount ?? 0) > 0) return false;
      return true;
    });
  }, [employees, searchText, filterLevel, filterTechStack, selectedOrgId, filterFree, orgTree]);

  const selectedOrgName = useMemo(
    () => selectedOrgId ? orgOptions.find((o) => o.value === selectedOrgId)?.label?.trim() : null,
    [selectedOrgId, orgOptions],
  );

  // ── Sidebar resize ────────────────────────────────────────────────────────────

  function handleDragStart(e: React.MouseEvent) {
    if (sidebarCollapsed) return;
    isDragging.current    = true;
    dragStartX.current    = e.clientX;
    dragStartWidth.current = panelWidth;
    document.body.style.cursor     = 'col-resize';
    document.body.style.userSelect = 'none';

    function onMouseMove(ev: MouseEvent) {
      if (!isDragging.current) return;
      setPanelWidth(Math.max(200, Math.min(420, dragStartWidth.current + ev.clientX - dragStartX.current)));
    }
    function onMouseUp() {
      isDragging.current = false;
      document.body.style.cursor     = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  // ── Org tree node renderer ────────────────────────────────────────────────────

  function buildOrgTreeData(nodes: OrgUnitTree[]): TreeDataNode[] {
    return nodes.map((n) => {
      const lvlIdx  = Math.min(n.level ?? 0, ORG_LEVEL_HUE.length - 1);
      const hue     = ORG_LEVEL_HUE[lvlIdx];
      const LvlIcon = ORG_LEVEL_ICONS[lvlIdx];
      return {
        key: n.id,
        title: (
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}
            onMouseEnter={() => setHoveredNodeId(n.id)}
            onMouseLeave={() => setHoveredNodeId(null)}
          >
            <span style={{
              width: 18, height: 18, borderRadius: 4, flexShrink: 0,
              background: `${hue}18`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <LvlIcon style={{ color: hue, fontSize: 10 }} />
            </span>
            <span style={{
              flex: 1, fontSize: 12.5, fontWeight: 500,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {n.name}
            </span>
            <span style={{
              fontSize: 9, fontWeight: 700, borderRadius: 3,
              padding: '1px 5px', flexShrink: 0,
              background: `${hue}22`, color: hue, letterSpacing: '0.4px',
            }}>
              {n.code}
            </span>
            {n._count?.users ? (
              <span style={{
                fontSize: 10, fontWeight: 600, borderRadius: 9999,
                padding: '0 5px', flexShrink: 0, minWidth: 18, textAlign: 'center',
                background: token.colorFillSecondary,
                color: token.colorTextSecondary,
              }}>
                {n._count.users}
              </span>
            ) : null}
            <span
              style={{ opacity: hoveredNodeId === n.id ? 1 : 0, transition: 'opacity 0.15s', display: 'flex', gap: 1, flexShrink: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <Tooltip title="Sửa" mouseEnterDelay={0.5}>
                <Button
                  type="text" size="small" icon={<EditOutlined />}
                  style={{ padding: '0 3px', height: 16, fontSize: 10 }}
                  onClick={() => setEditOrgTarget(n)}
                />
              </Tooltip>
              <Popconfirm
                title="Xoá đơn vị này?"
                description="Đơn vị con và nhân sự liên kết sẽ bị ảnh hưởng."
                onConfirm={() => deleteOrgMutation.mutate(n.id)}
                okText="Xoá" cancelText="Huỷ" okButtonProps={{ danger: true }}
              >
                <Tooltip title="Xoá" mouseEnterDelay={0.5}>
                  <Button
                    type="text" size="small" danger icon={<DeleteOutlined />}
                    style={{ padding: '0 3px', height: 16, fontSize: 10 }}
                  />
                </Tooltip>
              </Popconfirm>
            </span>
          </div>
        ),
        children: buildOrgTreeData(n.children ?? []),
      };
    });
  }

  const orgTreeData = useMemo(
    () => buildOrgTreeData(filteredOrgTree),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filteredOrgTree, hoveredNodeId, token.colorFillSecondary, token.colorTextSecondary],
  );

  // ── Employee table columns ────────────────────────────────────────────────────

  const projectHistoryColumns = [
    { title: 'Dự án', dataIndex: ['project', 'name'], ellipsis: true },
    {
      title: 'Mã', dataIndex: ['project', 'code'], width: 80,
      render: (v: string) => (
        <span style={{
          fontSize: 11, borderRadius: 4, padding: '1px 6px',
          background: token.colorFillSecondary,
          color: token.colorTextSecondary,
        }}>{v}</span>
      ),
    },
    { title: 'Vai trò', dataIndex: 'role', width: 90 },
    {
      title: 'Phân bổ', dataIndex: 'allocationPct', width: 80,
      render: (v: number) => (
        <span style={{ fontSize: 13, fontWeight: 600, color: Number(v) >= 90 ? '#EF4444' : Number(v) >= 70 ? '#F59E0B' : '#10B981' }}>
          {Number(v)}%
        </span>
      ),
    },
    { title: 'Từ',  dataIndex: 'startDate', width: 90, render: (v: string) => <Text style={{ color: textMuted }}>{dayjs(v).format('DD/MM/YY')}</Text> },
    { title: 'Đến', dataIndex: 'endDate',   width: 90, render: (v: string) => <Text style={{ color: textMuted }}>{dayjs(v).format('DD/MM/YY')}</Text> },
  ];

  const allColumns = [
    { key: 'code', title: 'Mã', dataIndex: 'code', width: 90 },
    {
      key: 'fullName', title: 'Họ tên', dataIndex: 'fullName',
      render: (_: string, r: Employee) => (
        <div onClick={() => setDetailId(r.id)} style={{ cursor: 'pointer' }}>
          <EmployeeInfoCell employee={r} />
        </div>
      ),
    },
    {
      key: 'orgUnit', title: 'Phòng ban',
      render: (_: unknown, r: Employee) => {
        const name = orgOptions.find((o) => o.value === r.orgUnitId)?.label?.trim();
        return name
          ? <span style={{ fontSize: 12, color: token.colorTextSecondary }}>{name}</span>
          : <span style={{ fontSize: 12, color: token.colorTextTertiary }}>—</span>;
      },
    },
    {
      key: 'jobTitle', title: 'Chức danh', width: 150,
      render: (_: unknown, r: Employee) => {
        const name = r.jobTitle?.name ?? r.position?.jobTitle?.name;
        return name
          ? <span style={{ fontSize: 12, color: token.colorTextSecondary }}>{name}</span>
          : <span style={{ fontSize: 12, color: token.colorTextTertiary }}>—</span>;
      },
    },
    {
      key: 'position', title: 'Vị trí', width: 120,
      render: (_: unknown, r: Employee) => r.position?.code
        ? (
          <span style={{
            fontSize: 11, fontWeight: 600, borderRadius: 4, padding: '1px 6px',
            background: token.colorFillSecondary, color: token.colorTextSecondary,
          }}>{r.position.code}</span>
        )
        : <span style={{ fontSize: 12, color: token.colorTextTertiary }}>—</span>,
    },
    {
      key: 'level', title: 'Cấp độ', dataIndex: 'level', width: 90,
      render: (v: string) => {
        const hue = LEVEL_HUE[v] ?? token.colorTextSecondary;
        return (
          <span style={{ fontSize: 11, fontWeight: 500, borderRadius: 4, padding: '2px 6px', color: hue, background: `${hue}1e` }}>
            {v}
          </span>
        );
      },
    },
    {
      key: 'techStack', title: 'Tech Stack', dataIndex: 'techStack',
      render: (v: string[]) => (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {v?.slice(0, 3).map((t) => (
            <span key={t} style={{
              fontSize: 10, borderRadius: 4, padding: '1px 5px',
              background: token.colorFillTertiary,
              color: token.colorTextSecondary,
              border: `1px solid ${token.colorBorderSecondary}`,
            }}>{t}</span>
          ))}
          {v?.length > 3 && <span style={{ fontSize: 10, color: token.colorTextTertiary }}>+{v.length - 3}</span>}
        </div>
      ),
    },
    {
      key: 'startDate', title: 'Ngày vào làm', dataIndex: 'startDate', width: 110,
      render: (v: string) => v
        ? <span style={{ fontSize: 12, color: token.colorTextSecondary }}>{dayjs(v).format('DD/MM/YYYY')}</span>
        : <span style={{ fontSize: 12, color: token.colorTextTertiary }}>—</span>,
    },
    {
      key: 'projects', title: 'Dự án', width: 100,
      render: (_: unknown, r: Employee) => <ProjectsCell employee={r} />,
    },
    {
      key: 'actions', title: '', width: 110,
      render: (_: unknown, r: Employee) => (
        <Space size={2}>
          <Tooltip title="Xem hồ sơ đầy đủ">
            <Button
              type="text" size="small" icon={<IdcardOutlined />}
              style={{ color: '#6366F1' }}
              onClick={() => navigate(`/hr/employees/${r.id}`)}
            />
          </Tooltip>
          <Tooltip title="Sửa">
            <Button
              type="text" size="small" icon={<EditOutlined />}
              onClick={() => {
                setEditEmployee(r);
                editForm.setFieldsValue({
                  code:          r.code,
                  fullName:      r.fullName,
                  level:         r.level,
                  orgUnitId:     r.orgUnitId,
                  jobTitleId:    r.jobTitleId ?? undefined,
                  positionId:    r.positionId ?? null,
                  startDate:     r.startDate     ? dayjs(r.startDate)     : null,
                  birthdate:     r.birthdate     ? dayjs(r.birthdate)     : null,
                  techStack:     r.techStack,
                  email:         r.email,
                  gender:        r.gender,
                  maritalStatus: r.maritalStatus,
                  phoneNumber:   r.phoneNumber,
                  hometown:      r.hometown,
                  cccd:          r.cccd,
                  cccdIssueDate: r.cccdIssueDate ? dayjs(r.cccdIssueDate) : null,
                  cccdIssuePlace: r.cccdIssuePlace,
                });
              }}
            />
          </Tooltip>
          <Tooltip title={getOnboardingTooltip(r)}>
            <Button
              type="text" size="small"
              icon={<PlayCircleOutlined />}
              disabled={isOnboardingDisabled()}
              loading={onboardingLoading === r.id}
              style={{ color: isOnboardingDisabled() ? undefined : '#10B981' }}
              onClick={() => void startOnboarding(r)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const columns = allColumns.filter((c) => c.key === 'actions' || isVisible(c.key));

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>

      {/* ── Left: Org Tree Panel ──────────────────────────────────────────── */}
      <div style={{
        width: sidebarCollapsed ? 0 : panelWidth,
        minWidth: sidebarCollapsed ? 0 : panelWidth,
        flexShrink: 0, overflow: 'hidden',
        transition: 'width 0.2s ease, min-width 0.2s ease',
        display: 'flex', flexDirection: 'column',
        background: token.colorBgLayout,
      }}>
        {/* Panel header */}
        <div style={{ padding: '12px 14px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase',
            color: token.colorTextSecondary, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <ApartmentOutlined style={{ color: token.colorPrimary, fontSize: 13 }} />
            Cơ cấu tổ chức
          </span>
          <Tooltip title="Thêm đơn vị">
            <Button
              type="text" size="small" icon={<PlusOutlined />}
              onClick={() => setCreateOrgOpen(true)}
              style={{ color: token.colorPrimary }}
            />
          </Tooltip>
        </div>

        {/* Org search */}
        <div style={{ padding: '0 10px 8px' }}>
          <Input
            size="small"
            prefix={<SearchOutlined style={{ color: token.colorTextTertiary, fontSize: 11 }} />}
            placeholder="Tìm phòng ban..."
            value={orgSearch}
            onChange={(e) => setOrgSearch(e.target.value)}
            allowClear
          />
        </div>

        {/* "Tất cả" row */}
        <div style={{ padding: '0 8px 2px' }}>
          <div
            onClick={() => setSelectedOrgId(null)}
            style={{
              padding: '5px 8px 5px 7px', borderRadius: 6, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              background: selectedOrgId === null ? token.colorPrimaryBg : 'transparent',
              color: selectedOrgId === null ? token.colorPrimary : token.colorTextSecondary,
              fontWeight: selectedOrgId === null ? 600 : 400,
              fontSize: 12.5,
              transition: 'background 0.15s',
              borderLeft: selectedOrgId === null
                ? `3px solid ${token.colorPrimary}`
                : '3px solid transparent',
            }}
          >
            <TeamOutlined style={{ fontSize: 13 }} />
            <span style={{ flex: 1 }}>Tất cả</span>
            <span style={{
              fontSize: 10, fontWeight: 600, borderRadius: 9999,
              padding: '0 6px', minWidth: 20, textAlign: 'center',
              background: selectedOrgId === null ? `${token.colorPrimary}20` : token.colorFillSecondary,
              color: selectedOrgId === null ? token.colorPrimary : token.colorTextSecondary,
            }}>
              {employees.length}
            </span>
          </div>
        </div>

        {/* Org tree */}
        <div style={{ flex: 1, overflow: 'auto', padding: '2px 4px' }}>
          {orgLoading ? (
            <div style={{ textAlign: 'center', paddingTop: 32 }}><Spin size="small" /></div>
          ) : (
            <Tree
              treeData={orgTreeData}
              defaultExpandAll
              showLine={{ showLeafIcon: false }}
              blockNode
              selectedKeys={selectedOrgId ? [selectedOrgId] : []}
              onSelect={(keys) => {
                const k = keys[0] as string | undefined;
                setSelectedOrgId(k === selectedOrgId ? null : (k ?? null));
              }}
              style={{ background: 'transparent', fontSize: 13 }}
            />
          )}
        </div>

        {/* Footer stats */}
        <div style={{
          padding: '8px 12px',
          borderTop: `1px solid ${token.colorBorderSecondary}`,
          display: 'flex', gap: 8,
        }}>
          <span style={{ flex: 1, fontSize: 11, color: token.colorTextTertiary, display: 'flex', alignItems: 'center', gap: 4 }}>
            <ApartmentOutlined />
            <strong style={{ color: token.colorTextSecondary, fontWeight: 600 }}>{totalOrgCount}</strong> đơn vị
          </span>
          <span style={{ flex: 1, fontSize: 11, color: token.colorTextTertiary, display: 'flex', alignItems: 'center', gap: 4 }}>
            <TeamOutlined />
            <strong style={{ color: token.colorTextSecondary, fontWeight: 600 }}>{employees.length}</strong> nhân sự
          </span>
        </div>
      </div>

      {/* ── Resize divider ────────────────────────────────────────────────── */}
      <div
        onMouseDown={handleDragStart}
        style={{
          width: 5, flexShrink: 0,
          cursor: sidebarCollapsed ? 'default' : 'col-resize',
          borderRight: `1px solid ${token.colorBorderSecondary}`,
          transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => { if (!sidebarCollapsed) (e.currentTarget as HTMLDivElement).style.background = token.colorPrimaryBg; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
      />

      {/* ── Right: Employee Panel ─────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Header */}
        <div style={{ padding: '14px 20px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <Tooltip title={sidebarCollapsed ? 'Hiện sơ đồ tổ chức' : 'Ẩn sơ đồ tổ chức'}>
              <Button
                type="text" size="small"
                icon={sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setSidebarCollapsed((v) => !v)}
                style={{ marginTop: 3, color: token.colorTextTertiary }}
              />
            </Tooltip>
            <div>
              <Title level={5} style={{ margin: 0 }}>
                {selectedOrgName ?? 'Tất cả nhân sự'}
              </Title>
              <span style={{ fontSize: 12, color: token.colorTextTertiary }}>{filteredEmployees.length} người</span>
            </div>
          </div>
          <Space>
            <Button
              icon={<DownloadOutlined />}
              onClick={() => downloadExport('/employees/export', 'nhan-vien.xlsx').catch(() => message.error('Export thất bại'))}
            >
              Export
            </Button>
            <Button
              type="primary" icon={<PlusOutlined />}
              onClick={() => { setCreateError(''); setCreateOpen(true); }}
            >
              Thêm nhân sự
            </Button>
          </Space>
        </div>

        {/* Filter bar */}
        <FilterBar right={<ColumnToggle columns={PERSONNEL_COL_DEFS} isVisible={isVisible} toggle={toggle} reset={resetCols} />}>
          <Input
            prefix={<SearchOutlined style={{ color: token.colorTextTertiary }} />}
            placeholder="Tên hoặc mã nhân sự..."
            style={{ width: 220 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />
          <Select
            mode="multiple" placeholder="Cấp độ"
            style={{ minWidth: 130 }}
            value={filterLevel} onChange={setFilterLevel}
            options={LEVELS.map((l) => ({ value: l, label: l }))}
            allowClear maxTagCount="responsive"
          />
          <Select
            mode="multiple" placeholder="Tech Stack"
            style={{ minWidth: 160 }}
            value={filterTechStack} onChange={setFilterTechStack}
            options={allTechStacks.map((t) => ({ value: t, label: t }))}
            allowClear maxTagCount="responsive"
            showSearch
          />
          <Tag
            style={{
              cursor: 'pointer', userSelect: 'none', borderRadius: 6, padding: '3px 10px',
              background: filterFree ? '#52C41A1e' : token.colorFillSecondary,
              color:      filterFree ? '#52C41A'   : token.colorTextSecondary,
              border:    `1px solid ${filterFree ? '#52C41A40' : token.colorBorderSecondary}`,
              lineHeight: '22px', fontSize: 13,
            }}
            onClick={() => setFilterFree((f) => !f)}
          >
            🟢 Đang free
          </Tag>
        </FilterBar>

        {/* Table */}
        <div style={{ flex: 1, overflow: 'auto', padding: '0 20px 20px' }}>
          <Table
            dataSource={filteredEmployees}
            columns={columns}
            rowKey="id"
            loading={isLoading}
            size="small"
            pagination={{ pageSize: 50, showSizeChanger: true, showTotal: (t) => `${t} nhân sự` }}
            locale={{ emptyText: 'Không có nhân sự phù hợp' }}
            scroll={{ x: 980 }}
          />
        </div>
      </div>

      {/* ══ Employee Detail Drawer ══════════════════════════════════════════════ */}
      <CenteredModal
        title={detail?.fullName ?? 'Chi tiết nhân sự'}
        open={!!detailId}
        onClose={() => setDetailId(null)}
        width={800}
        extra={
          <Space>
            <Button
              type="primary"
              icon={<IdcardOutlined />}
              onClick={() => { if (detailId) { setDetailId(null); navigate(`/hr/employees/${detailId}`); } }}
            >
              Hồ sơ đầy đủ
            </Button>
            <Tooltip title={detail ? getOnboardingTooltip(detail) : 'No onboarding process configured'}>
              <Button
                icon={<PlayCircleOutlined />}
                disabled={isOnboardingDisabled()}
                loading={!!detail && onboardingLoading === detail.id}
                onClick={() => { if (detail) void startOnboarding(detail); }}
              >
                Start Onboarding
              </Button>
            </Tooltip>
            <Button icon={<PlusOutlined />} onClick={() => setRateOpen(true)}>Thêm mức lương</Button>
          </Space>
        }
      >
        {detail && (
          <Tabs items={[
            {
              key: 'info', label: 'Thông tin',
              children: (
                <Descriptions column={1} size="small" bordered>
                  <Descriptions.Item label="Nhân sự">
                    <EmployeeInfoCell employee={detail} variant="descriptions" />
                  </Descriptions.Item>
                  <Descriptions.Item label="Chức danh">
                    {detail.jobTitle?.name ?? detail.position?.jobTitle?.name ?? '—'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Vị trí biên chế">
                    {detail.position?.code ?? '—'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Cấp độ">
                    {(() => {
                      const hue = LEVEL_HUE[detail.level] ?? token.colorTextSecondary;
                      return (
                        <span style={{ fontSize: 12, fontWeight: 500, borderRadius: 4, padding: '2px 8px', color: hue, background: `${hue}1e` }}>
                          {detail.level}
                        </span>
                      );
                    })()}
                  </Descriptions.Item>
                  <Descriptions.Item label="Ngày vào làm">
                    {(detail as Employee).startDate ? dayjs((detail as Employee).startDate).format('DD/MM/YYYY') : '—'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Ngày sinh">
                    {(detail as Employee).birthdate ? dayjs((detail as Employee).birthdate).format('DD/MM/YYYY') : '—'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Tech Stack">
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {detail.techStack?.map((t) => (
                        <span key={t} style={{
                          fontSize: 11, borderRadius: 4, padding: '2px 6px',
                          background: token.colorFillTertiary,
                          color: token.colorTextSecondary,
                          border: `1px solid ${token.colorBorderSecondary}`,
                        }}>{t}</span>
                      ))}
                    </div>
                  </Descriptions.Item>
                  <Descriptions.Item label="Email công việc">{detail.email ?? '—'}</Descriptions.Item>
                  <Descriptions.Item label="Số điện thoại">{detail.phoneNumber ?? '—'}</Descriptions.Item>
                  <Descriptions.Item label="Giới tính">
                    {detail.gender === 'MALE' ? 'Nam' : detail.gender === 'FEMALE' ? 'Nữ' : detail.gender === 'OTHER' ? 'Khác' : '—'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Tình trạng hôn nhân">
                    {detail.maritalStatus === 'SINGLE' ? 'Độc thân' : detail.maritalStatus === 'MARRIED' ? 'Đã kết hôn' : detail.maritalStatus === 'DIVORCED' ? 'Đã ly hôn' : detail.maritalStatus === 'WIDOWED' ? 'Góa' : '—'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Quê quán">{detail.hometown ?? '—'}</Descriptions.Item>
                  <Descriptions.Item label="Tài khoản hệ thống">{detail.user?.email ?? '—'}</Descriptions.Item>
                  <Descriptions.Item label="Số CCCD">{detail.cccd ?? '—'}</Descriptions.Item>
                  <Descriptions.Item label="Ngày cấp CCCD">
                    {detail.cccdIssueDate ? dayjs(detail.cccdIssueDate).format('DD/MM/YYYY') : '—'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Nơi cấp">{detail.cccdIssuePlace ?? '—'}</Descriptions.Item>
                </Descriptions>
              ),
            },
            {
              key: 'rates', label: 'Lịch sử lương',
              children: rates.length === 0 ? (
                <p style={{ color: token.colorTextTertiary, paddingTop: 16 }}>Chưa có dữ liệu lương</p>
              ) : (
                <Timeline
                  style={{ marginTop: 16 }}
                  items={rates.map((r) => ({
                    children: (
                      <Space direction="vertical" size={0}>
                        <span>{dayjs(r.effectiveDate).format('DD/MM/YYYY')}</span>
                        <strong>{formatNumber(r.ratePerDay)} {r.currency}/ngày</strong>
                      </Space>
                    ),
                  }))}
                />
              ),
            },
            {
              key: 'projects', label: `Dự án (${projectHistory.length})`,
              children: (
                <Table
                  dataSource={projectHistory} columns={projectHistoryColumns}
                  rowKey="id" size="small" pagination={false}
                  style={{ marginTop: 8 }}
                  locale={{ emptyText: 'Chưa tham gia dự án nào' }}
                />
              ),
            },
            {
              key: 'tax',
              label: 'Thuế & BHXH',
              children: detail ? <TaxProfileTab employeeId={detail.id} /> : null,
            },
          ]} />
        )}
      </CenteredModal>

      {/* ══ Modal: Tạo nhân sự ═════════════════════════════════════════════════ */}
      <Modal
        title="Thêm nhân sự mới" open={createOpen} width={520}
        onCancel={() => { setCreateOpen(false); setCreateError(''); }}
        onOk={() => createForm.submit()}
        confirmLoading={createMutation.isPending}
      >
        {createError && (
          <Alert type="error" showIcon style={{ marginBottom: 12 }} message="Dữ liệu không hợp lệ"
            description={<ul style={{ margin: 0, paddingLeft: 16 }}>{createError.split('\n').map((l, i) => <li key={i}>{l}</li>)}</ul>}
          />
        )}
        <Form form={createForm} layout="vertical"
          onFinish={(v) => createMutation.mutate({
            ...v,
            startDate:     v.startDate.format('YYYY-MM-DD'),
            birthdate:     v.birthdate?.format('YYYY-MM-DD'),
            cccdIssueDate: v.cccdIssueDate?.format('YYYY-MM-DD'),
          })}
        >
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item name="code" label="Mã nhân sự" style={{ flex: 1 }}
              rules={[{ required: true, message: 'Nhập mã' }, { pattern: /^[A-Z0-9_-]+$/, message: 'Chỉ dùng chữ HOA, số, gạch ngang' }]}
            >
              <Input placeholder="EMP001" onChange={(e) => createForm.setFieldValue('code', e.target.value.toUpperCase())} />
            </Form.Item>
            <Form.Item name="level" label="Cấp độ" style={{ flex: 1 }} rules={[{ required: true, message: 'Chọn cấp độ' }]}>
              <Select options={LEVELS.map((l) => ({ value: l, label: l }))} />
            </Form.Item>
          </Space>
          <Form.Item name="fullName" label="Họ và tên đầy đủ" rules={[{ required: true, message: 'Nhập họ tên' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="orgUnitId" label="Phòng ban" rules={[{ required: true, message: 'Chọn phòng ban' }]}>
            <Select showSearch placeholder="Chọn phòng ban..."
              filterOption={(input, opt) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())}
              options={orgOptions}
            />
          </Form.Item>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item name="jobTitleId" label="Chức danh" style={{ flex: 1 }}>
              <Select showSearch placeholder="Chọn chức danh..." allowClear
                filterOption={(input, opt) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())}
                options={jobTitleOptions}
              />
            </Form.Item>
            <Form.Item name="positionId" label="Vị trí biên chế" style={{ flex: 1 }}>
              <Select showSearch placeholder="Chọn vị trí..." allowClear
                filterOption={(input, opt) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())}
                options={(allPositionsData?.data ?? []).map((pos) => ({ value: pos.id, label: pos.jobTitle ? `${pos.jobTitle.name} — ${pos.code}` : pos.code }))}
              />
            </Form.Item>
          </Space>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item name="startDate" label="Ngày vào làm" style={{ flex: 1 }} rules={[{ required: true, message: 'Chọn ngày' }]}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
            <Form.Item name="birthdate" label="Ngày sinh" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          </Space>
          <Form.Item name="techStack" label="Kỹ năng / Tech Stack">
            <Select mode="tags" placeholder="Gõ và Enter: React, Node.js, Java..." />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ type: 'email', message: 'Email không hợp lệ' }]}>
            <Input placeholder="nguyen.van.a@company.vn" />
          </Form.Item>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item name="gender" label="Giới tính" style={{ flex: 1 }}>
              <Select allowClear placeholder="Chọn giới tính">
                <Select.Option value="MALE">Nam</Select.Option>
                <Select.Option value="FEMALE">Nữ</Select.Option>
                <Select.Option value="OTHER">Khác</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="maritalStatus" label="Tình trạng hôn nhân" style={{ flex: 1 }}>
              <Select allowClear placeholder="Chọn tình trạng">
                <Select.Option value="SINGLE">Độc thân</Select.Option>
                <Select.Option value="MARRIED">Đã kết hôn</Select.Option>
                <Select.Option value="DIVORCED">Đã ly hôn</Select.Option>
                <Select.Option value="WIDOWED">Góa</Select.Option>
              </Select>
            </Form.Item>
          </Space>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item name="phoneNumber" label="Số điện thoại" style={{ flex: 1 }}><Input placeholder="0912345678" /></Form.Item>
            <Form.Item name="hometown" label="Quê quán" style={{ flex: 1 }}><ProvinceWardSelect /></Form.Item>
          </Space>
          <Divider style={{ fontSize: 13 }}>Căn cước công dân</Divider>
          <Form.Item name="cccd" label="Số CCCD"><Input placeholder="012345678901" /></Form.Item>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item name="cccdIssueDate" label="Ngày cấp" style={{ flex: 1 }}><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item>
            <Form.Item name="cccdIssuePlace" label="Nơi cấp" style={{ flex: 1 }}><Input placeholder="Cục Cảnh sát QLHC..." /></Form.Item>
          </Space>
        </Form>
      </Modal>

      {/* ══ Modal: Sửa nhân sự ════════════════════════════════════════════════ */}
      <Modal
        title={`Sửa: ${editEmployee?.fullName ?? ''}`} open={!!editEmployee}
        onCancel={() => setEditEmployee(null)} onOk={() => editForm.submit()}
        confirmLoading={updateMutation.isPending}
      >
        <Form form={editForm} layout="vertical"
          onFinish={(v) => updateMutation.mutate({
            id: editEmployee!.id,
            data: {
              ...v,
              startDate:     v.startDate?.format('YYYY-MM-DD'),
              birthdate:     v.birthdate?.format('YYYY-MM-DD'),
              cccdIssueDate: v.cccdIssueDate?.format('YYYY-MM-DD'),
            },
          })}
        >
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item name="code" label="Mã nhân sự" style={{ flex: 1 }}>
              <Input disabled />
            </Form.Item>
            <Form.Item name="fullName" label="Họ và tên" style={{ flex: 1 }} rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Space>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item name="level" label="Cấp độ" style={{ flex: 1 }} rules={[{ required: true }]}>
              <Select options={LEVELS.map((l) => ({ value: l, label: l }))} />
            </Form.Item>
            <Form.Item name="orgUnitId" label="Phòng ban" style={{ flex: 1 }}>
              <Select showSearch allowClear placeholder="Chọn phòng ban..."
                filterOption={(input, opt) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())}
                options={orgOptions}
                onChange={() => editForm.setFieldValue('positionId', null)}
              />
            </Form.Item>
          </Space>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item name="jobTitleId" label="Chức danh" style={{ flex: 1 }}>
              <Select showSearch placeholder="Chọn chức danh..." allowClear
                filterOption={(input, opt) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())}
                options={jobTitleOptions}
              />
            </Form.Item>
            <Form.Item name="positionId" label="Vị trí biên chế" style={{ flex: 1 }}>
              <Select
                allowClear showSearch
                placeholder={editOrgUnitId ? 'Chọn vị trí...' : 'Chọn phòng ban trước'}
                disabled={!editOrgUnitId}
                filterOption={(input, opt) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())}
                options={positionOptions}
              />
            </Form.Item>
          </Space>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item name="startDate" label="Ngày vào làm" style={{ flex: 1 }} rules={[{ required: true, message: 'Chọn ngày' }]}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
            <Form.Item name="birthdate" label="Ngày sinh" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          </Space>
          <Form.Item name="techStack" label="Kỹ năng / Tech Stack">
            <Select mode="tags" placeholder="React, Node.js..." />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ type: 'email', message: 'Email không hợp lệ' }]}>
            <Input placeholder="nguyen.van.a@company.vn" />
          </Form.Item>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item name="gender" label="Giới tính" style={{ flex: 1 }}>
              <Select allowClear placeholder="Chọn giới tính">
                <Select.Option value="MALE">Nam</Select.Option>
                <Select.Option value="FEMALE">Nữ</Select.Option>
                <Select.Option value="OTHER">Khác</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="maritalStatus" label="Tình trạng hôn nhân" style={{ flex: 1 }}>
              <Select allowClear placeholder="Chọn tình trạng">
                <Select.Option value="SINGLE">Độc thân</Select.Option>
                <Select.Option value="MARRIED">Đã kết hôn</Select.Option>
                <Select.Option value="DIVORCED">Đã ly hôn</Select.Option>
                <Select.Option value="WIDOWED">Góa</Select.Option>
              </Select>
            </Form.Item>
          </Space>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item name="phoneNumber" label="Số điện thoại" style={{ flex: 1 }}><Input /></Form.Item>
            <Form.Item name="hometown" label="Quê quán" style={{ flex: 1 }}><ProvinceWardSelect /></Form.Item>
          </Space>
          <Divider style={{ fontSize: 13 }}>Căn cước công dân</Divider>
          <Form.Item name="cccd" label="Số CCCD"><Input /></Form.Item>
          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item name="cccdIssueDate" label="Ngày cấp" style={{ flex: 1 }}><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item>
            <Form.Item name="cccdIssuePlace" label="Nơi cấp" style={{ flex: 1 }}><Input /></Form.Item>
          </Space>
        </Form>
      </Modal>

      {/* ══ Modal: Tạo đơn vị tổ chức ════════════════════════════════════════ */}
      <Modal
        title="Thêm đơn vị tổ chức" open={createOrgOpen}
        onCancel={() => { setCreateOrgOpen(false); createOrgForm.resetFields(); }}
        onOk={() => createOrgForm.submit()}
        confirmLoading={createOrgMutation.isPending}
      >
        <Form form={createOrgForm} layout="vertical" onFinish={(v) => createOrgMutation.mutate(v)}>
          <Form.Item name="name" label="Tên đơn vị" rules={[{ required: true, message: 'Nhập tên' }]}>
            <Input placeholder="VD: Phòng Kỹ thuật" />
          </Form.Item>
          <Form.Item name="code" label="Mã đơn vị"
            rules={[{ required: true, message: 'Nhập mã' }, { pattern: /^[A-Z0-9_-]+$/, message: 'Chỉ dùng chữ hoa, số, gạch ngang' }]}
          >
            <Input placeholder="VD: KT001" onChange={(e) => createOrgForm.setFieldValue('code', e.target.value.toUpperCase())} />
          </Form.Item>
          <Form.Item name="parentId" label="Đơn vị cha (để trống nếu là gốc)">
            <OrgUnitSelect allowClear placeholder="Chọn đơn vị cha..." style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="headJobTitleId" label="Chức danh trưởng đơn vị">
            <Select allowClear showSearch optionFilterProp="label"
              placeholder="VD: Trưởng phòng, Giám đốc..."
              options={jobTitleOptions}
            />
          </Form.Item>
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 8,
            padding: '8px 12px', borderRadius: 6, marginTop: 4,
            background: token.colorInfoBg,
            border: `1px dashed ${token.colorInfoBorder}`,
            fontSize: 12, color: token.colorInfoText,
          }}>
            <InfoCircleOutlined style={{ marginTop: 2, flexShrink: 0 }} />
            <span>Lãnh đạo sẽ được tự động xác định dựa trên nhân viên có chức danh trưởng đơn vị đã chọn.</span>
          </div>
        </Form>
      </Modal>

      {/* ══ Modal: Sửa đơn vị tổ chức ════════════════════════════════════════ */}
      <Modal
        title={`Sửa: ${editOrgTarget?.name ?? ''}`} open={!!editOrgTarget}
        onCancel={() => setEditOrgTarget(null)} onOk={() => editOrgForm.submit()}
        confirmLoading={updateOrgMutation.isPending}
        afterOpenChange={(visible) => {
          if (visible && editOrgTarget) {
            editOrgForm.resetFields();
            editOrgForm.setFieldsValue({
              name:           editOrgTarget.name,
              code:           editOrgTarget.code,
              parentId:       editOrgTarget.parentId ?? undefined,
              headJobTitleId: editOrgTarget.headJobTitleId ?? undefined,
              leaderId:       editOrgTarget.leaderInfo?.id ?? undefined,
            });
          }
        }}
      >
        <Form form={editOrgForm} layout="vertical"
          onFinish={(v) => updateOrgMutation.mutate({
            id: editOrgTarget!.id,
            data: {
              name: v.name, code: v.code,
              parentId: v.parentId ?? null,
              headJobTitleId: v.headJobTitleId ?? null,
              leaderId: v.leaderId ?? null,
            },
          })}
        >
          <Form.Item name="name" label="Tên đơn vị" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="code" label="Mã đơn vị"
            rules={[{ required: true }, { pattern: /^[A-Z0-9_-]+$/, message: 'Chỉ dùng chữ hoa, số, gạch ngang' }]}
          >
            <Input onChange={(e) => editOrgForm.setFieldValue('code', e.target.value.toUpperCase())} />
          </Form.Item>
          <Form.Item name="parentId" label="Đơn vị cha (để trống nếu là gốc)">
            <OrgUnitSelect allowClear placeholder="Chọn đơn vị cha..." style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="headJobTitleId" label="Chức danh trưởng đơn vị">
            <Select allowClear showSearch optionFilterProp="label"
              placeholder="VD: Trưởng phòng, Giám đốc..."
              options={jobTitleOptions}
            />
          </Form.Item>
          <Form.Item label={
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <CrownOutlined style={{ color: token.colorPrimary, fontSize: 12 }} />
              Lãnh đạo đơn vị (tự động theo chức danh)
            </span>
          }>
            <div style={{
              padding: '5px 11px', borderRadius: 6, minHeight: 32,
              display: 'flex', alignItems: 'center',
              border: `1px solid ${token.colorBorder}`,
              background: token.colorFillAlter,
              fontSize: 13,
            }}>
              {autoOrgLeader ? (
                <>
                  <UserOutlined style={{ marginRight: 8, color: token.colorPrimary }} />
                  <span style={{ color: token.colorPrimary, fontWeight: 600 }}>{autoOrgLeader.code}</span>
                  <span style={{ color: token.colorText, marginLeft: 6 }}>— {autoOrgLeader.fullName}</span>
                </>
              ) : watchEditOrgHeadJobTitle ? (
                <span style={{ fontStyle: 'italic', fontSize: 12, color: token.colorTextTertiary }}>
                  Chưa có nhân viên phù hợp trong đơn vị này
                </span>
              ) : (
                <span style={{ fontStyle: 'italic', fontSize: 12, color: token.colorTextTertiary }}>
                  Chọn chức danh để xem lãnh đạo
                </span>
              )}
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* ══ Modal: Thêm mức lương ════════════════════════════════════════════ */}
      <Modal
        title="Thêm mức lương" open={rateOpen}
        onCancel={() => setRateOpen(false)} onOk={() => rateForm.submit()}
        confirmLoading={addRateMutation.isPending}
      >
        <Form form={rateForm} layout="vertical"
          onFinish={(v) => addRateMutation.mutate({ ratePerDay: v.ratePerDay, effectiveDate: v.effectiveDate.format('YYYY-MM-DD') })}
        >
          <Form.Item name="ratePerDay" label="Mức lương / ngày (VND)" rules={[{ required: true }]}>
            <InputNumber<number>
              min={0} style={{ width: '100%' }}
              formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(v) => Number(v?.replace(/,/g, '') ?? 0)}
            />
          </Form.Item>
          <Form.Item name="effectiveDate" label="Ngày có hiệu lực" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
