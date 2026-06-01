import { useState, useMemo } from 'react';
import {
  Table, Typography, Tag, Space, Select, DatePicker,
  Collapse, Progress, Tabs, Tooltip, Button, Popconfirm, App,
} from 'antd';
import {
  ScheduleOutlined, HistoryOutlined, UserOutlined,
  BarChartOutlined, ThunderboltOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useThemePalette } from '../../hooks/useThemePalette';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { FilterBar } from '../../components/FilterBar';
import { EmployeeInfoCell } from '../../components/ui/EmployeeInfoCell';
import { orgUnitsApi } from '../../api/org-units';
import { leavesApi } from '../../api/leaves';

const { Text } = Typography;

const MONTH_NAMES = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];

type EmployeeLeave = Awaited<ReturnType<typeof leavesApi.getAllBalance>>['data'][0];
type MonthStat = Awaited<ReturnType<typeof leavesApi.getMonthlyStats>>['months'][0];

// ── Tab 1: Phép tồn nhân sự ───────────────────────────────────────────────────

function BalanceTab({
  year, orgUnitId, orgOptions,
  setYear, setOrgUnit,
}: {
  year: number; orgUnitId?: string; orgOptions: { value: string; label: string }[];
  setYear: (y: number) => void; setOrgUnit: (v?: string) => void;
}) {
  const { textPrimary, textMuted, isDark, linkColor } = useThemePalette();
  const { message: msg } = App.useApp();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  const { data, isLoading } = useQuery({
    queryKey: ['leave-summary-all', year, orgUnitId, page],
    queryFn: () => leavesApi.getAllBalance({ year, orgUnitId, page, limit: PAGE_SIZE }),
    placeholderData: (prev) => prev,
  });

  const initMutation = useMutation({
    mutationFn: () => leavesApi.initBalances({ year, orgUnitId }),
    onSuccess: (res) => {
      msg.success(res.message);
      qc.invalidateQueries({ queryKey: ['leave-summary-all'] });
    },
    onError: () => msg.error('Khởi tạo thất bại'),
  });

  const employees = data?.data ?? [];
  const total     = data?.total ?? 0;

  const totalEmployees   = total;
  const totalUsed        = employees.reduce((s, e) => s + e.balances.reduce((a, b) => a + b.usedDays, 0), 0);
  const totalRemaining   = employees.reduce((s, e) => s + e.balances.reduce((a, b) => a + b.remainingDays, 0), 0);
  const zeroBalanceCount = employees.filter((e) => e.balances.every((b) => b.remainingDays <= 0)).length;

  const columns: ColumnsType<EmployeeLeave> = [
    {
      title: 'Nhân viên',
      key: 'employee',
      width: 200,
      render: (_: unknown, r: EmployeeLeave) => <EmployeeInfoCell employee={r.employee} />,
    },
    {
      title: `Phép tồn ${year}`,
      key: 'balances',
      render: (_: unknown, r: EmployeeLeave) => {
        if (!r.balances.length) return <Text style={{ color: textMuted }}>Chưa có phép</Text>;
        return (
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            {r.balances.map((b) => {
              const pct = b.totalDays > 0 ? Math.round((b.usedDays / b.totalDays) * 100) : 0;
              return (
                <div key={b.leaveTypeId}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <Tag
                      style={{
                        background: isDark ? `${b.leaveType.color}22` : `${b.leaveType.color}18`,
                        color: b.leaveType.color, borderColor: `${b.leaveType.color}55`,
                        fontSize: 11, margin: 0,
                      }}
                    >
                      {b.leaveType.name}
                    </Tag>
                    <Text style={{ color: b.remainingDays <= 0 ? '#EF4444' : textPrimary, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {b.remainingDays} / {b.totalDays} ngày
                    </Text>
                  </div>
                  <Progress
                    percent={pct}
                    size="small"
                    strokeColor={b.remainingDays <= 0 ? '#EF4444' : b.leaveType.color}
                    showInfo={false}
                    style={{ marginTop: 2 }}
                  />
                </div>
              );
            })}
          </Space>
        );
      },
    },
    {
      title: 'Đã dùng (ngày)',
      key: 'used',
      width: 110,
      align: 'right',
      render: (_: unknown, r: EmployeeLeave) => {
        const used = r.balances.reduce((s, b) => s + b.usedDays, 0);
        return <Text style={{ color: used > 0 ? '#F59E0B' : textMuted, fontWeight: 600 }}>{used}</Text>;
      },
    },
    {
      title: 'Còn lại (ngày)',
      key: 'remaining',
      width: 110,
      align: 'right',
      render: (_: unknown, r: EmployeeLeave) => {
        const remaining = r.balances.reduce((s, b) => s + b.remainingDays, 0);
        return (
          <Text style={{ color: remaining <= 0 ? '#EF4444' : '#10B981', fontWeight: 700 }}>
            {remaining}
          </Text>
        );
      },
    },
    {
      title: 'Lịch sử gần đây',
      key: 'history',
      render: (_: unknown, r: EmployeeLeave) => {
        if (!r.recentHistory.length) return <Text style={{ color: textMuted }}>—</Text>;
        return (
          <Collapse
            ghost
            size="small"
            items={[{
              key: '1',
              label: (
                <Text style={{ color: linkColor, fontSize: 12 }}>
                  <HistoryOutlined style={{ marginRight: 4 }} />
                  {r.recentHistory.length} lần nghỉ gần nhất
                </Text>
              ),
              children: (
                <Space direction="vertical" size={3} style={{ width: '100%' }}>
                  {r.recentHistory.map((h) => (
                    <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <Space size={4}>
                        {h.leaveType && (
                          <Tag style={{ fontSize: 10, padding: '0 4px', margin: 0, color: h.leaveType.color, borderColor: `${h.leaveType.color}55`, background: `${h.leaveType.color}18` }}>
                            {h.leaveType.name}
                          </Tag>
                        )}
                        <Text style={{ color: textMuted }}>
                          {dayjs(h.startDate).format('DD/MM')} → {dayjs(h.endDate).format('DD/MM/YYYY')}
                        </Text>
                      </Space>
                      <Text style={{ color: textPrimary, fontWeight: 600 }}>{h.days}N</Text>
                    </div>
                  ))}
                </Space>
              ),
            }]}
          />
        );
      },
    },
  ];

  return (
    <>
      {/* Stats */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 160 }}>
          <StatCard label="Tổng nhân viên" value={totalEmployees} color="#6366F1" icon={<UserOutlined />} />
        </div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <StatCard label={`Đã dùng phép ${year}`} value={`${totalUsed} ngày`} color="#F59E0B" icon={<HistoryOutlined />} />
        </div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <StatCard label="Phép tồn còn lại" value={`${totalRemaining} ngày`} color="#10B981" icon={<ScheduleOutlined />} />
        </div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <StatCard label="Đã hết phép" value={zeroBalanceCount} color={zeroBalanceCount > 0 ? '#EF4444' : '#94A3B8'} icon={<ScheduleOutlined />} />
        </div>
      </div>

      <FilterBar
        right={
          <Popconfirm
            title={`Khởi tạo phép năm ${year}`}
            description={
              <span>
                Tạo số dư phép ban đầu cho toàn bộ nhân viên<br />
                dựa trên tất cả loại phép đang hoạt động.<br />
                Bản ghi đã có <strong>sẽ không bị ghi đè</strong>.
              </span>
            }
            onConfirm={() => initMutation.mutate()}
            okText="Khởi tạo"
            cancelText="Hủy"
          >
            <Button
              icon={<ThunderboltOutlined />}
              loading={initMutation.isPending}
              disabled={initMutation.isPending}
            >
              Khởi tạo phép năm {year}
            </Button>
          </Popconfirm>
        }
      >
        <DatePicker
          picker="year"
          value={dayjs().year(year)}
          onChange={(d) => { if (d) { setYear(d.year()); setPage(1); } }}
          style={{ width: 100 }}
        />
        <Select
          placeholder="Phòng ban"
          allowClear
          style={{ width: 220 }}
          value={orgUnitId}
          onChange={(v) => { setOrgUnit(v); setPage(1); }}
          options={orgOptions}
          showSearch
          filterOption={(input, opt) => String(opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
        />
      </FilterBar>

      <Table<EmployeeLeave>
        rowKey={(r) => r.employee.id}
        columns={columns}
        dataSource={employees}
        loading={isLoading}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total,
          showSizeChanger: false,
          showTotal: (t) => `${t} nhân viên`,
          onChange: setPage,
        }}
        size="small"
        scroll={{ x: 900 }}
      />
    </>
  );
}

// ── Tab 2: Phép giảm hàng tháng ──────────────────────────────────────────────

function MonthlyTrendTab({
  year, orgUnitId, orgOptions,
  setYear, setOrgUnit,
}: {
  year: number; orgUnitId?: string; orgOptions: { value: string; label: string }[];
  setYear: (y: number) => void; setOrgUnit: (v?: string) => void;
}) {
  const { textPrimary, textMuted, isDark, bgCard, borderColor } = useThemePalette();

  const { data: statsData, isLoading } = useQuery({
    queryKey: ['leave-monthly-stats', year, orgUnitId],
    queryFn: () => leavesApi.getMonthlyStats({ year, orgUnitId }),
  });

  const months = statsData?.months ?? [];

  // Tập hợp tất cả loại phép có trong dữ liệu
  const allTypes = useMemo(() => {
    const map = new Map<string, { leaveTypeId: string; name: string; color: string }>();
    for (const m of months) {
      for (const t of m.byType) {
        if (!map.has(t.leaveTypeId)) map.set(t.leaveTypeId, t);
      }
    }
    return Array.from(map.values());
  }, [months]);

  // Max days để tính tỷ lệ bar
  const maxDays = Math.max(...months.map((m) => m.totalDays), 1);

  // Summary stats
  const totalDaysYear = months.reduce((s, m) => s + m.totalDays, 0);
  const totalReqYear  = months.reduce((s, m) => s + m.totalRequests, 0);
  const peakMonth     = months.reduce((best, m) => (m.totalDays > best.totalDays ? m : best), months[0] ?? { month: 0, totalDays: 0, totalRequests: 0, byType: [] });
  const avgPerMonth   = totalDaysYear > 0 ? +(totalDaysYear / 12).toFixed(1) : 0;

  // Columns: Tháng + bar + breakdown theo loại phép
  const typeColumns: ColumnsType<MonthStat> = allTypes.map((t) => ({
    title: (
      <Tag style={{ background: isDark ? `${t.color}22` : `${t.color}18`, color: t.color, borderColor: `${t.color}55`, fontSize: 11, margin: 0 }}>
        {t.name}
      </Tag>
    ),
    key: t.leaveTypeId,
    width: 110,
    align: 'right' as const,
    render: (_: unknown, row: MonthStat) => {
      const entry = row.byType.find((b) => b.leaveTypeId === t.leaveTypeId);
      if (!entry || entry.days === 0) return <Text style={{ color: textMuted }}>—</Text>;
      return <Text style={{ color: t.color, fontWeight: 600 }}>{entry.days}N</Text>;
    },
  }));

  const columns: ColumnsType<MonthStat> = [
    {
      title: 'Tháng',
      dataIndex: 'month',
      width: 110,
      render: (v: number) => (
        <Text style={{ color: textPrimary, fontWeight: 600 }}>{MONTH_NAMES[v - 1]}</Text>
      ),
    },
    {
      title: 'Tổng ngày nghỉ',
      key: 'chart',
      width: 200,
      render: (_: unknown, row: MonthStat) => {
        if (row.totalDays === 0) return <Text style={{ color: textMuted }}>—</Text>;
        const pct = Math.round((row.totalDays / maxDays) * 100);
        return (
          <Tooltip title={`${row.totalDays} ngày (${row.totalRequests} đơn)`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, background: isDark ? '#334155' : '#E2E8F0', borderRadius: 4, height: 8 }}>
                <div style={{
                  width: `${pct}%`, height: '100%', borderRadius: 4,
                  background: `linear-gradient(90deg, #6366F1, #8B5CF6)`,
                  transition: 'width 0.3s',
                }} />
              </div>
              <Text style={{ color: textPrimary, fontWeight: 700, minWidth: 36, textAlign: 'right' }}>
                {row.totalDays}N
              </Text>
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: 'Số đơn',
      dataIndex: 'totalRequests',
      width: 80,
      align: 'right' as const,
      render: (v: number) => v > 0
        ? <Text style={{ color: '#3B82F6', fontWeight: 600 }}>{v}</Text>
        : <Text style={{ color: textMuted }}>—</Text>,
    },
    ...typeColumns,
  ];

  return (
    <>
      {/* Stats */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 160 }}>
          <StatCard label={`Tổng ngày nghỉ ${year}`} value={`${totalDaysYear} ngày`} color="#6366F1" icon={<BarChartOutlined />} />
        </div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <StatCard label="Tổng đơn phép" value={totalReqYear} color="#3B82F6" icon={<ScheduleOutlined />} />
        </div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <StatCard label="TB mỗi tháng" value={`${avgPerMonth} ngày`} color="#F59E0B" icon={<HistoryOutlined />} />
        </div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <StatCard
            label="Tháng nhiều nhất"
            value={peakMonth?.month ? MONTH_NAMES[peakMonth.month - 1] : '—'}
            subValue={peakMonth?.totalDays ? `${peakMonth.totalDays} ngày` : undefined}
            color="#EF4444"
            icon={<BarChartOutlined />}
          />
        </div>
      </div>

      <FilterBar>
        <DatePicker
          picker="year"
          value={dayjs().year(year)}
          onChange={(d) => { if (d) setYear(d.year()); }}
          style={{ width: 100 }}
        />
        <Select
          placeholder="Phòng ban"
          allowClear
          style={{ width: 220 }}
          value={orgUnitId}
          onChange={setOrgUnit}
          options={orgOptions}
          showSearch
          filterOption={(input, opt) => String(opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
        />
      </FilterBar>

      <div style={{ background: bgCard, border: `1px solid ${borderColor}`, borderRadius: 8, overflow: 'hidden' }}>
        <Table<MonthStat>
          rowKey="month"
          columns={columns}
          dataSource={months}
          loading={isLoading}
          pagination={false}
          size="small"
          scroll={{ x: 600 + allTypes.length * 110 }}
          rowClassName={(row) => row.totalDays === 0 ? 'ts-row-off' : ''}
          summary={(rows) => {
            const sumDays = rows.reduce((s, r) => s + r.totalDays, 0);
            const sumReqs = rows.reduce((s, r) => s + r.totalRequests, 0);
            return (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0}>
                  <Text style={{ color: textPrimary, fontWeight: 700 }}>Tổng cộng</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} />
                <Table.Summary.Cell index={2} align="right">
                  <Text style={{ color: '#3B82F6', fontWeight: 700 }}>{sumReqs}</Text>
                </Table.Summary.Cell>
                {allTypes.map((t, i) => {
                  const total = rows.reduce((s, r) => {
                    const e = r.byType.find((b) => b.leaveTypeId === t.leaveTypeId);
                    return s + (e?.days ?? 0);
                  }, 0);
                  return (
                    <Table.Summary.Cell key={t.leaveTypeId} index={3 + i} align="right">
                      {total > 0
                        ? <Text style={{ color: t.color, fontWeight: 700 }}>{total}N</Text>
                        : <Text style={{ color: textMuted }}>—</Text>
                      }
                    </Table.Summary.Cell>
                  );
                })}
                <Table.Summary.Cell index={3 + allTypes.length} align="right">
                  <Text style={{ color: '#6366F1', fontWeight: 700 }}>{sumDays}N</Text>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            );
          }}
        />
      </div>
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function LeaveSummaryPage() {
  const [year, setYear]         = useState(dayjs().year());
  const [orgUnitId, setOrgUnit] = useState<string | undefined>(undefined);

  const { data: orgTree = [] } = useQuery({ queryKey: ['org-tree'], queryFn: orgUnitsApi.getTree });
  const orgOptions = orgTree.flatMap(function flat(n: { id: string; name: string; children?: typeof orgTree }): { value: string; label: string }[] {
    return [{ value: n.id, label: n.name }, ...(n.children ?? []).flatMap(flat)];
  });

  const sharedProps = { year, orgUnitId, orgOptions, setYear, setOrgUnit };

  return (
    <div style={{ padding: '20px 24px' }}>
      <PageHeader
        title="Quản lý phép năm"
        icon={<ScheduleOutlined />}
        iconColor="#8B5CF6"
      />

      <Tabs
        defaultActiveKey="balance"
        items={[
          {
            key: 'balance',
            label: (
              <Space>
                <UserOutlined />
                Phép tồn nhân sự
              </Space>
            ),
            children: <BalanceTab {...sharedProps} />,
          },
          {
            key: 'monthly',
            label: (
              <Space>
                <BarChartOutlined />
                Phép giảm hàng tháng
              </Space>
            ),
            children: <MonthlyTrendTab {...sharedProps} />,
          },
        ]}
      />
    </div>
  );
}
