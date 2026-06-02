import { useState, useMemo, useEffect } from 'react';
import {
  Table, Button, Space, Typography, Tag, Form,
  Input, Select, Tabs, Row, Col, message, InputNumber,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  DollarOutlined, CheckCircleOutlined, ClockCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useThemePalette } from '../../hooks/useThemePalette';
import { usePagination } from '../../hooks/usePagination';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { FilterBar } from '../../components/FilterBar';
import { CenteredModal } from '../../components/ui/CenteredModal';
import { confirmDelete } from '../../components/ui/confirmDelete';
import { formatCurrency } from '../../utils/format';
import { apiClient } from '../../api/client';

const { Text } = Typography;

// ─── Types ────────────────────────────────────────────────────────────────────

interface SalaryBand {
  id: string;
  position: string;
  level: string;
  minSalary: number;
  midSalary: number;
  maxSalary: number;
  effectiveFrom: string;
  currency: string;
}

interface SalaryProposal {
  id: string;
  employeeName: string;
  position: string;
  currentSalary: number;
  proposedSalary: number;
  increasePercent: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  proposedBy: string;
  proposedAt: string;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_BANDS: SalaryBand[] = [
  {
    id: '1',
    position: 'Software Engineer',
    level: 'Junior (L1)',
    minSalary: 10_000_000,
    midSalary: 14_000_000,
    maxSalary: 18_000_000,
    effectiveFrom: '2025-01-01',
    currency: 'VND',
  },
  {
    id: '2',
    position: 'Software Engineer',
    level: 'Mid (L2)',
    minSalary: 18_000_000,
    midSalary: 25_000_000,
    maxSalary: 32_000_000,
    effectiveFrom: '2025-01-01',
    currency: 'VND',
  },
  {
    id: '3',
    position: 'Software Engineer',
    level: 'Senior (L3)',
    minSalary: 30_000_000,
    midSalary: 42_000_000,
    maxSalary: 55_000_000,
    effectiveFrom: '2025-01-01',
    currency: 'VND',
  },
  {
    id: '4',
    position: 'Product Manager',
    level: 'Mid (L2)',
    minSalary: 25_000_000,
    midSalary: 35_000_000,
    maxSalary: 45_000_000,
    effectiveFrom: '2025-01-01',
    currency: 'VND',
  },
  {
    id: '5',
    position: 'Designer',
    level: 'Junior (L1)',
    minSalary: 9_000_000,
    midSalary: 13_000_000,
    maxSalary: 17_000_000,
    effectiveFrom: '2025-06-01',
    currency: 'VND',
  },
  {
    id: '6',
    position: 'QA Engineer',
    level: 'Mid (L2)',
    minSalary: 15_000_000,
    midSalary: 20_000_000,
    maxSalary: 28_000_000,
    effectiveFrom: '2025-01-01',
    currency: 'VND',
  },
];

const MOCK_PROPOSALS: SalaryProposal[] = [
  {
    id: '1',
    employeeName: 'Nguyễn Văn An',
    position: 'Software Engineer',
    currentSalary: 22_000_000,
    proposedSalary: 28_000_000,
    increasePercent: 27.3,
    reason: 'Thăng cấp từ Mid lên Senior sau review Q4/2025',
    status: 'PENDING',
    proposedBy: 'Trần Thị Bình',
    proposedAt: '2026-05-20',
  },
  {
    id: '2',
    employeeName: 'Lê Thị Cúc',
    position: 'Product Manager',
    currentSalary: 30_000_000,
    proposedSalary: 38_000_000,
    increasePercent: 26.7,
    reason: 'Điều chỉnh theo thị trường và kết quả KPI vượt chỉ tiêu',
    status: 'APPROVED',
    proposedBy: 'Phạm Minh Đức',
    proposedAt: '2026-05-15',
  },
  {
    id: '3',
    employeeName: 'Hoàng Văn Em',
    position: 'QA Engineer',
    currentSalary: 16_000_000,
    proposedSalary: 20_000_000,
    increasePercent: 25.0,
    reason: 'Hoàn thành chương trình đào tạo Automation Testing',
    status: 'PENDING',
    proposedBy: 'Nguyễn Thị Phương',
    proposedAt: '2026-05-22',
  },
  {
    id: '4',
    employeeName: 'Vũ Thị Giang',
    position: 'Designer',
    currentSalary: 12_000_000,
    proposedSalary: 11_500_000,
    increasePercent: -4.2,
    reason: 'Điều chỉnh lại sau khi xem xét lại mức thị trường',
    status: 'REJECTED',
    proposedBy: 'Đinh Hồng Hà',
    proposedAt: '2026-05-10',
  },
];

// ─── Status Tag helper ────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  PENDING:  { label: 'Chờ duyệt', color: 'gold' as const,   darkBg: 'rgba(251,191,36,0.15)',  darkColor: '#FDE68A', darkBorder: 'rgba(251,191,36,0.3)' },
  APPROVED: { label: 'Đã duyệt',  color: 'green' as const,  darkBg: 'rgba(52,211,153,0.15)',  darkColor: '#6EE7B7', darkBorder: 'rgba(52,211,153,0.3)' },
  REJECTED: { label: 'Từ chối',   color: 'red' as const,    darkBg: 'rgba(248,113,113,0.15)', darkColor: '#FCA5A5', darkBorder: 'rgba(248,113,113,0.3)' },
};

