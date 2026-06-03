import { useState } from 'react';
import {
  Table, Button, Tag, Typography, Input, Space, Row, Col, Tooltip, App,
} from 'antd';
import {
  SafetyCertificateOutlined, SearchOutlined, DownloadOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { permissionAuditApi, type UserPermissionRow } from '../../api/permission-audit';
import { useThemePalette } from '../../hooks/useThemePalette';
import { usePagination } from '../../hooks/usePagination';
import { PageHeader } from '../../components/ui/PageHeader';
import { FilterBar } from '../../components/FilterBar';
import { StatCard } from '../../components/ui/StatCard';

const { Text } = Typography;

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'red',
  MANAGER: 'orange',
  HR: 'purple',
  FINANCE: 'green',
  USER: 'blue',
};

export default function PermissionAuditPage() {
  const { message } = App.useApp();
  const { textPrimary, textMuted, bgContainer, borderColor, isDark } = useThemePalette();
  const { paginationProps } = usePagination(20);

  const [search, setSearch] = useState('');
  const [permSearch, setPermSearch] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const { data: matrix = [], isLoading } = useQuery({
    queryKey: ['permission-audit'],
    queryFn: permissionAuditApi.getMatrix,
    staleTime: 5 * 60 * 1000,
  });

  const { data: searchResult, isLoading: isSearching } = useQuery({
    queryKey: ['permission-search', permSearch],
    queryFn: () => permissionAuditApi.search(permSearch),
    enabled: permSearch.length >= 2,
    staleTime: 30_000,
  });

  const displayData = permSearch.length >= 2 ? (searchResult ?? []) : matrix;

  const filtered = displayData.filter(
    (u) =>
      !search ||
      u.userName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  );

  async function handleExport() {
    setIsExporting(true);
    try {
      await permissionAuditApi.exportExcel();
    } catch {
      message.error('Export thất bại');
    } finally {
      setIsExporting(false);
    }
  }

  const adminCount = matrix.filter((u) => u.role === 'ADMIN').length;
  const totalPerms = matrix.reduce((sum, u) => sum + u.permissions.length, 0);

  const columns = [
    {
      title: <Text style={{ color: textPrimary }}>Tên</Text>,
      dataIndex: 'userName',
      key: 'userName',
      width: 180,
      render: (v: string) => <Text style={{ color: textPrimary, fontWeight: 600 }}>{v}</Text>,
    },
    {
      title: <Text style={{ color: textPrimary }}>Email</Text>,
      dataIndex: 'email',
      key: 'email',
      width: 220,
      render: (v: string) => <Text style={{ color: textMuted }}>{v}</Text>,
    },
    {
      title: <Text style={{ color: textPrimary }}>Role</Text>,
      dataIndex: 'role',
      key: 'role',
      width: 100,
      render: (v: string) => (
        <Tag
          color={isDark ? undefined : (ROLE_COLORS[v] ?? 'default')}
          style={isDark ? { background: 'rgba(96,165,250,0.15)', color: '#93C5FD', borderColor: 'rgba(96,165,250,0.3)' } : {}}
        >
          {v}
        </Tag>
      ),
    },
    {
      title: <Text style={{ color: textPrimary }}>Module Roles</Text>,
      dataIndex: 'moduleRoles',
      key: 'moduleRoles',
      width: 200,
      render: (v: string[]) => (
        <Space wrap size={4}>
          {v.length === 0
            ? <Text style={{ color: textMuted }}>—</Text>
            : v.map((r) => (
                <Tag key={r} style={{ fontSize: 11, margin: 0 }}>{r}</Tag>
              ))}
        </Space>
      ),
    },
    {
      title: <Text style={{ color: textPrimary }}>Số quyền</Text>,
      dataIndex: 'permissions',
      key: 'permCount',
      width: 100,
      sorter: (a: UserPermissionRow, b: UserPermissionRow) => a.permissions.length - b.permissions.length,
      render: (v: string[]) => (
        <Text style={{ color: v.length > 50 ? '#EF4444' : textPrimary, fontWeight: 600 }}>
          {v.length}
        </Text>
      ),
    },
    {
      title: <Text style={{ color: textPrimary }}>Danh sách quyền</Text>,
      dataIndex: 'permissions',
      key: 'permissions',
      render: (v: string[]) => (
        <Tooltip
          title={
            <div style={{ maxHeight: 200, overflowY: 'auto', fontSize: 11 }}>
              {v.join(', ') || '(không có quyền)'}
            </div>
          }
        >
          <Text style={{ color: textMuted, fontSize: 12 }}>
            {v.slice(0, 3).join(', ')}
            {v.length > 3 && ` +${v.length - 3} quyền khác`}
          </Text>
        </Tooltip>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Báo cáo Phân quyền"
        icon={<SafetyCertificateOutlined />}
        iconColor="#8B5CF6"
        actions={
          <Button
            icon={<DownloadOutlined />}
            loading={isExporting}
            onClick={handleExport}
          >
            Export Excel
          </Button>
        }
      />

      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}>
          <StatCard label="Tổng user" value={matrix.length} color="#6366F1" icon={<SafetyCertificateOutlined />} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard label="ADMIN" value={adminCount} color="#EF4444" icon={<SafetyCertificateOutlined />} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard label="Tổng quyền" value={totalPerms} color="#3B82F6" icon={<SafetyCertificateOutlined />} />
        </Col>
      </Row>

      <FilterBar>
        <Input
          prefix={<SearchOutlined />}
          placeholder="Tìm theo tên / email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 260 }}
          allowClear
        />
        <Input
          prefix={<SearchOutlined />}
          placeholder="Tìm ai có quyền... (vd: leave.approve)"
          value={permSearch}
          onChange={(e) => setPermSearch(e.target.value)}
          style={{ width: 320 }}
          allowClear
        />
      </FilterBar>

      {permSearch.length >= 2 && (
        <div style={{ marginBottom: 8 }}>
          <Text style={{ color: textMuted, fontSize: 12 }}>
            {isSearching ? 'Đang tìm...' : `${searchResult?.length ?? 0} user có quyền chứa "${permSearch}"`}
          </Text>
        </div>
      )}

      <div
        style={{
          background: bgContainer,
          border: `1px solid ${borderColor}`,
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        <Table<UserPermissionRow>
          rowKey="userId"
          columns={columns}
          dataSource={filtered}
          loading={isLoading}
          pagination={paginationProps(filtered.length, 'bản ghi')}
          scroll={{ x: 900 }}
        />
      </div>
    </div>
  );
}
