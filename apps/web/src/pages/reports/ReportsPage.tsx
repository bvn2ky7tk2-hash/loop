import { useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Typography, Tabs } from 'antd';
import { BugOutlined, TeamOutlined, ShopOutlined, UsergroupAddOutlined, LaptopOutlined, SwapOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '../../api/reports';
import { projectsApi } from '../../api/projects';
import { useThemePalette } from '../../hooks/useThemePalette';
import dayjs from 'dayjs';
import { LEVEL_BADGE } from './components/shared';
import { CrmReportTab } from './components/CrmReportTab';
import { RecruitmentReportTab } from './components/RecruitmentReportTab';
import { AssetReportTab } from './components/AssetReportTab';
import { PeriodComparisonTab } from './components/PeriodComparisonTab';
import { HoursTab } from './components/HoursTab';
import { BurndownTab } from './components/BurndownTab';
import { OrgTab } from './components/OrgTab';
import { BugStatsTab } from './components/BugStatsTab';
import { HrStatsTab } from './components/HrStatsTab';
import { ExportSection } from './components/ExportSection';

const { Text } = Typography;

export default function ReportsPage() {
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const { isDark, primary, bgContainer, borderColor, textPrimary } = useThemePalette();
  const chartCardStyle = {
    borderRadius: 12,
    background: bgContainer,
    border: `1px solid ${borderColor}`,
  };
  const axisColor = isDark ? '#888' : '#555';
  const gridColor = isDark ? '#333' : '#f0f0f0';
  const tooltipBg = isDark ? '#1f1f1f' : '#fff';

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.list,
  });

  const { data: topEmployees = [] } = useQuery({
    queryKey: ['reports-top-employees'],
    queryFn: () => reportsApi.topEmployees(15),
  });

  const { data: monthlyHours = [] } = useQuery({
    queryKey: ['reports-monthly-hours'],
    queryFn: () => reportsApi.monthlyHours(6),
  });

  const { data: orgSummary = [] } = useQuery({
    queryKey: ['reports-org-summary'],
    queryFn: reportsApi.orgSummary,
  });

  const { data: burndown } = useQuery({
    queryKey: ['reports-burndown', selectedProject],
    queryFn: () => reportsApi.projectBurndown(selectedProject!),
    enabled: !!selectedProject,
  });

  const { data: bugStats } = useQuery({
    queryKey: ['bug-stats'],
    queryFn: reportsApi.bugStats,
  });

  const { data: hrStats } = useQuery({
    queryKey: ['hr-stats'],
    queryFn: reportsApi.hrStats,
  });

  const topEmployeeColumns = [
    { title: 'STT', render: (_: unknown, __: unknown, i: number) => i + 1, width: 50 },
    { title: 'Mã', dataIndex: 'code', width: 80 },
    { title: 'Tên', dataIndex: 'name' },
    {
      title: 'Cấp độ', dataIndex: 'level', width: 80,
      render: (v: string) => {
        const cfg = LEVEL_BADGE[v] ?? { bg: '#F1F5F9', color: '#94A3B8' };
        return <span style={{ fontSize: 11, fontWeight: 600, borderRadius: 9999, padding: '2px 8px', background: cfg.bg, color: cfg.color }}>{v}</span>;
      },
    },
    { title: 'Đơn vị', dataIndex: 'orgUnit', ellipsis: true },
    {
      title: 'Tổng giờ', dataIndex: 'totalHours', width: 100,
      render: (v: number) => <Text strong>{v}h</Text>,
      sorter: (a: { totalHours: number }, b: { totalHours: number }) => a.totalHours - b.totalHours,
      defaultSortOrder: 'descend' as const,
    },
  ];

  const orgColumns = [
    { title: 'Đơn vị', dataIndex: 'name' },
    { title: 'Mã', dataIndex: 'code', width: 80 },
    { title: 'Nhân sự', dataIndex: 'employeeCount', width: 90, render: (v: number) => <span style={{ fontSize: 12, fontWeight: 700, color: '#4338CA' }}>{v}</span> },
    { title: 'Dự án', dataIndex: 'projectCount', width: 80, render: (v: number) => <span style={{ fontSize: 12, fontWeight: 700, color: '#6D28D9' }}>{v}</span> },
  ];

  const monthlyChartData = monthlyHours.map((m) => ({
    month: dayjs(m.month + '-01').format('MM/YYYY'),
    hours: m.totalHours,
  }));

  const topBarData = topEmployees.slice(0, 10).map((e) => ({
    name: e.name.split(' ').slice(-2).join(' '),
    hours: e.totalHours,
    level: e.level,
  }));

  return (
    <div className="page-wrapper">
      <PageHeader title="Reports" />

      <Tabs
        items={[
          {
            key: 'hours',
            label: 'Giờ làm việc',
            children: (
              <HoursTab
                axisColor={axisColor} gridColor={gridColor} tooltipBg={tooltipBg} primary={primary} chartCardStyle={chartCardStyle}
                topBarData={topBarData}
                monthlyChartData={monthlyChartData}
                topEmployees={topEmployees}
                topEmployeeColumns={topEmployeeColumns}
              />
            ),
          },
          {
            key: 'burndown',
            label: 'Tiến độ dự án',
            children: (
              <BurndownTab
                axisColor={axisColor} gridColor={gridColor} tooltipBg={tooltipBg} primary={primary} chartCardStyle={chartCardStyle}
                projects={projects}
                selectedProject={selectedProject}
                setSelectedProject={setSelectedProject}
                burndown={burndown}
              />
            ),
          },
          {
            key: 'org',
            label: 'Theo đơn vị',
            children: (
              <OrgTab
                axisColor={axisColor} gridColor={gridColor} tooltipBg={tooltipBg} primary={primary} chartCardStyle={chartCardStyle}
                orgSummary={orgSummary}
                orgColumns={orgColumns}
              />
            ),
          },
          {
            key: 'bug-stats',
            label: <span><BugOutlined style={{ marginRight: 4 }} />Bug Statistics</span>,
            children: (
              <BugStatsTab
                axisColor={axisColor} gridColor={gridColor} tooltipBg={tooltipBg} primary={primary} chartCardStyle={chartCardStyle}
                bugStats={bugStats}
              />
            ),
          },
          {
            key: 'hr-stats',
            label: <span><TeamOutlined style={{ marginRight: 4 }} />HR Stats</span>,
            children: (
              <HrStatsTab
                axisColor={axisColor} gridColor={gridColor} tooltipBg={tooltipBg} primary={primary} chartCardStyle={chartCardStyle}
                hrStats={hrStats}
                isDark={isDark}
                textPrimary={textPrimary}
              />
            ),
          },
          {
            key: 'crm-report',
            label: <><ShopOutlined /> CRM</>,
            children: <CrmReportTab axisColor={axisColor} gridColor={gridColor} tooltipBg={tooltipBg} primary={primary} chartCardStyle={chartCardStyle} />,
          },
          {
            key: 'recruitment-report',
            label: <><UsergroupAddOutlined /> Recruitment</>,
            children: <RecruitmentReportTab axisColor={axisColor} gridColor={gridColor} tooltipBg={tooltipBg} primary={primary} chartCardStyle={chartCardStyle} />,
          },
          {
            key: 'asset-report',
            label: <><LaptopOutlined /> Assets</>,
            children: <AssetReportTab axisColor={axisColor} gridColor={gridColor} tooltipBg={tooltipBg} primary={primary} chartCardStyle={chartCardStyle} />,
          },
          {
            key: 'period-comparison',
            label: <><SwapOutlined /> So sánh kỳ</>,
            children: <PeriodComparisonTab chartCardStyle={chartCardStyle} />,
          },
        ]}
      />

      {/* ── Export Section (Story 8.3) ───────────────────────────────────────── */}
      <ExportSection chartCardStyle={chartCardStyle} />
    </div>
  );
}
