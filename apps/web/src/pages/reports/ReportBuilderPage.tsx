import { useState } from 'react';
import {
  Row,
  Col,
  Select,
  Checkbox,
  Button,
  Input,
  Table,
  Tooltip,
  Modal,
  Form,
  App,
  Typography,
  Divider,
  Space,
  Tag,
} from 'antd';
import {
  BuildOutlined,
  PlayCircleOutlined,
  DownloadOutlined,
  SaveOutlined,
  PlusOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useThemePalette } from '../../hooks/useThemePalette';
import { PageHeader } from '../../components/ui/PageHeader';

const { Text } = Typography;

// ── Entity & Column definitions ──────────────────────────────────────────────

type EntityKey = 'Employee' | 'Project' | 'Invoice' | 'Leave' | 'Expense';

interface ColumnDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'status';
}

const entityColumnMap: Record<EntityKey, ColumnDef[]> = {
  Employee: [
    { key: 'id',         label: 'Mã NV',       type: 'text' },
    { key: 'fullName',   label: 'Họ tên',       type: 'text' },
    { key: 'email',      label: 'Email',        type: 'text' },
    { key: 'department', label: 'Phòng ban',    type: 'text' },
    { key: 'position',   label: 'Chức vụ',      type: 'text' },
    { key: 'startDate',  label: 'Ngày vào làm', type: 'date' },
    { key: 'status',     label: 'Trạng thái',   type: 'status' },
  ],
  Project: [
    { key: 'name',      label: 'Tên dự án',    type: 'text' },
    { key: 'status',    label: 'Trạng thái',   type: 'status' },
    { key: 'pm',        label: 'PM',           type: 'text' },
    { key: 'startDate', label: 'Ngày bắt đầu', type: 'date' },
    { key: 'endDate',   label: 'Ngày kết thúc',type: 'date' },
    { key: 'budget',    label: 'Ngân sách',    type: 'number' },
    { key: 'margin',    label: 'Margin %',     type: 'number' },
  ],
  Invoice: [
    { key: 'code',     label: 'Số hoá đơn',   type: 'text' },
    { key: 'customer', label: 'Khách hàng',   type: 'text' },
    { key: 'type',     label: 'Loại',         type: 'status' },
    { key: 'amount',   label: 'Số tiền',      type: 'number' },
    { key: 'status',   label: 'Trạng thái',   type: 'status' },
    { key: 'dueDate',  label: 'Hạn thanh toán',type: 'date' },
  ],
  Leave: [
    { key: 'employee',  label: 'Nhân viên',  type: 'text' },
    { key: 'type',      label: 'Loại phép',  type: 'text' },
    { key: 'startDate', label: 'Từ ngày',    type: 'date' },
    { key: 'days',      label: 'Số ngày',    type: 'number' },
    { key: 'status',    label: 'Trạng thái', type: 'status' },
  ],
  Expense: [
    { key: 'title',       label: 'Tiêu đề',     type: 'text' },
    { key: 'employee',    label: 'Nhân viên',    type: 'text' },
    { key: 'amount',      label: 'Số tiền',      type: 'number' },
    { key: 'category',    label: 'Danh mục',     type: 'text' },
    { key: 'status',      label: 'Trạng thái',   type: 'status' },
    { key: 'submittedAt', label: 'Ngày nộp',     type: 'date' },
  ],
};

// ── Mock data generators ──────────────────────────────────────────────────────

