import { useState } from 'react';
import {
  Table, Button, Space, Typography, Tag, Input, Select, Row, Col, App, Empty, Tooltip,
} from 'antd';
import {
  DollarOutlined, SearchOutlined, CheckOutlined, CloseOutlined,
  ClockCircleOutlined, CheckCircleOutlined, RiseOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { useThemePalette } from '../../hooks/useThemePalette';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { FilterBar } from '../../components/FilterBar';
import { OrgUnitSelect } from '../../components/selects';
import { confirmDelete } from '../../components/ui/confirmDelete';
import { EmployeeInfoCell } from '../../components/ui/EmployeeInfoCell';
import { apiClient } from '../../api/client';

const { Text } = Typography;

// ─── Types ────────────────────────────────────────────────────────────────────

type ReviewSuggestionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface SalaryReviewSuggestion {
  id: string;
  employeeId: string;
  employee?: {
    id: string;
    fullName: string;
    code: string;
    orgUnit?: { name: string } | null;
    position?: { jobTitle?: { name: string } | null } | null;
  };
  currentSalary: number;
  proposedSalary: number;
  reason: string;
  effectiveDate: string;
  status: ReviewSuggestionStatus;
  approvedAt?: string;
  createdAt: string;
}

// ─── Status meta (explicit isDark style theo Nguyên tắc #6) ──────────────────

const STATUS_META: Record<ReviewSuggestionStatus, {
  label: string;
  antColor: string;
  darkBg: string;
  darkText: string;
  darkBorder: string;
}> = {
  PENDING:  {
    label: 'Chờ duyệt',
    antColor: 'warning',
    darkBg: 'rgba(245,158,11,0.15)',
    darkText: '#FCD34D',
    darkBorder: 'rgba(245,158,11,0.3)',
  },
  APPROVED: {
    label: 'Đã duyệt',
    antColor: 'success',
    darkBg: 'rgba(52,211,153,0.15)',
    darkText: '#6EE7B7',
    darkBorder: 'rgba(52,211,153,0.3)',
  },
  REJECTED: {
    label: 'Từ chối',
    antColor: 'error',
    darkBg: 'rgba(248,113,113,0.15)',
    darkText: '#FCA5A5',
    darkBorder: 'rgba(248,113,113,0.3)',
  },
};

export default function SalaryReviewPage() {
  const { isDark, textPrimary, textMuted, bgContainer, borderColor, linkColor } = useThemePalette();
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReviewSuggestionStatus | undefined>(undefined);
  const [orgUnitFilter, setOrgUnitFilter] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);

  // ── Queries ──
  const { data: suggestions = [], isLoading, isError } = useQuery({
    queryKey: ['salary-reviews', { page, status: statusFilter, orgUnitId: orgUnitFilter }],
    queryFn: () =>
      apiClient
        .get<{ data: SalaryReviewSuggestion[]; total: number }>('/hr/salary-reviews', {
          params: { page, limit: 50, status: statusFilter, orgUnitId: orgUnitFilter || undefined },
        })
        .then((r) => r.data.data ?? [])
        .catch(() => { throw new Error('API not available'); }),
    retry: false,
  });

  // ── Mutations ──
  const approveMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient.post(`/hr/salary-reviews/${id}/approve`).then((r) => r.data),
    onSuccess: () => {
      message.success('Đã phê duyệt đề xuất lương');
      queryClient.invalidateQueries({ queryKey: ['salary-reviews'] });
    },
    onError: () => message.error('Không thể phê duyệt'),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient.post(`/hr/salary-reviews/${id}/reject`).then((r) => r.data),
    onSuccess: () => {
      message.success('Đã từ chối đề xuất lương');
      queryClient.invalidateQueries({ queryKey: ['salary-reviews'] });
    },
    onError: () => message.error('Không thể từ chối'),
  });

  // ── Derived stats ──
  const pendingCount = suggestions.filter((s) => s.status === 'PENDING').length;
  const approvedThisMonth = suggestions.filter(
    (s) =>
      s.status === 'APPROVED' &&
      s.approvedAt &&
      dayjs(s.approvedAt).isSame(dayjs(), 'month')
  ).length;
  const totalAdjustment = suggestions
    .filter((s) => s.status === 'APPROVED')
    .reduce((sum, s) => sum + (s.proposedSalary - s.currentSalary), 0);

  // ── Filter client-side ──
  const filtered = suggestions.filter((s) => {
    const matchSearch =
      !search ||
      s.employee?.fullName.toLowerCase().includes(search.toLowerCase()) ||
      s.employee?.code.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // ── Table Columns ──
  const columns: ColumnsType<SalaryReviewSuggestion> = [
    {
      title: 'Nhân viên',
      key: 'employee',
      render: (_, r) =>
        r.employee ? (
          <EmployeeInfoCell employee={r.employee} />
        ) : (
          <Text style={{ color: textMuted }}>{r.employeeId}</Text>
        ),
    },
    {
      title: 'Lương hiện tại',
      dataIndex: 'currentSalary',
      width: 140,
      render: (v: number) => (
        <Text style={{ color: textMuted }}>{v.toLocaleString('vi-VN')} ₫</Text>
      ),
    },
    {
      title: 'Đề xuất',
      dataIndex: 'proposedSalary',
      width: 140,
      render: (v: number) => (
        <Text style={{ color: linkColor, fontWeight: 600 }}>{v.toLocaleString('vi-VN')} ₫</Text>
      ),
    },
    {
      title: '% tăng',
      key: 'increase',
      width: 90,
      render: (_, r) => {
        const pct = r.currentSalary > 0
          ? (((r.proposedSalary - r.currentSalary) / r.currentSalary) * 100).toFixed(1)
          : '—';
        return (
          <Text style={{ color: '#10B981', fontWeight: 700 }}>+{pct}%</Text>
        );
      },
    },
    {
      title: 'Lý do',
      dataIndex: 'reason',
      width: 180,
      ellipsis: true,
      render: (v?: string) =>
        v ? (
          <Text style={{ color: textPrimary }} ellipsis={{ tooltip: v }}>{v}</Text>
        ) : (
          <Text style={{ color: textMuted }}>—</Text>
        ),
    },
    {
      title: 'Ngày hiệu lực',
      dataIndex: 'effectiveDate',
      width: 130,
      render: (v: string) => (
        <Text style={{ color: textMuted }}>{dayjs(v).format('DD/MM/YYYY')}</Text>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 120,
      render: (v: ReviewSuggestionStatus) => {
        const meta = STATUS_META[v];
        return (
          <Tag
            color={isDark ? undefined : meta.antColor}
            style={isDark ? { background: meta.darkBg, color: meta.darkText, borderColor: meta.darkBorder } : {}}
          >
            {meta.label}
          </Tag>
        );
      },
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 100,
      render: (_, r) =>
        r.status === 'PENDING' ? (
          <Space size={4}>
            <Tooltip title="Phê duyệt">
              <Button
                size="small"
                type="primary"
                icon={<CheckOutlined />}
                loading={approveMutation.isPending}
                disabled={approveMutation.isPending}
                onClick={() => approveMutation.mutate(r.id)}
              />
            </Tooltip>
            <Tooltip title="Từ chối">
              <Button
                size="small"
                danger
                icon={<CloseOutlined />}
                loading={rejectMutation.isPending}
                onClick={() =>
                  confirmDelete({
                    itemName: `đề xuất lương của ${r.employee?.fullName ?? r.employeeId}`,
                    onConfirm: () => rejectMutation.mutate(r.id),
                  })
                }
              />
            </Tooltip>
          </Space>
        ) : (
          <Text style={{ color: textMuted }}>—</Text>
        ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Xem xét Lương"
        icon={<DollarOutlined />}
        iconColor="#10B981"
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}>
          <StatCard
            label="Chờ duyệt"
            value={pendingCount}
            color="#F59E0B"
            icon={<ClockCircleOutlined />}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            label="Đã duyệt tháng này"
            value={approvedThisMonth}
            color="#10B981"
            icon={<CheckCircleOutlined />}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            label="Tổng điều chỉnh"
            value={`${(totalAdjustment / 1_000_000).toFixed(1)}M ₫`}
            color="#3B82F6"
            icon={<RiseOutlined />}
          />
        </Col>
      </Row>

      <FilterBar>
        <Input
          prefix={<SearchOutlined style={{ color: textMuted }} />}
          placeholder="Tìm tên hoặc mã nhân viên..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          style={{ width: 260 }}
          allowClear
        />
        <Select
          placeholder="Trạng thái"
          style={{ width: 150 }}
          allowClear
          value={statusFilter}
          onChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
          options={Object.entries(STATUS_META).map(([k, v]) => ({
            value: k,
            label: v.label,
          }))}
        />
        <OrgUnitSelect
          placeholder="Phòng ban"
          style={{ minWidth: 180 }}
          value={orgUnitFilter}
          onChange={(v) => { setOrgUnitFilter(v); setPage(1); }}
          allowClear
        />
      </FilterBar>

      <div
        style={{
          background: bgContainer,
          borderRadius: 12,
          border: `1px solid ${borderColor}`,
          overflow: 'hidden',
        }}
      >
        {isError ? (
          <Empty
            style={{ padding: 48 }}
            description={
              <Text style={{ color: textMuted }}>
                API đang phát triển — endpoint /hr/salary-reviews chưa có
              </Text>
            }
          />
        ) : (
          <Table<SalaryReviewSuggestion>
            rowKey="id"
            columns={columns}
            dataSource={filtered}
            loading={isLoading}
            pagination={{
              current: page,
              pageSize: 20,
              onChange: (p) => setPage(p),
              showSizeChanger: false,
              showTotal: (t) => (
                <Text style={{ color: textMuted }}>Tổng {t} đề xuất</Text>
              ),
            }}
            scroll={{ x: 1100 }}
            locale={{
              emptyText: <Text style={{ color: textMuted }}>Không có đề xuất điều chỉnh lương</Text>,
            }}
          />
        )}
      </div>
    </div>
  );
}
