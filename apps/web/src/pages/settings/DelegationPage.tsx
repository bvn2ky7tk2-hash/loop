import { useState } from 'react';
import {
  Table, Button, Space, Typography, Tag, Form,
  Select, Checkbox, Row, Col, DatePicker, App,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined,
  UsergroupAddOutlined, CheckCircleOutlined, WarningOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs, { type Dayjs } from 'dayjs';

import { useThemePalette } from '../../hooks/useThemePalette';
import { usePagination } from '../../hooks/usePagination';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { CenteredModal } from '../../components/ui/CenteredModal';
import { FilterBar } from '../../components/FilterBar';
import { confirmDelete } from '../../components/ui/confirmDelete';
import { delegationApi, type DelegationRule } from '../../api/delegation';
import { usersApi } from '../../api/users';

const { Text } = Typography;
const { RangePicker } = DatePicker;

// ─── Constants ────────────────────────────────────────────────────────────────

const MODULE_OPTIONS = [
  { value: 'leaves',      label: 'Nghỉ phép' },
  { value: 'overtime',    label: 'OT' },
  { value: 'expenses',    label: 'Chi phí' },
  { value: 'procurement', label: 'Mua hàng' },
  { value: 'contracts',   label: 'Hợp đồng' },
  { value: 'all',         label: 'Tất cả' },
];

const MODULE_LABELS: Record<string, string> = {
  leaves:      'Nghỉ phép',
  overtime:    'OT',
  expenses:    'Chi phí',
  procurement: 'Mua hàng',
  contracts:   'Hợp đồng',
  all:         'Tất cả',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ModuleTags({ modules, isDark }: { modules: string[]; isDark: boolean }) {
  if (modules.includes('all')) {
    return (
      <Tag
        style={isDark ? { background: 'rgba(96,165,250,0.15)', color: '#93C5FD', borderColor: 'rgba(96,165,250,0.3)' } : {}}
        color={isDark ? undefined : 'blue'}
      >
        Tất cả
      </Tag>
    );
  }
  return (
    <Space size={4} wrap>
      {modules.map((m) => (
        <Tag
          key={m}
          style={isDark ? { background: 'rgba(96,165,250,0.15)', color: '#93C5FD', borderColor: 'rgba(96,165,250,0.3)' } : {}}
          color={isDark ? undefined : 'blue'}
        >
          {MODULE_LABELS[m] ?? m}
        </Tag>
      ))}
    </Space>
  );
}

function DaysRemainingBadge({ endDate, isActive }: { endDate: string; isActive: boolean }) {
  const days = dayjs(endDate).diff(dayjs(), 'day');
  if (!isActive || days < 0) return <Tag color="default">Hết hạn</Tag>;
  if (days === 0) return <Tag color="orange">Hôm nay</Tag>;
  if (days <= 3) return <Tag color="orange">{days} ngày</Tag>;
  return <Tag color="green">{days} ngày</Tag>;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DelegationPage() {
  const { textPrimary, textMuted, bgContainer, borderColor, linkColor, isDark } = useThemePalette();
  const { message } = App.useApp();
  const qc = useQueryClient();
  const { paginationProps } = usePagination(50);

  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  // ── Data queries ──
  const { data: paginatedData, isLoading } = useQuery({
    queryKey: ['delegation-rules'],
    queryFn: () => delegationApi.list(1, 100),
  });
  const delegations: DelegationRule[] = paginatedData?.data ?? [];

  const { data: users = [] } = useQuery<Array<{ id: string; name: string; isActive: boolean }>>({
    queryKey: ['users'],
    queryFn: usersApi.list,
  });
  const activeUsers = users.filter((u) => u.isActive);

  // ── Mutations ──
  const createMut = useMutation({
    mutationFn: delegationApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['delegation-rules'] });
      message.success('Đã tạo ủy quyền duyệt');
      setModalOpen(false);
      form.resetFields();
    },
    onError: () => message.error('Không thể tạo ủy quyền. Vui lòng thử lại.'),
  });

  const deleteMut = useMutation({
    mutationFn: delegationApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['delegation-rules'] });
      message.success('Đã xóa ủy quyền');
    },
    onError: () => message.error('Không thể xóa ủy quyền'),
  });

  // ── Stats ──
  const activeCount = delegations.filter((d) => {
    return d.isActive && dayjs(d.endDate).diff(dayjs(), 'day') >= 0;
  }).length;
  const expiringSoonCount = delegations.filter((d) => {
    const days = dayjs(d.endDate).diff(dayjs(), 'day');
    return d.isActive && days >= 0 && days <= 7;
  }).length;

  // ── Handlers ──
  const handleDelete = (item: DelegationRule) => {
    const delegateeName = item.delegate?.name ?? 'người được ủy quyền';
    confirmDelete({
      itemName: `ủy quyền cho ${delegateeName}`,
      onConfirm: () => deleteMut.mutate(item.id),
    });
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const [from, to] = (values.dateRange as [Dayjs, Dayjs]) ?? [];

    createMut.mutate({
      delegateId: values.delegateId,
      moduleTypes: values.moduleTypes,
      startDate: from.format('YYYY-MM-DD'),
      endDate: to.format('YYYY-MM-DD'),
      note: Array.isArray(values.note) ? values.note.join('; ') : (values.note ?? undefined),
    });
  };

  // ── Columns ──
  const columns: ColumnsType<DelegationRule> = [
    {
      title: 'Người được ủy quyền',
      key: 'delegate',
      render: (_: unknown, record: DelegationRule) => (
        <Space direction="vertical" size={0}>
          <Text style={{ color: textPrimary, fontWeight: 600 }}>{record.delegate?.name ?? '—'}</Text>
          <Text style={{ color: linkColor, fontSize: 12 }}>{record.delegate?.email ?? ''}</Text>
        </Space>
      ),
    },
    {
      title: 'Phân hệ được ủy quyền',
      dataIndex: 'moduleTypes',
      render: (v: string[]) => <ModuleTags modules={v} isDark={isDark} />,
    },
    {
      title: 'Từ ngày',
      dataIndex: 'startDate',
      width: 120,
      render: (v: string) => (
        <Text style={{ color: textMuted }}>{dayjs(v).format('DD/MM/YYYY')}</Text>
      ),
    },
    {
      title: 'Đến ngày',
      dataIndex: 'endDate',
      width: 120,
      render: (v: string) => (
        <Text style={{ color: textMuted }}>{dayjs(v).format('DD/MM/YYYY')}</Text>
      ),
    },
    {
      title: 'Còn lại',
      key: 'remaining',
      width: 110,
      align: 'center',
      render: (_: unknown, record: DelegationRule) => (
        <DaysRemainingBadge endDate={record.endDate} isActive={record.isActive} />
      ),
    },
    {
      title: 'Ghi chú',
      dataIndex: 'note',
      render: (v?: string) => v
        ? <Text style={{ color: textMuted }}>{v}</Text>
        : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      title: '',
      key: 'actions',
      width: 70,
      align: 'right',
      render: (_: unknown, record: DelegationRule) => (
        <Button
          type="text"
          size="small"
          danger
          icon={<DeleteOutlined />}
          loading={deleteMut.isPending}
          onClick={() => handleDelete(record)}
        />
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Ủy quyền duyệt"
        icon={<UsergroupAddOutlined />}
        iconColor="#6366F1"
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            Thêm ủy quyền
          </Button>
        }
      />

      {/* Stat Cards */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12}>
          <StatCard
            label="Đang hoạt động"
            value={activeCount}
            color="#10B981"
            icon={<CheckCircleOutlined />}
          />
        </Col>
        <Col xs={24} sm={12}>
          <StatCard
            label="Hết hạn trong 7 ngày"
            value={expiringSoonCount}
            color="#F59E0B"
            icon={<WarningOutlined />}
          />
        </Col>
      </Row>

      {/* Filter bar placeholder */}
      <FilterBar>
        <span />
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
          dataSource={delegations}
          loading={isLoading}
          pagination={paginationProps(delegations.length, 'ủy quyền')}
        />
      </div>

      {/* Modal tạo ủy quyền */}
      <CenteredModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          form.resetFields();
        }}
        title="Tạo ủy quyền duyệt mới"
        width={540}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => { setModalOpen(false); form.resetFields(); }}>
              Hủy
            </Button>
            <Button type="primary" loading={createMut.isPending} onClick={handleSubmit}>
              Tạo ủy quyền
            </Button>
          </div>
        }
      >
        <Form form={form} layout="vertical" requiredMark="optional">
          <Form.Item
            name="delegateId"
            label="Người được ủy quyền"
            rules={[{ required: true, message: 'Chọn người được ủy quyền' }]}
          >
            <Select
              placeholder="Chọn nhân viên..."
              showSearch
              options={activeUsers.map((u) => ({ value: u.id, label: u.name }))}
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>

          <Form.Item
            name="moduleTypes"
            label="Phân hệ được ủy quyền"
            rules={[
              { required: true, message: 'Chọn ít nhất một phân hệ' },
              {
                validator(_, value: string[]) {
                  if (value?.includes('all') && value.length > 1) {
                    return Promise.reject('Khi chọn "Tất cả" không cần chọn thêm phân hệ khác');
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Checkbox.Group style={{ width: '100%' }}>
              <Row gutter={[8, 8]}>
                {MODULE_OPTIONS.map((opt) => (
                  <Col span={12} key={opt.value}>
                    <Checkbox value={opt.value}>{opt.label}</Checkbox>
                  </Col>
                ))}
              </Row>
            </Checkbox.Group>
          </Form.Item>

          <Form.Item
            name="dateRange"
            label="Thời gian ủy quyền"
            rules={[{ required: true, message: 'Chọn khoảng thời gian' }]}
          >
            <RangePicker
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
              disabledDate={(current) => current && current < dayjs().startOf('day')}
              placeholder={['Từ ngày', 'Đến ngày']}
            />
          </Form.Item>

          <Form.Item
            name="note"
            label="Ghi chú"
            rules={[{ max: 500, message: 'Tối đa 500 ký tự' }]}
          >
            <Select
              mode="tags"
              placeholder="Lý do ủy quyền... (hoặc tự nhập)"
              options={[
                { value: 'Nghỉ phép có kế hoạch', label: 'Nghỉ phép có kế hoạch' },
                { value: 'Công tác nước ngoài', label: 'Công tác nước ngoài' },
                { value: 'Nghỉ thai sản', label: 'Nghỉ thai sản' },
                { value: 'Hội nghị / Đào tạo', label: 'Hội nghị / Đào tạo' },
              ]}
              maxTagCount={1}
            />
          </Form.Item>
        </Form>
      </CenteredModal>
    </div>
  );
}
