import { useState } from 'react';
import {
  Table, Button, Space, Typography, Tag, Form,
  Select, Checkbox, Row, Col, message, DatePicker,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined,
  UsergroupAddOutlined, CheckCircleOutlined, WarningOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';

import { useThemePalette } from '../../hooks/useThemePalette';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { CenteredModal } from '../../components/ui/CenteredModal';
import { confirmDelete } from '../../components/ui/confirmDelete';

const { Text } = Typography;
const { RangePicker } = DatePicker;

// ─── Types ────────────────────────────────────────────────────────────────────

type DelegationModule =
  | 'leaves'
  | 'overtime'
  | 'expenses'
  | 'procurement'
  | 'contracts'
  | 'all';

interface Delegation {
  id: string;
  delegatorName: string;
  delegatorAvatar?: string;
  delegateeName: string;
  delegateeEmail: string;
  modules: DelegationModule[];
  fromDate: string;
  toDate: string;
  note?: string;
  isActive: boolean;
  daysRemaining: number;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const TODAY = dayjs();

function calcDaysRemaining(toDate: string): number {
  return dayjs(toDate).diff(TODAY, 'day');
}

const MOCK_DELEGATIONS: Delegation[] = [
  {
    id: '1',
    delegatorName: 'Nguyễn Văn An',
    delegateeName: 'Trần Thị Bình',
    delegateeEmail: 'binh.tran@loop.vn',
    modules: ['leaves', 'overtime'],
    fromDate: '2026-05-28',
    toDate: '2026-06-10',
    note: 'Nghỉ phép hè, ủy quyền duyệt OT và nghỉ phép cho team',
    isActive: true,
    daysRemaining: calcDaysRemaining('2026-06-10'),
  },
  {
    id: '2',
    delegatorName: 'Lê Thị Cúc',
    delegateeName: 'Hoàng Văn Đức',
    delegateeEmail: 'duc.hoang@loop.vn',
    modules: ['expenses', 'procurement'],
    fromDate: '2026-06-01',
    toDate: '2026-06-05',
    note: 'Công tác nước ngoài',
    isActive: true,
    daysRemaining: calcDaysRemaining('2026-06-05'),
  },
  {
    id: '3',
    delegatorName: 'Phạm Minh Đức',
    delegateeName: 'Vũ Thị Giang',
    delegateeEmail: 'giang.vu@loop.vn',
    modules: ['all'],
    fromDate: '2026-05-01',
    toDate: '2026-05-15',
    note: 'Toàn quyền duyệt trong thời gian nghỉ thai sản',
    isActive: false,
    daysRemaining: calcDaysRemaining('2026-05-15'),
  },
  {
    id: '4',
    delegatorName: 'Đinh Hồng Hà',
    delegateeName: 'Nguyễn Thị Khánh',
    delegateeEmail: 'khanh.nguyen@loop.vn',
    modules: ['contracts'],
    fromDate: '2026-06-03',
    toDate: '2026-06-07',
    isActive: true,
    daysRemaining: calcDaysRemaining('2026-06-07'),
  },
];

// ─── Constants ────────────────────────────────────────────────────────────────

const MODULE_OPTIONS = [
  { value: 'leaves',      label: 'Nghỉ phép' },
  { value: 'overtime',    label: 'OT' },
  { value: 'expenses',    label: 'Chi phí' },
  { value: 'procurement', label: 'Mua hàng' },
  { value: 'contracts',   label: 'Hợp đồng' },
  { value: 'all',         label: 'Tất cả' },
];

const MODULE_LABELS: Record<DelegationModule, string> = {
  leaves:      'Nghỉ phép',
  overtime:    'OT',
  expenses:    'Chi phí',
  procurement: 'Mua hàng',
  contracts:   'Hợp đồng',
  all:         'Tất cả',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ModuleTags({ modules, isDark }: { modules: DelegationModule[]; isDark: boolean }) {
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
          {MODULE_LABELS[m]}
        </Tag>
      ))}
    </Space>
  );
}

