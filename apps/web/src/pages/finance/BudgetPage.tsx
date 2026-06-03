import { useState, useMemo, useEffect } from 'react';
import {
  Table, Select, Typography, Progress, Row, Col, Spin,
} from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useThemePalette } from '../../hooks/useThemePalette';
import { usePagination } from '../../hooks/usePagination';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { FilterBar } from '../../components/FilterBar';
import { formatCurrency } from '../../utils/format';
import {
  DotChartOutlined, DollarOutlined, PieChartOutlined,
  CheckCircleOutlined, MinusCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { apiClient } from '../../api/client';

const { Text } = Typography;

// ─── Types từ backend ────────────────────────────────────────────────────────

interface BudgetLine {
  key: string;
  planId: string;
  planName: string;
  category: string;
  department: string;
  year: number;
  status: string;
  allocated: number;
  used: number;
  committed: number;
}

interface BudgetPlanRaw {
  id: string;
  name: string;
  fiscalYear: number;
  status: string;
  orgUnit?: { id: string; name: string };
  lines?: {
    id: string;
    category: string;
    allocatedAmount: number | string;
    usedAmount: number | string;
    committedAmount: number | string;
  }[];
}

const STATUS_LABEL: Record<string, string> = {
  DRAFT:    'Dự thảo',
  PENDING:  'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  ACTIVE:   'Đang hiệu lực',
  CLOSED:   'Đã đóng',
  REJECTED: 'Từ chối',
};

// ─── BudgetPage ──────────────────────────────────────────────────────────────

export default function BudgetPage() {
  const { textPrimary, textMuted, bgContainer, borderColor, isDark } = useThemePalette();
  const { resetPage, paginationProps } = usePagination(20);

  const [filterYear, setFilterYear] = useState<number | undefined>(new Date().getFullYear());
  const [filterStatus, setFilterStatus] = useState<string | undefined>();

  useEffect(() => { resetPage(); }, [filterYear, filterStatus, resetPage]);

  const { data: rawData, isLoading } = useQuery({
    queryKey: ['budget-plans', filterYear, filterStatus],
    queryFn: () => apiClient.get<{ data: BudgetPlanRaw[] }>('/budget-plans', {
      params: {
        fiscalYear: filterYear,
        status: filterStatus,
        limit: 200,
      },
    }).then(r => r.data.data ?? []),
    staleTime: 60_000,
  });

  // Flatten plans → lines
  const flatLines = useMemo<BudgetLine[]>(() => {
    const plans = rawData ?? [];
    const rows: BudgetLine[] = [];
    for (const plan of plans) {
      if (plan.lines && plan.lines.length > 0) {
        for (const line of plan.lines) {
          rows.push({
            key: line.id,
            planId: plan.id,
            planName: plan.name,
            category: line.category,
            department: plan.orgUnit?.name ?? 'Toàn công ty',
            year: plan.fiscalYear,
            status: plan.status,
            allocated: Number(line.allocatedAmount),
            used: Number(line.usedAmount),
            committed: Number(line.committedAmount),
          });
        }
      } else {
        // Plan không có lines → hiển thị plan như 1 dòng tổng
        rows.push({
          key: plan.id,
          planId: plan.id,
          planName: plan.name,
          category: plan.name,
          department: plan.orgUnit?.name ?? 'Toàn công ty',
          year: plan.fiscalYear,
          status: plan.status,
          allocated: 0,
          used: 0,
          committed: 0,
        });
      }
    }
    return rows;
  }, [rawData]);

  const filtered = flatLines;

  const totalAllocated = filtered.reduce((s, l) => s + l.allocated, 0);
  const totalUsed      = filtered.reduce((s, l) => s + l.used, 0);
  const totalCommitted = filtered.reduce((s, l) => s + l.committed, 0);
  const totalRemaining = totalAllocated - totalUsed - totalCommitted;

  const columns: ColumnsType<BudgetLine> = [
    {
      title: 'Kế hoạch',
      dataIndex: 'planName',
      ellipsis: true,
      render: (v: string) => <Text style={{ color: textMuted, fontSize: 12 }}>{v}</Text>,
      width: 160,
    },
    {
      title: 'Danh mục',
      dataIndex: 'category',
      render: (v: string) => <Text style={{ color: textPrimary, fontWeight: 600 }}>{v}</Text>,
    },
    {
      title: 'Phòng ban',
      dataIndex: 'department',
      width: 140,
      render: (v: string) => <Text style={{ color: textMuted }}>{v}</Text>,
    },
    {
      title: 'Năm',
      dataIndex: 'year',
      width: 70,
      align: 'center',
      render: (v: number) => <Text style={{ color: textMuted }}>{v}</Text>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 140,
      render: (s: string) => (
        <span
          style={
            isDark && s === 'ACTIVE'
              ? { background: 'rgba(52,211,153,0.15)', color: '#6EE7B7', borderColor: 'rgba(52,211,153,0.3)', padding: '2px 8px', borderRadius: 4, border: '1px solid rgba(52,211,153,0.3)', fontSize: 12 }
              : isDark && s === 'DRAFT'
              ? { background: 'rgba(148,163,184,0.15)', color: '#CBD5E1', borderColor: 'rgba(148,163,184,0.3)', padding: '2px 8px', borderRadius: 4, border: '1px solid rgba(148,163,184,0.3)', fontSize: 12 }
              : isDark && s === 'CLOSED'
              ? { background: 'rgba(96,165,250,0.15)', color: '#93C5FD', borderColor: 'rgba(96,165,250,0.3)', padding: '2px 8px', borderRadius: 4, border: '1px solid rgba(96,165,250,0.3)', fontSize: 12 }
              : undefined
          }
        >
          {!isDark && (
            <span style={{
              background: s === 'ACTIVE' ? '#f6ffed' : s === 'DRAFT' ? '#f0f0f0' : '#e6f4ff',
              color: s === 'ACTIVE' ? '#52c41a' : s === 'DRAFT' ? '#595959' : '#1677ff',
              border: `1px solid ${s === 'ACTIVE' ? '#b7eb8f' : s === 'DRAFT' ? '#d9d9d9' : '#91caff'}`,
              padding: '2px 8px',
              borderRadius: 4,
              fontSize: 12,
            }}>
              {STATUS_LABEL[s]}
            </span>
          )}
          {isDark && STATUS_LABEL[s]}
        </span>
      ),
    },
    {
      title: 'Ngân sách',
      dataIndex: 'allocated',
      width: 160,
      align: 'right',
      render: (v: number) => <Text style={{ color: textPrimary }}>{formatCurrency(v)}</Text>,
    },
    {
      title: 'Đã dùng',
      dataIndex: 'used',
      width: 150,
      align: 'right',
      render: (v: number) => <Text style={{ color: '#EF4444', fontWeight: 600 }}>{formatCurrency(v)}</Text>,
    },
    {
      title: 'Cam kết',
      dataIndex: 'committed',
      width: 140,
      align: 'right',
      render: (v: number) => (
        v > 0
          ? <Text style={{ color: '#F59E0B' }}>{formatCurrency(v)}</Text>
          : <Text style={{ color: textMuted }}>—</Text>
      ),
    },
    {
      title: 'Còn lại',
      width: 150,
      align: 'right',
      render: (_: unknown, record: BudgetLine) => {
        const remaining = record.allocated - record.used - record.committed;
        return (
          <Text style={{ color: remaining >= 0 ? '#10B981' : '#EF4444', fontWeight: 600 }}>
            {formatCurrency(remaining)}
          </Text>
        );
      },
    },
    {
      title: 'Sử dụng %',
      width: 160,
      render: (_: unknown, record: BudgetLine) => {
        if (!record.allocated) return <Text style={{ color: textMuted }}>—</Text>;
        const pct = Math.round(((record.used + record.committed) / record.allocated) * 100);
        const strokeColor = pct >= 90 ? '#EF4444' : pct >= 70 ? '#F59E0B' : '#10B981';
        return (
          <div>
            <Progress
              percent={Math.min(pct, 100)}
              strokeColor={strokeColor}
              size="small"
              showInfo={false}
              style={{ marginBottom: 2 }}
            />
            <Text style={{ fontSize: 11, color: strokeColor }}>{pct}%</Text>
          </div>
        );
      },
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Kế hoạch ngân sách"
        icon={<DotChartOutlined />}
        iconColor="#10B981"
      />

      {/* StatCards */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}>
          <StatCard
            label="Tổng ngân sách"
            value={formatCurrency(totalAllocated)}
            color="#6366F1"
            icon={<PieChartOutlined />}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            label="Đã sử dụng"
            value={formatCurrency(totalUsed)}
            color="#EF4444"
            icon={<DollarOutlined />}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            label="Đã cam kết"
            value={formatCurrency(totalCommitted)}
            color="#F59E0B"
            icon={<CheckCircleOutlined />}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            label="Còn lại"
            value={formatCurrency(Math.max(totalRemaining, 0))}
            color="#10B981"
            icon={<MinusCircleOutlined />}
          />
        </Col>
      </Row>

      {/* FilterBar */}
      {isLoading && <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div>}

      <FilterBar>
        <Select
          placeholder="Năm"
          style={{ width: 100 }}
          value={filterYear}
          allowClear
          onChange={v => setFilterYear(v)}
          options={[2023, 2024, 2025, 2026].map(y => ({ value: y, label: String(y) }))}
        />
        <Select
          placeholder="Trạng thái"
          style={{ width: 160 }}
          allowClear
          value={filterStatus}
          onChange={v => setFilterStatus(v)}
          options={Object.entries(STATUS_LABEL).map(([v, l]) => ({ value: v, label: l }))}
        />
      </FilterBar>

      <Table
        rowKey="key"
        dataSource={filtered}
        loading={isLoading}
        columns={columns}
        size="small"
        style={{ border: `1px solid ${borderColor}`, borderRadius: 8, background: bgContainer }}
        pagination={paginationProps(filtered.length, 'ngân sách')}
        locale={{ emptyText: 'Không có dữ liệu ngân sách' }}
        summary={() => (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0} colSpan={4}>
              <Text style={{ color: textMuted, fontWeight: 600 }}>Tổng cộng</Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={4} align="right">
              <Text style={{ color: textPrimary, fontWeight: 700 }}>{formatCurrency(totalAllocated)}</Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={5} align="right">
              <Text style={{ color: '#EF4444', fontWeight: 700 }}>{formatCurrency(totalUsed)}</Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={6} align="right">
              <Text style={{ color: '#F59E0B', fontWeight: 700 }}>{formatCurrency(totalCommitted)}</Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={7} align="right">
              <Text style={{ color: '#10B981', fontWeight: 700 }}>{formatCurrency(Math.max(totalRemaining, 0))}</Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={8} />
          </Table.Summary.Row>
        )}
      />
    </div>
  );
}
