import { useState, useMemo, useEffect } from 'react';
import {
  Table, Button, Form, Input, Select, DatePicker,
  InputNumber, Space, Popconfirm, Tooltip, App, theme,
  Typography,
} from 'antd';
import { CenteredModal } from '../../components/ui/CenteredModal';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { contractsApi, type Contract, type ContractType, type ContractStatus, type CreateContractDto } from '../../api/contracts';
import { employeesApi } from '../../api/employees';
import { positionsApi } from '../../api/hr-core';
import { useThemePalette } from '../../hooks/useThemePalette';
import { formatNumber } from '../../utils/format';

const { Title } = Typography;

// ── Constants ─────────────────────────────────────────────────────────────────

const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  FULL_TIME:  'Full Time',
  PART_TIME:  'Part Time',
  PROBATION:  'Probation',
  FREELANCE:  'Freelance',
};

const CONTRACT_TYPE_HUE: Record<ContractType, string> = {
  FULL_TIME:  '#2563EB',
  PART_TIME:  '#7C3AED',
  PROBATION:  '#F59E0B',
  FREELANCE:  '#0EA5E9',
};

const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  DRAFT:      'Nháp',
  ACTIVE:     'Đang hiệu lực',
  EXPIRED:    'Đã hết hạn',
  TERMINATED: 'Đã chấm dứt',
};

const CONTRACT_STATUS_HUE: Record<ContractStatus, string> = {
  DRAFT:      '#2563EB',   // blue
  ACTIVE:     '#16A34A',   // green
  EXPIRED:    '#EA580C',   // orange
  TERMINATED: '#DC2626',   // red
};

const CONTRACT_TYPES: ContractType[]  = ['FULL_TIME', 'PART_TIME', 'PROBATION', 'FREELANCE'];
const CONTRACT_STATUSES: ContractStatus[] = ['DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED'];

// ── Sub-components ────────────────────────────────────────────────────────────

function TypeBadge({ type, isDark }: { type: ContractType; isDark: boolean }) {
  const hue = CONTRACT_TYPE_HUE[type] ?? '#64748B';
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, borderRadius: 5, padding: '2px 8px',
      color: hue,
      background: isDark ? `${hue}25` : `${hue}15`,
      border: `1px solid ${hue}40`,
      whiteSpace: 'nowrap',
    }}>
      {CONTRACT_TYPE_LABELS[type] ?? type}
    </span>
  );
}

