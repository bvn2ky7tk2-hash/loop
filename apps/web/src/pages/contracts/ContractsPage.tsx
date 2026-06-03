import { useState, useMemo } from 'react';
import {
  Table, Button, Input, Select, Space, Popconfirm, Tooltip, App, theme,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined,
  FileTextOutlined, SyncOutlined, HistoryOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  contractsApi,
  type Contract, type ContractType, type ContractStatus,
} from '../../api/contracts';
import { useThemePalette } from '../../hooks/useThemePalette';
import { usePagination } from '../../hooks/usePagination';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmployeeInfoCell } from '../../components/ui/EmployeeInfoCell';
import { OrgUnitSelect } from '../../components/selects';
import { formatNumber } from '../../utils/format';
import {
  CONTRACT_TYPE_LABELS, CONTRACT_TYPES, CONTRACT_STATUS_LABELS, CONTRACT_STATUSES,
} from './constants';
import { TypeBadge, StatusBadge } from './components/Badges';
import { ContractDrawer } from './components/ContractDrawer';
import { RenewalModal } from './components/RenewalModal';
import { ContractDetailModal } from './components/ContractDetailModal';

const { Text } = Typography;

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ContractsPage() {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const { token } = theme.useToken();
  const { isDark, bgContainer, borderColor, textPrimary, textMuted, textSecondary, linkColor } = useThemePalette();

  const [searchText, setSearchText]             = useState('');
  const [filterStatus, setFilterStatus]         = useState<ContractStatus | ''>('');
  const [filterType, setFilterType]             = useState<ContractType | ''>('');
  const [filterOrgUnit, setFilterOrgUnit]       = useState<string | undefined>(undefined);
  const [drawerOpen, setDrawerOpen]             = useState(false);
  const [editingContract, setEditingContract]   = useState<Contract | null>(null);
  const [renewTarget, setRenewTarget]           = useState<Contract | null>(null);
  const [renewModalOpen, setRenewModalOpen]     = useState(false);
  const [detailContract, setDetailContract]     = useState<Contract | null>(null);
  const { page, pageSize, resetPage, paginationProps } = usePagination(50);

  const { data: paginated, isLoading } = useQuery({
    queryKey: ['contracts', page, pageSize, filterOrgUnit],
    queryFn: () => contractsApi.list({ page, limit: pageSize, orgUnitId: filterOrgUnit }),
    placeholderData: (prev) => prev,
  });

  const filteredData = useMemo(() => {
    const all = paginated?.data ?? [];
    return all.filter((c) => {
      if (searchText) {
        const q = searchText.toLowerCase();
        if (!c.employee.fullName.toLowerCase().includes(q)) return false;
      }
      if (filterStatus && c.status !== filterStatus) return false;
      if (filterType   && c.type   !== filterType)   return false;
      return true;
    });
  }, [paginated?.data, searchText, filterStatus, filterType]);

  const deleteMutation = useMutation({
    mutationFn: contractsApi.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contracts'] });
      message.success('Đã xoá hợp đồng');
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      message.error(err.response?.data?.message ?? 'Xoá thất bại'),
  });

  function handleOpenCreate() {
    setEditingContract(null);
    setDrawerOpen(true);
  }

  function handleOpenEdit(contract: Contract) {
    setEditingContract(contract);
    setDrawerOpen(true);
  }

  function handleOpenRenew(contract: Contract) {
    setRenewTarget(contract);
    setRenewModalOpen(true);
  }

  const columns: ColumnsType<Contract> = [
    {
      title: 'Nhân viên',
      dataIndex: ['employee', 'fullName'],
      ellipsis: true,
      width: 220,
      render: (_: string, r: Contract) => (
        <div>
          <EmployeeInfoCell employee={r.employee} />
          {r.renewalCount > 0 && (
            <div style={{ fontSize: 11, color: linkColor }}>
              <HistoryOutlined style={{ marginRight: 2 }} />
              Gia hạn lần {r.renewalCount}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Loại hợp đồng',
      dataIndex: 'type',
      width: 160,
      render: (type: ContractType) => <TypeBadge type={type} isDark={isDark} />,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 140,
      render: (status: ContractStatus) => <StatusBadge status={status} isDark={isDark} />,
    },
    {
      title: 'Thời hạn',
      width: 210,
      render: (_: unknown, r: Contract) => (
        <div>
          <Text style={{ fontSize: 12, color: textSecondary }}>
            {dayjs(r.startDate).format('DD/MM/YYYY')}
          </Text>
          <Text style={{ fontSize: 12, color: textMuted }}> → </Text>
          {r.endDate ? (
            <Text style={{ fontSize: 12, color: textSecondary }}>
              {dayjs(r.endDate).format('DD/MM/YYYY')}
            </Text>
          ) : (
            <Text style={{ fontSize: 12, color: '#10B981', fontWeight: 600 }}>Vô thời hạn</Text>
          )}
        </div>
      ),
    },
    {
      title: 'Lương tháng',
      dataIndex: 'salaryMonthly',
      width: 150,
      align: 'right',
      render: (v: number, r: Contract) => {
        const totalAllowance = (r.allowances ?? []).reduce((s, a) => s + Number(a.amount), 0);
        return (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: textPrimary, fontVariantNumeric: 'tabular-nums' }}>
              {formatNumber(v)}
            </div>
            {totalAllowance > 0 && (
              <div style={{ fontSize: 11, color: '#10B981', fontVariantNumeric: 'tabular-nums' }}>
                +{formatNumber(totalAllowance)} phụ cấp
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: '',
      key: 'actions',
      width: 108,
      render: (_: unknown, r: Contract) => (
        <Space size={2}>
          <Tooltip title="Gia hạn hợp đồng">
            <Button
              type="text" size="small"
              icon={<SyncOutlined style={{ color: '#6366F1' }} />}
              onClick={() => handleOpenRenew(r)}
              disabled={r.status === 'TERMINATED'}
            />
          </Tooltip>
          <Tooltip title="Chỉnh sửa">
            <Button
              type="text" size="small"
              icon={<EditOutlined />}
              onClick={() => handleOpenEdit(r)}
            />
          </Tooltip>
          <Popconfirm
            title="Xoá hợp đồng này?"
            description="Hành động này không thể hoàn tác."
            onConfirm={() => deleteMutation.mutate(r.id)}
            okText="Xoá" cancelText="Huỷ" okButtonProps={{ danger: true }}
          >
            <Tooltip title="Xoá">
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '20px 24px', minHeight: '100vh', background: token.colorBgLayout }}>

      {/* Page Header */}
      <PageHeader
        title="Quản lý hợp đồng lao động"
        icon={<FileTextOutlined />}
        iconColor={token.colorPrimary}
        subtitle={
          <span style={{ fontSize: 13, color: textSecondary }}>
            {paginated?.total ?? 0} hợp đồng · Theo Bộ luật Lao động Việt Nam 2019
          </span>
        }
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}>
            Hợp đồng mới
          </Button>
        }
      />

      {/* Filter Bar */}
      <div style={{
        display: 'flex', gap: 10, flexWrap: 'wrap',
        marginBottom: 16, padding: '12px 16px',
        background: bgContainer,
        border: `1px solid ${borderColor}`,
        borderRadius: 10,
      }}>
        <Input
          prefix={<SearchOutlined style={{ color: token.colorTextTertiary }} />}
          placeholder="Tìm theo tên nhân viên..."
          style={{ width: 240 }}
          value={searchText}
          onChange={(e) => { setSearchText(e.target.value); resetPage(); }}
          allowClear
        />
        <Select
          placeholder="Trạng thái"
          style={{ minWidth: 160 }}
          value={filterStatus || undefined}
          onChange={(v) => { setFilterStatus(v ?? ''); resetPage(); }}
          allowClear
          options={CONTRACT_STATUSES.map((s) => ({ value: s, label: CONTRACT_STATUS_LABELS[s] }))}
        />
        <Select
          placeholder="Loại hợp đồng"
          style={{ minWidth: 190 }}
          value={filterType || undefined}
          onChange={(v) => { setFilterType(v ?? ''); resetPage(); }}
          allowClear
          options={CONTRACT_TYPES.map((t) => ({ value: t, label: CONTRACT_TYPE_LABELS[t] }))}
        />
        <OrgUnitSelect
          placeholder="Phòng ban"
          style={{ minWidth: 180 }}
          value={filterOrgUnit}
          onChange={(v) => { setFilterOrgUnit(v); resetPage(); }}
          allowClear
        />
      </div>

      {/* Table */}
      <div style={{
        background: bgContainer,
        border: `1px solid ${borderColor}`,
        borderRadius: 10,
        overflow: 'hidden',
      }}>
        <Table<Contract>
          dataSource={filteredData}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          size="small"
          scroll={{ x: 900 }}
          locale={{ emptyText: 'Không có hợp đồng phù hợp' }}
          onRow={(record) => ({
            onClick: (e) => {
              const target = e.target as HTMLElement;
              if (target.closest('button') || target.closest('.ant-popconfirm') || target.closest('.ant-tooltip')) return;
              setDetailContract(record);
            },
            style: { cursor: 'pointer' },
          })}
          pagination={paginationProps(paginated?.total ?? 0, 'hợp đồng')}
        />
      </div>

      {/* ── Modal Chi tiết hợp đồng ────────────────────────────────────────── */}
      <ContractDetailModal
        detailContract={detailContract}
        onClose={() => setDetailContract(null)}
        onEdit={handleOpenEdit}
        onRenew={handleOpenRenew}
      />

      {/* Modals */}
      <ContractDrawer
        open={drawerOpen}
        editing={editingContract}
        onClose={() => { setDrawerOpen(false); setEditingContract(null); }}
        isDark={isDark}
      />
      <RenewalModal
        open={renewModalOpen}
        contract={renewTarget}
        onClose={() => { setRenewModalOpen(false); setRenewTarget(null); }}
        isDark={isDark}
      />
    </div>
  );
}
