import { useState, useMemo } from 'react';
import {
  Table, Button, Space, Typography, Tag, Form,
  Input, Select, Popconfirm, message, Row, Col,
} from 'antd';
import {
  PlusOutlined, EditOutlined, StopOutlined, TagOutlined, CheckCircleOutlined,
} from '@ant-design/icons';
import { SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useThemePalette } from '../../hooks/useThemePalette';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { FilterBar } from '../../components/FilterBar';
import { CenteredModal } from '../../components/ui/CenteredModal';
import { jobTitlesApi, type JobTitle } from '../../api/hr-core';

const { Text } = Typography;

// ─── Status Tag helper ────────────────────────────────────────────────────────

function ActiveTag({ isActive, isDark }: { isActive: boolean; isDark: boolean }) {
  if (isActive) {
    return (
      <Tag
        style={
          isDark
            ? { background: 'rgba(52,211,153,0.15)', color: '#6EE7B7', borderColor: 'rgba(52,211,153,0.3)' }
            : {}
        }
        color={isDark ? undefined : 'green'}
      >
        Hoạt động
      </Tag>
    );
  }
  return <Tag color="default">Ngừng</Tag>;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function JobTitlesPage() {
  const { textPrimary, textMuted, bgContainer, borderColor, linkColor, isDark } = useThemePalette();
  const qc = useQueryClient();
  const [msg, msgCtx] = message.useMessage();

  // ── State ──
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<JobTitle | null>(null);
  const [form] = Form.useForm();

  // ── Queries ──
  const { data, isLoading } = useQuery({
    queryKey: ['job-titles', { page, search, isActive: activeFilter }],
    queryFn: () =>
      jobTitlesApi.list({ page, limit: 20, search: search || undefined, isActive: activeFilter }),
  });

  const items = data?.data ?? [];
  const total = data?.total ?? 0;

  // ── Stats (tính từ data hiện tại, hoặc dùng all-items query) ──
  const { data: allData } = useQuery({
    queryKey: ['job-titles', 'stats'],
    queryFn: () => jobTitlesApi.list({ page: 1, limit: 1000 }),
  });
  const allItems = allData?.data ?? [];
  const stats = useMemo(() => {
    const active = allItems.filter((i) => i.isActive).length;
    const inactive = allItems.length - active;
    return { total: allItems.length, active, inactive };
  }, [allItems]);

  // ── Mutations ──
  const createMut = useMutation({
    mutationFn: jobTitlesApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['job-titles'] });
      msg.success('Đã tạo chức danh');
      handleCloseModal();
    },
    onError: () => msg.error('Tạo thất bại'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<JobTitle> }) =>
      jobTitlesApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['job-titles'] });
      msg.success('Đã cập nhật chức danh');
      handleCloseModal();
    },
    onError: () => msg.error('Cập nhật thất bại'),
  });

  const deactivateMut = useMutation({
    mutationFn: jobTitlesApi.deactivate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['job-titles'] });
      msg.success('Đã ngừng chức danh');
    },
    onError: () => msg.error('Thao tác thất bại'),
  });

  // ── Handlers ──
  const handleOpenCreate = () => {
    setEditingItem(null);
    form.resetFields();
    setModalOpen(true);
  };

  const handleOpenEdit = (item: JobTitle) => {
    setEditingItem(item);
    form.setFieldsValue({
      code: item.code,
      name: item.name,
      band: item.band,
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

  // ── Columns ──
  const columns: ColumnsType<JobTitle> = [
    {
      title: 'Mã',
      dataIndex: 'code',
      width: 120,
      render: (v: string) => <Text style={{ color: linkColor, fontWeight: 600 }}>{v}</Text>,
    },
    {
      title: 'Tên chức danh',
      dataIndex: 'name',
      render: (v: string) => <Text style={{ color: textPrimary }}>{v}</Text>,
    },
    {
      title: 'Band / Cấp độ',
      dataIndex: 'band',
      width: 140,
      render: (v?: string) =>
        v ? (
          <Text style={{ color: textMuted }}>{v}</Text>
        ) : (
          <Text style={{ color: textMuted }}>—</Text>
        ),
    },
    {
      title: 'Vị trí biên chế',
      dataIndex: '_count',
      width: 150,
      align: 'center',
      render: (cnt?: { positions: number }) => (
        <Tag color="blue">{cnt?.positions ?? 0} vị trí</Tag>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      width: 130,
      render: (v: boolean) => <ActiveTag isActive={v} isDark={isDark} />,
    },
    {
      title: '',
      key: 'actions',
      width: 100,
      align: 'right',
      render: (_: unknown, record: JobTitle) => (
        <Space size={4}>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleOpenEdit(record)}
          />
          {record.isActive && (
            <Popconfirm
              title="Ngừng chức danh này?"
              description="Chức danh sẽ không thể chọn cho vị trí mới."
              okText="Ngừng"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
              onConfirm={() => deactivateMut.mutate(record.id)}
            >
              <Button
                type="text"
                size="small"
                danger
                icon={<StopOutlined />}
                loading={deactivateMut.isPending}
              />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // ── Render ──
  return (
    <div style={{ padding: 24 }}>
      {msgCtx}

      <PageHeader
        title="Chức danh"
        icon={<TagOutlined />}
        iconColor="#6366F1"
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}>
            Thêm chức danh
          </Button>
        }
      />

      {/* Stat Cards */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={8}>
          <StatCard
            label="Tổng chức danh"
            value={stats.total}
            color="#6366F1"
            icon={<TagOutlined />}
          />
        </Col>
        <Col xs={24} sm={8}>
          <StatCard
            label="Đang hoạt động"
            value={stats.active}
            color="#10B981"
            icon={<CheckCircleOutlined />}
          />
        </Col>
        <Col xs={24} sm={8}>
          <StatCard
            label="Đã ngừng"
            value={stats.inactive}
            color="#94A3B8"
            icon={<StopOutlined />}
          />
        </Col>
      </Row>

      {/* Filter Bar */}
      <FilterBar>
        <Input
          prefix={<SearchOutlined />}
          placeholder="Tìm theo mã, tên chức danh..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          allowClear
          style={{ width: 280 }}
        />
        <Select
          placeholder="Trạng thái"
          value={activeFilter === undefined ? null : String(activeFilter)}
          onChange={(v) => {
            setActiveFilter(v === null || v === undefined ? undefined : v === 'true');
            setPage(1);
          }}
          allowClear
          style={{ width: 160 }}
          options={[
            { value: 'true', label: 'Đang hoạt động' },
            { value: 'false', label: 'Đã ngừng' },
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
          dataSource={items}
          loading={isLoading}
          pagination={{
            current: page,
            pageSize: 20,
            total,
            showSizeChanger: false,
            showTotal: (t) => `Tổng ${t} chức danh`,
            onChange: (p) => setPage(p),
          }}
        />
      </div>

      {/* Modal tạo / sửa */}
      <CenteredModal
        open={modalOpen}
        onClose={handleCloseModal}
        title={editingItem ? 'Sửa chức danh' : 'Thêm chức danh mới'}
        width={520}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={handleCloseModal}>Hủy</Button>
            <Button type="primary" loading={isSaving} onClick={handleSubmit}>
              {editingItem ? 'Lưu thay đổi' : 'Tạo chức danh'}
            </Button>
          </div>
        }
      >
        <Form form={form} layout="vertical" requiredMark="optional">
          <Form.Item
            name="code"
            label="Mã chức danh"
            rules={[
              { required: true, message: 'Nhập mã chức danh' },
              { max: 50, message: 'Tối đa 50 ký tự' },
            ]}
          >
            <Input placeholder="VD: SE, PM, QA..." maxLength={50} />
          </Form.Item>

          <Form.Item
            name="name"
            label="Tên chức danh"
            rules={[
              { required: true, message: 'Nhập tên chức danh' },
              { max: 200, message: 'Tối đa 200 ký tự' },
            ]}
          >
            <Input placeholder="VD: Kỹ sư phần mềm, Quản lý dự án..." maxLength={200} />
          </Form.Item>

          <Form.Item
            name="band"
            label="Band / Cấp độ"
            rules={[{ max: 50, message: 'Tối đa 50 ký tự' }]}
          >
            <Input placeholder="VD: IC3, M2, L5..." maxLength={50} />
          </Form.Item>

          <Form.Item
            name="description"
            label="Mô tả"
            rules={[{ max: 500, message: 'Tối đa 500 ký tự' }]}
          >
            <Input.TextArea
              placeholder="Mô tả chức danh..."
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
