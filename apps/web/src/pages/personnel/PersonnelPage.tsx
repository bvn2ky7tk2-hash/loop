import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table, Button, Form, Input, Select, Space,
  Typography, App, Tooltip, Tree, Tag, Popconfirm, Spin, theme,
} from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { downloadExport } from '../../utils/exportApi';
import type { TreeDataNode } from 'antd';
import {
  PlusOutlined, EditOutlined, SearchOutlined,
  DeleteOutlined, ApartmentOutlined, TeamOutlined,
  MenuFoldOutlined, MenuUnfoldOutlined,
} from '@ant-design/icons';
import { useColumnVisibility } from '../../hooks/useColumnVisibility';
import { usePagination } from '../../hooks/usePagination';
import { ColumnToggle } from '../../components/ColumnToggle';
import { FilterBar } from '../../components/FilterBar';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeesApi, type Employee } from '../../api/employees';
import { orgUnitsApi, type OrgUnitTree } from '../../api/org-units';
import { jobTitlesApi, positionsApi } from '../../api/hr-core';
import { apiClient } from '../../api/client';
import {
  LEVELS, ORG_LEVEL_HUE, ORG_LEVEL_ICONS, PERSONNEL_COL_DEFS,
  filterOrgTree, getSubtreeIds, flattenOrgUnits, countOrgs,
} from './personnelConstants';
import { buildEmployeeColumns } from './components/employeeColumns';
import { EmployeeDetailModal } from './components/EmployeeDetailModal';
import { CreateEmployeeModal } from './components/CreateEmployeeModal';
import { EditEmployeeModal } from './components/EditEmployeeModal';
import { CreateOrgUnitModal } from './components/CreateOrgUnitModal';
import { EditOrgUnitModal } from './components/EditOrgUnitModal';
import { AddRateModal } from './components/AddRateModal';

const { Title } = Typography;

export default function PersonnelPage() {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const { token } = theme.useToken();
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
  const { resetPage, paginationProps } = usePagination(50);

  // Reset về trang 1 khi bất kỳ filter nào thay đổi
  useEffect(() => { resetPage(); }, [searchText, filterLevel, filterTechStack, selectedOrgId, filterFree, resetPage]);

  // ── Queries ──────────────────────────────────────────────────────────────────

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeesApi.list(),
    staleTime: 0,
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
  const allPositionOptions = (allPositionsData?.data ?? []).map((pos) => ({
    value: pos.id,
    label: pos.jobTitle ? `${pos.jobTitle.name} — ${pos.code}` : pos.code,
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
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: ['employees'], exact: true });
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

  const allColumns = buildEmployeeColumns({
    token,
    orgOptions,
    editForm,
    navigate,
    setDetailId,
    setEditEmployee,
    getOnboardingTooltip,
    isOnboardingDisabled,
    onboardingLoading,
    startOnboarding,
  });

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
            pagination={paginationProps(filteredEmployees.length, 'nhân sự')}
            locale={{ emptyText: 'Không có nhân sự phù hợp' }}
            scroll={{ x: 980 }}
          />
        </div>
      </div>

      {/* ══ Employee Detail Drawer ══════════════════════════════════════════════ */}
      <EmployeeDetailModal
        detailId={detailId}
        detail={detail}
        rates={rates}
        projectHistory={projectHistory}
        onClose={() => setDetailId(null)}
        onOpenFullProfile={() => { if (detailId) { setDetailId(null); navigate(`/hr/employees/${detailId}`); } }}
        onStartOnboarding={() => { if (detail) void startOnboarding(detail); }}
        onAddRate={() => setRateOpen(true)}
        getOnboardingTooltip={getOnboardingTooltip}
        isOnboardingDisabled={isOnboardingDisabled}
        onboardingLoading={onboardingLoading}
      />

      {/* ══ Modal: Tạo nhân sự ═════════════════════════════════════════════════ */}
      <CreateEmployeeModal
        open={createOpen}
        createForm={createForm}
        createError={createError}
        confirmLoading={createMutation.isPending}
        orgOptions={orgOptions}
        jobTitleOptions={jobTitleOptions}
        allPositionOptions={allPositionOptions}
        onCancel={() => { setCreateOpen(false); setCreateError(''); }}
        onFinish={(v) => createMutation.mutate({
          ...v,
          startDate:     v.startDate.format('YYYY-MM-DD'),
          birthdate:     v.birthdate?.format('YYYY-MM-DD'),
          cccdIssueDate: v.cccdIssueDate?.format('YYYY-MM-DD'),
        })}
      />

      {/* ══ Modal: Sửa nhân sự ════════════════════════════════════════════════ */}
      <EditEmployeeModal
        editEmployee={editEmployee}
        editForm={editForm}
        confirmLoading={updateMutation.isPending}
        orgOptions={orgOptions}
        jobTitleOptions={jobTitleOptions}
        positionOptions={positionOptions}
        editOrgUnitId={editOrgUnitId}
        onCancel={() => setEditEmployee(null)}
        onFinish={(v) => updateMutation.mutate({
          id: editEmployee!.id,
          data: {
            ...v,
            startDate:     v.startDate?.format('YYYY-MM-DD'),
            birthdate:     v.birthdate?.format('YYYY-MM-DD'),
            cccdIssueDate: v.cccdIssueDate?.format('YYYY-MM-DD'),
          },
        })}
      />

      {/* ══ Modal: Tạo đơn vị tổ chức ════════════════════════════════════════ */}
      <CreateOrgUnitModal
        open={createOrgOpen}
        createOrgForm={createOrgForm}
        confirmLoading={createOrgMutation.isPending}
        jobTitleOptions={jobTitleOptions}
        onCancel={() => { setCreateOrgOpen(false); createOrgForm.resetFields(); }}
        onFinish={(v) => createOrgMutation.mutate(v)}
      />

      {/* ══ Modal: Sửa đơn vị tổ chức ════════════════════════════════════════ */}
      <EditOrgUnitModal
        editOrgTarget={editOrgTarget}
        editOrgForm={editOrgForm}
        confirmLoading={updateOrgMutation.isPending}
        jobTitleOptions={jobTitleOptions}
        watchEditOrgHeadJobTitle={watchEditOrgHeadJobTitle}
        autoOrgLeader={autoOrgLeader}
        onCancel={() => setEditOrgTarget(null)}
        onAfterOpenChange={(visible) => {
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
        onFinish={(v) => updateOrgMutation.mutate({
          id: editOrgTarget!.id,
          data: {
            name: v.name, code: v.code,
            parentId: v.parentId ?? null,
            headJobTitleId: v.headJobTitleId ?? null,
            leaderId: v.leaderId ?? null,
          },
        })}
      />

      {/* ══ Modal: Thêm mức lương ════════════════════════════════════════════ */}
      <AddRateModal
        open={rateOpen}
        rateForm={rateForm}
        confirmLoading={addRateMutation.isPending}
        onCancel={() => setRateOpen(false)}
        onFinish={(v) => addRateMutation.mutate({ ratePerDay: v.ratePerDay, effectiveDate: v.effectiveDate.format('YYYY-MM-DD') })}
      />
    </div>
  );
}
