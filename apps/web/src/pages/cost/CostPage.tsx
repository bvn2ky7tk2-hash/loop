import { useState } from 'react';
import {
  Select, Table, Card, Row, Col, DatePicker,
} from 'antd';
import { DollarOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useThemePalette } from '../../hooks/useThemePalette';
import { SparklineCard } from '../../components/ui/SparklineCard';
import { useColumnVisibility } from '../../hooks/useColumnVisibility';
import { ColumnToggle } from '../../components/ColumnToggle';

const MEMBER_COL_DEFS = [
  { key: 'fullName',       label: 'Nhân sự' },
  { key: 'allocationRole', label: 'Vai trò' },
  { key: 'ratePerDay',     label: 'Đơn giá/ngày' },
  { key: 'actualHours',    label: 'Giờ thực tế' },
  { key: 'cost',           label: 'Chi phí' },
];
import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '../../api/projects';
import { apiClient } from '../../api/client';
import dayjs from 'dayjs';
import CostBreakdownTooltip from '../../components/CostBreakdownTooltip';
import { formatNumber, formatCompact } from '../../utils/format';

const { RangePicker } = DatePicker;

interface CostSummary {
  projectId: string;
  projectName: string;
  budgetEffortMm: number | null;
  totalEstimateHours: number;
  totalActualHours: number;
  totalCost: number;
  members: { employeeId: string; fullName: string; allocationRole: string; ratePerDay: number; actualHours: number; cost: number }[];
}

interface TimeLog {
  id: string;
  hours: number;
  logDate: string;
  note?: string;
  task: { id: string; title: string };
  user: { id: string; name: string };
}

export default function CostPage() {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);

  const { isDark, preset } = useThemePalette();
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

  const allMemberColumns = [
    { key: 'fullName',       title: 'Nhân sự',      dataIndex: 'fullName' },
    { key: 'allocationRole', title: 'Vai trò',       dataIndex: 'allocationRole' },
    {
      key: 'ratePerDay',
      title: 'Đơn giá/ngày', dataIndex: 'ratePerDay',
      render: (v: number) => formatNumber(v),
    },
    { key: 'actualHours', title: 'Giờ thực tế', dataIndex: 'actualHours', render: (v: number) => `${v}h` },
    {
      key: 'cost',
      title: 'Chi phí', dataIndex: 'cost',
      render: (v: number, record: CostSummary['members'][number]) => (
        <CostBreakdownTooltip member={record}>
          <strong style={{ cursor: 'help' }}>{formatNumber(v)}</strong>
        </CostBreakdownTooltip>
      ),
    },
  ];

  const memberColumns = allMemberColumns.filter((c) => isVisible(c.key));

  const logColumns = [
    {
      title: 'Ngày', dataIndex: 'logDate', width: 110,
      render: (v: string) => dayjs(v).format('DD/MM/YYYY'),
    },
    { title: 'Người dùng', dataIndex: ['user', 'name'] },
    { title: 'Task', dataIndex: ['task', 'title'] },
    { title: 'Giờ', dataIndex: 'hours', width: 80, render: (v: number) => `${Number(v)}h` },
    { title: 'Ghi chú', dataIndex: 'note' },
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
