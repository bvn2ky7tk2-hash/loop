import { useState } from 'react';
import {
  Table, Select, Typography, Progress, Row, Col,
} from 'antd';
import { useThemePalette } from '../../hooks/useThemePalette';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { FilterBar } from '../../components/FilterBar';
import { formatCurrency } from '../../utils/format';
import {
  DotChartOutlined, DollarOutlined, PieChartOutlined,
  CheckCircleOutlined, MinusCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { Text } = Typography;

// ─── Mock data ──────────────────────────────────────────────────────────────

interface BudgetLine {
  key: string;
  category: string;
  department: string;
  year: number;
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED';
  allocated: number;
  used: number;
  committed: number;
}

const MOCK_LINES: BudgetLine[] = [
  { key: '1', category: 'Nhân sự',      department: 'Toàn công ty', year: 2026, status: 'ACTIVE',  allocated: 200000000, used: 160000000, committed: 20000000 },
  { key: '2', category: 'Công cụ IT',   department: 'Kỹ thuật',     year: 2026, status: 'ACTIVE',  allocated: 100000000, used: 45000000,  committed: 15000000 },
  { key: '3', category: 'Đào tạo',      department: 'Nhân sự',      year: 2026, status: 'ACTIVE',  allocated: 100000000, used: 10000000,  committed: 5000000  },
  { key: '4', category: 'Marketing',    department: 'Kinh doanh',   year: 2026, status: 'DRAFT',   allocated: 80000000,  used: 0,         committed: 12000000 },
  { key: '5', category: 'Vận hành',     department: 'Toàn công ty', year: 2025, status: 'CLOSED',  allocated: 150000000, used: 148000000, committed: 0        },
  { key: '6', category: 'R&D',          department: 'Kỹ thuật',     year: 2025, status: 'CLOSED',  allocated: 120000000, used: 95000000,  committed: 0        },
  { key: '7', category: 'Bán hàng',     department: 'Kinh doanh',   year: 2026, status: 'ACTIVE',  allocated: 90000000,  used: 72000000,  committed: 10000000 },
  { key: '8', category: 'Hành chính',   department: 'Toàn công ty', year: 2026, status: 'ACTIVE',  allocated: 50000000,  used: 46000000,  committed: 3000000  },
];

const STATUS_LABEL: Record<string, string> = {
  DRAFT:  'Dự thảo',
  ACTIVE: 'Đang hiệu lực',
  CLOSED: 'Đã đóng',
};

const STATUS_COLOR: Record<string, string> = {
  DRAFT:  'default',
  ACTIVE: 'green',
  CLOSED: 'blue',
};

const DEPARTMENTS = ['Toàn công ty', 'Kỹ thuật', 'Nhân sự', 'Kinh doanh'];

// ─── BudgetPage ──────────────────────────────────────────────────────────────

export default function BudgetPage() {
  const { textPrimary, textMuted, bgContainer, borderColor, linkColor, isDark } = useThemePalette();

  const [filterYear, setFilterYear] = useState<number | undefined>(2026);
  const [filterDept, setFilterDept] = useState<string | undefined>();
  const [filterStatus, setFilterStatus] = useState<string | undefined>();

  const filtered = MOCK_LINES.filter(line => {
    if (filterYear && line.year !== filterYear) return false;
    if (filterDept && line.department !== filterDept) return false;
    if (filterStatus && line.status !== filterStatus) return false;
    return true;
  });

  const totalAllocated = filtered.reduce((s, l) => s + l.allocated, 0);
  const totalUsed      = filtered.reduce((s, l) => s + l.used, 0);
  const totalCommitted = filtered.reduce((s, l) => s + l.committed, 0);
  const totalRemaining = totalAllocated - totalUsed - totalCommitted;

  const columns: ColumnsType<BudgetLine> = [
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
      width: 80,
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
      <FilterBar>
        <Select
          placeholder="Năm"
          style={{ width: 100 }}
          value={filterYear}
          allowClear
          onChange={v => setFilterYear(v)}
          options={[
            { value: 2024, label: '2024' },
            { value: 2025, label: '2025' },
            { value: 2026, label: '2026' },
          ]}
        />
        <Select
          placeholder="Phòng ban"
          style={{ width: 160 }}
          allowClear
          value={filterDept}
          onChange={v => setFilterDept(v)}
          options={DEPARTMENTS.map(d => ({ value: d, label: d }))}
        />
        <Select
          placeholder="Trạng thái"
          style={{ width: 160 }}
          allowClear
          value={filterStatus}
          onChange={v => setFilterStatus(v)}
          options={[
            { value: 'DRAFT',  label: 'Dự thảo' },
            { value: 'ACTIVE', label: 'Đang hiệu lực' },
            { value: 'CLOSED', label: 'Đã đóng' },
          ]}
        />
      </FilterBar>

      <Table
        rowKey="key"
        dataSource={filtered}
        columns={columns}
        size="small"
        style={{ border: `1px solid ${borderColor}`, borderRadius: 8, background: bgContainer }}
        pagination={{ pageSize: 20, showTotal: t => `${t} dòng` }}
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
