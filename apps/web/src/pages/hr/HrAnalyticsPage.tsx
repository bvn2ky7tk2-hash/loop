import { Row, Col, Card, Table, Tag, Typography, Select, Spin, Empty, Button } from 'antd';
import { EmployeeInfoCell } from '../../components/ui/EmployeeInfoCell';
import type { EmployeeInfoCellEmployee } from '../../components/ui/EmployeeInfoCell';
import {
  TeamOutlined, UserAddOutlined, UserDeleteOutlined,
  FileExclamationOutlined, SearchOutlined, DollarOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip,
  ResponsiveContainer, CartesianGrid, Cell,
  LineChart, Line, Legend,
} from 'recharts';
import type { ColumnsType } from 'antd/es/table';
import { useState } from 'react';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useThemePalette } from '../../hooks/useThemePalette';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { FilterBar } from '../../components/FilterBar';

const { Text } = Typography;

/* ---- Interfaces ---- */
interface HrSummary {
  headcount: number;
  newHiresThisMonth: number;
  attritionYtd: number;
  contractsExpiring60d: number;
  openPositions: number;
  avgSalaryPerHead: number;
}

interface HeadcountTrendItem {
  month: string;
  total: number;
  newHires: number;
  resigns: number;
}

interface AttritionDeptItem {
  deptName: string;
  count: number;
  attritionRate: number;
}

interface SalaryDistItem {
  range: string;
  count: number;
}

interface ContractExpiry {
  id: string;
  employee: EmployeeInfoCellEmployee;
  contractType: string;
  expiryDate: string;
  daysLeft: number;
}

/* ---- API fetchers ---- */
const fetchSummary  = () => axios.get<HrSummary>('/api/v1/hr/analytics/summary').then(r => r.data);
const fetchTrend    = (months: number) =>
  axios.get<HeadcountTrendItem[]>(`/api/v1/hr/analytics/headcount-trend?months=${months}`).then(r => r.data);
const fetchAttrition = () =>
  axios.get<AttritionDeptItem[]>('/api/v1/hr/analytics/attrition-by-dept').then(r => r.data);
const fetchSalaryDist = () =>
  axios.get<SalaryDistItem[]>('/api/v1/hr/analytics/salary-distribution').then(r => r.data);

/* ---- Helpers ---- */
function daysLeftFromNow(expiryDate: string): number {
  return dayjs(expiryDate).diff(dayjs(), 'day');
}

