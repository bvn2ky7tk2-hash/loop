import { useState } from 'react';
import { Row, Col, Card, Table, Select, Typography, Space, theme } from 'antd';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line,
} from 'recharts';
import { BugOutlined, WarningOutlined, CheckCircleOutlined, SyncOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '../../api/projects';
import { useGetBugStats } from '../../api/bugs.api';
import { useThemeStore } from '../../store/theme.store';
import { SparklineCard } from '../../components/ui/SparklineCard';

const STATUS_COLORS = ['#1677FF', '#FA8C16', '#52C41A', '#8C8C8C', '#D9D9D9'];
const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: '#FF4D4F', HIGH: '#FA8C16', MEDIUM: '#FADB14', LOW: '#52C41A',
};

export default function BugDashboardPage() {
  const { mode, preset } = useThemeStore();
  const isDark = mode === 'dark';
  const primary = preset.primary;
  const chartCardStyle = {
    borderRadius: 12,
    background: isDark ? '#1E293B' : `${primary}09`,
    border: `1px solid ${isDark ? '#334155' : `${primary}28`}`,
  };
  const { token } = theme.useToken();
  const navigate   = useNavigate();
  const [projectId, setProjectId] = useState<string | undefined>();

  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: projectsApi.list });
  const { data: stats, isLoading } = useGetBugStats(projectId ? { projectId } : {});

  const gridColor    = isDark ? 'rgba(255,255,255,0.1)' : '#eee';
  const labelColor   = isDark ? 'rgba(255,255,255,0.85)' : '#333';
  const tooltipStyle = isDark
    ? { backgroundColor: '#1E293B', border: '1px solid #334155', color: '#F1F5F9' }
    : undefined;

  const statusData = stats
    ? [
        { name: 'Open',       value: stats.byStatus.open,       fill: STATUS_COLORS[0] },
        { name: 'Đang xử lý', value: stats.byStatus.inProgress, fill: STATUS_COLORS[1] },
        { name: 'Resolved',   value: stats.byStatus.resolved,   fill: STATUS_COLORS[2] },
        { name: 'Closed',     value: stats.byStatus.closed,     fill: STATUS_COLORS[3] },
        { name: 'Đã huỷ',     value: stats.byStatus.cancelled,  fill: STATUS_COLORS[4] },
      ]
    : [];

  const severityData = stats
    ? [
        { name: 'Critical', value: stats.bySeverity.critical, fill: SEVERITY_COLORS.CRITICAL },
        { name: 'High',     value: stats.bySeverity.high,     fill: SEVERITY_COLORS.HIGH },
        { name: 'Medium',   value: stats.bySeverity.medium,   fill: SEVERITY_COLORS.MEDIUM },
        { name: 'Low',      value: stats.bySeverity.low,      fill: SEVERITY_COLORS.LOW },
      ]
    : [];

  const trendData = stats?.trend.map((d) => ({
    date:     d.date.slice(5), // MM-DD
    'Tạo mới':  d.created,
    'Resolved': d.resolved,
  })) ?? [];

  const projectColumns: ColumnsType<(typeof stats)['openByProject'][0]> = [
    {
      title: 'Dự án', dataIndex: 'projectName',
      render: (name, row) => (
        <Link to={`/bugs?projectId=${row.projectId}`} style={{ color: token.colorPrimary }}>
          {name}
        </Link>
      ),
    },
    { title: 'Open',     dataIndex: 'open',     width: 80, align: 'right' },
    { title: 'Critical', dataIndex: 'critical', width: 80, align: 'right' },
    { title: 'Tổng',     dataIndex: 'total',    width: 80, align: 'right' },
  ];

  const taskColumns: ColumnsType<(typeof stats)['openByTask'][0]> = [
    { title: 'Task',         dataIndex: 'taskTitle',   ellipsis: true },
    { title: 'Dự án',        dataIndex: 'projectName', width: 140, ellipsis: true },
    { title: 'Bug đang mở',  dataIndex: 'openCount',   width: 100, align: 'right' },
  ];

  const assigneeData = (stats?.openByAssignee ?? []).map((r) => ({
    name:      r.assigneeName,
    'Đang mở': r.open,
    Critical:  r.critical,
    Tổng:      r.total,
  }));

  const assigneeColumns: ColumnsType<(typeof stats)['openByAssignee'][0]> = [
    {
      title: 'Nhân sự', dataIndex: 'assigneeName', ellipsis: true,
      render: (name: string) => <Typography.Text strong>{name}</Typography.Text>,
    },
    {
      title: 'Đang mở', dataIndex: 'open', width: 90, align: 'right',
      render: (v: number) => (
        <Typography.Text style={{ color: '#1677FF', fontWeight: 600 }}>{v}</Typography.Text>
      ),
      sorter: (a, b) => a.open - b.open,
      defaultSortOrder: 'descend',
    },
    {
      title: 'Critical', dataIndex: 'critical', width: 90, align: 'right',
      render: (v: number) => v > 0
        ? <Typography.Text style={{ color: '#FF4D4F', fontWeight: 600 }}>{v}</Typography.Text>
        : <Typography.Text type="secondary">0</Typography.Text>,
    },
    { title: 'Tổng', dataIndex: 'total', width: 75, align: 'right' },
  ];

  const reporterData = (stats?.openByReporter ?? []).map((r) => ({
    name:      r.reporterName,
    'Đang mở': r.open,
    Critical:  r.critical,
    Tổng:      r.total,
  }));

  const reporterColumns: ColumnsType<(typeof stats)['openByReporter'][0]> = [
    {
      title: 'Người tạo', dataIndex: 'reporterName', ellipsis: true,
      render: (name: string) => <Typography.Text strong>{name}</Typography.Text>,
    },
    {
      title: 'Đang mở', dataIndex: 'open', width: 90, align: 'right',
      render: (v: number) => (
        <Typography.Text style={{ color: '#1677FF', fontWeight: 600 }}>{v}</Typography.Text>
      ),
      sorter: (a, b) => a.open - b.open,
      defaultSortOrder: 'descend',
    },
    {
      title: 'Critical', dataIndex: 'critical', width: 90, align: 'right',
      render: (v: number) => v > 0
        ? <Typography.Text style={{ color: '#FF4D4F', fontWeight: 600 }}>{v}</Typography.Text>
        : <Typography.Text type="secondary">0</Typography.Text>,
    },
    { title: 'Tổng', dataIndex: 'total', width: 75, align: 'right' },
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* Tab navigation */}
      <Space style={{ marginBottom: 16 }}>
        <Typography.Link onClick={() => navigate('/bugs')}>List</Typography.Link>
        <Typography.Text strong>Dashboard</Typography.Text>
      </Space>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>Bug Dashboard</Typography.Title>
        <Select
          placeholder="Tất cả dự án"
          allowClear
          style={{ width: 220 }}
          options={projects.map((p) => ({ value: p.id, label: p.name }))}
          onChange={setProjectId}
        />
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} lg={6}>
          <SparklineCard label="Open" value={stats?.byStatus.open ?? 0} color="#1677FF" icon={<BugOutlined />} filled loading={isLoading} />
        </Col>
        <Col xs={12} lg={6}>
          <SparklineCard label="Đang xử lý" value={stats?.byStatus.inProgress ?? 0} color="#FA8C16" icon={<SyncOutlined />} filled loading={isLoading} />
        </Col>
        <Col xs={12} lg={6}>
          <SparklineCard label="Resolved" value={stats?.byStatus.resolved ?? 0} color="#52C41A" icon={<CheckCircleOutlined />} filled loading={isLoading} />
        </Col>
        <Col xs={12} lg={6}>
          <SparklineCard label="Critical" value={stats?.bySeverity.critical ?? 0} color="#FF4D4F" icon={<WarningOutlined />} filled loading={isLoading} />
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* Card 1: Status Donut */}
        <Col xs={24} lg={12}>
          <Card title="Trạng thái tổng quan" loading={isLoading} style={chartCardStyle}>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="80%">
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Card 2: Severity Bar */}
        <Col xs={24} lg={12}>
          <Card title="Phân bố mức độ" loading={isLoading} style={chartCardStyle}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={severityData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis type="number" tick={{ fill: labelColor }} />
                <YAxis type="category" dataKey="name" width={60} tick={{ fill: labelColor }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" label={{ position: 'right', fill: labelColor }}>
                  {severityData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Card 3: Top Projects */}
        <Col xs={24} lg={12}>
          <Card title="Top dự án nhiều bug nhất" loading={isLoading} style={chartCardStyle}>
            <Table
              dataSource={stats?.openByProject ?? []}
              columns={projectColumns}
              rowKey="projectId"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>

        {/* Card 4: Top Tasks */}
        <Col xs={24} lg={12}>
          <Card title="Task nhiều bug nhất" loading={isLoading} style={chartCardStyle}>
            <Table
              dataSource={stats?.openByTask ?? []}
              columns={taskColumns}
              rowKey="taskId"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>

        {/* Card 5: Bugs theo nhân sự */}
        <Col xs={24}>
          <Card title="Bug theo nhân sự xử lý" loading={isLoading} style={chartCardStyle}>
            {assigneeData.length === 0 ? (
              <Typography.Text type="secondary">Chưa có bug nào được assign</Typography.Text>
            ) : (
              <Row gutter={16} align="top">
                <Col xs={24} lg={15}>
                  <ResponsiveContainer width="100%" height={Math.max(220, assigneeData.length * 44)}>
                    <BarChart data={assigneeData} layout="vertical" margin={{ left: 8, right: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                      <XAxis type="number" tick={{ fill: labelColor, fontSize: 12 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" width={120} tick={{ fill: labelColor, fontSize: 12 }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend />
                      <Bar dataKey="Đang mở"  fill="#1677FF" radius={[0, 4, 4, 0]}
                        label={{ position: 'right', fill: labelColor, fontSize: 11 }} />
                      <Bar dataKey="Critical" fill="#FF4D4F" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="Tổng"     fill="#8B5CF6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Col>
                <Col xs={24} lg={9}>
                  <Table
                    dataSource={stats?.openByAssignee ?? []}
                    columns={assigneeColumns}
                    rowKey="assigneeId"
                    pagination={false}
                    size="small"
                    scroll={{ y: Math.max(220, assigneeData.length * 44) }}
                  />
                </Col>
              </Row>
            )}
          </Card>
        </Col>

        {/* Card 6: Bug theo người tạo */}
        <Col xs={24}>
          <Card title="Bug theo người tạo" loading={isLoading} style={chartCardStyle}>
            {reporterData.length === 0 ? (
              <Typography.Text type="secondary">Chưa có dữ liệu</Typography.Text>
            ) : (
              <Row gutter={16} align="top">
                <Col xs={24} lg={15}>
                  <ResponsiveContainer width="100%" height={Math.max(220, reporterData.length * 44)}>
                    <BarChart data={reporterData} layout="vertical" margin={{ left: 8, right: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                      <XAxis type="number" tick={{ fill: labelColor, fontSize: 12 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" width={120} tick={{ fill: labelColor, fontSize: 12 }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend />
                      <Bar dataKey="Đang mở"  fill="#1677FF" radius={[0, 4, 4, 0]}
                        label={{ position: 'right', fill: labelColor, fontSize: 11 }} />
                      <Bar dataKey="Critical" fill="#FF4D4F" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="Tổng"     fill="#52C41A" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Col>
                <Col xs={24} lg={9}>
                  <Table
                    dataSource={stats?.openByReporter ?? []}
                    columns={reporterColumns}
                    rowKey="reporterId"
                    pagination={false}
                    size="small"
                    scroll={{ y: Math.max(220, reporterData.length * 44) }}
                  />
                </Col>
              </Row>
            )}
          </Card>
        </Col>

        {/* Card 7: Trend 30 ngày */}
        <Col xs={24}>
          <Card title="Xu hướng 30 ngày" loading={isLoading} style={chartCardStyle}>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="date" tick={{ fill: labelColor, fontSize: 11 }} />
                <YAxis tick={{ fill: labelColor }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Line type="monotone" dataKey="Tạo mới"  stroke="#FF4D4F" dot={{ r: 2 }} />
                <Line type="monotone" dataKey="Resolved" stroke="#52C41A" dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
