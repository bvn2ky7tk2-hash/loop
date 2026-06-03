import { useState, useEffect } from 'react';
import {
  Table, Select, Typography, Tag, Progress, Space,
  Row, Col, Statistic, Spin,
} from 'antd';
import { CenteredModal } from '../../components/ui/CenteredModal';
import { StatCard } from '../../components/ui/StatCard';
import { usePagination } from '../../hooks/usePagination';
import {
  DollarOutlined, WarningOutlined, CheckCircleOutlined, BarChartOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useQuery } from '@tanstack/react-query';
import { projectsApi, type Project } from '../../api/projects';
import { apiClient } from '../../api/client';
import { useThemePalette } from '../../hooks/useThemePalette';
import { formatCurrency, formatHours } from '../../utils/format';

const { Text, Title } = Typography;

// ─── Types ────────────────────────────────────────────────────────────────────

type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'CLOSED';

const STATUS_LABEL: Record<ProjectStatus, string> = {
  PLANNING: 'Lên kế hoạch',
  ACTIVE:   'Đang chạy',
  ON_HOLD:  'Tạm dừng',
  CLOSED:   'Đã đóng',
};

const STATUS_COLOR: Record<ProjectStatus, string> = {
  PLANNING: 'blue',
  ACTIVE:   'green',
  ON_HOLD:  'orange',
  CLOSED:   'default',
};

interface CostSummary {
  projectId: string;
  projectName: string;
  budgetEffortMm: number | null;
  totalEstimateHours: number;
  totalActualHours: number;
  totalCost: number;
  members: {
    employeeId: string;
    fullName: string;
    allocationRole: string;
    ratePerDay: number;
    actualHours: number;
    cost: number;
  }[];
}

interface ProjectBudgetRow extends Project {
  actualCost: number;
  actualHours: number;
  budgetHours?: number;
  costLoading: boolean;
  members: CostSummary['members'];
}

function getUtilizationColor(pct: number): string {
  if (pct > 100) return '#FF4D4F';
  if (pct >= 80) return '#FA8C16';
  return '#52C41A';
}

// ─── Detail Drawer ─────────────────────────────────────────────────────────

function BudgetDetailDrawer({
  project,
  onClose,
  isDark,
  bgContainer,
  bgCard,
  borderColor,
  textPrimary,
  textSecondary,
}: {
  project: ProjectBudgetRow | null;
  onClose: () => void;
  isDark: boolean;
  bgContainer: string;
  bgCard: string;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
}) {
  if (!project) return null;

  const costPct = project.budgetCost && project.actualCost
    ? Math.round((project.actualCost / Number(project.budgetCost)) * 100)
    : 0;

  const hoursPct = project.budgetHours && project.actualHours
    ? Math.round((project.actualHours / Number(project.budgetHours)) * 100)
    : 0;

  const memberColumns: ColumnsType<CostSummary['members'][number]> = [
    { title: 'Nhân sự', dataIndex: 'fullName', ellipsis: true },
    { title: 'Vai trò', dataIndex: 'allocationRole', width: 120 },
    {
      title: 'Đơn giá/ngày', dataIndex: 'ratePerDay', width: 130,
      render: (v: number) => formatCurrency(v),
    },
    {
      title: 'Giờ thực tế', dataIndex: 'actualHours', width: 110,
      render: (v: number) => formatHours(v),
    },
    {
      title: 'Chi phí', dataIndex: 'cost', width: 140,
      render: (v: number) => (
        <Text strong style={{ color: textPrimary }}>{formatCurrency(v)}</Text>
      ),
    },
  ];

  return (
    <CenteredModal
      title={
        <Space>
          <BarChartOutlined />
          {project.code} — {project.name}
        </Space>
      }
      open={!!project}
      onClose={onClose}
      width={620}
      styles={{
        body: { background: bgContainer },
      }}
    >
      {/* Summary stats */}
      <Row gutter={12} style={{ marginBottom: 20 }}>
        <Col span={12}>
          <div style={{ background: bgCard, border: `1px solid ${borderColor}`, borderRadius: 10, padding: 16 }}>
            <Statistic
              title={<span style={{ color: textSecondary, fontSize: 12 }}>Ngân sách</span>}
              value={Number(project.budgetCost ?? 0)}
              formatter={(v) => formatCurrency(Number(v))}
              valueStyle={{ color: textPrimary, fontSize: 16 }}
            />
          </div>
        </Col>
        <Col span={12}>
          <div style={{ background: bgCard, border: `1px solid ${borderColor}`, borderRadius: 10, padding: 16 }}>
            <Statistic
              title={<span style={{ color: textSecondary, fontSize: 12 }}>Chi phí thực tế</span>}
              value={project.actualCost}
              formatter={(v) => formatCurrency(Number(v))}
              valueStyle={{ color: costPct > 100 ? '#FF4D4F' : '#52C41A', fontSize: 16 }}
            />
          </div>
        </Col>
        <Col span={12} style={{ marginTop: 12 }}>
          <div style={{ background: bgCard, border: `1px solid ${borderColor}`, borderRadius: 10, padding: 16 }}>
            <Statistic
              title={<span style={{ color: textSecondary, fontSize: 12 }}>Budget giờ</span>}
              value={Number(project.budgetHours ?? 0)}
              suffix="h"
              valueStyle={{ color: textPrimary, fontSize: 16 }}
            />
          </div>
        </Col>
        <Col span={12} style={{ marginTop: 12 }}>
          <div style={{ background: bgCard, border: `1px solid ${borderColor}`, borderRadius: 10, padding: 16 }}>
            <Statistic
              title={<span style={{ color: textSecondary, fontSize: 12 }}>Giờ thực tế</span>}
              value={formatHours(project.actualHours)}
              suffix="h"
              valueStyle={{ color: hoursPct > 100 ? '#FF4D4F' : textPrimary, fontSize: 16 }}
            />
          </div>
        </Col>
      </Row>

      {/* Utilization bars */}
      {project.budgetCost && project.actualCost > 0 && (
        <div style={{
          background: bgCard, border: `1px solid ${borderColor}`,
          borderRadius: 10, padding: '12px 16px', marginBottom: 16,
        }}>
          <Text style={{ color: textSecondary, fontSize: 12, display: 'block', marginBottom: 8 }}>
            Sử dụng ngân sách: {costPct}%
          </Text>
          <Progress
            percent={Math.min(costPct, 100)}
            strokeColor={getUtilizationColor(costPct)}
            trailColor={isDark ? '#334155' : '#E2E8F0'}
            showInfo={false}
            size="small"
          />
          {costPct > 100 && (
            <Text style={{ color: '#FF4D4F', fontSize: 11, marginTop: 4, display: 'block' }}>
              Vượt ngân sách {costPct - 100}%
            </Text>
          )}
        </div>
      )}

      {/* Members breakdown */}
      <Text strong style={{ color: textPrimary, marginBottom: 12, display: 'block' }}>
        Chi phí theo nhân sự ({project.members.length})
      </Text>
      <Table
        dataSource={project.members}
        columns={memberColumns}
        rowKey="employeeId"
        size="small"
        pagination={false}
        style={{ background: bgContainer }}
        locale={{ emptyText: 'Không có dữ liệu nhân sự' }}
        summary={(rows) => {
          const totalCost = rows.reduce((s, m) => s + m.cost, 0);
          return (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={4}>
                <Text strong style={{ color: textSecondary }}>Tổng cộng</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={4}>
                <Text strong style={{ color: textPrimary }}>{formatCurrency(totalCost)}</Text>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          );
        }}
      />
    </CenteredModal>
  );
}

