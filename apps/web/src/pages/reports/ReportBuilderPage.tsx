import { useState, useMemo } from 'react';
import {
  Row,
  Col,
  Select,
  Checkbox,
  Button,
  Input,
  Table,
  Modal,
  Form,
  App,
  Typography,
  Divider,
  Space,
  Tag,
  Spin,
  Steps,
} from 'antd';
import {
  BuildOutlined,
  PlayCircleOutlined,
  DownloadOutlined,
  SaveOutlined,
  PlusOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useThemePalette } from '../../hooks/useThemePalette';
import { PageHeader } from '../../components/ui/PageHeader';

const { Text } = Typography;

// ── Types ──────────────────────────────────────────────────────────────────────

type EntityKey = string;

interface ColumnDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'status';
}

interface FilterRow {
  id: number;
  field: string;
  operator: '=' | '>' | '<' | 'contains';
  value: string;
}

interface PreviewResult {
  rows: Record<string, unknown>[];
  total: number;
}

const OPERATORS: { value: FilterRow['operator']; label: string }[] = [
  { value: '=',        label: '= bằng'    },
  { value: '>',        label: '> lớn hơn' },
  { value: '<',        label: '< nhỏ hơn' },
  { value: 'contains', label: 'contains'  },
];

const ENTITY_LABELS: Record<string, string> = {
  Employee: 'Employee — Nhân viên',
  Project:  'Project — Dự án',
  Invoice:  'Invoice — Hoá đơn',
  Leave:    'Leave — Nghỉ phép',
  Expense:  'Expense — Chi phí',
  Payroll:  'Payroll — Bảng lương',
};

// ── Status pill helper ─────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, { bg: string; color: string }> = {
  ACTIVE:    { bg: '#ECFDF5', color: '#065F46' },
  INACTIVE:  { bg: '#F1F5F9', color: '#94A3B8' },
  APPROVED:  { bg: '#ECFDF5', color: '#065F46' },
  PENDING:   { bg: '#FFFBEB', color: '#92400E' },
  REJECTED:  { bg: '#FEF2F2', color: '#991B1B' },
  PAID:      { bg: '#EEF2FF', color: '#3730A3' },
  OVERDUE:   { bg: '#FEF2F2', color: '#991B1B' },
  SENT:      { bg: '#EFF6FF', color: '#1D4ED8' },
  DRAFT:     { bg: '#F8FAFC', color: '#94A3B8' },
  COMPLETED: { bg: '#ECFDF5', color: '#065F46' },
  ON_HOLD:   { bg: '#FFFBEB', color: '#92400E' },
  PLANNING:  { bg: '#EEF2FF', color: '#3730A3' },
};

