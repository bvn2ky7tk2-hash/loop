import { useState, useMemo } from 'react';
import {
  Table, Button, Space, Typography, Tag, Form,
  Input, Select, InputNumber, message, Row, Col,
} from 'antd';
import {
  PlusOutlined, EditOutlined, ApartmentOutlined,
  CheckCircleOutlined, WarningOutlined, CloseCircleOutlined,
} from '@ant-design/icons';
import { SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useThemePalette } from '../../hooks/useThemePalette';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { FilterBar } from '../../components/FilterBar';
import { CenteredModal } from '../../components/ui/CenteredModal';
import { positionsApi, jobTitlesApi, type Position } from '../../api/hr-core';
import { orgUnitsApi } from '../../api/org-units';

const { Text } = Typography;

// ─── Status config ────────────────────────────────────────────────────────────

type PositionStatus = 'FILLED' | 'VACANT' | 'OVER_CAPACITY';

const statusConfig: Record<PositionStatus, { label: string; color: string }> = {
  FILLED:        { label: 'Đủ biên chế',   color: '#10B981' },
  VACANT:        { label: 'Còn trống',      color: '#F59E0B' },
  OVER_CAPACITY: { label: 'Quá biên chế',  color: '#EF4444' },
};

function StatusTag({ status, isDark }: { status?: PositionStatus; isDark: boolean }) {
  if (!status) return <Text style={{ color: 'rgba(0,0,0,0.45)' }}>—</Text>;
  const cfg = statusConfig[status];
  return (
    <Tag
      style={
        isDark
          ? {
              background: `${cfg.color}26`,
              color: cfg.color,
              borderColor: `${cfg.color}4D`,
            }
          : { color: cfg.color, borderColor: cfg.color, background: `${cfg.color}1A` }
      }
    >
      {cfg.label}
    </Tag>
  );
}

// ─── Flatten OrgUnit tree ─────────────────────────────────────────────────────

interface FlatOrgUnit { id: string; name: string }

