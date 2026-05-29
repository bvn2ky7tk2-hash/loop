import { useState, useMemo } from 'react';
import {
  Table,
  Button,
  Space,
  Typography,
  Tag,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Drawer,
  Descriptions,
  Row,
  Col,
  App,
  Tooltip,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  FileProtectOutlined,
  ClockCircleOutlined,
  EditOutlined,
  CalendarOutlined,
  SendOutlined,
  CheckOutlined,
  CheckCircleOutlined,
  CloseOutlined,
  FilePdfOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { useThemePalette } from '../../hooks/useThemePalette';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { CenteredModal } from '../../components/ui/CenteredModal';
import { FilterBar } from '../../components/FilterBar';
import { hrDecisionsApi, type HrDecision, type HrDecisionType, type HrDecisionStatus } from '../../api/hr-decisions';
import { employeesApi } from '../../api/employees';
import { positionsApi } from '../../api/hr-core';
import { orgUnitsApi } from '../../api/org-units';
import { EmployeeSelect } from '../../components/selects';

const { Text } = Typography;
const { TextArea } = Input;

// ─── Label + color maps ───────────────────────────────────────────────────────

const DECISION_TYPE_MAP: Record<HrDecisionType, { label: string; color: string }> = {
  HIRE:            { label: 'Tuyển dụng',         color: '#10B981' },
  PROBATION_END:   { label: 'Kết thúc thử việc',  color: '#3B82F6' },
  TRANSFER:        { label: 'Điều chuyển',         color: '#8B5CF6' },
  POSITION_CHANGE: { label: 'Thay đổi vị trí',    color: '#6366F1' },
  SALARY_CHANGE:   { label: 'Điều chỉnh lương',   color: '#F59E0B' },
  COMMENDATION:    { label: 'Khen thưởng',         color: '#F97316' },
  DISCIPLINE:      { label: 'Kỷ luật',             color: '#EF4444' },
  TERMINATION:     { label: 'Chấm dứt HĐ',         color: '#64748B' },
  PROMOTION:       { label: 'Thăng chức',          color: '#EC4899' },
  SECONDMENT:      { label: 'Biệt phái',           color: '#0EA5E9' },
};

const STATUS_MAP: Record<HrDecisionStatus, { label: string; antColor: string }> = {
  DRAFT:    { label: 'Bản nháp',  antColor: 'default' },
  PENDING:  { label: 'Chờ duyệt', antColor: 'warning' },
  APPROVED: { label: 'Đã duyệt',  antColor: 'success' },
  REJECTED: { label: 'Từ chối',   antColor: 'error'   },
};

// Helper: render TypeTag với explicit dark-mode style
function TypeTag({ type, isDark }: { type: HrDecisionType; isDark: boolean }) {
  const meta = DECISION_TYPE_MAP[type];
  if (!meta) return <Text>{type}</Text>;
  const hex = meta.color;

  const style = isDark
    ? {
        background: `${hex}26`,
        color: `${hex}`,
        borderColor: `${hex}50`,
      }
    : {};

  return (
    <Tag color={isDark ? undefined : hex} style={style}>
      {meta.label}
    </Tag>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function HrDecisionsPage() {
  const { textPrimary, textMuted, borderColor, linkColor, isDark, bgContainer } = useThemePalette();
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  // ── Filters ──
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<HrDecisionType | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<HrDecisionStatus | undefined>(undefined);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [page, setPage] = useState(1);

  // ── UI state ──
  const [detailRecord, setDetailRecord] = useState<HrDecision | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<HrDecision | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedType, setSelectedType] = useState<HrDecisionType | undefined>(undefined);
  const [selectedEmpId, setSelectedEmpId] = useState<string | undefined>(undefined);
  const [signedByEmpId, setSignedByEmpId] = useState<string | undefined>(undefined);

  const [form] = Form.useForm();

  // ── Queries ──
  const queryParams = useMemo(() => ({
    page,
    limit: 20,
    search: search || undefined,
    type: typeFilter,
    status: statusFilter,
    effectiveDateFrom: dateRange?.[0]?.format('YYYY-MM-DD'),
    effectiveDateTo: dateRange?.[1]?.format('YYYY-MM-DD'),
  }), [page, search, typeFilter, statusFilter, dateRange]);

  const { data: decisionsData, isLoading } = useQuery({
    queryKey: ['hr-decisions', queryParams],
    queryFn: () => hrDecisionsApi.list(queryParams),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: employeesApi.list,
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
  function flattenOrgUnits(nodes: typeof orgTree): { value: string; label: string }[] {
    return nodes.flatMap((n) => [
      { value: n.id, label: n.name },
      ...flattenOrgUnits(n.children ?? []),
    ]);
  }
  const orgOptions = flattenOrgUnits(orgTree);

  const decisions = decisionsData?.data ?? [];
  const total = decisionsData?.total ?? 0;

  // Stats derived from current data (approximation; ideally from a stats endpoint)
  const pending = decisions.filter((d) => d.status === 'PENDING').length;
  const approved = decisions.filter((d) => d.status === 'APPROVED').length;
  const thisMonth = decisions.filter((d) =>
    dayjs(d.effectiveDate).isSame(dayjs(), 'month')
  ).length;

  // ── Mutations ──
  const createMutation = useMutation({
    mutationFn: (data: Partial<HrDecision>) => hrDecisionsApi.create(data),
    onSuccess: () => {
      message.success('Tạo quyết định thành công');
      queryClient.invalidateQueries({ queryKey: ['hr-decisions'] });
      closeForm();
    },
    onError: () => message.error('Không thể tạo quyết định'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<HrDecision> }) =>
      hrDecisionsApi.update(id, data),
    onSuccess: () => {
      message.success('Cập nhật quyết định thành công');
      queryClient.invalidateQueries({ queryKey: ['hr-decisions'] });
      closeForm();
    },
    onError: () => message.error('Không thể cập nhật quyết định'),
  });

  const submitMutation = useMutation({
    mutationFn: (id: string) => hrDecisionsApi.submit(id),
    onSuccess: () => {
      message.success('Đã nộp quyết định để duyệt');
      queryClient.invalidateQueries({ queryKey: ['hr-decisions'] });
      setDetailRecord(null);
    },
    onError: () => message.error('Không thể nộp quyết định'),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => hrDecisionsApi.approve(id),
    onSuccess: () => {
      message.success('Đã duyệt quyết định');
      queryClient.invalidateQueries({ queryKey: ['hr-decisions'] });
      setDetailRecord(null);
    },
    onError: () => message.error('Không thể duyệt quyết định'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      hrDecisionsApi.reject(id, reason),
    onSuccess: () => {
      message.success('Đã từ chối quyết định');
      queryClient.invalidateQueries({ queryKey: ['hr-decisions'] });
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

  // ── Table columns ──
  const columns: ColumnsType<HrDecision> = [
    {
      title: 'Số QĐ',
      key: 'decisionNumber',
      width: 130,
      render: (_, record) => (
        <span
          style={{ color: linkColor, fontWeight: 600, cursor: 'pointer' }}
          onClick={() => setDetailRecord(record)}
        >
          {record.decisionNumber ?? '—'}
        </span>
      ),
    },
    {
      title: 'Nhân viên',
      key: 'employee',
      render: (_, record) => (
        <Text style={{ color: textPrimary, fontWeight: 500 }}>
          {record.employee?.fullName ?? record.employeeId}
        </Text>
      ),
    },
    {
      title: 'Loại quyết định',
      key: 'type',
      width: 160,
      render: (_, record) => <TypeTag type={record.type} isDark={isDark} />,
    },
    {
      title: 'Ngày hiệu lực',
      key: 'effectiveDate',
      width: 130,
      render: (_, record) => (
        <Text style={{ color: textMuted }}>
          {dayjs(record.effectiveDate).format('DD/MM/YYYY')}
        </Text>
      ),
    },
    {
      title: 'Người ký',
      key: 'signedBy',
      render: (_, record) => (
        <Text style={{ color: textMuted }}>{record.signedBy ?? '—'}</Text>
      ),
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 120,
      render: (_, record) => {
        const meta = STATUS_MAP[record.status];
        return <Tag color={meta?.antColor}>{meta?.label ?? record.status}</Tag>;
      },
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 160,
      render: (_, record) => (
        <Space size={4}>
          {(record.status === 'DRAFT') && (
            <Tooltip title="Sửa">
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => openEdit(record)}
              />
            </Tooltip>
          )}
          {record.status === 'DRAFT' && (
            <Tooltip title="Nộp để duyệt">
              <Button
                size="small"
                icon={<SendOutlined />}
                onClick={() => submitMutation.mutate(record.id)}
                loading={submitMutation.isPending}
              />
            </Tooltip>
          )}
          {record.status === 'PENDING' && (
            <>
              <Tooltip title="Duyệt">
                <Button
                  size="small"
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={() => approveMutation.mutate(record.id)}
                  loading={approveMutation.isPending}
                />
              </Tooltip>
              <Tooltip title="Từ chối">
                <Button
                  size="small"
                  danger
                  icon={<CloseOutlined />}
                  onClick={() => openReject(record.id)}
                />
              </Tooltip>
            </>
          )}
          {record.status === 'APPROVED' && record.pdfPath && (
            <Tooltip title="Tải PDF">
              <Button
                size="small"
                icon={<FilePdfOutlined />}
                href={record.pdfPath}
                target="_blank"
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

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
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          style={{ width: 260 }}
          allowClear
        />
        <Select
          placeholder="Loại quyết định"
          style={{ width: 180 }}
          allowClear
          value={typeFilter}
          onChange={(v) => {
            setTypeFilter(v);
            setPage(1);
          }}
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
          onChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
          options={Object.entries(STATUS_MAP).map(([k, v]) => ({
            value: k,
            label: v.label,
          }))}
        />
        <DatePicker.RangePicker
          placeholder={['Từ ngày HLực', 'Đến ngày']}
          format="DD/MM/YYYY"
          onChange={(vals) => {
            setDateRange(vals as [dayjs.Dayjs | null, dayjs.Dayjs | null] | null);
            setPage(1);
          }}
          style={{ width: 240 }}
        />
      </FilterBar>

      {/* Table */}
      <div
        style={{
          background: bgContainer,
          borderRadius: 12,
          border: `1px solid ${borderColor}`,
          overflow: 'hidden',
        }}
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={decisions}
          loading={isLoading}
          pagination={{
            current: page,
            pageSize: 20,
            total,
            onChange: (p) => setPage(p),
            showSizeChanger: false,
            showTotal: (t) => (
              <Text style={{ color: textMuted }}>Tổng {t} quyết định</Text>
            ),
          }}
          scroll={{ x: 900 }}
        />
      </div>

      {/* ─── Drawer: Chi tiết quyết định ───────────────────────────────── */}
      <Drawer
        open={!!detailRecord}
        onClose={() => setDetailRecord(null)}
        title={
          <Text style={{ color: textPrimary, fontWeight: 700, fontSize: 16 }}>
            Chi tiết quyết định
          </Text>
        }
        width={520}
        styles={{ body: { background: bgContainer } }}
      >
        {detailRecord && (
          <>
            <Descriptions
              bordered
              size="small"
              column={1}
              labelStyle={{ color: textMuted, width: 160 }}
              contentStyle={{ color: textPrimary }}
            >
              <Descriptions.Item label="Số quyết định">
                <Text style={{ color: linkColor, fontWeight: 600 }}>
                  {detailRecord.decisionNumber ?? '—'}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Nhân viên">
                {detailRecord.employee
                  ? `${detailRecord.employee.code} — ${detailRecord.employee.fullName}`
                  : detailRecord.employeeId}
              </Descriptions.Item>
              <Descriptions.Item label="Loại QĐ">
                <TypeTag type={detailRecord.type} isDark={isDark} />
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                <Tag color={STATUS_MAP[detailRecord.status]?.antColor}>
                  {STATUS_MAP[detailRecord.status]?.label ?? detailRecord.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Ngày ký">
                <Text style={{ color: textMuted }}>
                  {detailRecord.signedDate
                    ? dayjs(detailRecord.signedDate).format('DD/MM/YYYY')
                    : '—'}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Ngày hiệu lực">
                <Text style={{ color: textMuted }}>
                  {dayjs(detailRecord.effectiveDate).format('DD/MM/YYYY')}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Người ký">
                <Text style={{ color: textMuted }}>{detailRecord.signedBy ?? '—'}</Text>
              </Descriptions.Item>
              {detailRecord.toSalary !== undefined && (
                <Descriptions.Item label="Lương mới">
                  <Text style={{ color: linkColor, fontWeight: 600 }}>
                    {detailRecord.toSalary.toLocaleString('vi-VN')} ₫
                  </Text>
                </Descriptions.Item>
              )}
              {detailRecord.fromSalary !== undefined && (
                <Descriptions.Item label="Lương cũ">
                  <Text style={{ color: textMuted }}>
                    {detailRecord.fromSalary.toLocaleString('vi-VN')} ₫
                  </Text>
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Nội dung">
                <Text style={{ color: textPrimary }}>{detailRecord.content ?? '—'}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Ghi chú">
                <Text style={{ color: textMuted }}>{detailRecord.notes ?? '—'}</Text>
              </Descriptions.Item>
            </Descriptions>

            <Divider />

            <Space wrap>
              {detailRecord.status === 'DRAFT' && (
                // disabled đồng bộ với loading để ngăn double-submit khi mutation đang chạy
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  loading={submitMutation.isPending}
                  disabled={submitMutation.isPending}
                  onClick={() => submitMutation.mutate(detailRecord.id)}
                >
                  Nộp để duyệt
                </Button>
              )}
              {detailRecord.status === 'PENDING' && (
                <>
                  {/* disabled đồng bộ với loading để ngăn double-submit khi mutation đang chạy */}
                  <Button
                    type="primary"
                    icon={<CheckOutlined />}
                    loading={approveMutation.isPending}
                    disabled={approveMutation.isPending}
                    onClick={() => approveMutation.mutate(detailRecord.id)}
                  >
                    Duyệt
                  </Button>
                  <Button
                    danger
                    icon={<CloseOutlined />}
                    onClick={() => openReject(detailRecord.id)}
                  >
                    Từ chối
                  </Button>
                </>
              )}
              {detailRecord.status === 'APPROVED' && detailRecord.pdfPath && (
                <Button
                  icon={<FilePdfOutlined />}
                  href={detailRecord.pdfPath}
                  target="_blank"
                >
                  Tải PDF
                </Button>
              )}
            </Space>
          </>
        )}
      </Drawer>

      {/* ─── Modal: Từ chối ─────────────────────────────────────────────── */}
      <CenteredModal
        open={rejectOpen}
        onClose={() => {
          setRejectOpen(false);
          setRejectTarget(null);
        }}
        title="Từ chối quyết định"
        width={440}
        footer={
          <Space>
            <Button onClick={() => setRejectOpen(false)}>Huỷ</Button>
            <Button
              danger
              loading={rejectMutation.isPending}
              onClick={handleRejectConfirm}
            >
              Xác nhận từ chối
            </Button>
          </Space>
        }
      >
        <Form layout="vertical">
          <Form.Item label={<Text style={{ color: textPrimary }}>Lý do từ chối</Text>}>
            <TextArea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Nhập lý do từ chối..."
            />
          </Form.Item>
        </Form>
      </CenteredModal>

      {/* ─── Modal: Tạo / Sửa quyết định ──────────────────────────────── */}
      <CenteredModal
        open={formOpen}
        onClose={closeForm}
        title={editRecord ? 'Sửa quyết định nhân sự' : 'Tạo quyết định nhân sự'}
        width={620}
        footer={
          <Space>
            <Button onClick={closeForm}>Huỷ</Button>
            <Button
              type="primary"
              loading={createMutation.isPending || updateMutation.isPending}
              disabled={createMutation.isPending || updateMutation.isPending}
              onClick={handleSaveForm}
            >
              {editRecord ? 'Lưu thay đổi' : 'Tạo quyết định'}
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" requiredMark="optional">
          {/* Loại QĐ */}
          <Form.Item
            name="type"
            label={<Text style={{ color: textPrimary }}>Loại quyết định</Text>}
            rules={[{ required: true, message: 'Vui lòng chọn loại quyết định' }]}
          >
            <Select
              placeholder="Chọn loại quyết định"
              onChange={(v: HrDecisionType) => setSelectedType(v)}
              options={Object.entries(DECISION_TYPE_MAP).map(([k, v]) => ({
                value: k,
                label: v.label,
              }))}
            />
          </Form.Item>

          {/* Nhân viên */}
          <Form.Item
            name="employeeId"
            label={<Text style={{ color: textPrimary }}>Nhân viên</Text>}
            rules={[{ required: true, message: 'Vui lòng chọn nhân viên' }]}
          >
            <Select
              showSearch
              placeholder="Tìm và chọn nhân viên"
              filterOption={(input, option) =>
                String(option?.label ?? '')
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              options={empOptions}
              onChange={(v: string) => setSelectedEmpId(v)}
            />
          </Form.Item>

          {/* Hiển thị thông tin nhân viên được chọn */}
          {selectedEmpDetail && (
            <div style={{
              padding: '8px 12px',
              borderRadius: 8,
              background: isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.06)',
              border: `1px solid ${isDark ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.2)'}`,
              marginBottom: 16,
              display: 'flex', gap: 16, flexWrap: 'wrap',
            }}>
              <div>
                <Text style={{ fontSize: 11, color: textMuted }}>Đơn vị hiện tại</Text>
                <div style={{ fontSize: 13, fontWeight: 600, color: textPrimary }}>
                  {selectedEmpDetail.orgUnit?.name ?? '—'}
                </div>
              </div>
              <div>
                <Text style={{ fontSize: 11, color: textMuted }}>Vị trí hiện tại</Text>
                <div style={{ fontSize: 13, fontWeight: 600, color: textPrimary }}>
                  {selectedEmpDetail.position?.jobTitle?.name ?? '—'}
                </div>
              </div>
            </div>
          )}

          <Row gutter={12}>
            {/* Số QĐ */}
            <Col span={12}>
              <Form.Item
                name="decisionNumber"
                label={<Text style={{ color: textPrimary }}>Số quyết định</Text>}
              >
                <Input placeholder="VD: QĐ-2026-001 (để trống = tự động)" />
              </Form.Item>
            </Col>
            {/* Người ký */}
            <Col span={12}>
              <Form.Item
                name="signedByEmpId"
                label={<Text style={{ color: textPrimary }}>Người ký</Text>}
              >
                <EmployeeSelect
                  allowClear
                  placeholder="Chọn người ký..."
                  onChange={(v) => setSignedByEmpId(v)}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            {/* Ngày ký */}
            <Col span={12}>
              <Form.Item
                name="signedDate"
                label={<Text style={{ color: textPrimary }}>Ngày ký</Text>}
              >
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            {/* Ngày hiệu lực */}
            <Col span={12}>
              <Form.Item
                name="effectiveDate"
                label={<Text style={{ color: textPrimary }}>Ngày hiệu lực</Text>}
                rules={[{ required: true, message: 'Bắt buộc' }]}
              >
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>

          {/* Conditional: Điều chỉnh lương */}
          {(selectedType === 'SALARY_CHANGE') && (
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item
                  name="fromSalary"
                  label={<Text style={{ color: textPrimary }}>Lương hiện tại (₫)</Text>}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    min={0}
                    formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    placeholder="0"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="toSalary"
                  label={<Text style={{ color: textPrimary }}>Lương mới (₫)</Text>}
                  rules={[{ required: true, message: 'Nhập lương mới' }]}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    min={0}
                    formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    placeholder="0"
                  />
                </Form.Item>
              </Col>
            </Row>
          )}

          {/* Conditional: Điều chuyển / Thay đổi vị trí / Biệt phái */}
          {(selectedType === 'TRANSFER' ||
            selectedType === 'SECONDMENT' ||
            selectedType === 'POSITION_CHANGE') && (
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item
                  name="fromOrgUnitId"
                  label={<Text style={{ color: textPrimary }}>Phòng ban hiện tại</Text>}
                >
                  <Select
                    showSearch
                    allowClear
                    placeholder="Chọn phòng ban..."
                    filterOption={(input, opt) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())}
                    options={orgOptions}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="toOrgUnitId"
                  label={<Text style={{ color: textPrimary }}>Phòng ban mới</Text>}
                  rules={[{ required: true, message: 'Chọn phòng ban mới' }]}
                >
                  <Select
                    showSearch
                    allowClear
                    placeholder="Chọn phòng ban..."
                    filterOption={(input, opt) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())}
                    options={orgOptions}
                  />
                </Form.Item>
              </Col>
            </Row>
          )}

          {/* Conditional: Thăng chức / Thay đổi vị trí */}
          {(selectedType === 'PROMOTION' || selectedType === 'POSITION_CHANGE') && (
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item
                  name="fromPositionId"
                  label={<Text style={{ color: textPrimary }}>Vị trí hiện tại</Text>}
                >
                  <Select
                    showSearch
                    allowClear
                    placeholder="Chọn vị trí..."
                    filterOption={(input, opt) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())}
                    options={positionOptions}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="toPositionId"
                  label={<Text style={{ color: textPrimary }}>Vị trí mới</Text>}
                  rules={[{ required: true, message: 'Chọn vị trí mới' }]}
                >
                  <Select
                    showSearch
                    allowClear
                    placeholder="Chọn vị trí..."
                    filterOption={(input, opt) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())}
                    options={positionOptions}
                  />
                </Form.Item>
              </Col>
            </Row>
          )}

          {/* Nội dung QĐ */}
          <Form.Item
            name="content"
            label={<Text style={{ color: textPrimary }}>Nội dung quyết định</Text>}
          >
            <TextArea rows={3} placeholder="Mô tả nội dung quyết định..." />
          </Form.Item>

          {/* Ghi chú */}
          <Form.Item
            name="notes"
            label={<Text style={{ color: textPrimary }}>Ghi chú</Text>}
          >
            <TextArea rows={2} placeholder="Ghi chú thêm (nếu có)..." />
          </Form.Item>
        </Form>
      </CenteredModal>
    </div>
  );
}