function StatusBadge({ status, isDark }: { status: ContractStatus; isDark: boolean }) {
  const hue = CONTRACT_STATUS_HUE[status] ?? '#64748B';
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, borderRadius: 5, padding: '2px 8px',
      color: hue,
      background: isDark ? `${hue}25` : `${hue}15`,
      border: `1px solid ${hue}40`,
      whiteSpace: 'nowrap',
    }}>
      {CONTRACT_STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ── Drawer form ───────────────────────────────────────────────────────────────

interface ContractDrawerProps {
  open: boolean;
  editing: Contract | null;
  onClose: () => void;
  isDark: boolean;
}

function ContractDrawer({ open, editing, onClose, isDark }: ContractDrawerProps) {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [form] = Form.useForm();
  const [empSearch, setEmpSearch] = useState('');
  const [selectedEmpId, setSelectedEmpId] = useState<string | undefined>(undefined);
  const { bgContainer, textPrimary, textMuted } = useThemePalette();

  // Search employees
  const { data: employees = [], isFetching: empLoading } = useQuery({
    queryKey: ['employees-search', empSearch],
    queryFn: () => empSearch
      ? employeesApi.list().then((r) => Array.isArray(r)
          ? r.filter((e) => e.fullName.toLowerCase().includes(empSearch.toLowerCase()))
          : r)
      : employeesApi.list().then((r) => Array.isArray(r) ? r.slice(0, 50) : []),
    staleTime: 30_000,
  });

  // Load employee detail when selected (to show unit + position info)
  const { data: selectedEmpDetail } = useQuery({
    queryKey: ['employee', selectedEmpId],
    queryFn: () => employeesApi.get(selectedEmpId!),
    enabled: !!selectedEmpId,
    staleTime: 60_000,
  });

  // Load positions for position select — use selectedEmpDetail which is fetched via selectedEmpId
  const empOrgUnitId = selectedEmpDetail?.orgUnitId;
  const { data: positionsData } = useQuery({
    queryKey: ['positions-by-unit', empOrgUnitId],
    queryFn: () => positionsApi.list({ orgUnitId: empOrgUnitId, isActive: true, limit: 200 }),
    enabled: !!empOrgUnitId,
    staleTime: 5 * 60_000,
  });
  const positionOptions = (positionsData?.data ?? []).map((p) => ({
    value: p.id,
    label: p.jobTitle ? `${p.jobTitle.name} — ${p.code}` : p.code,
  }));

  function handleEmpChange(empId: string) {
    setSelectedEmpId(empId);
    // Clear position when employee changes (org unit may change)
    form.setFieldValue('positionId', undefined);
  }

  const createMutation = useMutation({
    mutationFn: contractsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contracts'] });
      message.success('Đã tạo hợp đồng');
      form.resetFields();
      onClose();
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      message.error(err.response?.data?.message ?? 'Tạo hợp đồng thất bại'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateContractDto> & { status?: ContractStatus } }) =>
      contractsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contracts'] });
      message.success('Đã cập nhật hợp đồng');
      form.resetFields();
      onClose();
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      message.error(err.response?.data?.message ?? 'Cập nhật thất bại'),
  });

  // Thay thế afterOpenChange bằng useEffect để sync form khi modal mở
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setSelectedEmpId(editing.employeeId);
      form.setFieldsValue({
        employeeId:    editing.employeeId,
        type:          editing.type,
        status:        editing.status,
        positionId:    (editing as Contract & { positionId?: string }).positionId ?? undefined,
        startDate:     editing.startDate     ? dayjs(editing.startDate)  : null,
        endDate:       editing.endDate       ? dayjs(editing.endDate)    : null,
        salaryMonthly: editing.salaryMonthly,
        currency:      editing.currency ?? 'VND',
        note:          editing.note ?? '',
        signedAt:      editing.signedAt      ? dayjs(editing.signedAt)   : null,
      });
    } else {
      setSelectedEmpId(undefined);
      form.resetFields();
      form.setFieldValue('currency', 'VND');
      form.setFieldValue('status', 'DRAFT');
    }
  }, [open, editing]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleFinish(values: Record<string, unknown>) {
    const payload = {
      employeeId:    values.employeeId as string,
      type:          values.type as ContractType,
      status:        values.status as ContractStatus,
      positionId:    (values.positionId as string) ?? undefined,
      startDate:     (values.startDate as dayjs.Dayjs).format('YYYY-MM-DD'),
      endDate:       values.endDate ? (values.endDate as dayjs.Dayjs).format('YYYY-MM-DD') : undefined,
      salaryMonthly: values.salaryMonthly as number,
      currency:      (values.currency as string) ?? 'VND',
      note:          (values.note as string) ?? undefined,
      signedAt:      values.signedAt ? (values.signedAt as dayjs.Dayjs).format('YYYY-MM-DD') : undefined,
    };

    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <CenteredModal
      title={editing ? 'Cập nhật hợp đồng' : 'Hợp đồng mới'}
      open={open}
      onClose={onClose}
      width={520}
      styles={{
        body: { background: bgContainer },
      }}
      footer={
        <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
          <Button onClick={onClose}>Huỷ</Button>
          <Button type="primary" loading={isPending} disabled={isPending} onClick={() => form.submit()}>
            {editing ? 'Lưu thay đổi' : 'Tạo hợp đồng'}
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        {/* Nhân viên */}
        <Form.Item
          name="employeeId" label="Nhân viên"
          rules={[{ required: true, message: 'Chọn nhân viên' }]}
        >
          <Select
            showSearch
            placeholder="Tìm kiếm nhân viên..."
            loading={empLoading}
            onSearch={setEmpSearch}
            filterOption={false}
            onChange={handleEmpChange}
            options={employees.map((e) => ({
              value: e.id,
              label: `${e.fullName} — ${e.code}`,
            }))}
          />
        </Form.Item>

        {/* Auto-fill: Đơn vị + Vị trí hiện tại */}
        {selectedEmpDetail && (
          <div style={{
            padding: '8px 12px',
            borderRadius: 8,
            background: isDark ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.06)',
            border: `1px solid ${isDark ? 'rgba(16,185,129,0.3)' : 'rgba(16,185,129,0.2)'}`,
            marginBottom: 16,
            display: 'flex', gap: 16, flexWrap: 'wrap',
          }}>
            <div>
              <div style={{ fontSize: 11, color: textMuted }}>Đơn vị hiện tại</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: textPrimary }}>
                {selectedEmpDetail.orgUnit?.name ?? '—'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: textMuted }}>Vị trí / Chức danh</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: textPrimary }}>
                {selectedEmpDetail.position?.jobTitle?.name ?? '—'}
              </div>
            </div>
          </div>
        )}

        {/* Vị trí công việc trong hợp đồng */}
        <Form.Item name="positionId" label="Vị trí công việc (hợp đồng)">
          <Select
            allowClear
            showSearch
            placeholder={empOrgUnitId ? 'Chọn vị trí biên chế...' : 'Chọn nhân viên trước'}
            disabled={!empOrgUnitId}
            filterOption={(input, opt) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())}
            options={positionOptions}
          />
        </Form.Item>

        {/* Loại hợp đồng + Trạng thái */}
        <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
          <Form.Item
            name="type" label="Loại hợp đồng" style={{ flex: 1 }}
            rules={[{ required: true, message: 'Chọn loại hợp đồng' }]}
          >
            <Select
              placeholder="Chọn loại..."
              options={CONTRACT_TYPES.map((t) => ({
                value: t,
                label: CONTRACT_TYPE_LABELS[t],
              }))}
            />
          </Form.Item>
          <Form.Item name="status" label="Trạng thái" style={{ flex: 1 }}>
            <Select
              placeholder="Chọn trạng thái..."
              options={CONTRACT_STATUSES.map((s) => ({
                value: s,
                label: CONTRACT_STATUS_LABELS[s],
              }))}
            />
          </Form.Item>
        </Space>

        {/* Ngày bắt đầu + Ngày kết thúc */}
        <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
          <Form.Item
            name="startDate" label="Ngày bắt đầu" style={{ flex: 1 }}
            rules={[{ required: true, message: 'Chọn ngày bắt đầu' }]}
          >
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Chọn ngày" />
          </Form.Item>
          <Form.Item name="endDate" label="Ngày kết thúc (tuỳ chọn)" style={{ flex: 1 }}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Để trống nếu vô hạn" />
          </Form.Item>
        </Space>

        {/* Lương tháng */}
        <Form.Item
          name="salaryMonthly" label="Lương tháng (VND)"
          rules={[{ required: true, message: 'Nhập mức lương' }]}
        >
          <InputNumber<number>
            style={{ width: '100%' }}
            min={0}
            step={500000}
            formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={(v) => Number(v?.replace(/,/g, '') ?? 0)}
            placeholder="VD: 15,000,000"
          />
        </Form.Item>

        {/* Ngày ký */}
        <Form.Item name="signedAt" label="Ngày ký (tuỳ chọn)">
          <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Chọn ngày ký" />
        </Form.Item>

        {/* Ghi chú */}
        <Form.Item name="note" label="Ghi chú (tuỳ chọn)">
          <Input.TextArea rows={3} placeholder="Ghi chú thêm về hợp đồng..." />
        </Form.Item>
      </Form>
    </CenteredModal>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ContractsPage() {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const { token } = theme.useToken();
  const { isDark, bgContainer, borderColor, textPrimary, textMuted, textSecondary } = useThemePalette();

  // State
  const [page, setPage]                     = useState(1);
  const [pageSize, setPageSize]             = useState(20);
  const [searchText, setSearchText]         = useState('');
  const [filterStatus, setFilterStatus]     = useState<ContractStatus | ''>('');
  const [filterType, setFilterType]         = useState<ContractType | ''>('');
  const [drawerOpen, setDrawerOpen]         = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);

  // ── Query ─────────────────────────────────────────────────────────────────
  const { data: paginated, isLoading } = useQuery({
    queryKey: ['contracts', page, pageSize],
    queryFn: () => contractsApi.list({ page, limit: pageSize }),
    placeholderData: (prev) => prev,
  });

  // Client-side filtering
  const filteredData = useMemo(() => {
    const all = paginated?.data ?? [];
    return all.filter((c) => {
      if (searchText) {
        const q = searchText.toLowerCase();
        if (!c.employee.fullName.toLowerCase().includes(q)) return false;
      }
      if (filterStatus && c.status !== filterStatus) return false;
      if (filterType   && c.type   !== filterType)   return false;
      return true;
    });
  }, [paginated?.data, searchText, filterStatus, filterType]);

  // ── Delete mutation ───────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: contractsApi.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contracts'] });
      message.success('Đã xoá hợp đồng');
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      message.error(err.response?.data?.message ?? 'Xoá thất bại'),
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleOpenCreate() {
    setEditingContract(null);
    setDrawerOpen(true);
  }

  function handleOpenEdit(contract: Contract) {
    setEditingContract(contract);
    setDrawerOpen(true);
  }

  function handleDrawerClose() {
    setDrawerOpen(false);
    setEditingContract(null);
  }

  // ── Columns ───────────────────────────────────────────────────────────────
  const columns: ColumnsType<Contract> = [
    {
      title: 'Nhân viên',
      dataIndex: ['employee', 'fullName'],
      ellipsis: true,
      render: (name: string, r: Contract) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, color: textPrimary }}>{name}</div>
          {r.employee.position && (
            <div style={{ fontSize: 11, color: textMuted }}>{r.employee.position}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Loại hợp đồng',
      dataIndex: 'type',
      width: 130,
      render: (type: ContractType) => <TypeBadge type={type} isDark={isDark} />,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 140,
      render: (status: ContractStatus) => <StatusBadge status={status} isDark={isDark} />,
    },
    {
      title: 'Ngày bắt đầu',
      dataIndex: 'startDate',
      width: 120,
      render: (v: string) => (
        <span style={{ fontSize: 12, color: textSecondary }}>
          {dayjs(v).format('DD/MM/YYYY')}
        </span>
      ),
    },
    {
      title: 'Ngày kết thúc',
      dataIndex: 'endDate',
      width: 120,
      render: (v: string | null) => v ? (
        <span style={{ fontSize: 12, color: textSecondary }}>
          {dayjs(v).format('DD/MM/YYYY')}
        </span>
      ) : (
        <span style={{ fontSize: 12, color: textMuted }}>Vô thời hạn</span>
      ),
    },
    {
      title: 'Lương tháng',
      dataIndex: 'salaryMonthly',
      width: 140,
      align: 'right',
      render: (v: number, r: Contract) => (
        <span style={{ fontSize: 13, fontWeight: 600, color: textPrimary, fontVariantNumeric: 'tabular-nums' }}>
          {formatNumber(v)} {r.currency || 'VND'}
        </span>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 72,
      render: (_: unknown, r: Contract) => (
        <Space size={2}>
          <Tooltip title="Chỉnh sửa">
            <Button
              type="text" size="small"
              icon={<EditOutlined />}
              onClick={() => handleOpenEdit(r)}
            />
          </Tooltip>
          <Popconfirm
            title="Xoá hợp đồng này?"
            description="Hành động này không thể hoàn tác."
            onConfirm={() => deleteMutation.mutate(r.id)}
            okText="Xoá" cancelText="Huỷ" okButtonProps={{ danger: true }}
          >
            <Tooltip title="Xoá">
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '20px 24px', minHeight: '100vh', background: token.colorBgLayout }}>

      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ margin: 0, color: textPrimary }}>
            <FileTextOutlined style={{ marginRight: 8, color: token.colorPrimary }} />
            Quản lý hợp đồng
          </Title>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: textSecondary }}>
            {paginated?.total ?? 0} hợp đồng
          </p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}>
          Hợp đồng mới
        </Button>
      </div>

      {/* Filter Bar */}
      <div style={{
        display: 'flex', gap: 10, flexWrap: 'wrap',
        marginBottom: 16,
        padding: '12px 16px',
        background: bgContainer,
        border: `1px solid ${borderColor}`,
        borderRadius: 10,
      }}>
        <Input
          prefix={<SearchOutlined style={{ color: token.colorTextTertiary }} />}
          placeholder="Tìm theo tên nhân viên..."
          style={{ width: 240 }}
          value={searchText}
          onChange={(e) => { setSearchText(e.target.value); setPage(1); }}
          allowClear
        />
        <Select
          placeholder="Trạng thái"
          style={{ minWidth: 160 }}
          value={filterStatus || undefined}
          onChange={(v) => { setFilterStatus(v ?? ''); setPage(1); }}
          allowClear
          options={CONTRACT_STATUSES.map((s) => ({
            value: s,
            label: CONTRACT_STATUS_LABELS[s],
          }))}
        />
        <Select
          placeholder="Loại hợp đồng"
          style={{ minWidth: 160 }}
          value={filterType || undefined}
          onChange={(v) => { setFilterType(v ?? ''); setPage(1); }}
          allowClear
          options={CONTRACT_TYPES.map((t) => ({
            value: t,
            label: CONTRACT_TYPE_LABELS[t],
          }))}
        />
      </div>

      {/* Table */}
      <div style={{
        background: bgContainer,
        border: `1px solid ${borderColor}`,
        borderRadius: 10,
        overflow: 'hidden',
      }}>
        <Table<Contract>
          dataSource={filteredData}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          size="small"
          scroll={{ x: 900 }}
          locale={{ emptyText: 'Không có hợp đồng phù hợp' }}
          pagination={{
            current: page,
            pageSize,
            total: paginated?.total ?? 0,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            showTotal: (total) => `${total} hợp đồng`,
            onChange: (p, ps) => { setPage(p); setPageSize(ps); },
          }}
        />
      </div>

      {/* Contract Drawer */}
      <ContractDrawer
        open={drawerOpen}
        editing={editingContract}
        onClose={handleDrawerClose}
        isDark={isDark}
      />
    </div>
  );
}