function flattenTree(nodes: { id: string; name: string; children?: { id: string; name: string; children?: unknown[] }[] }[], depth = 0): FlatOrgUnit[] {
  const result: FlatOrgUnit[] = [];
  for (const n of nodes) {
    result.push({ id: n.id, name: `${'  '.repeat(depth)}${n.name}` });
    if (n.children?.length) {
      result.push(...flattenTree(n.children as Parameters<typeof flattenTree>[0], depth + 1));
    }
  }
  return result;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function PositionsPage() {
  const { textPrimary, textMuted, bgContainer, borderColor, linkColor, isDark } = useThemePalette();
  const qc = useQueryClient();
  const [msg, msgCtx] = message.useMessage();

  // ── State ──
  const [search, setSearch] = useState('');
  const [orgUnitFilter, setOrgUnitFilter] = useState<string | undefined>(undefined);
  const [jobTitleFilter, setJobTitleFilter] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Position | null>(null);
  const [form] = Form.useForm();

  // ── Queries ──
  const { data, isLoading } = useQuery({
    queryKey: ['positions', { page, search, orgUnitId: orgUnitFilter, jobTitleId: jobTitleFilter }],
    queryFn: () =>
      positionsApi.list({
        page,
        limit: 20,
        search: search || undefined,
        orgUnitId: orgUnitFilter,
        jobTitleId: jobTitleFilter,
      }),
  });

  const items = data?.data ?? [];
  const total = data?.total ?? 0;

  // Stats query — all positions
  const { data: allData } = useQuery({
    queryKey: ['positions', 'stats'],
    queryFn: () => positionsApi.list({ page: 1, limit: 1000 }),
  });
  const allItems = allData?.data ?? [];
  const stats = useMemo(() => {
    const filled       = allItems.filter((i) => i.status === 'FILLED').length;
    const vacant       = allItems.filter((i) => i.status === 'VACANT').length;
    const overCapacity = allItems.filter((i) => i.status === 'OVER_CAPACITY').length;
    return { total: allItems.length, filled, vacant, overCapacity };
  }, [allItems]);

  // Select options
  const { data: orgTree = [] } = useQuery({
    queryKey: ['org-units', 'tree'],
    queryFn: orgUnitsApi.getTree,
  });
  const orgOptions = useMemo(
    () => flattenTree(orgTree).map((u) => ({ value: u.id, label: u.name })),
    [orgTree],
  );

  const { data: jobTitleData } = useQuery({
    queryKey: ['job-titles', 'all'],
    queryFn: () => jobTitlesApi.list({ page: 1, limit: 500, isActive: true }),
  });
  const jobTitleOptions = useMemo(
    () => (jobTitleData?.data ?? []).map((jt) => ({ value: jt.id, label: `${jt.code} — ${jt.name}` })),
    [jobTitleData],
  );

  // ── Mutations ──
  const createMut = useMutation({
    mutationFn: positionsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['positions'] });
      msg.success('Đã tạo vị trí biên chế');
      handleCloseModal();
    },
    onError: () => msg.error('Tạo thất bại'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Position> }) =>
      positionsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['positions'] });
      msg.success('Đã cập nhật vị trí biên chế');
      handleCloseModal();
    },
    onError: () => msg.error('Cập nhật thất bại'),
  });

  // ── Handlers ──
  const handleOpenCreate = () => {
    setEditingItem(null);
    form.resetFields();
    setModalOpen(true);
  };

  const handleOpenEdit = (item: Position) => {
    setEditingItem(item);
    form.setFieldsValue({
      code:        item.code,
      jobTitleId:  item.jobTitleId,
      orgUnitId:   item.orgUnitId,
      headcount:   item.headcount,
      description: item.description,
    });
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingItem(null);
    form.resetFields();
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (editingItem) {
      updateMut.mutate({ id: editingItem.id, data: values });
    } else {
      createMut.mutate(values);
    }
  };

  const isSaving = createMut.isPending || updateMut.isPending;

  // Filter by status (client-side since API may not support it)
  const filteredItems = useMemo(() => {
    if (!statusFilter) return items;
    return items.filter((i) => i.status === statusFilter);
  }, [items, statusFilter]);

  // ── Columns ──
  const columns: ColumnsType<Position> = [
    {
      title: 'Mã',
      dataIndex: 'code',
      width: 120,
      render: (v: string) => <Text style={{ color: linkColor, fontWeight: 600 }}>{v}</Text>,
    },
    {
      title: 'Chức danh',
      dataIndex: 'jobTitle',
      render: (jt?: { name: string }) =>
        jt ? (
          <Text style={{ color: textPrimary }}>{jt.name}</Text>
        ) : (
          <Text style={{ color: textMuted }}>—</Text>
        ),
    },
    {
      title: 'Phòng ban',
      dataIndex: 'orgUnit',
      render: (ou?: { name: string }) =>
        ou ? (
          <Text style={{ color: textPrimary }}>{ou.name}</Text>
        ) : (
          <Text style={{ color: textMuted }}>—</Text>
        ),
    },
    {
      title: 'Biên chế',
      dataIndex: 'headcount',
      width: 100,
      align: 'center',
      render: (v: number) => <Text style={{ color: textPrimary }}>{v} người</Text>,
    },
    {
      title: 'Hiện tại',
      dataIndex: '_count',
      width: 100,
      align: 'center',
      render: (cnt?: { employees: number }) => (
        <Text style={{ color: textMuted }}>{cnt?.employees ?? 0} người</Text>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 150,
      render: (v?: PositionStatus) => <StatusTag status={v} isDark={isDark} />,
    },
    {
      title: '',
      key: 'actions',
      width: 60,
      align: 'right',
      render: (_: unknown, record: Position) => (
        <Space size={4}>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleOpenEdit(record)}
          />
        </Space>
      ),
    },
  ];

  // ── Render ──
  return (
    <div style={{ padding: 24 }}>
      {msgCtx}

      <PageHeader
        title="Vị trí biên chế"
        icon={<ApartmentOutlined />}
        iconColor="#6366F1"
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}>
            Thêm vị trí
          </Button>
        }
      />

      {/* Stat Cards */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}>
          <StatCard
            label="Tổng vị trí"
            value={stats.total}
            color="#6366F1"
            icon={<ApartmentOutlined />}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            label="Còn trống"
            value={stats.vacant}
            color="#F59E0B"
            icon={<WarningOutlined />}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            label="Đủ biên chế"
            value={stats.filled}
            color="#10B981"
            icon={<CheckCircleOutlined />}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            label="Quá biên chế"
            value={stats.overCapacity}
            color="#EF4444"
            icon={<CloseCircleOutlined />}
          />
        </Col>
      </Row>

      {/* Filter Bar */}
      <FilterBar>
        <Input
          prefix={<SearchOutlined />}
          placeholder="Tìm theo mã, chức danh..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          allowClear
          style={{ width: 260 }}
        />
        <Select
          placeholder="Phòng ban"
          value={orgUnitFilter}
          onChange={(v) => {
            setOrgUnitFilter(v);
            setPage(1);
          }}
          allowClear
          style={{ width: 200 }}
          options={orgOptions}
          showSearch
          optionFilterProp="label"
        />
        <Select
          placeholder="Chức danh"
          value={jobTitleFilter}
          onChange={(v) => {
            setJobTitleFilter(v);
            setPage(1);
          }}
          allowClear
          style={{ width: 220 }}
          options={jobTitleOptions}
          showSearch
          optionFilterProp="label"
        />
        <Select
          placeholder="Trạng thái"
          value={statusFilter}
          onChange={setStatusFilter}
          allowClear
          style={{ width: 160 }}
          options={[
            { value: 'FILLED',        label: 'Đủ biên chế'  },
            { value: 'VACANT',        label: 'Còn trống'     },
            { value: 'OVER_CAPACITY', label: 'Quá biên chế' },
          ]}
        />
      </FilterBar>

      {/* Table */}
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
          columns={columns}
          dataSource={filteredItems}
          loading={isLoading}
          pagination={{
            current: page,
            pageSize: 20,
            total,
            showSizeChanger: false,
            showTotal: (t) => `Tổng ${t} vị trí`,
            onChange: (p) => setPage(p),
          }}
        />
      </div>

      {/* Modal tạo / sửa */}
      <CenteredModal
        open={modalOpen}
        onClose={handleCloseModal}
        title={editingItem ? 'Sửa vị trí biên chế' : 'Thêm vị trí biên chế'}
        width={540}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={handleCloseModal}>Hủy</Button>
            <Button type="primary" loading={isSaving} onClick={handleSubmit}>
              {editingItem ? 'Lưu thay đổi' : 'Tạo vị trí'}
            </Button>
          </div>
        }
      >
        <Form form={form} layout="vertical" requiredMark="optional">
          <Form.Item
            name="code"
            label="Mã vị trí"
            rules={[
              { required: true, message: 'Nhập mã vị trí' },
              { max: 50, message: 'Tối đa 50 ký tự' },
            ]}
          >
            <Input placeholder="VD: POS-001, DEV-BE-01..." maxLength={50} />
          </Form.Item>

          <Form.Item
            name="jobTitleId"
            label="Chức danh"
            rules={[{ required: true, message: 'Chọn chức danh' }]}
          >
            <Select
              placeholder="Chọn chức danh..."
              options={jobTitleOptions}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>

          <Form.Item
            name="orgUnitId"
            label="Phòng ban / Đơn vị"
            rules={[{ required: true, message: 'Chọn phòng ban' }]}
          >
            <Select
              placeholder="Chọn phòng ban..."
              options={orgOptions}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>

          <Form.Item
            name="headcount"
            label="Số biên chế (người)"
            initialValue={1}
            rules={[{ required: true, message: 'Nhập số biên chế' }]}
          >
            <InputNumber min={1} max={9999} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="description"
            label="Mô tả"
            rules={[{ max: 500, message: 'Tối đa 500 ký tự' }]}
          >
            <Input.TextArea
              placeholder="Mô tả vị trí..."
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
