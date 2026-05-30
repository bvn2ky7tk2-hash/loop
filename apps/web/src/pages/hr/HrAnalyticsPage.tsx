import { Row, Col, Card, Table, Tag, Typography, Select } from 'antd';
import { TeamOutlined, UserAddOutlined, UserDeleteOutlined, FileExclamationOutlined, SearchOutlined, DollarOutlined } from '@ant-design/icons';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip,
  ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import type { ColumnsType } from 'antd/es/table';
import { useState } from 'react';
import dayjs from 'dayjs';
import { useThemePalette } from '../../hooks/useThemePalette';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { SparklineCard } from '../../components/ui/SparklineCard';
import { FilterBar } from '../../components/FilterBar';
import { formatCurrency } from '../../utils/format';

const { Text } = Typography;

// TODO: GET /reports/hr/analytics/summary
const MOCK_SUMMARY = {
  headcount: 248,
  newHiresThisMonth: 7,
  attritionYtd: 14,
  contractsExpiring60d: 11,
  openPositions: 5,
  salaryPerHead: 22_500_000,
};

// TODO: GET /reports/hr/headcount-trend?months=12
const HEADCOUNT_TREND = Array.from({ length: 12 }, (_, i) => {
  const month = dayjs().subtract(11 - i, 'month');
  return {
    day: month.format('T[M]M'),
    value: 220 + Math.round(Math.sin(i / 2) * 8) + i * 2,
  };
});

// TODO: GET /reports/hr/attrition-by-department
const ATTRITION_BY_DEPT = [
  { dept: 'Engineering', resigned: 4 },
  { dept: 'Sales',       resigned: 3 },
  { dept: 'HR',          resigned: 2 },
  { dept: 'Finance',     resigned: 2 },
  { dept: 'Marketing',   resigned: 1 },
  { dept: 'Operations',  resigned: 2 },
];

// TODO: GET /reports/hr/contract-expiry?days=60
interface ContractExpiry {
  key: string;
  employeeName: string;
  contractType: string;
  expiryDate: string;
  daysLeft: number;
}

const CONTRACT_EXPIRY: ContractExpiry[] = [
  { key: '1', employeeName: 'Nguyễn Văn A',  contractType: 'Xác định thời hạn 1 năm', expiryDate: '2026-06-15', daysLeft: 16 },
  { key: '2', employeeName: 'Trần Thị B',    contractType: 'Xác định thời hạn 2 năm', expiryDate: '2026-06-22', daysLeft: 23 },
  { key: '3', employeeName: 'Lê Minh C',     contractType: 'Xác định thời hạn 1 năm', expiryDate: '2026-06-30', daysLeft: 31 },
  { key: '4', employeeName: 'Phạm Thu D',    contractType: 'Xác định thời hạn 2 năm', expiryDate: '2026-07-10', daysLeft: 41 },
  { key: '5', employeeName: 'Hoàng Văn E',   contractType: 'Thử việc 60 ngày',        expiryDate: '2026-07-14', daysLeft: 45 },
  { key: '6', employeeName: 'Đỗ Thị F',      contractType: 'Xác định thời hạn 3 năm', expiryDate: '2026-07-18', daysLeft: 49 },
  { key: '7', employeeName: 'Vũ Quốc G',     contractType: 'Thử việc 60 ngày',        expiryDate: '2026-07-20', daysLeft: 51 },
  { key: '8', employeeName: 'Bùi Thị H',     contractType: 'Xác định thời hạn 1 năm', expiryDate: '2026-07-25', daysLeft: 56 },
];

const DEPT_FILTER_OPTIONS = [
  { value: 'all',         label: 'Tất cả phòng ban' },
  { value: 'Engineering', label: 'Engineering' },
  { value: 'Sales',       label: 'Sales' },
  { value: 'HR',          label: 'HR' },
  { value: 'Finance',     label: 'Finance' },
  { value: 'Marketing',   label: 'Marketing' },
  { value: 'Operations',  label: 'Operations' },
];

