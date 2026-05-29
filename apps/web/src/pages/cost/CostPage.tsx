import { useState } from 'react';
import {
  Select, Table, Card, Row, Col, DatePicker, Typography, Progress, Tooltip,
} from 'antd';
import {
  DollarOutlined, ClockCircleOutlined, FundOutlined, InfoCircleOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '../../api/projects';
import { apiClient } from '../../api/client';
import dayjs from 'dayjs';
import { useThemePalette } from '../../hooks/useThemePalette';
import { SparklineCard } from '../../components/ui/SparklineCard';
import { StatCard } from '../../components/ui/StatCard';
import { useColumnVisibility } from '../../hooks/useColumnVisibility';
import { ColumnToggle } from '../../components/ColumnToggle';
import CostBreakdownTooltip from '../../components/CostBreakdownTooltip';
import { formatNumber, formatCompact } from '../../utils/format';

const { Text } = Typography;
const { RangePicker } = DatePicker;

const MEMBER_COL_DEFS = [
  { key: 'fullName',       label: 'Nhân sự' },
  { key: 'allocationRole', label: 'Vai trò' },
  { key: 'ratePerDay',     label: 'Đơn giá/ngày' },
  { key: 'actualHours',    label: 'Giờ thực tế' },
  { key: 'cost',           label: 'Chi phí' },
];

interface MemberCostRow {
  employeeId: string;
  fullName: string;
  level: string;
  allocationRole: string;
  ratePerDay: number;
  actualHours: number;
  cost: number;
}

interface CostSummary {
  projectId: string;
  projectName: string;
  budgetEffortMm: number | null;
  totalEstimateHours: number;
  totalActualHours: number;
  totalCost: number;
  completionPct?: number;
  plannedValue?: number;
  members: MemberCostRow[];
}

interface TimeLog {
  id: string;
  hours: number;
  logDate: string;
  note?: string;
  task: { id: string; title: string };
  user: { id: string; name: string };
}

// ── EVM helpers ──────────────────────────────────────────────────────────────
function evmColor(index: number): string {
  if (index >= 1) return '#10B981';
  if (index >= 0.9) return '#F59E0B';
  return '#EF4444';
}

function evmLabel(index: number): string {
  if (index >= 1) return 'Tốt';
  if (index >= 0.9) return 'Cần chú ý';
  return 'Vượt kế hoạch';
}

export default function CostPage() {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);

  const { isDark, preset, textPrimary, textMuted } = useThemePalette();
  const primary = preset.primary;
  const chartCardStyle = {
    borderRadius: 12,
    background: isDark ? '#1E293B' : `${primary}09`,
    border: `1px solid ${isDark ? '#334155' : `${primary}28`}`,
  };

  const { isVisible, toggle, reset: resetCols } = useColumnVisibility('cost-members', MEMBER_COL_DEFS);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.list,
  });

  const { data: cost } = useQuery({
    queryKey: ['cost', projectId],
    queryFn: () => apiClient.get<CostSummary>(`/projects/${projectId}/cost`).then((r) => r.data),
    enabled: !!projectId,
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['time-logs', projectId, dateRange],
    queryFn: () =>
      apiClient
        .get<TimeLog[]>(`/projects/${projectId}/cost/time-logs`, {
          params: dateRange ? { from: dateRange[0], to: dateRange[1] } : {},
        })
        .then((r) => r.data),
    enabled: !!projectId,
  });

  // ── EVM calculations ────────────────────────────────────────────────────────
  // EV = % complete × Budget (use totalEstimateHours as budget proxy)
  // AC = totalActualHours (cost driver)
  // PV = plannedValue from API or estimate
  const completionPct = (cost?.completionPct ?? 0) / 100;
  const budget        = cost?.totalEstimateHours ?? 0;
  const ac            = cost?.totalActualHours ?? 0;
  const pv            = cost?.plannedValue ?? budget * 0.8; // fallback: 80% budget planned
  const ev            = completionPct * budget;
  const cpi           = ac > 0 ? ev / ac : 0;
  const spi           = pv > 0 ? ev / pv : 0;
  const hasEvm        = budget > 0 && ac > 0;

  const allMemberColumns = [
    { key: 'fullName',       title: 'Nhân sự',      dataIndex: 'fullName',
      render: (v: string) => <Text style={{ color: textPrimary }}>{v}</Text> },
    { key: 'allocationRole', title: 'Vai trò',       dataIndex: 'allocationRole',
      render: (v: string) => <Text style={{ color: textMuted }}>{v}</Text> },
    {
      key: 'ratePerDay',
      title: 'Đơn giá/ngày', dataIndex: 'ratePerDay',
      render: (v: number) => <Text style={{ color: textPrimary }}>{formatNumber(v)}</Text>,
    },
    { key: 'actualHours', title: 'Giờ thực tế', dataIndex: 'actualHours',
      render: (v: number) => <Text style={{ color: textPrimary }}>{v}h</Text> },
    {
      key: 'cost',
      title: 'Chi phí', dataIndex: 'cost',
      render: (v: number, record: MemberCostRow) => (
        <CostBreakdownTooltip member={record}>
          <strong style={{ cursor: 'help', color: textPrimary }}>{formatNumber(v)}</strong>
        </CostBreakdownTooltip>
      ),
    },
  ];

  const memberColumns = allMemberColumns.filter((c) => isVisible(c.key));

  const logColumns = [
    {
      title: 'Ngày', dataIndex: 'logDate', width: 110,
      render: (v: string) => <Text style={{ color: textMuted }}>{dayjs(v).format('DD/MM/YYYY')}</Text>,
    },
    { title: 'Người dùng', dataIndex: ['user', 'name'],
      render: (v: string) => <Text style={{ color: textPrimary }}>{v}</Text> },
    { title: 'Task', dataIndex: ['task', 'title'],
      render: (v: string) => <Text style={{ color: textPrimary }}>{v}</Text> },
    { title: 'Giờ', dataIndex: 'hours', width: 80,
      render: (v: number) => <Text style={{ color: textPrimary }}>{Number(v)}h</Text> },
    { title: 'Ghi chú', dataIndex: 'note',
      render: (v?: string) => <Text style={{ color: textMuted }}>{v || '—'}</Text> },
  ];

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <h1 className="page-title">Cost</h1>
        <Select
          style={{ width: 320 }}
          placeholder="Chọn dự án"
          onChange={setProjectId}
          showSearch={{ optionFilterProp: 'label' }}
          options={projects.map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` }))}
        />
      </div>

      {cost && (
        <>
          {/* ── SparklineCards tổng quan ──────────────────────────────────── */}
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={6}>
              <SparklineCard
                label="Tổng chi phí"
                value={formatCompact(cost.totalCost)}
                unit="VND"
                color="#10B981"
                icon={<DollarOutlined />}
                filled
              />
            </Col>
            <Col span={6}>
              <SparklineCard
                label="Giờ ước tính"
                value={cost.totalEstimateHours}
                unit="h"
                color={primary}
                icon={<ClockCircleOutlined />}
                filled
              />
            </Col>
            <Col span={6}>
              <SparklineCard
                label="Giờ thực tế"
                value={cost.totalActualHours}
                unit="h"
                color="#FA8C16"
                icon={<ClockCircleOutlined />}
                filled
              />
            </Col>
            <Col span={6}>
              <SparklineCard
                label="Budget"
                value={cost.budgetEffortMm ?? '—'}
                unit={cost.budgetEffortMm ? 'MM' : ''}
                color="#F59E0B"
                filled
              />
            </Col>
          </Row>

          {/* ── EVM Dashboard ─────────────────────────────────────────────── */}
          <Card
            title={
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FundOutlined style={{ color: '#6366F1' }} />
                Earned Value Management (EVM)
                <Tooltip title="EVM đo hiệu quả chi phí và tiến độ dự án. CPI > 1 = đang tiết kiệm hơn kế hoạch. SPI > 1 = đang đi trước tiến độ.">
                  <InfoCircleOutlined style={{ color: textMuted as string, fontSize: 14, cursor: 'help' }} />
                </Tooltip>
              </span>
            }
            style={{ marginBottom: 24, ...chartCardStyle }}
          >
            {!hasEvm ? (
              <Text style={{ color: textMuted }}>Chưa đủ dữ liệu để tính EVM. Cần có giờ ước tính và giờ thực tế.</Text>
            ) : (
              <Row gutter={[16, 16]}>
                {/* CPI gauge */}
                <Col xs={24} sm={12} md={6}>
                  <div style={{ textAlign: 'center' }}>
                    <Progress
                      type="circle"
                      percent={Math.min(Math.round(cpi * 100), 150)}
                      format={() => <span style={{ color: evmColor(cpi), fontWeight: 700, fontSize: 18 }}>{cpi.toFixed(2)}</span>}
                      strokeColor={evmColor(cpi)}
                      size={100}
                    />
                    <div style={{ marginTop: 8 }}>
                      <Text style={{ color: textPrimary, fontWeight: 600, display: 'block' }}>CPI</Text>
                      <Text style={{ color: evmColor(cpi), fontSize: 12 }}>{evmLabel(cpi)}</Text>
                      <Text style={{ color: textMuted, fontSize: 11, display: 'block' }}>
                        {cpi >= 1 ? 'Dưới ngân sách' : 'Vượt ngân sách'}
                      </Text>
                    </div>
                  </div>
                </Col>

                {/* SPI gauge */}
                <Col xs={24} sm={12} md={6}>
                  <div style={{ textAlign: 'center' }}>
                    <Progress
                      type="circle"
                      percent={Math.min(Math.round(spi * 100), 150)}
                      format={() => <span style={{ color: evmColor(spi), fontWeight: 700, fontSize: 18 }}>{spi.toFixed(2)}</span>}
                      strokeColor={evmColor(spi)}
                      size={100}
                    />
                    <div style={{ marginTop: 8 }}>
                      <Text style={{ color: textPrimary, fontWeight: 600, display: 'block' }}>SPI</Text>
                      <Text style={{ color: evmColor(spi), fontSize: 12 }}>{evmLabel(spi)}</Text>
                      <Text style={{ color: textMuted, fontSize: 11, display: 'block' }}>
                        {spi >= 1 ? 'Đúng/trước tiến độ' : 'Chậm tiến độ'}
                      </Text>
                    </div>
                  </div>
                </Col>

                {/* EVM StatCards */}
                <Col xs={24} md={12}>
                  <Row gutter={[8, 8]}>
                    <Col xs={12}>
                      <StatCard label="Earned Value (EV)" value={`${ev.toFixed(0)}h`} color="#6366F1" icon={<FundOutlined />} />
                    </Col>
                    <Col xs={12}>
                      <StatCard label="Actual Cost (AC)" value={`${ac}h`} color={ac > budget ? '#EF4444' : '#10B981'} icon={<ClockCircleOutlined />} />
                    </Col>
                    <Col xs={12}>
                      <StatCard label="Planned Value (PV)" value={`${pv.toFixed(0)}h`} color="#3B82F6" icon={<FundOutlined />} />
                    </Col>
                    <Col xs={12}>
                      <StatCard label="% Hoàn thành" value={`${(completionPct * 100).toFixed(0)}%`} color="#F59E0B" icon={<ClockCircleOutlined />} />
                    </Col>
                  </Row>
                </Col>
              </Row>
            )}
          </Card>

          {/* ── Chi phí theo nhân sự ─────────────────────────────────────── */}
          <Card
            title="Chi phí theo nhân sự"
            style={{ marginBottom: 24, ...chartCardStyle }}
            extra={<ColumnToggle columns={MEMBER_COL_DEFS} isVisible={isVisible} toggle={toggle} reset={resetCols} />}
          >
            <Table
              dataSource={cost.members}
              columns={memberColumns}
              rowKey="employeeId"
              size="small"
              pagination={false}
            />
          </Card>
        </>
      )}

      <Card
        title="Time Logs"
        style={chartCardStyle}
        extra={
          <RangePicker
            onChange={(dates) =>
              setDateRange(dates ? [dates[0]!.format('YYYY-MM-DD'), dates[1]!.format('YYYY-MM-DD')] : null)
            }
          />
        }
      >
        <Table
          dataSource={logs}
          columns={logColumns}
          rowKey="id"
          size="small"
          locale={{ emptyText: projectId ? 'Chưa có dữ liệu' : 'Chọn dự án để xem' }}
        />
      </Card>
    </div>
  );
}
