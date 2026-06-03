import { useState, useMemo, useEffect } from 'react';
import {
  Button,
  Form,
  Input,
  Select,
  DatePicker,
  Row,
  Col,
  App,
} from 'antd';
import {
  PlusOutlined,
  FileProtectOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { useThemePalette } from '../../hooks/useThemePalette';
import { usePagination } from '../../hooks/usePagination';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { FilterBar } from '../../components/FilterBar';
import { hrDecisionsApi, type HrDecision, type HrDecisionType, type HrDecisionStatus } from '../../api/hr-decisions';
import { employeesApi } from '../../api/employees';
import { positionsApi } from '../../api/hr-core';
import { orgUnitsApi } from '../../api/org-units';
import { OrgUnitSelect } from '../../components/selects';
import { DECISION_TYPE_MAP, STATUS_MAP } from './hr-decisions/constants';
import { DecisionsTable } from './hr-decisions/components/DecisionsTable';
import { DecisionDetailModal } from './hr-decisions/components/DecisionDetailModal';
import { RejectModal } from './hr-decisions/components/RejectModal';
import { DecisionFormModal } from './hr-decisions/components/DecisionFormModal';

// ─── Page ────────────────────────────────────────────────────────────────────

export default function HrDecisionsPage() {
  const { textPrimary, textMuted, borderColor, linkColor, isDark, bgContainer } = useThemePalette();
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  // ── Filters ──
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<HrDecisionType | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<HrDecisionStatus | undefined>(undefined);
  const [orgUnitFilter, setOrgUnitFilter] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);

  const { page, pageSize, resetPage, paginationProps } = usePagination(20);

  // Reset trang 1 khi filter thay đổi
  useEffect(() => { resetPage(); }, [search, typeFilter, statusFilter, orgUnitFilter, dateRange, resetPage]);

  // ── UI state ──
  const [detailRecord, setDetailRecord] = useState<HrDecision | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<HrDecision | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedType, setSelectedType] = useState<HrDecisionType | undefined>(undefined);
  const [selectedEmpId, setSelectedEmpId] = useState<string | undefined>(undefined);
  const [, setSignedByEmpId] = useState<string | undefined>(undefined);

  const [form] = Form.useForm();

  // ── Queries ──
  const queryParams = useMemo(() => ({
    page,
    limit: pageSize,
    search: search || undefined,
    type: typeFilter,
    status: statusFilter,
    orgUnitId: orgUnitFilter,
    effectiveDateFrom: dateRange?.[0]?.format('YYYY-MM-DD'),
    effectiveDateTo: dateRange?.[1]?.format('YYYY-MM-DD'),
  }), [page, pageSize, search, typeFilter, statusFilter, orgUnitFilter, dateRange]);

  const { data: decisionsData, isLoading } = useQuery({
    queryKey: ['hr-decisions', queryParams],
    queryFn: () => hrDecisionsApi.list(queryParams),
  });

  // Dùng queryKey riêng + limit cao để load đủ nhân viên cho dropdown
  const { data: employees = [] } = useQuery({
    queryKey: ['employees-dropdown'],
    queryFn: () => employeesApi.list({ limit: 2000 }),
    staleTime: 5 * 60_000,
  });

  const { data: selectedEmpDetail } = useQuery({
    queryKey: ['employee', selectedEmpId],
    queryFn: () => employeesApi.get(selectedEmpId!),
    enabled: !!selectedEmpId,
    staleTime: 60_000,
  });

  const { data: positionsData } = useQuery({
    queryKey: ['positions-all'],
    queryFn: () => positionsApi.list({ isActive: true, limit: 500 }),
    staleTime: 5 * 60_000,
  });
  const positionOptions = (positionsData?.data ?? []).map((p) => ({
    value: p.id,
    label: p.jobTitle ? `${p.jobTitle.name} — ${p.code}` : p.code,
  }));

  const { data: orgTree = [] } = useQuery({
    queryKey: ['org-units'],
    queryFn: orgUnitsApi.getTree,
    staleTime: 5 * 60_000,
  });
  type OrgTreeNode = { id: string; name: string; children?: OrgTreeNode[] };
  function flattenOrgUnits(nodes: OrgTreeNode[]): { value: string; label: string }[] {
    return nodes.flatMap((n) => [
      { value: n.id, label: n.name },
      ...flattenOrgUnits(n.children ?? []),
    ]);
  }
  const orgOptions = flattenOrgUnits(orgTree as OrgTreeNode[]);

  const decisions = decisionsData?.data ?? [];
  const total = decisionsData?.total ?? 0;

  // Stats derived from current data (approximation; ideally from a stats endpoint)
  const pending = decisions.filter((d) => d.status === 'PENDING').length;
  const approved = decisions.filter((d) => d.status === 'APPROVED').length;
  const thisMonth = decisions.filter((d) =>
    dayjs(d.effectiveDate).isSame(dayjs(), 'month')
  ).length;

  // ── Mutations ──
  const refresh = () => queryClient.refetchQueries({ queryKey: ['hr-decisions'], exact: false });

  const createMutation = useMutation({
    mutationFn: (data: Partial<HrDecision>) => hrDecisionsApi.create(data),
    onSuccess: async () => {
      await refresh();
      message.success('Tạo quyết định thành công');
      closeForm();
    },
    onError: () => message.error('Không thể tạo quyết định'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<HrDecision> }) =>
      hrDecisionsApi.update(id, data),
    onSuccess: async () => {
      await refresh();
      message.success('Cập nhật quyết định thành công');
      closeForm();
    },
    onError: () => message.error('Không thể cập nhật quyết định'),
  });

  const submitMutation = useMutation({
    mutationFn: (id: string) => hrDecisionsApi.submit(id),
    onSuccess: async () => {
      await refresh();
      message.success('Đã nộp quyết định để duyệt');
      setDetailRecord(null);
    },
    onError: () => message.error('Không thể nộp quyết định'),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => hrDecisionsApi.approve(id),
    onSuccess: async () => {
      await refresh();
      message.success('Đã duyệt quyết định');
      setDetailRecord(null);
    },
    onError: () => message.error('Không thể duyệt quyết định'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      hrDecisionsApi.reject(id, reason),
    onSuccess: async () => {
      await refresh();
      message.success('Đã từ chối quyết định');
      setRejectOpen(false);
      setRejectTarget(null);
      setRejectReason('');
      setDetailRecord(null);
    },
    onError: () => message.error('Không thể từ chối quyết định'),
  });

  // ── Helpers ──
  const empOptions = employees.map((e) => ({
    value: e.id,
    label: `${e.code} — ${e.fullName}`,
  }));

  function closeForm() {
    setFormOpen(false);
    setEditRecord(null);
    form.resetFields();
    setSelectedType(undefined);
    setSelectedEmpId(undefined);
    setSignedByEmpId(undefined);
  }

  function openCreate() {
    setEditRecord(null);
    form.resetFields();
    setSelectedType(undefined);
    setSelectedEmpId(undefined);
    setSignedByEmpId(undefined);
    setFormOpen(true);
  }

  function openEdit(record: HrDecision) {
    setEditRecord(record);
    setSelectedType(record.type);
    setSelectedEmpId(record.employeeId);
    setSignedByEmpId(undefined);
    form.setFieldsValue({
      type: record.type,
      employeeId: record.employeeId,
      decisionNumber: record.decisionNumber,
      signedByEmpId: undefined, // signedBy là string name, không reverse-map được sang ID
      signedDate: record.signedDate ? dayjs(record.signedDate) : undefined,
      effectiveDate: record.effectiveDate ? dayjs(record.effectiveDate) : undefined,
      fromSalary: record.fromSalary,
      toSalary: record.toSalary,
      fromPositionId: record.fromPositionId,
      toPositionId: record.toPositionId,
      toOrgUnitId: record.toOrgUnitId,
      note: record.notes,
    });
    setFormOpen(true);
  }

  const handleSaveForm = async () => {
    const values = await form.validateFields();
    // Map signedByEmpId (UUID) → signedBy (fullName string) cho backend
    const signedByName = values.signedByEmpId
      ? (employees.find((e) => e.id === values.signedByEmpId)?.fullName ?? undefined)
      : undefined;
    const { signedByEmpId: _dropSignedBy, ...rest } = values;
    const payload: Partial<HrDecision> = {
      ...rest,
      ...(signedByName !== undefined ? { signedBy: signedByName } : {}),
      signedDate: values.signedDate ? values.signedDate.format('YYYY-MM-DD') : undefined,
      effectiveDate: values.effectiveDate.format('YYYY-MM-DD'),
    };
    if (editRecord) {
      updateMutation.mutate({ id: editRecord.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const openReject = (id: string) => {
    setRejectTarget(id);
    setRejectReason('');
    setRejectOpen(true);
  };

  const handleRejectConfirm = () => {
    if (!rejectTarget) return;
    rejectMutation.mutate({ id: rejectTarget, reason: rejectReason });
  };

  // ── Render ──
  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <PageHeader
        title="Quyết định nhân sự"
        icon={<FileProtectOutlined />}
        iconColor="#6366F1"
        actions={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => openCreate()}
          >
            Tạo quyết định
          </Button>
        }
      />

      {/* Stat Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}>
          <StatCard
            label="Tổng quyết định"
            value={total}
            color="#6366F1"
            icon={<FileProtectOutlined />}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            label="Chờ duyệt"
            value={pending}
            color="#F59E0B"
            icon={<ClockCircleOutlined />}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            label="Đã duyệt"
            value={approved}
            color="#10B981"
            icon={<CheckCircleOutlined />}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            label="Tháng này"
            value={thisMonth}
            color="#3B82F6"
            icon={<CalendarOutlined />}
          />
        </Col>
      </Row>

      {/* Filter Bar */}
      <FilterBar>
        <Input
          prefix={<span style={{ color: textMuted }}>🔍</span>}
          placeholder="Tìm tên nhân viên hoặc số QĐ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 260 }}
          allowClear
        />
        <Select
          placeholder="Loại quyết định"
          style={{ width: 180 }}
          allowClear
          value={typeFilter}
          onChange={(v) => setTypeFilter(v)}
          options={Object.entries(DECISION_TYPE_MAP).map(([k, v]) => ({
            value: k,
            label: v.label,
          }))}
        />
        <Select
          placeholder="Trạng thái"
          style={{ width: 140 }}
          allowClear
          value={statusFilter}
          onChange={(v) => setStatusFilter(v)}
          options={Object.entries(STATUS_MAP).map(([k, v]) => ({
            value: k,
            label: v.label,
          }))}
        />
        <OrgUnitSelect
          placeholder="Phòng ban"
          style={{ minWidth: 180 }}
          value={orgUnitFilter}
          onChange={(v) => setOrgUnitFilter(v)}
          allowClear
        />
        <DatePicker.RangePicker
          placeholder={['Từ ngày HLực', 'Đến ngày']}
          format="DD/MM/YYYY"
          onChange={(vals) => setDateRange(vals as [dayjs.Dayjs | null, dayjs.Dayjs | null] | null)}
          style={{ width: 240 }}
        />
      </FilterBar>

      {/* Table */}
      <DecisionsTable
        decisions={decisions}
        total={total}
        isLoading={isLoading}
        paginationProps={paginationProps}
        textMuted={textMuted}
        linkColor={linkColor}
        borderColor={borderColor}
        bgContainer={bgContainer}
        isDark={isDark}
        onShowDetail={setDetailRecord}
        onEdit={openEdit}
        onSubmit={(id) => submitMutation.mutate(id)}
        onApprove={(id) => approveMutation.mutate(id)}
        onReject={openReject}
        submitPending={submitMutation.isPending}
        approvePending={approveMutation.isPending}
      />

      {/* ─── Modal: Chi tiết quyết định ────────────────────────────────── */}
      <DecisionDetailModal
        detailRecord={detailRecord}
        onClose={() => setDetailRecord(null)}
        onSubmit={(id) => submitMutation.mutate(id)}
        onApprove={(id) => approveMutation.mutate(id)}
        onReject={openReject}
        submitPending={submitMutation.isPending}
        approvePending={approveMutation.isPending}
        textPrimary={textPrimary}
        textMuted={textMuted}
        linkColor={linkColor}
        isDark={isDark}
      />

      {/* ─── Modal: Từ chối ─────────────────────────────────────────────── */}
      <RejectModal
        open={rejectOpen}
        onClose={() => {
          setRejectOpen(false);
          setRejectTarget(null);
        }}
        onCancel={() => setRejectOpen(false)}
        rejectReason={rejectReason}
        onReasonChange={setRejectReason}
        onConfirm={handleRejectConfirm}
        rejectPending={rejectMutation.isPending}
        textPrimary={textPrimary}
      />

      {/* ─── Modal: Tạo / Sửa quyết định ──────────────────────────────── */}
      <DecisionFormModal
        open={formOpen}
        editRecord={editRecord}
        form={form}
        onClose={closeForm}
        onSave={handleSaveForm}
        savePending={createMutation.isPending || updateMutation.isPending}
        selectedType={selectedType}
        onTypeChange={(v) => setSelectedType(v)}
        onEmpChange={(v) => setSelectedEmpId(v)}
        onSignedByChange={(v) => setSignedByEmpId(v)}
        selectedEmpDetail={selectedEmpDetail}
        empOptions={empOptions}
        orgOptions={orgOptions}
        positionOptions={positionOptions}
        textPrimary={textPrimary}
        textMuted={textMuted}
        isDark={isDark}
      />
    </div>
  );
}