export default function HrAnalyticsPage() {
  const { isDark, textPrimary, textMuted, bgContainer, borderColor } = useThemePalette();
  const [deptFilter, setDeptFilter] = useState<string>('all');

  const axisColor   = isDark ? '#888' : '#555';
  const gridColor   = isDark ? '#334155' : '#f0f0f0';
  const tooltipBg     = bgContainer;
  const tooltipBorder = borderColor;

  const chartCardStyle = {
    borderRadius: 12,
    background: bgContainer,
    border: `1px solid ${borderColor}`,
  };

  const filteredAttrition = deptFilter === 'all'
    ? ATTRITION_BY_DEPT
    : ATTRITION_BY_DEPT.filter(d => d.dept === deptFilter);

  const contractColumns: ColumnsType<ContractExpiry> = [
    {
      title: 'Nhân viên',
      dataIndex: 'employeeName',
      render: (v: string) => <Text style={{ color: textPrimary, fontWeight: 500 }}>{v}</Text>,
    },
    {
      title: 'Loại HĐ',
      dataIndex: 'contractType',
      render: (v: string) => <Text style={{ color: textMuted, fontSize: 13 }}>{v}</Text>,
    },
    {
      title: 'Ngày hết hạn',
      dataIndex: 'expiryDate',
      render: (v: string) => (
        <Text style={{ color: textMuted, fontSize: 13 }}>
          {dayjs(v).format('DD/MM/YYYY')}
        </Text>
      ),
    },
    {
      title: 'Còn lại (ngày)',
      dataIndex: 'daysLeft',
      align: 'center' as const,
      render: (v: number) => {
        const urgent  = v <= 30;
        const warning = v <= 45;
        const tagColor = urgent ? '#EF4444' : warning ? '#F59E0B' : '#10B981';
        const tagBg    = urgent
          ? (isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.08)')
          : warning
            ? (isDark ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.08)')
            : (isDark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.08)');
        const tagBorder = urgent
          ? (isDark ? 'rgba(239,68,68,0.35)' : 'rgba(239,68,68,0.3)')
          : warning
            ? (isDark ? 'rgba(245,158,11,0.35)' : 'rgba(245,158,11,0.3)')
            : (isDark ? 'rgba(16,185,129,0.35)' : 'rgba(16,185,129,0.3)');
        return (
          <Tag style={{ background: tagBg, color: tagColor, borderColor: tagBorder, fontWeight: 600 }}>
            {v} ngày
          </Tag>
        );
      },
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="HR Analytics"
        icon={<TeamOutlined />}
        iconColor="#8B5CF6"
      />

      {/* Row 6 StatCards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={8} lg={4}>
          <StatCard
            label="Headcount"
            value={MOCK_SUMMARY.headcount}
            color="#6366F1"
            icon={<TeamOutlined />}
          />
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <StatCard
            label="Mới tháng này"
            value={MOCK_SUMMARY.newHiresThisMonth}
            color="#10B981"
            icon={<UserAddOutlined />}
            subValue="nhân viên mới"
          />
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <StatCard
            label="Nghỉ việc YTD"
            value={MOCK_SUMMARY.attritionYtd}
            color="#EF4444"
            icon={<UserDeleteOutlined />}
            subValue="từ đầu năm"
          />
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <StatCard
            label="HĐ hết hạn 60 ngày"
            value={MOCK_SUMMARY.contractsExpiring60d}
            color="#F59E0B"
            icon={<FileExclamationOutlined />}
            subValue="cần gia hạn"
          />
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <StatCard
            label="Đang tuyển"
            value={MOCK_SUMMARY.openPositions}
            color="#3B82F6"
            icon={<SearchOutlined />}
            subValue="vị trí mở"
          />
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <StatCard
            label="Chi phí lương/người"
            value={`${Math.round(MOCK_SUMMARY.salaryPerHead / 1_000_000)}M`}
            color="#F97316"
            icon={<DollarOutlined />}
            subValue="trung bình/tháng"
          />
        </Col>
      </Row>

      {/* Headcount Trend SparklineCard */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={8}>
          <SparklineCard
            label="Headcount Trend"
            value={MOCK_SUMMARY.headcount}
            unit="nhân sự"
            delta={3}
            data={HEADCOUNT_TREND}
            variant="line"
            color="#8B5CF6"
            icon={<TeamOutlined />}
            filled
          />
        </Col>

        {/* Attrition by Department — Horizontal BarChart */}
        <Col xs={24} lg={16}>
          <Card
            title={
              <Text style={{ color: textPrimary, fontWeight: 600 }}>
                Attrition by Department
              </Text>
            }
            style={chartCardStyle}
            extra={
              <FilterBar>
                <Select
                  size="small"
                  value={deptFilter}
                  onChange={setDeptFilter}
                  options={DEPT_FILTER_OPTIONS}
                  style={{ width: 180 }}
                />
              </FilterBar>
            }
          >
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={filteredAttrition}
                layout="vertical"
                margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
                barSize={20}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: axisColor, fontSize: 12 }}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="dept"
                  tick={{ fill: axisColor, fontSize: 12 }}
                  width={90}
                />
                <RTooltip
                  formatter={(v: number) => [`${v} người`, 'Nghỉ việc']}
                  contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 8 }}
                  labelStyle={{ color: axisColor }}
                />
                <Bar dataKey="resigned" name="Nghỉ việc" radius={[0, 6, 6, 0]}>
                  {filteredAttrition.map((_, i) => (
                    <Cell
                      key={i}
                      fill={i % 2 === 0 ? '#EF4444' : '#F87171'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Contract Expiry Timeline Table */}
      <Card
        title={
          <Text style={{ color: textPrimary, fontWeight: 600 }}>
            Contract Expiry Timeline (60 ngày tới)
          </Text>
        }
        style={chartCardStyle}
      >
        <Table<ContractExpiry>
          rowKey="key"
          dataSource={CONTRACT_EXPIRY}
          columns={contractColumns}
          pagination={{ pageSize: 8, size: 'small' }}
          size="small"
        />
      </Card>
    </div>
  );
}
