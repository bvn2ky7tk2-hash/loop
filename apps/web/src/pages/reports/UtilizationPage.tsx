import { useState, useEffect } from 'react';
import { Row, Col, Table, DatePicker, Select, Typography } from 'antd';
import { BarChartOutlined, UserOutlined, CheckCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { usePagination } from '../../hooks/usePagination';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import dayjs from 'dayjs';
import { useThemePalette } from '../../hooks/useThemePalette';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { FilterBar } from '../../components/FilterBar';
import { apiClient } from '../../api/client';

const { Text } = Typography;

interface UtilizationEmployee {
  employeeId: string;
  name: string;
  department: string;
  actualHours: number;
  availableHours: number;
  utilizationPct: number;
}

interface UtilizationData {
  avgUtilization: number;
  highCount: number;
  lowCount: number;
  employees: UtilizationEmployee[];
}

function utilColor(pct: number) {
  if (pct >= 80) return '#10B981';
  if (pct >= 50) return '#F59E0B';
  return '#EF4444';
}

export default function UtilizationPage() {
  const { textPrimary, textMuted, bgContainer, borderColor, isDark } = useThemePalette();
  const { resetPage, paginationProps } = usePagination(10);
  const [period, setPeriod] = useState(dayjs().format('YYYY-MM'));
  const [departmentId, setDepartmentId] = useState<string | undefined>();

  useEffect(() => { resetPage(); }, [period, departmentId, resetPage]);

  const { data, isFetching } = useQuery<UtilizationData>({
    queryKey: ['reports-utilization', period, departmentId],
    queryFn: () =>
      apiClient
        .get<UtilizationData>('/reports/utilization', {
          params: { period, ...(departmentId ? { departmentId } : {}) },
        })
        .then(r => r.data),
  });

  const employees = data?.employees ?? [];

  const top10BarData = [...employees]
    .sort((a, b) => b.utilizationPct - a.utilizationPct)
    .slice(0, 10)
    .map(e => ({
      name: e.name.split(' ').slice(-2).join(' '),
      pct: e.utilizationPct,
      color: utilColor(e.utilizationPct),
    }));

  const axisColor = isDark ? '#888' : '#555';
  const gridColor = isDark ? '#333' : '#f0f0f0';
  const tooltipBg = isDark ? '#1f1f1f' : '#fff';

  const columns = [
    {
      title: 'Nhân viên',
      dataIndex: 'name',
      render: (v: string) => <Text style={{ color: textPrimary }}>{v}</Text>,
    },
    {
      title: 'Phòng ban',
      dataIndex: 'department',
      render: (v: string) => <Text style={{ color: textMuted }}>{v || '—'}</Text>,
    },
    {
      title: 'Giờ thực tế',
      dataIndex: 'actualHours',
      width: 120,
      align: 'right' as const,
      render: (v: number) => <Text style={{ color: textPrimary }}>{v}h</Text>,
    },
    {
      title: 'Giờ có sẵn',
      dataIndex: 'availableHours',
      width: 120,
      align: 'right' as const,
      render: (v: number) => <Text style={{ color: textMuted }}>{v}h</Text>,
    },
    {
      title: 'Utilization %',
      dataIndex: 'utilizationPct',
      width: 130,
      align: 'right' as const,
      sorter: (a: UtilizationEmployee, b: UtilizationEmployee) => a.utilizationPct - b.utilizationPct,
      defaultSortOrder: 'descend' as const,
      render: (v: number) => (
        <Text style={{ color: utilColor(v), fontWeight: 700 }}>{v}%</Text>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Utilization Rate"
        icon={<BarChartOutlined />}
        iconColor="#6366F1"
      />

      <FilterBar>
        <DatePicker
          picker="month"
          value={dayjs(period)}
          onChange={v => v && setPeriod(v.format('YYYY-MM'))}
          format="MM/YYYY"
          allowClear={false}
          placeholder="Chọn tháng"
        />
        <Select
          style={{ minWidth: 200 }}
          placeholder="Tất cả phòng ban"
          allowClear
          onChange={v => setDepartmentId(v ?? undefined)}
        />
      </FilterBar>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <StatCard
            label="Avg Utilization"
            value={`${data?.avgUtilization ?? 0}%`}
            color="#6366F1"
            icon={<BarChartOutlined />}
          />
        </Col>
        <Col xs={24} sm={8}>
          <StatCard
            label="Nhân viên ≥80%"
            value={data?.highCount ?? 0}
            color="#10B981"
            icon={<CheckCircleOutlined />}
          />
        </Col>
        <Col xs={24} sm={8}>
          <StatCard
            label="Nhân viên <50%"
            value={data?.lowCount ?? 0}
            color="#EF4444"
            icon={<WarningOutlined />}
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10}>
          <div style={{
            background: bgContainer,
            border: `1px solid ${borderColor}`,
            borderRadius: 12,
            padding: '16px 20px',
            marginBottom: 16,
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: textPrimary, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <UserOutlined style={{ color: '#6366F1' }} />
              Top 10 nhân viên theo utilization
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={top10BarData}
                layout="vertical"
                margin={{ left: 60, right: 24, top: 4, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fill: axisColor, fontSize: 12 }} tickFormatter={v => `${v}%`} />
                <YAxis type="category" dataKey="name" tick={{ fill: axisColor, fontSize: 12 }} width={70} />
                <RTooltip
                  formatter={(v) => [`${v}%`, 'Utilization']}
                  contentStyle={{ background: tooltipBg, border: '1px solid #333' }}
                />
                <Bar dataKey="pct" radius={[0, 4, 4, 0]}>
                  {top10BarData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Col>

        <Col xs={24} lg={14}>
          <div style={{
            background: bgContainer,
            border: `1px solid ${borderColor}`,
            borderRadius: 12,
            padding: '16px 20px',
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: textPrimary, marginBottom: 12 }}>
              Danh sách nhân viên
            </div>
            <Table
              dataSource={employees}
              columns={columns}
              rowKey="employeeId"
              size="small"
              loading={isFetching}
              pagination={{ ...paginationProps(employees.length, 'nhân viên'), size: 'small' }}
              locale={{ emptyText: <Text style={{ color: textMuted }}>Không có dữ liệu</Text> }}
            />
          </div>
        </Col>
      </Row>
    </div>
  );
}
