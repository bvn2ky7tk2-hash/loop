import { useState } from 'react';
import {
  Table, Button, Space, Typography, Tag, Input, Select, Row, Col, App, Progress,
} from 'antd';
import {
  LogoutOutlined, SearchOutlined, LinkOutlined,
  UserDeleteOutlined, CheckCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { useThemePalette } from '../../hooks/useThemePalette';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { FilterBar } from '../../components/FilterBar';
import { apiClient } from '../../api/client';

const { Text } = Typography;

type OffboardStatus = 'IN_PROGRESS' | 'COMPLETED' | 'PENDING';

interface OffboardingEmployee {
  id: string;
  code: string;
  fullName: string;
  email?: string;
  orgUnit?: { name: string };
  terminationDate?: string;
  offboardingStatus?: OffboardStatus;
  offboardingProgress?: number;
  processInstanceId?: string;
}

const STATUS_META: Record<OffboardStatus, { label: string; color: string; darkBg: string; darkText: string; darkBorder: string }> = {
  PENDING:     { label: 'Chờ bắt đầu', color: 'warning',  darkBg: 'rgba(245,158,11,0.15)',  darkText: '#FCD34D', darkBorder: 'rgba(245,158,11,0.3)' },
  IN_PROGRESS: { label: 'Đang thực hiện', color: 'processing', darkBg: 'rgba(96,165,250,0.15)', darkText: '#93C5FD', darkBorder: 'rgba(96,165,250,0.3)' },
  COMPLETED:   { label: 'Hoàn thành',  color: 'success',  darkBg: 'rgba(52,211,153,0.15)', darkText: '#6EE7B7', darkBorder: 'rgba(52,211,153,0.3)' },
};

export default function OffboardingPage() {
  const { isDark, textPrimary, textMuted, textSecondary, bgContainer, borderColor, linkColor } = useThemePalette();
  const { message } = App.useApp();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  // Lấy nhân viên đã nghỉ việc từ API
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees-terminated'],
    queryFn: () =>
      apiClient
        .get<OffboardingEmployee[]>('/employees', { params: { status: 'TERMINATED', limit: 100 } })
        .then((r) => r.data)
        .catch(() => [] as OffboardingEmployee[]),
  });

  const filtered = employees.filter((e) => {
    const matchSearch = !search || e.fullName.toLowerCase().includes(search.toLowerCase()) || e.code.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || (e.offboardingStatus ?? 'PENDING') === statusFilter;
    return matchSearch && matchStatus;
  });

  const inProgress = employees.filter((e) => (e.offboardingStatus ?? 'PENDING') === 'IN_PROGRESS').length;
  const thisMonthCompleted = employees.filter((e) =>
    e.offboardingStatus === 'COMPLETED' &&
    e.terminationDate &&
    dayjs(e.terminationDate).isSame(dayjs(), 'month')
  ).length;

  const handleViewProcess = (record: OffboardingEmployee) => {
    if (record.processInstanceId) {
      window.open(`/processes/instances/${record.processInstanceId}`, '_blank');
    } else {
      message.info('Chưa có quy trình offboarding cho nhân viên này');
    }
  };

  const columns: ColumnsType<OffboardingEmployee> = [
    {
      title: 'Nhân viên',
      key: 'employee',
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text style={{ color: textPrimary, fontWeight: 600 }}>{r.fullName}</Text>
          <Text style={{ color: textMuted, fontSize: 12 }}>{r.code}</Text>
        </Space>
      ),
    },
    {
      title: 'Phòng ban',
      key: 'orgUnit',
      width: 160,
      render: (_, r) => (
        <Text style={{ color: textSecondary }}>{r.orgUnit?.name ?? '—'}</Text>
      ),
    },
    {
      title: 'Ngày nghỉ việc',
      key: 'terminationDate',
      width: 140,
      render: (_, r) => r.terminationDate
        ? <Text style={{ color: textMuted }}>{dayjs(r.terminationDate).format('DD/MM/YYYY')}</Text>
        : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      title: 'Tiến độ',
      key: 'progress',
      width: 160,
      render: (_, r) => {
        const pct = r.offboardingProgress ?? 0;
        const status = r.offboardingStatus ?? 'PENDING';
        const strokeColor = status === 'COMPLETED' ? '#10B981' : status === 'IN_PROGRESS' ? '#3B82F6' : '#94A3B8';
        return (
          <Space direction="vertical" size={2} style={{ width: '100%' }}>
            <Progress
              percent={pct}
              size="small"
              strokeColor={strokeColor}
              showInfo={false}
              style={{ marginBottom: 0 }}
            />
            <Text style={{ color: textMuted, fontSize: 11 }}>{pct}%</Text>
          </Space>
        );
      },
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 140,
      render: (_, r) => {
        const s = r.offboardingStatus ?? 'PENDING';
        const meta = STATUS_META[s];
        return (
          <Tag
            color={isDark ? undefined : meta.color}
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
      width: 140,
      render: (_, r) => (
        <Button
          size="small"
          icon={<LinkOutlined />}
          style={{ color: linkColor, borderColor: linkColor }}
          onClick={() => handleViewProcess(r)}
        >
          Xem quy trình
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Offboarding"
        icon={<LogoutOutlined />}
        iconColor="#EF4444"
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}>
          <StatCard
            label="Đang offboarding"
            value={inProgress}
            color="#EF4444"
            icon={<UserDeleteOutlined />}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            label="Hoàn thành tháng này"
            value={thisMonthCompleted}
            color="#10B981"
            icon={<CheckCircleOutlined />}
          />
        </Col>
      </Row>

      <FilterBar>
        <Input
          prefix={<SearchOutlined style={{ color: textMuted }} />}
          placeholder="Tìm tên hoặc mã nhân viên..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 260 }}
          allowClear
        />
        <Select
          placeholder="Trạng thái"
          style={{ width: 160 }}
          allowClear
          value={statusFilter}
          onChange={setStatusFilter}
          options={Object.entries(STATUS_META).map(([k, v]) => ({
            value: k,
            label: v.label,
          }))}
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
        <Table<OffboardingEmployee>
          rowKey="id"
          columns={columns}
          dataSource={filtered}
          loading={isLoading}
          pagination={{ pageSize: 20, showSizeChanger: false }}
          scroll={{ x: 800 }}
          locale={{ emptyText: <Text style={{ color: textMuted }}>Không có nhân viên đang offboarding</Text> }}
        />
      </div>
    </div>
  );
}