function ProposalStatusTag({ status, isDark }: { status: SalaryProposal['status']; isDark: boolean }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <Tag
      style={isDark ? { background: cfg.darkBg, color: cfg.darkColor, borderColor: cfg.darkBorder } : {}}
      color={isDark ? undefined : cfg.color}
    >
      {cfg.label}
    </Tag>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SalaryBandPage() {
  const { textPrimary, textMuted, bgContainer, borderColor, linkColor, isDark } = useThemePalette();
  const { paginationProps: bandPaginationProps } = usePagination(50);
  const { paginationProps: proposalPaginationProps } = usePagination(50);
  const [msgApi, msgCtx] = message.useMessage();
  const qc = useQueryClient();

  // ── Band state ──
  const [bandSearch, setBandSearch] = useState('');
  const [bandModalOpen, setBandModalOpen] = useState(false);
  const [editingBand, setEditingBand] = useState<SalaryBand | null>(null);
  const [bandForm] = Form.useForm();

  // ── Proposal state ──
  const [proposalSearch, setProposalSearch] = useState('');
  const [proposalStatusFilter, setProposalStatusFilter] = useState<string | null>(null);
  const [proposalModalOpen, setProposalModalOpen] = useState(false);
  const [editingProposal, setEditingProposal] = useState<SalaryProposal | null>(null);
  const [proposalForm] = Form.useForm();

  // ── API queries ──
  const { data: bandsData, isLoading: bandsLoading } = useQuery({
    queryKey: ['salary-bands'],
    queryFn: () => apiClient.get<{ data: any[] }>('/hr/salary-bands').then(r => r.data.data ?? []),
    staleTime: 5 * 60_000,
  });

  const { data: reviewsData, isLoading: reviewsLoading } = useQuery({
    queryKey: ['salary-reviews'],
    queryFn: () => apiClient.get<{ data: any[] }>('/hr/salary-reviews').then(r => r.data.data ?? []),
    staleTime: 5 * 60_000,
  });

  // Map API response → SalaryBand shape
  const bands = useMemo<SalaryBand[]>(() => (bandsData ?? []).map((b: any) => ({
    id: b.id,
    position: b.position?.jobTitle?.name ?? b.position?.code ?? '—',
    level: b.position?.code ?? '—',
    minSalary: Number(b.minSalary),
    midSalary: Number(b.midSalary),
    maxSalary: Number(b.maxSalary),
    effectiveFrom: b.effectiveFrom ? b.effectiveFrom.split('T')[0] : '',
    currency: b.currency ?? 'VND',
  })), [bandsData]);

  // Map API response → SalaryProposal shape
  const proposals = useMemo<SalaryProposal[]>(() => (reviewsData ?? []).map((r: any) => ({
    id: r.id,
    employeeName: r.employee?.fullName ?? '—',
    position: r.employee?.code ?? '—',
    currentSalary: Number(r.currentSalary),
    proposedSalary: Number(r.suggestedSalary),
    increasePercent: Number(r.increasePercent),
    reason: r.reason ?? '',
    status: r.status ?? 'PENDING',
    proposedBy: r.approvedBy?.name ?? 'Hệ thống',
    proposedAt: r.createdAt ? r.createdAt.split('T')[0] : '',
  })), [reviewsData]);

  // ── Filtered data ──
  const filteredBands = useMemo(() => bands.filter((b) =>
    !bandSearch ||
    b.position.toLowerCase().includes(bandSearch.toLowerCase()) ||
    b.level.toLowerCase().includes(bandSearch.toLowerCase()),
  ), [bands, bandSearch]);

  const filteredProposals = useMemo(() => proposals.filter((p) => {
    const matchSearch =
      !proposalSearch ||
      p.employeeName.toLowerCase().includes(proposalSearch.toLowerCase()) ||
      p.position.toLowerCase().includes(proposalSearch.toLowerCase());
    const matchStatus = !proposalStatusFilter || p.status === proposalStatusFilter;
    return matchSearch && matchStatus;
  }), [proposals, proposalSearch, proposalStatusFilter]);

  // ── Band handlers ──
  const handleOpenCreateBand = () => {
    setEditingBand(null);
    bandForm.resetFields();
    setBandModalOpen(true);
  };

  const handleOpenEditBand = (item: SalaryBand) => {
    setEditingBand(item);
    bandForm.setFieldsValue({
      position: item.position,
      level: item.level,
      minSalary: item.minSalary,
      midSalary: item.midSalary,
      maxSalary: item.maxSalary,
      effectiveFrom: item.effectiveFrom,
    });
    setBandModalOpen(true);
  };

  const handleDeleteBand = (item: SalaryBand) => {
    confirmDelete({
      itemName: `${item.position} — ${item.level}`,
      onConfirm: async () => {
        try {
          await apiClient.delete(`/hr/salary-bands/${item.id}`);
          qc.invalidateQueries({ queryKey: ['salary-bands'] });
          msgApi.success('Đã xóa band lương');
        } catch {
          msgApi.error('Lỗi xóa band lương');
        }
      },
    });
  };

  const handleSubmitBand = async () => {
    const values = await bandForm.validateFields();
    try {
      if (editingBand) {
        await apiClient.patch(`/hr/salary-bands/${editingBand.id}`, values);
        msgApi.success('Đã cập nhật band lương');
      } else {
        await apiClient.post('/hr/salary-bands', { ...values, currency: 'VND' });
        msgApi.success('Đã thêm band lương');
      }
      qc.invalidateQueries({ queryKey: ['salary-bands'] });
    } catch {
      msgApi.error('Lỗi lưu band lương');
    }
    setBandModalOpen(false);
    setEditingBand(null);
    bandForm.resetFields();
  };

  // ── Proposal handlers ──
  const handleOpenCreateProposal = () => {
    setEditingProposal(null);
    proposalForm.resetFields();
    setProposalModalOpen(true);
  };

  const handleDeleteProposal = (item: SalaryProposal) => {
    confirmDelete({
      itemName: `đề xuất cho ${item.employeeName}`,
      onConfirm: async () => {
        try {
          await apiClient.delete(`/hr/salary-reviews/${item.id}`);
          qc.invalidateQueries({ queryKey: ['salary-reviews'] });
          msgApi.success('Đã xóa đề xuất');
        } catch {
          msgApi.error('Lỗi xóa đề xuất');
        }
      },
    });
  };

  const handleSubmitProposal = async () => {
    const values = await proposalForm.validateFields();
    const current = values.currentSalary ?? 0;
    const proposed = values.proposedSalary ?? 0;
    const increasePercent = current > 0 ? ((proposed - current) / current) * 100 : 0;
    try {
      await apiClient.post('/hr/salary-reviews/manual', {
        ...values,
        increasePercent,
        status: 'PENDING',
      });
      qc.invalidateQueries({ queryKey: ['salary-reviews'] });
      msgApi.success('Đã tạo đề xuất điều chỉnh');
    } catch {
      msgApi.error('Lỗi tạo đề xuất');
    }
    setProposalModalOpen(false);
    setEditingProposal(null);
    proposalForm.resetFields();
  };

  // ── Band columns ──
  const bandColumns: ColumnsType<SalaryBand> = [
    {
      title: 'Vị trí',
      dataIndex: 'position',
      render: (v: string) => <Text style={{ color: textPrimary, fontWeight: 600 }}>{v}</Text>,
    },
    {
      title: 'Cấp độ',
      dataIndex: 'level',
      width: 150,
      render: (v: string) => <Text style={{ color: textMuted }}>{v}</Text>,
    },
    {
      title: 'Lương tối thiểu',
      dataIndex: 'minSalary',
      width: 160,
      align: 'right',
      render: (v: number) => <Text style={{ color: textPrimary }}>{formatCurrency(v)}</Text>,
    },
    {
      title: 'Lương trung bình',
      dataIndex: 'midSalary',
      width: 160,
      align: 'right',
      render: (v: number) => (
        <Text style={{ color: linkColor, fontWeight: 600 }}>{formatCurrency(v)}</Text>
      ),
    },
    {
      title: 'Lương tối đa',
      dataIndex: 'maxSalary',
      width: 160,
      align: 'right',
      render: (v: number) => <Text style={{ color: textPrimary }}>{formatCurrency(v)}</Text>,
    },
    {
      title: 'Hiệu lực từ',
      dataIndex: 'effectiveFrom',
      width: 140,
      render: (v: string) => (
        <Text style={{ color: textMuted }}>{dayjs(v).format('DD/MM/YYYY')}</Text>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 90,
      align: 'right',
      render: (_: unknown, record: SalaryBand) => (
        <Space size={4}>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleOpenEditBand(record)}
          />
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteBand(record)}
          />
        </Space>
      ),
    },
  ];

  // ── Proposal columns ──
  const proposalColumns: ColumnsType<SalaryProposal> = [
    {
      title: 'Nhân viên',
      dataIndex: 'employeeName',
      render: (v: string) => <Text style={{ color: textPrimary, fontWeight: 600 }}>{v}</Text>,
    },
    {
      title: 'Vị trí',
      dataIndex: 'position',
      width: 160,
      render: (v: string) => <Text style={{ color: textMuted }}>{v}</Text>,
    },
    {
      title: 'Lương hiện tại',
      dataIndex: 'currentSalary',
      width: 150,
      align: 'right',
      render: (v: number) => <Text style={{ color: textPrimary }}>{formatCurrency(v)}</Text>,
    },
    {
      title: 'Đề xuất',
      dataIndex: 'proposedSalary',
      width: 150,
      align: 'right',
      render: (v: number) => (
        <Text style={{ color: linkColor, fontWeight: 600 }}>{formatCurrency(v)}</Text>
      ),
    },
    {
      title: 'Tăng %',
      dataIndex: 'increasePercent',
      width: 100,
      align: 'center',
      render: (v: number) => {
        const color = v >= 0 ? '#10B981' : '#EF4444';
        return (
          <Text style={{ color, fontWeight: 600 }}>
            {v >= 0 ? '+' : ''}{v.toFixed(1)}%
          </Text>
        );
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 130,
      render: (v: SalaryProposal['status']) => (
        <ProposalStatusTag status={v} isDark={isDark} />
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 70,
      align: 'right',
      render: (_: unknown, record: SalaryProposal) => (
        <Button
          type="text"
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleDeleteProposal(record)}
          disabled={record.status === 'APPROVED'}
        />
      ),
    },
  ];

  // ── Stats ──
  const totalBands = bands.length;
  const pendingCount = proposals.filter((p) => p.status === 'PENDING').length;
  const approvedCount = proposals.filter((p) => p.status === 'APPROVED').length;

  return (
    <div style={{ padding: 24 }}>
      {msgCtx}

      <PageHeader
        title="Band lương & Đề xuất"
        icon={<DollarOutlined />}
        iconColor="#8B5CF6"
        actions={null}
      />

      {/* Stat Cards */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={8}>
          <StatCard
            label="Tổng band lương"
            value={totalBands}
            color="#8B5CF6"
            icon={<DollarOutlined />}
          />
        </Col>
        <Col xs={24} sm={8}>
          <StatCard
            label="Đề xuất chờ duyệt"
            value={pendingCount}
            color="#F59E0B"
            icon={<ClockCircleOutlined />}
          />
        </Col>
        <Col xs={24} sm={8}>
          <StatCard
            label="Đã duyệt"
            value={approvedCount}
            color="#10B981"
            icon={<CheckCircleOutlined />}
          />
        </Col>
      </Row>

      <Tabs
        defaultActiveKey="bands"
        items={[
          {
            key: 'bands',
            label: 'Band lương',
            children: (
              <>
                <FilterBar>
                  <Input
                    placeholder="Tìm theo vị trí, cấp độ..."
                    value={bandSearch}
                    onChange={(e) => setBandSearch(e.target.value)}
                    allowClear
                    style={{ width: 280 }}
                  />
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleOpenCreateBand}
                    style={{ marginLeft: 'auto' }}
                  >
                    Thêm band mới
                  </Button>
                </FilterBar>

                <div
                  style={{
                    background: bgContainer,
                    borderRadius: 12,
                    border: `1px solid ${borderColor}`,
                    overflow: 'hidden',
                  }}
                >
                  <Table
                    rowKey="id"
                    columns={bandColumns}
                    dataSource={filteredBands}
                    loading={bandsLoading}
                    pagination={bandPaginationProps(filteredBands.length, 'bậc lương')}
                    locale={{ emptyText: 'Chưa có band lương nào' }}
                  />
                </div>
              </>
            ),
          },
          {
            key: 'proposals',
            label: 'Đề xuất điều chỉnh',
            children: (
              <>
                <FilterBar>
                  <Input
                    placeholder="Tìm theo tên nhân viên, vị trí..."
                    value={proposalSearch}
                    onChange={(e) => setProposalSearch(e.target.value)}
                    allowClear
                    style={{ width: 280 }}
                  />
                  <Select
                    placeholder="Trạng thái"
                    value={proposalStatusFilter}
                    onChange={setProposalStatusFilter}
                    allowClear
                    style={{ width: 160 }}
                    options={[
                      { value: 'PENDING', label: 'Chờ duyệt' },
                      { value: 'APPROVED', label: 'Đã duyệt' },
                      { value: 'REJECTED', label: 'Từ chối' },
                    ]}
                  />
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleOpenCreateProposal}
                    style={{ marginLeft: 'auto' }}
                  >
                    Tạo đề xuất
                  </Button>
                </FilterBar>

                <div
                  style={{
                    background: bgContainer,
                    borderRadius: 12,
                    border: `1px solid ${borderColor}`,
                    overflow: 'hidden',
                  }}
                >
                  <Table
                    rowKey="id"
                    columns={proposalColumns}
                    dataSource={filteredProposals}
                    loading={reviewsLoading}
                    pagination={proposalPaginationProps(filteredProposals.length, 'bậc lương')}
                    locale={{ emptyText: 'Chưa có đề xuất điều chỉnh lương' }}
                  />
                </div>
              </>
            ),
          },
        ]}
      />

      {/* Modal Band lương */}
      <CenteredModal
        open={bandModalOpen}
        onClose={() => {
          setBandModalOpen(false);
          setEditingBand(null);
          bandForm.resetFields();
        }}
        title={editingBand ? 'Sửa band lương' : 'Thêm band lương mới'}
        width={560}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button
              onClick={() => {
                setBandModalOpen(false);
                setEditingBand(null);
                bandForm.resetFields();
              }}
            >
              Hủy
            </Button>
            <Button type="primary" onClick={handleSubmitBand}>
              {editingBand ? 'Lưu thay đổi' : 'Tạo band lương'}
            </Button>
          </div>
        }
      >
        <Form form={bandForm} layout="vertical" requiredMark="optional">
          <Row gutter={16}>
            <Col span={14}>
              <Form.Item
                name="position"
                label="Vị trí"
                rules={[{ required: true, message: 'Nhập tên vị trí' }]}
              >
                <Input placeholder="VD: Software Engineer, Product Manager..." />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item
                name="level"
                label="Cấp độ"
                rules={[{ required: true, message: 'Nhập cấp độ' }]}
              >
                <Select
                  placeholder="Chọn cấp độ"
                  options={[
                    { value: 'Junior (L1)', label: 'Junior (L1)' },
                    { value: 'Mid (L2)', label: 'Mid (L2)' },
                    { value: 'Senior (L3)', label: 'Senior (L3)' },
                    { value: 'Lead (L4)', label: 'Lead (L4)' },
                    { value: 'Principal (L5)', label: 'Principal (L5)' },
                    { value: 'Manager (M1)', label: 'Manager (M1)' },
                    { value: 'Senior Manager (M2)', label: 'Senior Manager (M2)' },
                    { value: 'Director (M3)', label: 'Director (M3)' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="minSalary"
                label="Lương tối thiểu (đ)"
                rules={[{ required: true, message: 'Nhập mức tối thiểu' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  step={500_000}
                  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                  parser={(v) => Number((v ?? '').replace(/\./g, ''))}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="midSalary"
                label="Lương trung bình (đ)"
                rules={[{ required: true, message: 'Nhập mức trung bình' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  step={500_000}
                  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                  parser={(v) => Number((v ?? '').replace(/\./g, ''))}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="maxSalary"
                label="Lương tối đa (đ)"
                rules={[{ required: true, message: 'Nhập mức tối đa' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  step={500_000}
                  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                  parser={(v) => Number((v ?? '').replace(/\./g, ''))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="effectiveFrom"
            label="Hiệu lực từ ngày"
            rules={[{ required: true, message: 'Nhập ngày hiệu lực' }]}
          >
            <Input type="date" />
          </Form.Item>
        </Form>
      </CenteredModal>

      {/* Modal Đề xuất */}
      <CenteredModal
        open={proposalModalOpen}
        onClose={() => {
          setProposalModalOpen(false);
          setEditingProposal(null);
          proposalForm.resetFields();
        }}
        title="Tạo đề xuất điều chỉnh lương"
        width={520}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button
              onClick={() => {
                setProposalModalOpen(false);
                setEditingProposal(null);
                proposalForm.resetFields();
              }}
            >
              Hủy
            </Button>
            <Button type="primary" onClick={handleSubmitProposal}>
              Tạo đề xuất
            </Button>
          </div>
        }
      >
        <Form form={proposalForm} layout="vertical" requiredMark="optional">
          <Form.Item
            name="employeeName"
            label="Nhân viên"
            rules={[{ required: true, message: 'Nhập tên nhân viên' }]}
          >
            <Input placeholder="Tên nhân viên..." />
          </Form.Item>

          <Form.Item
            name="position"
            label="Vị trí"
            rules={[{ required: true, message: 'Nhập vị trí' }]}
          >
            <Input placeholder="VD: Software Engineer..." />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="currentSalary"
                label="Lương hiện tại (đ)"
                rules={[{ required: true, message: 'Nhập lương hiện tại' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  step={500_000}
                  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                  parser={(v) => Number((v ?? '').replace(/\./g, ''))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="proposedSalary"
                label="Lương đề xuất (đ)"
                rules={[{ required: true, message: 'Nhập lương đề xuất' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  step={500_000}
                  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                  parser={(v) => Number((v ?? '').replace(/\./g, ''))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="reason"
            label="Lý do điều chỉnh"
            rules={[{ required: true, message: 'Nhập lý do' }]}
          >
            <Input.TextArea
              placeholder="Mô tả lý do đề xuất điều chỉnh lương..."
              rows={3}
              maxLength={500}
              showCount
            />
          </Form.Item>
        </Form>
      </CenteredModal>
    </div>
  );
}