function generateMockRows(entity: EntityKey, columns: string[]): Record<string, unknown>[] {
  const rows10: Record<string, unknown>[] = [];

  const EMPLOYEES = ['Nguyễn Văn An', 'Trần Thị Bình', 'Lê Hoàng Cường', 'Phạm Thị Dung', 'Võ Minh Đức', 'Hoàng Tuấn Anh', 'Đặng Thị Hoa', 'Bùi Văn Khoa', 'Ngô Thị Lan', 'Vũ Mạnh Hùng'];
  const DEPTS = ['Kỹ thuật', 'Marketing', 'Kinh doanh', 'HR', 'Finance'];
  const POSITIONS = ['Senior Dev', 'PM', 'Business Analyst', 'Designer', 'Tester'];
  const STATUSES = ['ACTIVE', 'INACTIVE', 'ON_LEAVE'];
  const PROJECTS = ['Loop ERP v5', 'CRM Nâng cấp', 'Mobile App', 'Data Platform', 'Portal KH', 'BI Dashboard', 'AI Assistant', 'API Gateway', 'Cloud Migration', 'Security Audit'];
  const PROJ_STATUSES = ['ACTIVE', 'COMPLETED', 'ON_HOLD', 'PLANNING'];
  const CUSTOMERS = ['Công ty ABC', 'Tập đoàn XYZ', 'Cty TNHH DEF', 'MSC Corp', 'TechVN Ltd'];
  const LEAVE_TYPES = ['Phép năm', 'Nghỉ ốm', 'Phép đặc biệt', 'Nghỉ bù'];
  const LEAVE_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'];
  const EXPENSE_CATS = ['Di chuyển', 'Văn phòng phẩm', 'Đào tạo', 'Khách hàng', 'Khác'];
  const EXPENSE_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'PAID'];
  const INV_TYPES = ['SALE', 'SERVICE', 'REFUND'];
  const INV_STATUSES = ['DRAFT', 'SENT', 'PAID', 'OVERDUE'];

  for (let i = 0; i < 10; i++) {
    const row: Record<string, unknown> = { _key: i };
    if (entity === 'Employee') {
      if (columns.includes('id'))         row.id         = `NV-${String(1000 + i + 1).slice(-4)}`;
      if (columns.includes('fullName'))   row.fullName   = EMPLOYEES[i];
      if (columns.includes('email'))      row.email      = `${EMPLOYEES[i].split(' ').pop()?.toLowerCase() ?? 'user'}${i + 1}@loop.vn`;
      if (columns.includes('department')) row.department = DEPTS[i % DEPTS.length];
      if (columns.includes('position'))   row.position   = POSITIONS[i % POSITIONS.length];
      if (columns.includes('startDate'))  row.startDate  = dayjs().subtract(i * 6 + 3, 'month').format('DD/MM/YYYY');
      if (columns.includes('status'))     row.status     = STATUSES[i % STATUSES.length];
    } else if (entity === 'Project') {
      if (columns.includes('name'))      row.name      = PROJECTS[i];
      if (columns.includes('status'))    row.status    = PROJ_STATUSES[i % PROJ_STATUSES.length];
      if (columns.includes('pm'))        row.pm        = EMPLOYEES[i % EMPLOYEES.length];
      if (columns.includes('startDate')) row.startDate = dayjs().subtract(i * 2 + 1, 'month').format('DD/MM/YYYY');
      if (columns.includes('endDate'))   row.endDate   = dayjs().add(i * 1.5 + 2, 'month').format('DD/MM/YYYY');
      if (columns.includes('budget'))    row.budget    = `${(500 + i * 200).toLocaleString('vi-VN')} tr`;
      if (columns.includes('margin'))    row.margin    = `${18 + i * 2}%`;
    } else if (entity === 'Invoice') {
      if (columns.includes('code'))     row.code     = `INV-2026-${String(40 + i + 1).padStart(3, '0')}`;
      if (columns.includes('customer')) row.customer = CUSTOMERS[i % CUSTOMERS.length];
      if (columns.includes('type'))     row.type     = INV_TYPES[i % INV_TYPES.length];
      if (columns.includes('amount'))   row.amount   = `${(10 + i * 5).toLocaleString('vi-VN')} tr`;
      if (columns.includes('status'))   row.status   = INV_STATUSES[i % INV_STATUSES.length];
      if (columns.includes('dueDate'))  row.dueDate  = dayjs().add(i * 5 - 10, 'day').format('DD/MM/YYYY');
    } else if (entity === 'Leave') {
      if (columns.includes('employee'))  row.employee  = EMPLOYEES[i];
      if (columns.includes('type'))      row.type      = LEAVE_TYPES[i % LEAVE_TYPES.length];
      if (columns.includes('startDate')) row.startDate = dayjs().subtract(i * 3, 'day').format('DD/MM/YYYY');
      if (columns.includes('days'))      row.days      = 1 + (i % 5);
      if (columns.includes('status'))    row.status    = LEAVE_STATUSES[i % LEAVE_STATUSES.length];
    } else if (entity === 'Expense') {
      if (columns.includes('title'))       row.title       = `Chi phí ${EXPENSE_CATS[i % EXPENSE_CATS.length].toLowerCase()} tháng ${dayjs().month() + 1}`;
      if (columns.includes('employee'))    row.employee    = EMPLOYEES[i];
      if (columns.includes('amount'))      row.amount      = `${(200 + i * 150).toLocaleString('vi-VN')} K`;
      if (columns.includes('category'))    row.category    = EXPENSE_CATS[i % EXPENSE_CATS.length];
      if (columns.includes('status'))      row.status      = EXPENSE_STATUSES[i % EXPENSE_STATUSES.length];
      if (columns.includes('submittedAt')) row.submittedAt = dayjs().subtract(i * 2, 'day').format('DD/MM/YYYY');
    }
    rows10.push(row);
  }
  return rows10;
}