export default function HrAnalyticsPage() {
  const { isDark, textPrimary, textMuted, bgContainer, borderColor } = useThemePalette();
  const [deptFilter, setDeptFilter]   = useState<string>('all');
  const [yearFilter, setYearFilter]   = useState<number>(new Date().getFullYear());

  const { data: summary, isLoading: loadingSummary } = useQuery<HrSummary>({
    queryKey: ['hr-analytics-summary'],
    queryFn:  fetchSummary,
    staleTime: 300_000,
  });

  const { data: headcountTrend = [], isLoading: loadingTrend } = useQuery<HeadcountTrendItem[]>({
    queryKey: ['hr-headcount-trend', 12],
    queryFn:  () => fetchTrend(12),
    staleTime: 300_000,
  });

  const { data: attritionByDept = [], isLoading: loadingAttrition } = useQuery<AttritionDeptItem[]>({
    queryKey: ['hr-attrition-by-dept'],
    queryFn:  fetchAttrition,
    staleTime: 300_000,
  });

  const { data: salaryDist = [], isLoading: loadingSalaryDist } = useQuery<SalaryDistItem[]>({
    queryKey: ['hr-salary-distribution'],
    queryFn:  fetchSalaryDist,
    staleTime: 300_000,
  });

  /* Lấy contract expiry từ attritionByDept không có — dùng headcount endpoint để
     mô phỏng expiry list — thực tế cần /hr/contracts?expiring=60 nhưng endpoint
     chưa có riêng, dùng data từ summary.contractsExpiring60d để hiển thị count,
     và bảng được fill từ dữ liệu real khi có. */
  const { data: contractExpiry = [] } = useQuery<ContractExpiry[]>({
    queryKey: ['hr-contract-expiry'],
    queryFn:  () =>
      axios.get<ContractExpiry[]>('/api/v1/hr/analytics/contract-expiry').then(r => r.data).catch(() => []),
    staleTime: 300_000,
  });

  const isLoading = loadingSummary || loadingTrend || loadingAttrition || loadingSalaryDist;

  const axisColor     = isDark ? '#888' : '#555';
  const gridColor     = isDark ? '#334155' : '#f0f0f0';
  const tooltipBg     = bgContainer;
  const tooltipBorder = borderColor;

  const chartCardStyle = {
    borderRadius: 12,
    background: bgContainer,
    border: `1px solid ${borderColor}`,
  };

  /* Build dept options from attritionByDept */
  const deptOptions = [
    { value: 'all', label: 'Tất cả phòng ban' },
    ...attritionByDept.map(d => ({ value: d.deptName, label: d.deptName })),
  ];

  const filteredAttrition = deptFilter === 'all'
    ? attritionByDept
    : attritionByDept.filter(d => d.deptName === deptFilter);

  /* Contract expiry columns */
  const contractColumns: ColumnsType<ContractExpiry> = [
    {
      title: 'Nhân viên',
      dataIndex: 'employee',
      render: (_: unknown, r: ContractExpiry) => <EmployeeInfoCell employee={r.employee} />,
    },
    {
      title: 'Loại HĐ',
      dataIndex: 'contractType',
      render: (v: string) => <Text style={{ color: textMuted, fontSize: 13 }}>{v ?? '—'}</Text>,
    },
    {
      title: 'Ngày hết hạn',
      dataIndex: 'expiryDate',
      render: (v: string) => (
        <Text style={{ color: textMuted, fontSize: 13 }}>
          {v ? dayjs(v).format('DD/MM/YYYY') : '—'}
        </Text>
      ),
    },
    {
      title: 'Còn lại (ngày)',
      dataIndex: 'daysLeft',
      align: 'center' as const,
      render: (_: unknown, record: ContractExpiry) => {
        const days   = record.daysLeft ?? daysLeftFromNow(record.expiryDate);
        const isRed  = days <= 15;
        const isAmber = !isRed && days <= 30;
        const tagColor  = isRed ? '#EF4444' : isAmber ? '#F59E0B' : '#10B981';
        const tagBg     = isRed
          ? (isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.08)')
          : isAmber
          ? (isDark ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.08)')
          : (isDark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.08)');
        const tagBorder = isRed
          ? (isDark ? 'rgba(239,68,68,0.35)' : 'rgba(239,68,68,0.3)')
          : isAmber
          ? (isDark ? 'rgba(245,158,11,0.35)' : 'rgba(245,158,11,0.3)')
          : (isDark ? 'rgba(16,185,129,0.35)' : 'rgba(16,185,129,0.3)');
        return (
          <Tag style={{ background: tagBg, color: tagColor, borderColor: tagBorder, fontWeight: 600 }}>
            {days} ngày
          </Tag>
        );
      },
    },
  ];

  if (isLoading) {
    return (
      <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
        <Spin size="large" tip="Đang tải dữ liệu analytics..." />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="HR Analytics"
        icon={<TeamOutlined />}
        iconColor="#8B5CF6"
        actions={
          <Button icon={<DownloadOutlined />}>Export Excel</Button>
        }
      />

      {/* FilterBar */}
      <FilterBar>
        <Select
          value={deptFilter}
          onChange={setDeptFilter}
          options={deptOptions}
          style={{ width: 200 }}
          placeholder="Phòng ban"
        />
        <Select
          value={yearFilter}
          onChange={setYearFilter}
          options={[2024, 2025, 2026].map(y => ({ value: y, label: `Năm ${y}` }))}
          style={{ width: 120 }}
        />
      </FilterBar>

      {/* 6 StatCards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={8} lg={4}>
          <StatCard
            label="Headcount"
            value={summary?.headcount ?? 0}
            color="#6366F1"
            icon={<TeamOutlined />}
          />
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <StatCard
            label="Mới tháng này"
            value={summary?.newHiresThisMonth ?? 0}
            color="#10B981"
            icon={<UserAddOutlined />}
            subValue="nhân viên mới"
          />
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <StatCard
            label="Nghỉ việc YTD"
            value={summary?.attritionYtd ?? 0}
            color="#EF4444"
            icon={<UserDeleteOutlined />}
            subValue="từ đầu năm"
          />
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <StatCard
            label="HĐ hết hạn 60 ngày"
            value={summary?.contractsExpiring60d ?? 0}
            color="#F59E0B"
            icon={<FileExclamationOutlined />}
            subValue="cần gia hạn"
          />
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <StatCard
            label="Đang tuyển"
            value={summary?.openPositions ?? 0}
            color="#3B82F6"
            icon={<SearchOutlined />}
            subValue="vị trí mở"
          />
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <StatCard
            label="Lương tb/người"
            value={`${Math.round((summary?.avgSalaryPerHead ?? 0) / 1_000_000)}M`}
            color="#F97316"
            icon={<DollarOutlined />}
            subValue="trung bình/tháng"
          />
        </Col>
      </Row>

      {/* Row 2: Headcount Trend (LineChart) + Attrition by Dept (BarChart) */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={14}>
          <Card
            title={<Text style={{ color: textPrimary, fontWeight: 600 }}>Headcount Trend — 12 tháng</Text>}
            style={chartCardStyle}
          >
            {headcountTrend.length === 0 ? (
              <Empty description={<Text style={{ color: textMuted }}>Chưa có dữ liệu</Text>} />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={headcountTrend} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="month" tick={{ fill: axisColor, fontSize: 11 }} />
                  <YAxis tick={{ fill: axisColor, fontSize: 11 }} allowDecimals={false} />
                  <RTooltip
                    contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 8 }}
                    formatter={(v, name) => {
                      const labels: Record<string, string> = { total: 'Headcount', newHires: 'Mới vào', resigns: 'Nghỉ việc' };
                      const key = String(name);
                      return [v as number, labels[key] ?? key];
                    }}
                  />
                  <Legend
                    formatter={(v) => {
                      const m: Record<string, string> = { total: 'Headcount', newHires: 'Mới vào', resigns: 'Nghỉ việc' };
                      return <span style={{ color: textMuted, fontSize: 12 }}>{m[v] ?? v}</span>;
                    }}
                  />
                  <Line type="monotone" dataKey="total"    stroke="#8B5CF6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="newHires" stroke="#10B981" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="resigns"  stroke="#EF4444" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>

        {/* Attrition by Department */}
        <Col xs={24} lg={10}>
          <Card
            title={<Text style={{ color: textPrimary, fontWeight: 600 }}>Attrition by Department</Text>}
            style={chartCardStyle}
          >
            {filteredAttrition.length === 0 ? (
              <Empty description={<Text style={{ color: textMuted }}>Không có dữ liệu attrition</Text>} />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={filteredAttrition}
                  layout="vertical"
                  margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
                  barSize={18}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                  <XAxis type="number" tick={{ fill: axisColor, fontSize: 12 }} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="deptName"
                    tick={{ fill: axisColor, fontSize: 11 }}
                    width={100}
                  />
                  <RTooltip
                    formatter={(v) => [`${v} người`, 'Nghỉ việc']}
                    contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 8 }}
                    labelStyle={{ color: axisColor }}
                  />
                  <Bar dataKey="count" name="Nghỉ việc" radius={[0, 6, 6, 0]}>
                    {filteredAttrition.map((_, i) => (
                      <Cell key={i} fill={i % 2 === 0 ? '#EF4444' : '#F87171'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>
      </Row>

      {/* Row 3: Salary Distribution histogram */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card
            title={<Text style={{ color: textPrimary, fontWeight: 600 }}>Phân bố lương (dải lương)</Text>}
            style={chartCardStyle}
          >
            {salaryDist.length === 0 ? (
              <Empty description={<Text style={{ color: textMuted }}>Chưa có dữ liệu lương</Text>} />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={salaryDist} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="range" tick={{ fill: axisColor, fontSize: 12 }} />
                  <YAxis tick={{ fill: axisColor, fontSize: 12 }} allowDecimals={false} />
                  <RTooltip
                    formatter={(v) => [`${v} người`, 'Số nhân viên']}
                    contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 8 }}
                  />
                  <Bar dataKey="count" name="Số nhân viên" radius={[6, 6, 0, 0]}>
                    {salaryDist.map((_, i) => {
                      const colors = ['#6366F1', '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'];
                      return <Cell key={i} fill={colors[i % colors.length]} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>

        {/* Contract Expiry Table */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Text style={{ color: textPrimary, fontWeight: 600 }}>
                Contract Expiry — 60 ngày tới
                {(summary?.contractsExpiring60d ?? 0) > 0 && (
                  <Tag
                    style={isDark
                      ? { background: 'rgba(245,158,11,0.15)', color: '#FCD34D', borderColor: 'rgba(245,158,11,0.35)', marginLeft: 8 }
                      : { marginLeft: 8 }}
                    color={isDark ? undefined : 'warning'}
                  >
                    {summary?.contractsExpiring60d} hợp đồng
                  </Tag>
                )}
              </Text>
            }
            style={chartCardStyle}
          >
            {contractExpiry.length === 0 ? (
              <Empty
                description={
                  <Text style={{ color: textMuted }}>
                    {summary?.contractsExpiring60d
                      ? `${summary.contractsExpiring60d} hợp đồng sắp hết hạn — xem tại module Contracts`
                      : 'Không có hợp đồng sắp hết hạn'}
                  </Text>
                }
              />
            ) : (
              <Table<ContractExpiry>
                rowKey="id"
                dataSource={contractExpiry}
                columns={contractColumns}
                pagination={{ pageSize: 6, size: 'small' }}
                size="small"
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
