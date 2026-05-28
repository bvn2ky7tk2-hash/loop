import { useState } from 'react';
import { Table, Typography, Select, Tag, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { BankOutlined } from '@ant-design/icons';
import { useThemeStore } from '../../store/theme.store';
import { useGetAccounts, type ChartOfAccount, type AccountType } from '../../api/accounting';

const { Title, Text } = Typography;

const TYPE_META: Record<AccountType, { label: string; color: string }> = {
  ASSET:     { label: 'Tài sản',     color: 'blue'   },
  LIABILITY: { label: 'Nợ phải trả', color: 'red'    },
  EQUITY:    { label: 'Vốn chủ sở hữu', color: 'purple' },
  REVENUE:   { label: 'Doanh thu',   color: 'green'  },
  EXPENSE:   { label: 'Chi phí',     color: 'orange' },
};

const TYPE_OPTIONS = ([undefined, ...Object.keys(TYPE_META)] as (AccountType | undefined)[]).map(k =>
  k ? { value: k, label: TYPE_META[k].label } : { value: undefined as unknown as AccountType, label: 'Tất cả loại' }
);

export default function ChartOfAccountsPage() {
  const { mode, preset } = useThemeStore();
  const isDark = mode === 'dark';
  const [typeFilter, setTypeFilter] = useState<AccountType | undefined>(undefined);

  const { data: accounts = [], isLoading } = useGetAccounts(typeFilter);

  const bgContainer = isDark ? '#1E293B' : '#ffffff';
  const textPrimary = isDark ? '#F1F5F9' : '#0F172A';
  const textMuted   = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
  const borderColor = isDark ? '#334155' : '#E2E8F0';
  const linkColor   = isDark ? '#93C5FD' : preset.primary;

  const columns: ColumnsType<ChartOfAccount> = [
    {
      title: 'Mã TK',
      dataIndex: 'code',
      width: 120,
      render: (v: string) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: linkColor }}>{v}</span>
      ),
    },
    {
      title: 'Tên tài khoản',
      dataIndex: 'name',
      render: (v: string) => <span style={{ color: textPrimary }}>{v}</span>,
    },
    {
      title: 'Loại',
      dataIndex: 'type',
      width: 160,
      render: (v: AccountType) => (
        <Tag color={TYPE_META[v].color}>{TYPE_META[v].label}</Tag>
      ),
    },
    {
      title: 'TK cha',
      dataIndex: 'parentCode',
      width: 100,
      render: (v: string | null) => v ? (
        <span style={{ fontFamily: 'monospace', color: isDark ? 'rgba(255,255,255,0.5)' : '#475569' }}>{v}</span>
      ) : '—',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      width: 110,
      render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'Hoạt động' : 'Không dùng'}</Tag>,
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Space>
          <BankOutlined style={{ fontSize: 22, color: preset.primary }} />
          <Title level={4} style={{ margin: 0, color: textPrimary }}>Chart of Accounts</Title>
        </Space>
        <Select
          value={typeFilter}
          onChange={setTypeFilter}
          style={{ width: 180 }}
          options={TYPE_OPTIONS}
          allowClear
          placeholder="Lọc theo loại"
        />
      </div>

      <div style={{ background: bgContainer, borderRadius: 8, border: `1px solid ${borderColor}`, overflow: 'hidden' }}>
        <Table<ChartOfAccount>
          rowKey="id"
          dataSource={accounts}
          columns={columns}
          loading={isLoading}
          pagination={{ pageSize: 50, showSizeChanger: false }}
          size="middle"
        />
      </div>
    </div>
  );
}