function StatusPill({ value }: { value: string }) {
  const { isDark } = useThemePalette();
  const cfg = STATUS_COLOR[value] ?? { bg: '#F1F5F9', color: '#94A3B8' };
  const bg = isDark ? `${cfg.color}20` : cfg.bg;
  return (
    <span style={{ fontSize: 11, fontWeight: 600, borderRadius: 9999, padding: '2px 8px', background: bg, color: cfg.color }}>
      {value}
    </span>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

const MAX_COLS = 8;
const STEPS = ['Chọn Entity', 'Chọn Cột', 'Bộ lọc', 'Preview & Export'];

export default function ReportBuilderPage() {
  const { message } = App.useApp();
  const { isDark, textPrimary, textMuted, bgContainer, bgCard, borderColor, linkColor } = useThemePalette();

  const [step, setStep]                       = useState(0);
  const [entity, setEntity]                   = useState<EntityKey>('Employee');
  const [selectedCols, setSelectedCols]       = useState<string[]>([]);
  const [filters, setFilters]                 = useState<FilterRow[]>([]);
  const [filterIdSeq, setFilterIdSeq]         = useState(1);
  const [previewData, setPreviewData]         = useState<PreviewResult | null>(null);
  const [saveModalOpen, setSaveModalOpen]     = useState(false);
  const [saveForm]                            = Form.useForm<{ reportName: string }>();

  // Load entities from API
  const { data: entitiesMap = {}, isLoading: loadingEntities } = useQuery<Record<string, ColumnDef[]>>({
    queryKey: ['builder-entities'],
    queryFn: () => axios.get('/api/v1/reports/builder/entities').then(r => r.data),
    staleTime: 3_600_000,
  });

  const availableCols: ColumnDef[] = entitiesMap[entity] ?? [];

  // Auto-select first 4 cols when entity changes
  const handleEntityChange = (val: EntityKey) => {
    setEntity(val);
    const cols = (entitiesMap[val] ?? []).slice(0, 4).map(c => c.key);
    setSelectedCols(cols);
    setPreviewData(null);
    setFilters([]);
  };

  const toggleCol = (key: string) => {
    setSelectedCols(prev => {
      if (prev.includes(key)) return prev.filter(k => k !== key);
      if (prev.length >= MAX_COLS) {
        void message.warning(`Tối đa ${MAX_COLS} cột`);
        return prev;
      }
      return [...prev, key];
    });
  };

  const addFilter = () => {
    const firstField = availableCols[0]?.key ?? '';
    setFilters(prev => [...prev, { id: filterIdSeq, field: firstField, operator: '=', value: '' }]);
    setFilterIdSeq(n => n + 1);
  };

  const removeFilter = (id: number) => setFilters(prev => prev.filter(f => f.id !== id));
  const updateFilter = (id: number, patch: Partial<FilterRow>) =>
    setFilters(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f));

  // Preview mutation
  const previewMutation = useMutation({
    mutationFn: () =>
      axios.post<PreviewResult>('/api/v1/reports/builder/preview', {
        entity,
        columns: selectedCols,
        filters: filters.map(f => ({ field: f.field, op: f.operator, value: f.value })),
      }).then(r => r.data),
    onSuccess: (data) => {
      setPreviewData(data);
      void message.success(`Tải ${data.total} dòng thành công`);
    },
    onError: () => void message.error('Lỗi tải dữ liệu'),
  });

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: () =>
      axios.post('/api/v1/reports/builder/export', {
        entity,
        columns: selectedCols,
        filters: filters.map(f => ({ field: f.field, op: f.operator, value: f.value })),
      }, { responseType: 'blob' }).then(r => r.data as Blob),
    onSuccess: (blob) => {
      const url  = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href  = url;
      link.download = `report-${entity.toLowerCase()}-${dayjs().format('YYYYMMDD')}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
      void message.success('Đã tải Excel');
    },
    onError: () => void message.error('Lỗi xuất Excel'),
  });

  // Table columns derived from selected cols
  const tableColumns = useMemo(() =>
    selectedCols.map(key => {
      const colDef = availableCols.find(c => c.key === key);
      return {
        title: <Text style={{ color: textMuted }}>{colDef?.label ?? key}</Text>,
        dataIndex: key,
        key,
        ellipsis: true,
        render: (v: unknown) => {
          if (v === undefined || v === null) return <Text style={{ color: textMuted }}>—</Text>;
          const str = String(v);
          if (colDef?.type === 'status')  return <StatusPill value={str} />;
          if (colDef?.type === 'number')  return <Text style={{ color: linkColor, fontWeight: 600 }}>{str}</Text>;
          return <Text style={{ color: textPrimary }}>{str}</Text>;
        },
      };
    }),
    [selectedCols, availableCols, textMuted, textPrimary, linkColor],
  );

  const handleSave = (values: { reportName: string }) => {
    void message.success(`Đã lưu báo cáo "${values.reportName}"`);
    setSaveModalOpen(false);
    saveForm.resetFields();
  };

  const panelStyle: React.CSSProperties = {
    background: bgContainer,
    border: `1px solid ${borderColor}`,
    borderRadius: 12,
    padding: 20,
  };

  const canNext = [
    true,                        // step 0 always valid
    selectedCols.length > 0,     // step 1 needs cols
    true,                        // step 2 filters optional
    false,                       // step 3 is final
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Report Builder"
        icon={<BuildOutlined />}
        iconColor="#6366F1"
      />

      {/* Steps header */}
      <div style={{ ...panelStyle, marginBottom: 20 }}>
        <Steps
          current={step}
          size="small"
          items={STEPS.map((title, i) => ({
            title: <Text style={{ color: i === step ? linkColor : i < step ? '#10B981' : textMuted, fontSize: 13 }}>{title}</Text>,
            icon: i < step ? <CheckOutlined style={{ color: '#10B981' }} /> : undefined,
          }))}
        />
      </div>

      <Row gutter={[16, 16]}>
        {/* ── Left panel ───────────────────────────────────────────────────── */}
        <Col xs={24} lg={8}>
          <div style={panelStyle}>
            {loadingEntities ? (
              <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
            ) : (
              <>
                {/* Step 0: Entity */}
                {step === 0 && (
                  <div>
                    <Text style={{ color: textMuted, fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 12 }}>
                      Chọn nguồn dữ liệu
                    </Text>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {Object.keys(entitiesMap).map(key => (
                        <div
                          key={key}
                          style={{
                            padding: '12px 16px',
                            borderRadius: 10,
                            border: `2px solid ${entity === key ? (isDark ? linkColor : '#6366F1') : borderColor}`,
                            background: entity === key ? (isDark ? `${linkColor}15` : '#EEF2FF') : bgCard,
                            cursor: 'pointer',
                          }}
                          onClick={() => handleEntityChange(key)}
                          role="radio"
                          aria-checked={entity === key}
                          tabIndex={0}
                        >
                          <Text style={{ color: entity === key ? linkColor : textPrimary, fontWeight: entity === key ? 600 : 400, fontSize: 14 }}>
                            {ENTITY_LABELS[key] ?? key}
                          </Text>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 1: Columns */}
                {step === 1 && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <Text style={{ color: textMuted, fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                        Cột hiển thị
                      </Text>
                      <Text style={{ color: textMuted, fontSize: 11 }}>{selectedCols.length}/{MAX_COLS}</Text>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {availableCols.map(col => (
                        <div
                          key={col.key}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '8px 10px', borderRadius: 8,
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
                              onClick={e => e.stopPropagation()}
                            />
                            <Text style={{ color: textPrimary, fontSize: 13 }}>{col.label}</Text>
                          </div>
                          <Tag style={{ fontSize: 10, padding: '0 4px', marginRight: 0, opacity: 0.6 }}>{col.type}</Tag>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 2: Filters */}
                {step === 2 && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <Text style={{ color: textMuted, fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                        Bộ lọc
                      </Text>
                      <Button
                        type="link" size="small" icon={<PlusOutlined />}
                        style={{ color: linkColor, padding: 0 }}
                        onClick={addFilter}
                      >
                        Thêm điều kiện
                      </Button>
                    </div>

                    {filters.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <Text style={{ color: textMuted, fontSize: 12 }}>Chưa có bộ lọc — bỏ qua để lấy tất cả</Text>
                      </div>
                    )}

                    {filters.map(f => (
                      <div
                        key={f.id}
                        style={{ display: 'flex', gap: 6, marginBottom: 8, padding: '8px 10px', borderRadius: 8, background: bgCard, border: `1px solid ${borderColor}` }}
                      >
                        <Select
                          size="small" value={f.field}
                          onChange={v => updateFilter(f.id, { field: v })}
                          style={{ flex: 2, minWidth: 0 }}
                          options={availableCols.map(c => ({ value: c.key, label: c.label }))}
                        />
                        <Select
                          size="small" value={f.operator}
                          onChange={v => updateFilter(f.id, { operator: v as FilterRow['operator'] })}
                          style={{ flex: 1.5, minWidth: 0 }}
                          options={OPERATORS}
                        />
                        <Input
                          size="small" value={f.value}
                          onChange={e => updateFilter(f.id, { value: e.target.value })}
                          placeholder="Giá trị"
                          style={{ flex: 2, minWidth: 0 }}
                        />
                        <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => removeFilter(f.id)} style={{ flexShrink: 0 }} />
                      </div>
                    ))}
                  </div>
                )}

                {/* Step 3: Actions */}
                {step === 3 && (
                  <div>
                    <Text style={{ color: textMuted, fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 12 }}>
                      Tuỳ chọn
                    </Text>
                    <div style={{ marginBottom: 12 }}>
                      <Text style={{ color: textMuted, fontSize: 12, display: 'block', marginBottom: 4 }}>Entity:</Text>
                      <Text style={{ color: textPrimary, fontWeight: 600 }}>{ENTITY_LABELS[entity] ?? entity}</Text>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <Text style={{ color: textMuted, fontSize: 12, display: 'block', marginBottom: 4 }}>Cột đã chọn:</Text>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {selectedCols.map(k => {
                          const col = availableCols.find(c => c.key === k);
                          return <Tag key={k} style={{ fontSize: 11 }}>{col?.label ?? k}</Tag>;
                        })}
                      </div>
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <Text style={{ color: textMuted, fontSize: 12, display: 'block', marginBottom: 4 }}>Bộ lọc:</Text>
                      {filters.length === 0
                        ? <Text style={{ color: textMuted, fontSize: 12 }}>Không có</Text>
                        : filters.map(f => (
                          <Text key={f.id} style={{ color: textMuted, fontSize: 12, display: 'block' }}>
                            {f.field} {f.operator} "{f.value}"
                          </Text>
                        ))
                      }
                    </div>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Button
                        type="primary" block icon={<PlayCircleOutlined />}
                        loading={previewMutation.isPending}
                        onClick={() => previewMutation.mutate()}
                        style={{ borderRadius: 8, height: 40, fontWeight: 600 }}
                      >
                        Chạy báo cáo
                      </Button>
                      <Button
                        block icon={<DownloadOutlined />}
                        loading={exportMutation.isPending}
                        disabled={!previewData}
                        onClick={() => exportMutation.mutate()}
                        style={{ borderRadius: 8, height: 36 }}
                      >
                        Export Excel
                      </Button>
                      <Button
                        block icon={<SaveOutlined />} ghost
                        disabled={!previewData}
                        onClick={() => setSaveModalOpen(true)}
                        style={{ borderRadius: 8, height: 36 }}
                      >
                        Lưu báo cáo
                      </Button>
                    </Space>
                  </div>
                )}

                <Divider style={{ borderColor, margin: '16px 0' }} />

                {/* Nav buttons */}
                <div style={{ display: 'flex', gap: 8 }}>
                  {step > 0 && (
                    <Button icon={<ArrowLeftOutlined />} onClick={() => setStep(s => s - 1)} style={{ flex: 1 }}>
                      Quay lại
                    </Button>
                  )}
                  {step < STEPS.length - 1 && (
                    <Button
                      type="primary" icon={<ArrowRightOutlined />}
                      disabled={!canNext[step]}
                      onClick={() => setStep(s => s + 1)}
                      style={{ flex: 1 }}
                    >
                      Tiếp tục
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </Col>

        {/* ── Right panel: Preview ──────────────────────────────────────────── */}
        <Col xs={24} lg={16}>
          <div style={{ ...panelStyle, display: 'flex', flexDirection: 'column', minHeight: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <Text style={{ color: textPrimary, fontWeight: 700, fontSize: 15 }}>
                  Preview — {ENTITY_LABELS[entity] ?? entity}
                </Text>
                {previewData && (
                  <Text style={{ color: textMuted, fontSize: 12, marginLeft: 10 }}>
                    {previewData.total} dòng · {selectedCols.length} cột
                  </Text>
                )}
              </div>
            </div>

            {!previewData ? (
              <div
                style={{
                  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', padding: 48, background: bgCard, borderRadius: 10,
                  border: `1px dashed ${borderColor}`,
                }}
              >
                <BuildOutlined style={{ fontSize: 48, color: textMuted, marginBottom: 16 }} />
                <Text style={{ color: textMuted, fontSize: 14 }}>
                  Hoàn tất các bước và nhấn "Chạy báo cáo" để xem kết quả
                </Text>
              </div>
            ) : (
              <div style={{ flex: 1, overflow: 'auto' }}>
                <Table
                  rowKey={(_, i) => String(i)}
                  columns={tableColumns}
                  dataSource={previewData.rows}
                  size="small"
                  pagination={false}
                  scroll={{ x: 'max-content' }}
                  locale={{ emptyText: <Text style={{ color: textMuted }}>Không có dữ liệu</Text> }}
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
        <Form form={saveForm} layout="vertical" onFinish={handleSave}>
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
              <Button type="primary" htmlType="submit">Lưu</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