// ─── Main BudgetPage ──────────────────────────────────────────────────────────

export default function BudgetPage() {
  const { isDark, textPrimary, textSecondary, bgContainer, bgCard, borderColor, linkColor } = useThemePalette();
  const { resetPage, paginationProps } = usePagination(20);

  const [statusFilter, setStatusFilter] = useState<ProjectStatus | undefined>();
  const [selectedProject, setSelectedProject] = useState<ProjectBudgetRow | null>(null);

  useEffect(() => { resetPage(); }, [statusFilter, resetPage]);

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.list,
  });

  const filtered = statusFilter
    ? projects.filter((p) => p.status === statusFilter)
    : projects;

  // Fetch cost cho mỗi project — chạy song song
  const costQueries = useQuery({
    queryKey: ['all-costs', filtered.map((p) => p.id)],
    queryFn: async () => {
      const results = await Promise.allSettled(
        filtered.map((p) =>
          apiClient
            .get<CostSummary>(`/projects/${p.id}/cost`)
            .then((r) => r.data)
        )
      );
      const map: Record<string, CostSummary> = {};
      results.forEach((r, idx) => {
        if (r.status === 'fulfilled') {
          map[filtered[idx].id] = r.value;
        }
      });
      return map;
    },
    enabled: filtered.length > 0,
    staleTime: 60_000,
  });

  const costMap = costQueries.data ?? {};

  const rows: ProjectBudgetRow[] = filtered.map((p) => {
    const cost = costMap[p.id];
    return {
      ...p,
      actualCost: cost?.totalCost ?? 0,
      actualHours: cost?.totalActualHours ?? 0,
      costLoading: costQueries.isLoading,
      members: cost?.members ?? [],
    };
  });

  // Summary
  const totalBudget  = rows.reduce((s, r) => s + Number(r.budgetCost ?? 0), 0);
  const totalSpent   = rows.reduce((s, r) => s + r.actualCost, 0);
  const overBudget   = rows.filter((r) => r.budgetCost && r.actualCost > Number(r.budgetCost)).length;

  const columns: ColumnsType<ProjectBudgetRow> = [
    {
      title: 'Dự án', dataIndex: 'name', ellipsis: true,
      render: (name: string, record) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ color: textPrimary }}>{name}</Text>
          <Text style={{ fontSize: 11, color: textSecondary }}>{record.code}</Text>
        </Space>
      ),
    },
    {
      title: 'Trạng thái', dataIndex: 'status', width: 130,
      render: (s: ProjectStatus) => (
        <Tag color={STATUS_COLOR[s]}>{STATUS_LABEL[s]}</Tag>
      ),
    },
    {
      title: 'Budget (VND)', dataIndex: 'budgetCost', width: 160,
      render: (v?: number) => (
        <Text style={{ color: textSecondary }}>{formatCurrency(v)}</Text>
      ),
    },
    {
      title: 'Thực tế (VND)', dataIndex: 'actualCost', width: 160,
      render: (v: number, record) => {
        if (record.costLoading && !costMap[record.id]) {
          return <Spin size="small" />;
        }
        const over = record.budgetCost && v > Number(record.budgetCost);
        return (
          <Space size={4}>
            <Text style={{ color: over ? '#FF4D4F' : '#52C41A', fontWeight: 600 }}>
              {formatCurrency(v)}
            </Text>
            {over && <WarningOutlined style={{ color: '#FF4D4F', fontSize: 12 }} />}
          </Space>
        );
      },
    },
    {
      title: 'Budget (giờ)', dataIndex: 'budgetHours', width: 120,
      render: (v?: number) => v ? formatHours(v) : <Text type="secondary">—</Text>,
    },
    {
      title: 'Thực tế (giờ)', dataIndex: 'actualHours', width: 120,
      render: (v: number, record) => {
        if (record.costLoading && !costMap[record.id]) return <Spin size="small" />;
        const over = record.budgetHours && v > Number(record.budgetHours);
        return (
          <Text style={{ color: over ? '#FF4D4F' : textPrimary }}>
            {formatHours(v)}
          </Text>
        );
      },
    },
    {
      title: 'Budget MM', dataIndex: 'budgetEffortMm', width: 110,
      render: (v?: number) => v ? `${Math.round(Number(v) * 10) / 10} MM` : <Text type="secondary">—</Text>,
    },
    {
      title: 'Utilization', width: 160,
      render: (_: unknown, record: ProjectBudgetRow) => {
        if (!record.budgetCost || !record.actualCost) {
          return <Text type="secondary" style={{ fontSize: 12 }}>—</Text>;
        }
        const pct = Math.round((record.actualCost / Number(record.budgetCost)) * 100);
        const color = getUtilizationColor(pct);
        return (
          <Space direction="vertical" size={2} style={{ width: '100%' }}>
            <Progress
              percent={Math.min(pct, 100)}
              strokeColor={color}
              trailColor={isDark ? '#334155' : '#E2E8F0'}
              showInfo={false}
              size="small"
              style={{ marginBottom: 0 }}
            />
            <Text style={{ fontSize: 11, color }}>
              {pct}%{pct > 100 ? ' (vượt ngân sách)' : ''}
            </Text>
          </Space>
        );
      },
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Title level={3} style={{ margin: 0, color: textPrimary }}>
          <DollarOutlined style={{ marginRight: 8, color: linkColor }} />
          Budget Overview
        </Title>
      </div>

      {/* Summary cards */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={8}>
          <StatCard
            label="Tổng ngân sách"
            value={formatCurrency(totalBudget)}
            color="#6366F1"
            icon={<DollarOutlined />}
          />
        </Col>
        <Col xs={24} sm={8}>
          <StatCard
            label="Đã chi"
            value={formatCurrency(totalSpent)}
            color={totalSpent > totalBudget && totalBudget > 0 ? '#FF4D4F' : '#10B981'}
            icon={<CheckCircleOutlined />}
          />
        </Col>
        <Col xs={24} sm={8}>
          <StatCard
            label="Dự án vượt ngân sách"
            value={`${overBudget} dự án`}
            color={overBudget > 0 ? '#FF4D4F' : '#10B981'}
            icon={<WarningOutlined />}
          />
        </Col>
      </Row>

      {/* Filter */}
      <Space wrap style={{ marginBottom: 16 }}>
        <Select
          allowClear
          placeholder="Trạng thái dự án"
          style={{ width: 180 }}
          onChange={(v) => setStatusFilter(v)}
          options={Object.entries(STATUS_LABEL).map(([k, v]) => ({ value: k, label: v }))}
        />
      </Space>

      <Table
        dataSource={rows}
        loading={projectsLoading}
        rowKey="id"
        columns={columns}
        locale={{ emptyText: 'Chưa có dự án nào để hiển thị ngân sách' }}
        pagination={paginationProps(rows.length, 'dự án')}
        style={{ background: bgContainer }}
        onRow={(record) => ({
          onClick: () => setSelectedProject(record),
          style: { cursor: 'pointer' },
        })}
        rowClassName={(record) => {
          if (record.budgetCost && record.actualCost > Number(record.budgetCost)) {
            return 'budget-over-row';
          }
          return '';
        }}
      />

      <style>{`
        .budget-over-row td { background: rgba(255, 77, 79, 0.05) !important; }
        html.dark .budget-over-row td { background: rgba(255, 77, 79, 0.08) !important; }
      `}</style>

      <BudgetDetailDrawer
        project={selectedProject}
        onClose={() => setSelectedProject(null)}
        isDark={isDark}
        bgContainer={bgContainer}
        bgCard={bgCard}
        borderColor={borderColor}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
      />
    </div>
  );
}