function DaysRemainingBadge({ days, isActive }: { days: number; isActive: boolean }) {
  if (!isActive) {
    return <Tag color="default">Hết hạn</Tag>;
  }
  if (days <= 0) {
    return <Tag color="red">Hết hạn</Tag>;
  }
  if (days <= 3) {
    return <Tag color="orange">{days} ngày</Tag>;
  }
  return <Tag color="green">{days} ngày</Tag>;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DelegationPage() {
  const { textPrimary, textMuted, bgContainer, borderColor, linkColor, isDark } = useThemePalette();
  const [msgApi, msgCtx] = message.useMessage();

  const [delegations, setDelegations] = useState<Delegation[]>(MOCK_DELEGATIONS);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  // ── Stats ──
  const activeCount = delegations.filter((d) => d.isActive && d.daysRemaining > 0).length;
  const expiringSoonCount = delegations.filter(
    (d) => d.isActive && d.daysRemaining > 0 && d.daysRemaining <= 7,
  ).length;

  // ── Handlers ──
  const handleOpenCreate = () => {
    form.resetFields();
    setModalOpen(true);
  };

  const handleDelete = (item: Delegation) => {
    confirmDelete({
      itemName: `ủy quyền của ${item.delegatorName} cho ${item.delegateeName}`,
      onConfirm: () => {
        setDelegations((prev) => prev.filter((d) => d.id !== item.id));
        msgApi.success('Đã xóa ủy quyền');
      },
    });
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const [from, to] = (values.dateRange as [Dayjs, Dayjs]) ?? [];
    const fromDate = from?.format('YYYY-MM-DD') ?? '';
    const toDate = to?.format('YYYY-MM-DD') ?? '';
    const daysRemaining = calcDaysRemaining(toDate);

    setDelegations((prev) => [
      {
        id: String(Date.now()),
        delegatorName: 'Người dùng hiện tại',
        delegateeName: values.delegateeName,
        delegateeEmail: values.delegateeEmail ?? '',
        modules: values.modules,
        fromDate,
        toDate,
        note: values.note,
        isActive: true,
        daysRemaining,
      },
      ...prev,
    ]);
    msgApi.success('Đã tạo ủy quyền duyệt');
    setModalOpen(false);
    form.resetFields();
  };

  // ── Columns ──
  const columns: ColumnsType<Delegation> = [
    {
      title: 'Người ủy quyền',
      dataIndex: 'delegatorName',
      render: (v: string) => <Text style={{ color: textPrimary, fontWeight: 600 }}>{v}</Text>,
    },
    {
      title: 'Người được ủy quyền',
      dataIndex: 'delegateeName',
      render: (v: string, record: Delegation) => (
        <Space direction="vertical" size={0}>
          <Text style={{ color: textPrimary }}>{v}</Text>
          <Text style={{ color: linkColor, fontSize: 12 }}>{record.delegateeEmail}</Text>
        </Space>
      ),
    },
    {
      title: 'Phân hệ được ủy quyền',
      dataIndex: 'modules',
      render: (v: DelegationModule[]) => <ModuleTags modules={v} isDark={isDark} />,
    },
    {
      title: 'Từ ngày',
      dataIndex: 'fromDate',
      width: 120,
      render: (v: string) => (
        <Text style={{ color: textMuted }}>{dayjs(v).format('DD/MM/YYYY')}</Text>
      ),
    },
    {
      title: 'Đến ngày',
      dataIndex: 'toDate',
      width: 120,
      render: (v: string) => (
        <Text style={{ color: textMuted }}>{dayjs(v).format('DD/MM/YYYY')}</Text>
      ),
    },
    {
      title: 'Còn lại',
      dataIndex: 'daysRemaining',
      width: 110,
      align: 'center',
      render: (v: number, record: Delegation) => (
        <DaysRemainingBadge days={v} isActive={record.isActive} />
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 70,
      align: 'right',
      render: (_: unknown, record: Delegation) => (
        <Button
          type="text"
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleDelete(record)}
        />
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      {msgCtx}

      <PageHeader
        title="Ủy quyền duyệt"
        icon={<UsergroupAddOutlined />}
        iconColor="#6366F1"
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}>
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
          pagination={{
            pageSize: 10,
            showTotal: (t) => `Tổng ${t} ủy quyền`,
          }}
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
            <Button
              onClick={() => {
                setModalOpen(false);
                form.resetFields();
              }}
            >
              Hủy
            </Button>
            <Button type="primary" onClick={handleSubmit}>
              Tạo ủy quyền
            </Button>
          </div>
        }
      >
        <Form form={form} layout="vertical" requiredMark="optional">
          <Form.Item
            name="delegateeName"
            label="Người được ủy quyền"
            rules={[{ required: true, message: 'Chọn người được ủy quyền' }]}
          >
            <Select
              placeholder="Chọn nhân viên..."
              showSearch
              options={[
                { value: 'Trần Thị Bình', label: 'Trần Thị Bình' },
                { value: 'Hoàng Văn Đức', label: 'Hoàng Văn Đức' },
                { value: 'Vũ Thị Giang', label: 'Vũ Thị Giang' },
                { value: 'Nguyễn Thị Khánh', label: 'Nguyễn Thị Khánh' },
                { value: 'Lê Minh Toàn', label: 'Lê Minh Toàn' },
                { value: 'Phạm Thị Loan', label: 'Phạm Thị Loan' },
              ]}
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>

          <Form.Item
            name="modules"
            label="Phân hệ được ủy quyền"
            rules={[
              { required: true, message: 'Chọn ít nhất một phân hệ' },
              {
                validator(_, value: DelegationModule[]) {
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
              disabledDate={(current) => current && current < TODAY.startOf('day')}
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