// ── Filter row type ───────────────────────────────────────────────────────────

interface FilterRow {
  id: number;
  field: string;
  operator: string;
  value: string;
}

const OPERATORS = [
  { value: '=',        label: '= bằng' },
  { value: '>',        label: '> lớn hơn' },
  { value: '<',        label: '< nhỏ hơn' },
  { value: 'contains', label: 'contains' },
];

// ── Status pill helper ────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, { bg: string; color: string }> = {
  ACTIVE:       { bg: '#ECFDF5', color: '#065F46' },
  INACTIVE:     { bg: '#F1F5F9', color: '#475569' },
  APPROVED:     { bg: '#ECFDF5', color: '#065F46' },
  PENDING:      { bg: '#FFFBEB', color: '#92400E' },
  REJECTED:     { bg: '#FEF2F2', color: '#991B1B' },
  PAID:         { bg: '#EEF2FF', color: '#3730A3' },
  OVERDUE:      { bg: '#FEF2F2', color: '#991B1B' },
  SENT:         { bg: '#EFF6FF', color: '#1D4ED8' },
  DRAFT:        { bg: '#F8FAFC', color: '#475569' },
  COMPLETED:    { bg: '#ECFDF5', color: '#065F46' },
  ON_HOLD:      { bg: '#FFFBEB', color: '#92400E' },
  PLANNING:     { bg: '#EEF2FF', color: '#3730A3' },
  ON_LEAVE:     { bg: '#FFF7ED', color: '#9A3412' },
};

