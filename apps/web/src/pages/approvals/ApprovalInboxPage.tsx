import { useState } from 'react';
import { Row, Col, Table, Tag, Button, Select, Typography, Space, message } from 'antd';
import {
  InboxOutlined,
  UserOutlined,
  CheckOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { useThemePalette } from '../../hooks/useThemePalette';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { FilterBar } from '../../components/FilterBar';

const { Text } = Typography;

type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
type ApprovalModule = 'leave' | 'overtime' | 'expense' | 'purchase' | 'contract';

interface ApprovalItem {
  id: string;
  type: ApprovalModule;
  typeLabel: string;
  sender: string;
  content: string;
  submittedAt: string;
  status: ApprovalStatus;
  overdue: boolean;
}

const MODULE_OPTIONS = [
  { value: '', label: 'Tất cả module' },
  { value: 'leave', label: 'Nghỉ phép' },
  { value: 'overtime', label: 'Tăng ca' },
  { value: 'expense', label: 'Chi phí' },
  { value: 'purchase', label: 'Mua hàng' },
  { value: 'contract', label: 'Hợp đồng' },
];

const DATE_OPTIONS = [
  { value: '', label: 'Tất cả thời gian' },
  { value: 'today', label: 'Hôm nay' },
  { value: 'week', label: 'Tuần này' },
  { value: 'month', label: 'Tháng này' },
];

// Mock data — 10 pending items
// TODO: fetch /approvals/inbox
const INITIAL_ITEMS: ApprovalItem[] = [
  {
    id: '1', type: 'leave', typeLabel: 'Nghỉ phép',
    sender: 'Nguyễn Minh Hoàng',
    content: 'Đơn nghỉ phép — 26/05 đến 28/05/2026 (3 ngày)',
    submittedAt: '26/05/2026 08:12', status: 'PENDING', overdue: false,
  },
  {
    id: '2', type: 'overtime', typeLabel: 'Tăng ca',
    sender: 'Trần Thu Hương',
    content: 'Đăng ký OT — 27/05/2026 từ 18:00 đến 22:00 (4h)',
    submittedAt: '25/05/2026 17:30', status: 'PENDING', overdue: false,
  },
  {
    id: '3', type: 'expense', typeLabel: 'Chi phí',
    sender: 'Lê Thanh Long',
    content: 'Đề nghị thanh toán — Mua văn phòng phẩm Q2/2026 — 3.500.000 đ',
    submittedAt: '24/05/2026 10:00', status: 'PENDING', overdue: true,
  },
  {
    id: '4', type: 'purchase', typeLabel: 'Mua hàng',
    sender: 'Phạm Ngọc Ánh',
    content: 'Đơn mua hàng — 5 màn hình Dell 27" — 42.500.000 đ',
    submittedAt: '23/05/2026 09:45', status: 'PENDING', overdue: true,
  },
  {
    id: '5', type: 'contract', typeLabel: 'Hợp đồng',
    sender: 'Vũ Khánh Toàn',
    content: 'Hợp đồng lao động — Nhân viên mới: Nguyễn Đức Anh — thử việc 2 tháng',
    submittedAt: '22/05/2026 14:20', status: 'PENDING', overdue: true,
  },
  {
    id: '6', type: 'leave', typeLabel: 'Nghỉ phép',
    sender: 'Đặng Thị Mai',
    content: 'Đơn nghỉ phép — 30/05/2026 (1 ngày) — Việc gia đình',
    submittedAt: '26/05/2026 11:00', status: 'PENDING', overdue: false,
  },
  {
    id: '7', type: 'expense', typeLabel: 'Chi phí',
    sender: 'Hoàng Văn Bình',
    content: 'Chi phí công tác — Hà Nội 24–25/05 — 1.200.000 đ',
    submittedAt: '26/05/2026 08:50', status: 'PENDING', overdue: false,
  },
  {
    id: '8', type: 'overtime', typeLabel: 'Tăng ca',
    sender: 'Ngô Thị Lan',
    content: 'Đăng ký OT — 28/05/2026 từ 19:00 đến 21:00 (2h)',
    submittedAt: '26/05/2026 16:05', status: 'PENDING', overdue: false,
  },
  {
    id: '9', type: 'purchase', typeLabel: 'Mua hàng',
    sender: 'Trịnh Quang Hải',
    content: 'Đơn mua hàng — Phần mềm bản quyền Figma Team (5 seat) — 15.000.000 đ',
    submittedAt: '20/05/2026 10:30', status: 'PENDING', overdue: true,
  },
  {
    id: '10', type: 'contract', typeLabel: 'Hợp đồng',
    sender: 'Lý Thị Bảo Châu',
    content: 'Hợp đồng khách hàng — Cty ABC — Dịch vụ vận hành hệ thống ERP — 6 tháng',
    submittedAt: '21/05/2026 13:15', status: 'PENDING', overdue: true,
  },
];

const MODULE_COLOR: Record<ApprovalModule, string> = {
  leave:    '#6366F1',
  overtime: '#F97316',
  expense:  '#F59E0B',
  purchase: '#3B82F6',
  contract: '#8B5CF6',
};

export default function ApprovalInboxPage() {
  const { textPrimary, textMuted, borderColor, bgContainer, isDark, linkColor } = useThemePalette();

  const [items, setItems] = useState<ApprovalItem[]>(INITIAL_ITEMS);
  const [moduleFilter, setModuleFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const pendingCount  = items.filter(i => i.status === 'PENDING').length;
  const approvedToday = 3; // mock
  const overdueCount  = items.filter(i => i.status === 'PENDING' && i.overdue).length;

  const filtered = items.filter(item => {
    if (moduleFilter && item.type !== moduleFilter) return false;
    // Date filter is illustrative — real impl would compare timestamps
    return true;
  });

  function handleApprove(id: string) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'APPROVED' } : i));
    message.success('Đã duyệt yêu cầu');
  }

  function handleReject(id: string) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'REJECTED' } : i));
    message.error('Đã từ chối yêu cầu');
  }

  const statusLabel: Record<ApprovalStatus, string> = {
    PENDING:  'Chờ duyệt',
    APPROVED: 'Đã duyệt',
    REJECTED: 'Từ chối',
  };

  const statusColor: Record<ApprovalStatus, string> = {
    PENDING:  'warning',
    APPROVED: 'success',
    REJECTED: 'error',
  };

  const columns = [
    {
      title: 'Loại',
      dataIndex: 'typeLabel',
      width: 120,
      render: (v: string, record: ApprovalItem) => {
        const c = MODULE_COLOR[record.type];
        return (
          <Tag
            style={isDark
              ? { background: `${c}22`, color: c, borderColor: `${c}55`, fontSize: 12 }
              : { fontSize: 12 }}
            color={isDark ? undefined : 'default'}
          >
            {v}
          </Tag>
        );
      },
    },
    {
      title: 'Người gửi',
      dataIndex: 'sender',
      width: 160,
      render: (v: string) => (
        <Space>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 26, height: 26, borderRadius: '50%',
            background: '#6366F122', fontSize: 12, color: linkColor,
          }}>
            <UserOutlined />
          </span>
          <Text style={{ color: textPrimary, fontSize: 13 }}>{v}</Text>
        </Space>
      ),
    },
    {
      title: 'Nội dung',
      dataIndex: 'content',
      ellipsis: true,
      render: (v: string) => <Text style={{ color: textPrimary, fontSize: 13 }}>{v}</Text>,
    },
    {
      title: 'Ngày gửi',
      dataIndex: 'submittedAt',
      width: 140,
      render: (v: string, record: ApprovalItem) => (
        <Text style={{ color: record.overdue ? '#EF4444' : textMuted, fontSize: 12 }}>
          {v}
        </Text>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 110,
      render: (v: ApprovalStatus) => (
        <Tag color={statusColor[v]}>{statusLabel[v]}</Tag>
      ),
    },
    {
      title: 'Hành động',
      key: 'actions',
      width: 160,
      render: (_: unknown, record: ApprovalItem) => {
        if (record.status !== 'PENDING') {
          return <Text style={{ color: textMuted, fontSize: 12 }}>—</Text>;
        }
        return (
          <Space size={6}>
            <Button
              type="primary"
              size="small"
              icon={<CheckOutlined />}
              onClick={() => handleApprove(record.id)}
              style={{ fontSize: 12 }}
            >
              Duyệt
            </Button>
            <Button
              danger
              size="small"
              icon={<CloseOutlined />}
              onClick={() => handleReject(record.id)}
              style={{ fontSize: 12 }}
            >
              Từ chối
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Hộp thư duyệt"
        icon={<InboxOutlined />}
        iconColor="#6366F1"
      />

      {/* Stat cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <StatCard
            label="Chờ duyệt"
            value={pendingCount}
            subValue="yêu cầu đang chờ"
            color="#F59E0B"
            icon={<InboxOutlined />}
          />
        </Col>
        <Col xs={24} sm={8}>
          <StatCard
            label="Đã duyệt hôm nay"
            value={approvedToday}
            subValue="yêu cầu"
            color="#10B981"
            icon={<CheckOutlined />}
          />
        </Col>
        <Col xs={24} sm={8}>
          <StatCard
            label="Quá hạn"
            value={overdueCount}
            subValue="cần xử lý gấp"
            color="#EF4444"
            icon={<CloseOutlined />}
          />
        </Col>
      </Row>

      {/* Filter bar */}
      <FilterBar>
        <Select
          value={moduleFilter}
          onChange={setModuleFilter}
          options={MODULE_OPTIONS}
          style={{ width: 180 }}
          placeholder="Module"
        />
        <Select
          value={dateFilter}
          onChange={setDateFilter}
          options={DATE_OPTIONS}
          style={{ width: 160 }}
          placeholder="Thời gian"
        />
      </FilterBar>

      {/* Table */}
      <div style={{
        background: bgContainer,
        border: `1px solid ${borderColor}`,
        borderRadius: 12,
        overflow: 'hidden',
      }}>
        <Table
          rowKey="id"
          dataSource={filtered}
          columns={columns}
          size="middle"
          pagination={{ pageSize: 10, showSizeChanger: false, showTotal: (t) => `Tổng ${t} yêu cầu` }}
          locale={{ emptyText: <Text style={{ color: textMuted }}>Không có yêu cầu nào</Text> }}
          rowClassName={(record) => record.overdue && record.status === 'PENDING' ? 'row-overdue' : ''}
        />
      </div>
    </div>
  );
}
