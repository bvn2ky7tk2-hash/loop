import { useState } from 'react';
import {
  Table, Select, Input, DatePicker, Button, Tag, Modal, Typography, Space, Row, Col,
} from 'antd';
import {
  AuditOutlined, SearchOutlined, DownloadOutlined, EyeOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import dayjs, { type Dayjs } from 'dayjs';
import { useThemePalette } from '../../hooks/useThemePalette';
import { PAGE_SIZE_OPTIONS } from '../../hooks/usePagination';
import { PageHeader } from '../../components/ui/PageHeader';
import { FilterBar } from '../../components/FilterBar';
import { auditLogsApi, type AuditLogRecord } from '../../api/audit-logs';

const { Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;

const ACTION_COLORS: Record<string, { light: string; dark: { bg: string; color: string; borderColor: string } }> = {
  CREATE:  { light: 'blue',    dark: { bg: 'rgba(96,165,250,0.15)',   color: '#93C5FD', borderColor: 'rgba(96,165,250,0.3)' } },
  UPDATE:  { light: 'orange',  dark: { bg: 'rgba(251,191,36,0.15)',   color: '#FCD34D', borderColor: 'rgba(251,191,36,0.3)' } },
  DELETE:  { light: 'red',     dark: { bg: 'rgba(248,113,113,0.15)',  color: '#FCA5A5', borderColor: 'rgba(248,113,113,0.3)' } },
  APPROVE: { light: 'green',   dark: { bg: 'rgba(52,211,153,0.15)',   color: '#6EE7B7', borderColor: 'rgba(52,211,153,0.3)' } },
  REJECT:  { light: 'red',     dark: { bg: 'rgba(248,113,113,0.15)',  color: '#FCA5A5', borderColor: 'rgba(248,113,113,0.3)' } },
  EXPORT:  { light: 'purple',  dark: { bg: 'rgba(167,139,250,0.15)',  color: '#C4B5FD', borderColor: 'rgba(167,139,250,0.3)' } },
  LOGIN:   { light: 'default', dark: { bg: 'rgba(148,163,184,0.15)',  color: '#CBD5E1', borderColor: 'rgba(148,163,184,0.3)' } },
};

const MODULE_OPTIONS = [
  { value: 'pm',          label: 'Projects' },
  { value: 'hr',          label: 'HR' },
  { value: 'finance',     label: 'Finance' },
  { value: 'crm',         label: 'CRM' },
  { value: 'admin',       label: 'Admin' },
  { value: 'bpm',         label: 'Workflow' },
  { value: 'timesheet',   label: 'Timesheet' },
  { value: 'reports',     label: 'Reports' },
  { value: 'recruit',     label: 'Recruitment' },
  { value: 'asset',       label: 'Assets' },
  { value: 'procurement', label: 'Procurement' },
];

const ACTION_OPTIONS = [
  { value: 'CREATE',  label: 'CREATE' },
  { value: 'UPDATE',  label: 'UPDATE' },
  { value: 'DELETE',  label: 'DELETE' },
  { value: 'APPROVE', label: 'APPROVE' },
  { value: 'REJECT',  label: 'REJECT' },
  { value: 'EXPORT',  label: 'EXPORT' },
  { value: 'LOGIN',   label: 'LOGIN' },
];

interface Filters {
  module?: string;
  action?: string;
  entity?: string;
  dateRange?: [Dayjs, Dayjs] | null;
  page: number;
  limit: number;
}

export default function AuditLogPage() {
  const { textPrimary, textMuted, bgCard, bgPage, borderColor, isDark } = useThemePalette();

  const [filters, setFilters] = useState<Filters>({ page: 1, limit: 50 });
  const [detailLog, setDetailLog] = useState<AuditLogRecord | null>(null);

  const queryParams = {
    module:   filters.module,
    action:   filters.action,
    entity:   filters.entity,
    dateFrom: filters.dateRange?.[0]?.toISOString(),
    dateTo:   filters.dateRange?.[1]?.endOf('day').toISOString(),
    page:     filters.page,
    limit:    filters.limit,
  };

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', queryParams],
    queryFn:  () => auditLogsApi.list(queryParams),
    placeholderData: (prev) => prev,
  });

  function handleExport() {
    const url = auditLogsApi.exportUrl({
      module:   filters.module,
      action:   filters.action,
      entity:   filters.entity,
      dateFrom: filters.dateRange?.[0]?.toISOString(),
      dateTo:   filters.dateRange?.[1]?.endOf('day').toISOString(),
    });
    window.open(url, '_blank');
  }

  function renderActionTag(action: string) {
    const cfg = ACTION_COLORS[action];
    if (!cfg) {
      return <Tag><Text style={{ color: textMuted }}>{action}</Text></Tag>;
    }
    return isDark
      ? (
        <Tag style={{ background: cfg.dark.bg, color: cfg.dark.color, borderColor: cfg.dark.borderColor }}>
          {action}
        </Tag>
      )
      : (
        <Tag color={cfg.light}>{action}</Tag>
      );
  }

  function renderModuleTag(module: string | null) {
    if (!module) return <Text style={{ color: textMuted }}>—</Text>;
    const label = MODULE_OPTIONS.find((o) => o.value === module)?.label ?? module;
    return isDark
      ? (
        <Tag style={{ background: 'rgba(148,163,184,0.12)', color: '#94A3B8', borderColor: 'rgba(148,163,184,0.25)' }}>
          {label}
        </Tag>
      )
      : (
        <Tag color="default">{label}</Tag>
      );
  }

  const columns = [
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (v: string) => (
        <Text style={{ color: textMuted, fontSize: 13 }}>
          {dayjs(v).format('DD/MM/YYYY HH:mm:ss')}
        </Text>
      ),
    },
    {
      title: 'Người dùng',
      dataIndex: 'user',
      key: 'user',
      width: 160,
      render: (_: unknown, record: AuditLogRecord) => (
        <Text style={{ color: textPrimary }}>
          {record.user?.name ?? record.userId ?? '—'}
        </Text>
      ),
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      width: 100,
      render: (v: string) => renderActionTag(v),
    },
    {
      title: 'Module',
      dataIndex: 'module',
      key: 'module',
      width: 120,
      render: (v: string | null) => renderModuleTag(v),
    },
    {
      title: 'Entity',
      dataIndex: 'entity',
      key: 'entity',
      width: 130,
      render: (v: string) => <Text style={{ color: textPrimary }}>{v}</Text>,
    },
    {
      title: 'Entity ID',
      dataIndex: 'entityId',
      key: 'entityId',
      width: 220,
      render: (v: string | null) =>
        v
          ? (
            <Text
              code
              copyable={{ text: v }}
              style={{ color: textMuted, fontSize: 11, fontFamily: 'monospace' }}
              ellipsis={{ tooltip: v }}
            >
              {v.length > 20 ? `${v.slice(0, 8)}…${v.slice(-8)}` : v}
            </Text>
          )
          : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      title: 'Chi tiết',
      key: 'action-detail',
      width: 80,
      render: (_: unknown, record: AuditLogRecord) =>
        record.oldValues || record.newValues
          ? (
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              style={{ padding: 0 }}
              onClick={() => setDetailLog(record)}
            >
              Xem
            </Button>
          )
          : <Text style={{ color: textMuted }}>—</Text>,
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Audit Log"
        icon={<AuditOutlined />}
        iconColor="#6366F1"
        actions={
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExport}
          >
            Export Excel
          </Button>
        }
      />

      <FilterBar>
        <Select
          allowClear
          placeholder="Module"
          style={{ minWidth: 140 }}
          options={MODULE_OPTIONS}
          value={filters.module}
          onChange={(v) => setFilters((f) => ({ ...f, module: v, page: 1 }))}
        />
        <Select
          allowClear
          placeholder="Action"
          style={{ minWidth: 120 }}
          options={ACTION_OPTIONS}
          value={filters.action}
          onChange={(v) => setFilters((f) => ({ ...f, action: v, page: 1 }))}
        />
        <Input
          prefix={<SearchOutlined />}
          placeholder="Tên entity..."
          style={{ width: 180 }}
          allowClear
          value={filters.entity}
          onChange={(e) => setFilters((f) => ({ ...f, entity: e.target.value || undefined, page: 1 }))}
        />
        <RangePicker
          format="DD/MM/YYYY"
          value={filters.dateRange ?? null}
          onChange={(vals) =>
            setFilters((f) => ({ ...f, dateRange: vals as [Dayjs, Dayjs] | null, page: 1 }))
          }
        />
      </FilterBar>

      <div style={{
        background: bgCard,
        border: `1px solid ${borderColor}`,
        borderRadius: 8,
        overflow: 'hidden',
      }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={data?.data ?? []}
          loading={isLoading}
          scroll={{ x: 1000 }}
          pagination={{
            current:    filters.page,
            pageSize:   filters.limit,
            total:      data?.total ?? 0,
            showSizeChanger: true,
            pageSizeOptions: PAGE_SIZE_OPTIONS,
            locale: { items_per_page: '/ trang' },
            showTotal:  (total) => (
              <Text style={{ color: textMuted }}>Tổng {total} bản ghi</Text>
            ),
            onChange: (page, pageSize) =>
              setFilters((f) => ({ ...f, page, limit: pageSize })),
          }}
        />
      </div>

      {/* Modal chi tiết */}
      <Modal
        open={!!detailLog}
        title={
          <Space>
            <AuditOutlined />
            <span>Chi tiết Audit Log</span>
          </Space>
        }
        footer={null}
        onCancel={() => setDetailLog(null)}
        width={800}
      >
        {detailLog && (
          <div>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Text style={{ color: textMuted }}>Action: </Text>
                {renderActionTag(detailLog.action)}
              </Col>
              <Col span={12}>
                <Text style={{ color: textMuted }}>Entity: </Text>
                <Text style={{ color: textPrimary }}>{detailLog.entity} · {detailLog.entityId ?? '—'}</Text>
              </Col>
            </Row>

            <Row gutter={16}>
              {detailLog.oldValues && (
                <Col span={detailLog.newValues ? 12 : 24}>
                  <Text strong style={{ color: textMuted, display: 'block', marginBottom: 6 }}>
                    Trước (Before)
                  </Text>
                  <Paragraph
                    style={{
                      background: isDark ? bgPage : '#F8FAFC',
                      border: `1px solid ${borderColor}`,
                      borderRadius: 6,
                      padding: '10px 12px',
                      fontFamily: 'monospace',
                      fontSize: 12,
                      color: isDark ? '#FCA5A5' : '#991B1B',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                      maxHeight: 320,
                      overflowY: 'auto',
                      margin: 0,
                    }}
                  >
                    {JSON.stringify(detailLog.oldValues, null, 2)}
                  </Paragraph>
                </Col>
              )}
              {detailLog.newValues && (
                <Col span={detailLog.oldValues ? 12 : 24}>
                  <Text strong style={{ color: textMuted, display: 'block', marginBottom: 6 }}>
                    Sau (After)
                  </Text>
                  <Paragraph
                    style={{
                      background: isDark ? bgPage : '#F8FAFC',
                      border: `1px solid ${borderColor}`,
                      borderRadius: 6,
                      padding: '10px 12px',
                      fontFamily: 'monospace',
                      fontSize: 12,
                      color: isDark ? '#6EE7B7' : '#065F46',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                      maxHeight: 320,
                      overflowY: 'auto',
                      margin: 0,
                    }}
                  >
                    {JSON.stringify(detailLog.newValues, null, 2)}
                  </Paragraph>
                </Col>
              )}
            </Row>
          </div>
        )}
      </Modal>
    </div>
  );
}
