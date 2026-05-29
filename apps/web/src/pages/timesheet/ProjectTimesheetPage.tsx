import { useState, CSSProperties } from 'react';
import { Select, DatePicker, Table, Spin, Empty } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useQuery } from '@tanstack/react-query';
import dayjs, { Dayjs } from 'dayjs';
import { timesheetApi, type ProjectSummaryMember } from '../../api/timesheet';
import { projectsApi } from '../../api/projects';
import { useThemePalette } from '../../hooks/useThemePalette';

import { Typography } from 'antd';
const { Text } = Typography;

interface RowData extends ProjectSummaryMember {
  key: string;
  isTotal?: boolean;
}

function cellStyle(hours: number, isDark: boolean): CSSProperties {
  if (hours <= 0) return { color: isDark ? '#4B5563' : '#d9d9d9', textAlign: 'center' };
  if (hours < 8) return {
    background: isDark ? '#291500' : '#FFFBEB',
    color: isDark ? '#fb923c' : '#D97706',
    textAlign: 'center',
    fontWeight: 600,
  };
  return { textAlign: 'center' };
}

export default function ProjectTimesheetPage() {
  const { isDark, preset } = useThemePalette();
  const [projectId, setProjectId] = useState<string | undefined>();
  const [month, setMonth] = useState<Dayjs>(dayjs().startOf('month'));

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.list,
  });

  const year = month.year();
  const monthNum = month.month() + 1;
  const daysInMonth = month.daysInMonth();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['project-timesheet', projectId, year, monthNum],
    queryFn: () => timesheetApi.projectSummary(projectId!, year, monthNum),
    enabled: !!projectId,
  });

  const dayColumns: ColumnsType<RowData> = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const date = dayjs(`${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    const isWeekend = date.day() === 0 || date.day() === 6;

    return {
      title: (
        <div style={{ textAlign: 'center', color: isWeekend ? '#bfbfbf' : undefined }}>
          <div style={{ fontSize: 11, fontWeight: 400 }}>{date.format('dd')}</div>
          <div style={{ fontSize: 12, fontWeight: 600 }}>{day}</div>
        </div>
      ),
      key: `day-${day}`,
      width: 52,
      onHeaderCell: () => ({
        style: { background: isWeekend ? (isDark ? '#1a1a1a' : '#fafafa') : undefined, padding: '4px 2px' },
      }),
      onCell: (record: RowData) => ({
        style: record.isTotal
          ? { background: isDark ? '#1a1a1a' : '#fafafa', fontWeight: 600, textAlign: 'center' }
          : cellStyle(record.daily[String(day)] ?? 0, isDark),
      }),
      render: (_: unknown, record: RowData) => {
        const hours = record.daily[String(day)] ?? 0;
        if (hours <= 0) return <span>—</span>;
        return <span>{hours}h</span>;
      },
    };
  });

  const totalRow: RowData | null = data
    ? {
        key: '__total__',
        employeeId: '',
        name: 'Tổng',
        daily: data.dailyTotal,
        total: data.grandTotal,
        isTotal: true,
      }
    : null;

  const rows: RowData[] = [
    ...(data?.members ?? []).map((m) => ({ ...m, key: m.employeeId })),
    ...(totalRow ? [totalRow] : []),
  ];

  const columns: ColumnsType<RowData> = [
    {
      title: 'Nhân sự',
      dataIndex: 'name',
      key: 'name',
      width: 160,
      fixed: 'left',
      render: (name: string, record: RowData) =>
        record.isTotal ? (
          <Text strong style={{ color: preset.primary }}>{name}</Text>
        ) : (
          <Text>{name}</Text>
        ),
    },
    ...dayColumns,
    {
      title: 'Tổng',
      dataIndex: 'total',
      key: 'total',
      width: 72,
      fixed: 'right',
      align: 'center',
      onCell: (record: RowData) => ({
        style: {
          fontWeight: 600,
          background: record.isTotal ? (isDark ? `${preset.primary}25` : `${preset.primary}12`) : (isDark ? '#1a1a1a' : '#fafafa'),
          color: record.isTotal ? preset.primary : undefined,
        },
      }),
      render: (total: number) => <span>{total > 0 ? `${total}h` : '—'}</span>,
    },
  ];

  return (
    <div className="page-wrapper">
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h1 className="page-title">Time Sheet</h1>

        <Select
          placeholder="Chọn dự án..."
          style={{ width: 320 }}
          loading={projectsLoading}
          value={projectId}
          onChange={setProjectId}
          showSearch={{ optionFilterProp: 'label' }}
          options={projects.map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` }))}
        />

        <DatePicker
          picker="month"
          value={month}
          onChange={(d) => d && setMonth(d.startOf('month'))}
          format="MM/YYYY"
          allowClear={false}
        />

        {data && (
          <div style={{ display: 'flex', gap: 8, marginLeft: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, borderRadius: 9999, padding: '3px 10px', background: isDark ? '#1e1b4b' : '#EEF2FF', color: isDark ? '#a5b4fc' : '#4338CA' }}>{data.members.length} nhân sự</span>
            <span style={{ fontSize: 12, fontWeight: 600, borderRadius: 9999, padding: '3px 10px', background: isDark ? '#052e16' : '#ECFDF5', color: isDark ? '#6ee7b7' : '#065F46' }}>Tổng: {data.grandTotal}h</span>
          </div>
        )}
      </div>

      <div style={{ marginBottom: 10, display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 16, height: 10, background: isDark ? '#291500' : '#FFFBEB', border: `1px solid ${isDark ? '#7c2d12' : '#FDE68A'}`, display: 'inline-block', borderRadius: 2 }} />
          {'< 8h (cảnh báo)'}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 16, height: 10, background: isDark ? '#1E293B' : '#F1F5F9', border: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`, display: 'inline-block', borderRadius: 2 }} />
          {'≥ 8h'}
        </span>
      </div>

      {!projectId ? (
        <Empty description="Chọn dự án để xem timesheet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <Spin spinning={isLoading || isFetching}>
          <Table<RowData>
            columns={columns}
            dataSource={rows}
            pagination={false}
            size="small"
            scroll={{ x: 'max-content' }}
            bordered
            rowClassName={(r) => (r.isTotal ? 'timesheet-total-row' : '')}
          />
        </Spin>
      )}
    </div>
  );
}