function StatusPill({ value }: { value: string }) {
  const cfg = STATUS_COLOR[value] ?? { bg: '#F1F5F9', color: '#475569' };
  return (
    <span style={{ fontSize: 11, fontWeight: 600, borderRadius: 9999, padding: '2px 8px', background: cfg.bg, color: cfg.color }}>
      {value}
    </span>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ReportBuilderPage() {
  const { message } = App.useApp();
  const { isDark, textPrimary, textMuted, bgContainer, bgCard, borderColor, linkColor } = useThemePalette();

  const [entity, setEntity]           = useState<EntityKey>('Employee');
  const [selectedCols, setSelectedCols] = useState<string[]>(['id', 'fullName', 'email', 'department']);
  const [filters, setFilters]           = useState<FilterRow[]>([]);
  const [filterIdSeq, setFilterIdSeq]   = useState(1);
  const [hasRun, setHasRun]             = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveForm] = Form.useForm<{ reportName: string }>();

  const availableCols = entityColumnMap[entity] ?? [];
  const MAX_COLS = 8;

  // Limit selected cols to first MAX_COLS when entity changes
  const handleEntityChange = (val: EntityKey) => {
    setEntity(val);
    const defaultCols = (entityColumnMap[val] ?? []).slice(0, 4).map((c) => c.key);
    setSelectedCols(defaultCols);
    setHasRun(false);
  };

  const toggleCol = (key: string) => {
    setSelectedCols((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      if (prev.length >= MAX_COLS) {
        void message.warning(`Tối đa ${MAX_COLS} cột`);
        return prev;
      }
      return [...prev, key];
    });
  };

  const addFilter = () => {
    const firstField = availableCols[0]?.key ?? '';
    setFilters((prev) => [...prev, { id: filterIdSeq, field: firstField, operator: '=', value: '' }]);
    setFilterIdSeq((n) => n + 1);
  };

  const removeFilter = (id: number) => setFilters((prev) => prev.filter((f) => f.id !== id));

  const updateFilter = (id: number, patch: Partial<FilterRow>) =>
    setFilters((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  const handleRun = () => {
    if (selectedCols.length === 0) {
      void message.warning('Hãy chọn ít nhất 1 cột');
      return;
    }
    setHasRun(true);
    void message.success('Báo cáo đã được tạo');
  };

  const handleSave = async (values: { reportName: string }) => {
    void message.success(`Đã lưu báo cáo "${values.reportName}"`);
    setSaveModalOpen(false);
    saveForm.resetFields();
  };

  // Build table columns + data
  const tableColumns = selectedCols.map((key) => {
    const colDef = availableCols.find((c) => c.key === key);
    return {
      title: colDef?.label ?? key,
      dataIndex: key,
      key,
      ellipsis: true,
      render: (v: unknown) => {
        if (v === undefined || v === null) return <Text style={{ color: textMuted }}>—</Text>;
        const strVal = String(v);
        if (colDef?.type === 'status') return <StatusPill value={strVal} />;
        if (colDef?.type === 'number') return <Text style={{ color: linkColor, fontWeight: 600 }}>{strVal}</Text>;
        return <Text style={{ color: textPrimary }}>{strVal}</Text>;
      },
    };
  });

  const tableData = hasRun ? generateMockRows(entity, selectedCols) : [];

  const panelStyle: React.CSSProperties = {
    background: bgContainer,
    border: `1px solid ${borderColor}`,
    borderRadius: 12,
    padding: 20,
    height: '100%',
  };

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Report Builder"
        icon={<BuildOutlined />}
        iconColor="#6366F1"
      />

      <Row gutter={[16, 16]} align="stretch">
        {/* ── Left panel: Config ─────────────────────────────────────────────── */}
        <Col xs={24} lg={8}>
          <div style={panelStyle}>
            {/* Entity selector */}
            <div style={{ marginBottom: 20 }}>
              <Text style={{ color: textMuted, fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                Entity
              </Text>
              <Select
                value={entity}
                onChange={handleEntityChange}
                style={{ width: '100%' }}
                options={[
                  { value: 'Employee', label: 'Employee — Nhân viên' },
                  { value: 'Project',  label: 'Project — Dự án' },
                  { value: 'Invoice',  label: 'Invoice — Hoá đơn' },
                  { value: 'Leave',    label: 'Leave — Nghỉ phép' },
                  { value: 'Expense',  label: 'Expense — Chi phí' },
                ]}
              />
            </div>

            <Divider style={{ borderColor: borderColor, margin: '0 0 16px' }} />

            {/* Columns */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text style={{ color: textMuted, fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Cột hiển thị
                </Text>
                <Text style={{ color: textMuted, fontSize: 11 }}>
                  {selectedCols.length}/{MAX_COLS}
                </Text>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {availableCols.map((col) => (
                  <div
                    key={col.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 10px',
                      borderRadius: 8,
                      background: selectedCols.includes(col.key) ? (isDark ? `${linkColor}18` : '#EEF2FF') : bgCard,
                      border: `1px solid ${selectedCols.includes(col.key) ? (isDark ? `${linkColor}40` : '#C7D2FE') : borderColor}`,
                      cursor: 'pointer',
                    }}
                    onClick={() => toggleCol(col.key)}
                    role="checkbox"
                    aria-checked={selectedCols.includes(col.key)}
                    tabIndex={0}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Checkbox
                        checked={selectedCols.includes(col.key)}
                        onChange={() => toggleCol(col.key)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Text style={{ color: textPrimary, fontSize: 13 }}>{col.label}</Text>
                    </div>
                    <Tag style={{ fontSize: 10, padding: '0 4px', marginRight: 0, opacity: 0.6 }}>
                      {col.type}
                    </Tag>
                  </div>
                ))}
              </div>
            </div>

            <Divider style={{ borderColor: borderColor, margin: '0 0 16px' }} />

            {/* Filters */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text style={{ color: textMuted, fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Bộ lọc
                </Text>
                <Button
                  type="link"
                  size="small"
                  icon={<PlusOutlined />}
                  style={{ color: linkColor, padding: 0 }}
                  onClick={addFilter}
                >
                  Thêm
                </Button>
              </div>

              {filters.length === 0 && (
                <div style={{ textAlign: 'center', padding: '12px 0' }}>
                  <Text style={{ color: textMuted, fontSize: 12 }}>Chưa có bộ lọc nào</Text>
                </div>
              )}

              {filters.map((f) => (
                <div
                  key={f.id}
                  style={{
                    display: 'flex',
                    gap: 6,
                    marginBottom: 8,
                    padding: '8px 10px',
                    borderRadius: 8,
                    background: bgCard,
                    border: `1px solid ${borderColor}`,
                  }}
                >
                  <Select
                    size="small"
                    value={f.field}
                    onChange={(v) => updateFilter(f.id, { field: v })}
                    style={{ flex: 2, minWidth: 0 }}
                    options={availableCols.map((c) => ({ value: c.key, label: c.label }))}
                  />
                  <Select
                    size="small"
                    value={f.operator}
                    onChange={(v) => updateFilter(f.id, { operator: v })}
                    style={{ flex: 1.5, minWidth: 0 }}
                    options={OPERATORS}
                  />
                  <Input
                    size="small"
                    value={f.value}
                    onChange={(e) => updateFilter(f.id, { value: e.target.value })}
                    placeholder="Giá trị"
                    style={{ flex: 2, minWidth: 0 }}
                  />
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => removeFilter(f.id)}
                    style={{ flexShrink: 0 }}
                  />
                </div>
              ))}
            </div>

            <Button
              type="primary"
              block
              icon={<PlayCircleOutlined />}
              onClick={handleRun}
              style={{ borderRadius: 8, height: 40, fontWeight: 600 }}
            >
              Chạy báo cáo
            </Button>
          </div>
        </Col>

        {/* ── Right panel: Preview ───────────────────────────────────────────── */}
        <Col xs={24} lg={16}>
          <div style={{ ...panelStyle, display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <Text style={{ color: textPrimary, fontWeight: 700, fontSize: 15 }}>
                  Preview — {entity}
                </Text>
                {hasRun && (
                  <Text style={{ color: textMuted, fontSize: 12, marginLeft: 10 }}>
                    {tableData.length} dòng · {selectedCols.length} cột
                  </Text>
                )}
              </div>
              <Space>
                <Tooltip title="Tính năng đang phát triển">
                  <Button
                    icon={<DownloadOutlined />}
                    disabled
                  >
                    Export Excel
                  </Button>
                </Tooltip>
                <Button
                  icon={<SaveOutlined />}
                  type="primary"
                  ghost
                  onClick={() => setSaveModalOpen(true)}
                  disabled={!hasRun}
                >
                  Lưu báo cáo
                </Button>
              </Space>
            </div>

            {/* Preview table */}
            {!hasRun ? (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 48,
                  background: bgCard,
                  borderRadius: 10,
                  border: `1px dashed ${borderColor}`,
                }}
              >
                <BuildOutlined style={{ fontSize: 48, color: textMuted, marginBottom: 16 }} />
                <Text style={{ color: textMuted, fontSize: 14 }}>
                  Chọn entity, cột và nhấn "Chạy báo cáo" để xem kết quả
                </Text>
              </div>
            ) : (
              <div style={{ flex: 1, overflow: 'auto' }}>
                <Table
                  rowKey="_key"
                  columns={tableColumns}
                  dataSource={tableData}
                  size="small"
                  pagination={false}
                  scroll={{ x: 'max-content' }}
                />
              </div>
            )}
          </div>
        </Col>
      </Row>

      {/* Save modal */}
      <Modal
        title={<Text style={{ color: textPrimary }}>Lưu báo cáo</Text>}
        open={saveModalOpen}
        onCancel={() => setSaveModalOpen(false)}
        footer={null}
        centered
        styles={{ content: { background: bgContainer }, header: { background: bgContainer } }}
      >
        <Form
          form={saveForm}
          layout="vertical"
          onFinish={handleSave}
        >
          <Form.Item
            name="reportName"
            label={<Text style={{ color: textPrimary }}>Tên báo cáo</Text>}
            rules={[{ required: true, message: 'Hãy nhập tên báo cáo' }]}
          >
            <Input
              placeholder={`Báo cáo ${entity} — ${dayjs().format('DD/MM/YYYY')}`}
              style={{ borderRadius: 8 }}
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setSaveModalOpen(false)}>Huỷ</Button>
              <Button type="primary" htmlType="submit">
                Lưu
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
