import { useEffect, useState } from 'react';
import { Table, Tag, Select } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { BankOutlined } from '@ant-design/icons';
import { useThemePalette } from '../../hooks/useThemePalette';
import { PageHeader } from '../../components/ui/PageHeader';
import { usePagination } from '../../hooks/usePagination';
import { useGetAccounts, type ChartOfAccount, type AccountType } from '../../api/accounting';

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
  const { bgContainer, textPrimary, borderColor, linkColor } = useThemePalette();
  const { resetPage, paginationProps } = usePagination(50);
  const [typeFilter, setTypeFilter] = useState<AccountType | undefined>(undefined);

  const { data: accounts = [], isLoading } = useGetAccounts(typeFilter);

  useEffect(() => { resetPage(); }, [typeFilter, resetPage]);

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
        <span style={{ fontFamily: 'monospace', color: linkColor }}>{v}</span>
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
      <PageHeader
        title="Chart of Accounts"
        icon={<BankOutlined />}
        actions={
          <Select
            value={typeFilter}
            onChange={setTypeFilter}
            style={{ width: 180 }}
            options={TYPE_OPTIONS}
            allowClear
            placeholder="Lọc theo loại"
          />
        }
      />

      <div style={{ background: bgContainer, borderRadius: 8, border: `1px solid ${borderColor}`, overflow: 'hidden' }}>
        <Table<ChartOfAccount>
          rowKey="id"
          dataSource={accounts}
          columns={columns}
          loading={isLoading}
          pagination={paginationProps(accounts.length, 'tài khoản')}
          size="middle"
        />
      </div>
    </div>
  );
}
