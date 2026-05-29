import { useState } from 'react';
import {
  Table, Button, Space, Tag, Typography, Select, Form,
  DatePicker, InputNumber, Input, Modal, Tabs, Row, Col, Card,
  Tooltip, message, Drawer, Descriptions, Divider,
} from 'antd';
import { CenteredModal } from '../../components/ui/CenteredModal';
import { CommentThread } from '../../components/comments/CommentThread';
import {
  PlusOutlined, CheckOutlined, CloseOutlined, CalendarOutlined,
  SettingOutlined, BranchesOutlined, DownloadOutlined,
} from '@ant-design/icons';
import { downloadExport } from '../../utils/exportApi';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  leavesApi,
  type LeaveRequest, type LeaveStatus, type LeaveType, type LeaveBalance,
} from '../../api/leaves';
import { employeesApi } from '../../api/employees';
import { useAuthStore } from '../../store/auth.store';
import { useThemeStore } from '../../store/theme.store';
import LeaveTypeConfigModal from '../../components/leave/LeaveTypeConfigModal';

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

const STATUS_LABEL: Record<LeaveStatus, string> = {
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
  CANCELLED: 'Đã huỷ',
};

const STATUS_COLOR: Record<LeaveStatus, string> = {
  PENDING: 'orange',
  APPROVED: 'green',
  REJECTED: 'red',
  CANCELLED: 'default',
};

const CATEGORY_ICONS: Record<string, string> = {
  TRAVEL: '✈️',
  MEALS: '🍱',
  EQUIPMENT: '💻',
  SOFTWARE: '🛠️',
  TRAINING: '📚',
  OTHER: '📦',
};

const PRIVILEGED_ROLES = ['ADMIN', 'LEADERSHIP', 'PM', 'HR'];

function canApprove(role?: string): boolean {
  return PRIVILEGED_ROLES.includes(role ?? '');
}

// ─── Leave Balance Widget ─────────────────────────────────────────────────────

function BalanceWidget({
  balances,
  isDark,
  borderColor,
  bgCard,
  textPrimary,
  textSecondary,
  isAdmin,
  onConfigType,
}: {
  balances: LeaveBalance[];
  isDark: boolean;
  borderColor: string;
  bgCard: string;
  textPrimary: string;
  textSecondary: string;
  isAdmin?: boolean;
  onConfigType?: (lt: LeaveType) => void;
}) {
  if (!balances.length) return null;

  return (
    <Row gutter={12} style={{ marginBottom: 20 }}>
      {balances.map((b) => {
        const remaining = Number(b.totalDays) - Number(b.usedDays);
        const pct = b.totalDays > 0 ? (Number(b.usedDays) / Number(b.totalDays)) * 100 : 0;
        const barColor = pct >= 100 ? '#FF4D4F' : pct >= 75 ? '#FA8C16' : b.leaveType?.color ?? '#10B981';
        return (
          <Col key={b.id} xs={12} sm={8} md={6} lg={4}>
            <Card
              size="small"
              style={{
                background: bgCard,
                border: `1px solid ${borderColor}`,
                borderRadius: 10,
                textAlign: 'center',
                position: 'relative',
              }}
              bodyStyle={{ padding: '10px 12px' }}
            >
              {isAdmin && b.leaveType && (
                <Tooltip title="Configure workflow">
                  <Button
                    type="text"
                    size="small"
                    icon={<SettingOutlined />}
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      color: textSecondary,
                      padding: 2,
                      height: 20,
                      width: 20,
                      minWidth: 20,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (b.leaveType) onConfigType?.(b.leaveType);
                    }}
                  />
                </Tooltip>
              )}
              <div
                style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: b.leaveType?.color ?? '#10B981',
                  display: 'inline-block', marginBottom: 4,
                }}
              />
              <div style={{ fontSize: 11, color: textSecondary, marginBottom: 2 }}>
                {b.leaveType?.name ?? 'Leave'}
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: textPrimary, lineHeight: 1.2 }}>
                {remaining}
                <span style={{ fontSize: 12, fontWeight: 400, color: textSecondary }}> / {b.totalDays}</span>
              </div>
              <div style={{ fontSize: 10, color: textSecondary }}>days remaining</div>
              {/* Progress bar */}
              <div style={{
                marginTop: 6, height: 4, borderRadius: 2,
                background: isDark ? '#334155' : '#E2E8F0',
              }}>
                <div style={{
                  width: `${Math.min(pct, 100)}%`, height: '100%',
                  borderRadius: 2, background: barColor,
                  transition: 'width 0.3s',
                }} />
              </div>
            </Card>
          </Col>
        );
      })}
    </Row>
  );
}

// ─── Leave Drawer ─────────────────────────────────────────────────────────────

function LeaveDrawer({
  open,
  onClose,
  leaveTypes,
  employees,
  isDark,
  bgContainer,
  borderColor,
  textPrimary,
  currentEmployeeId,
}: {
  open: boolean;
  onClose: () => void;
  leaveTypes: LeaveType[];
  employees: { id: string; fullName: string }[];
  isDark: boolean;
  bgContainer: string;
  borderColor: string;
  textPrimary: string;
  currentEmployeeId?: string;
}) {
  const [form] = Form.useForm();
  const [days, setDays] = useState<number>(1);
  const qc = useQueryClient();

  const { mutate: create, isPending } = useMutation({
    mutationFn: leavesApi.create,
    onSuccess: () => {
      message.success('Gửi yêu cầu nghỉ phép thành công');
      qc.invalidateQueries({ queryKey: ['leaves'] });
      qc.invalidateQueries({ queryKey: ['leave-balance'] });
      form.resetFields();
      onClose();
    },
    onError: () => message.error('Gửi yêu cầu thất bại'),
  });

  function calcDays(start?: Dayjs, end?: Dayjs): number {
    if (!start || !end) return 1;
    const diff = end.diff(start, 'day') + 1;
    return Math.max(0.5, diff);
  }

  function onDateChange(_: unknown, dates: [Dayjs | null, Dayjs | null] | null) {
    if (dates?.[0] && dates?.[1]) {
      const d = calcDays(dates[0], dates[1]);
      setDays(d);
      form.setFieldValue('days', d);
    }
  }

  function onFinish(values: Record<string, unknown>) {
    const dateRange = values.dateRange as [Dayjs, Dayjs];
    create({
      employeeId: (values.employeeId as string) ?? currentEmployeeId ?? '',
      leaveTypeId: values.leaveTypeId as string,
      startDate: dateRange[0].format('YYYY-MM-DD'),
      endDate: dateRange[1].format('YYYY-MM-DD'),
      days: values.days as number,
      reason: values.reason as string | undefined,
    });
  }

  return (
    <CenteredModal
      title="Tạo yêu cầu nghỉ phép"
      open={open}
      onClose={onClose}
      width={480}
      styles={{
        body: { background: bgContainer },
        header: {
          background: bgContainer,
          borderBottom: `1px solid ${borderColor}`,
          color: textPrimary,
        },
      }}
      footer={
        <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
          <Button onClick={onClose}>Huỷ</Button>
          <Button type="primary" loading={isPending} onClick={() => form.submit()}>
            Gửi yêu cầu
          </Button>
        </Space>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{ days: 1 }}
      >
        <Form.Item name="employeeId" label="Nhân viên" rules={[{ required: true, message: 'Chọn nhân viên' }]}>
          <Select
            showSearch
            placeholder="Chọn nhân viên"
            optionFilterProp="label"
            defaultValue={currentEmployeeId}
            options={employees.map((e) => ({ value: e.id, label: e.fullName }))}
          />
        </Form.Item>

        <Form.Item name="leaveTypeId" label="Loại nghỉ phép" rules={[{ required: true, message: 'Chọn loại nghỉ phép' }]}>
          <Select placeholder="Chọn loại nghỉ phép">
            {leaveTypes.map((t) => (
              <Select.Option key={t.id} value={t.id}>
                <Space size={6}>
                  <span
                    style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: t.color, display: 'inline-block',
                    }}
                  />
                  {t.name}
                </Space>
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name="dateRange" label="Thời gian" rules={[{ required: true, message: 'Chọn ngày nghỉ' }]}>
          <RangePicker
            style={{ width: '100%' }}
            placeholder={['Ngày bắt đầu', 'Ngày kết thúc']}
            onChange={(dates) => onDateChange(null, dates as [Dayjs | null, Dayjs | null])}
          />
        </Form.Item>

        <Form.Item name="days" label="Số ngày nghỉ" rules={[{ required: true }]}>
          <InputNumber
            min={0.5}
            step={0.5}
            style={{ width: '100%' }}
            value={days}
            onChange={(v) => setDays(v ?? 1)}
          />
        </Form.Item>

        <Form.Item name="reason" label="Lý do">
          <TextArea rows={3} placeholder="Nhập lý do nghỉ phép (không bắt buộc)" />
        </Form.Item>
      </Form>
    </CenteredModal>
  );
}

// ─── Main LeavePage ───────────────────────────────────────────────────────────

export default function LeavePage() {
  const { mode, preset } = useThemeStore();
  const isDark = mode === 'dark';
  const textPrimary   = isDark ? '#F1F5F9' : '#0F172A';
  const textSecondary = isDark ? 'rgba(255,255,255,0.5)' : '#475569';
  const bgContainer   = isDark ? '#1E293B' : '#ffffff';
  const bgCard        = isDark ? '#2D3F56' : '#FAFAFA';
  const borderColor   = isDark ? '#334155' : '#E2E8F0';

  const user = useAuthStore((s) => s.user);
  const isPrivileged = canApprove(user?.role);

  const [activeTab, setActiveTab] = useState<'my' | 'team'>('my');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewLeave, setViewLeave] = useState<LeaveRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | undefined>();
  const [page, setPage] = useState(1);
  const [rejectModal, setRejectModal] = useState<{ id: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [configLeaveType, setConfigLeaveType] = useState<LeaveType | null>(null);

  const qc = useQueryClient();

  const { data: leaveTypes = [] } = useQuery({
    queryKey: ['leave-types'],
    queryFn: leavesApi.getTypes,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: employeesApi.list,
  });

  // Tìm employee của current user
  const currentEmployee = employees.find((e) => e.userId === user?.id);

  const { data: balances = [] } = useQuery<LeaveBalance[]>({
    queryKey: ['leave-balance', currentEmployee?.id],
    queryFn: () =>
      leavesApi.getBalance(currentEmployee!.id, new Date().getFullYear()),
    enabled: !!currentEmployee?.id,
  });

  const params = {
    page,
    pageSize: 20,
    status: statusFilter,
    ...(activeTab === 'my' && currentEmployee ? { employeeId: currentEmployee.id } : {}),
  };

  const { data, isLoading } = useQuery({
    queryKey: ['leaves', params],
    queryFn: () => leavesApi.list(params),
  });

  const { mutate: approve } = useMutation({
    mutationFn: ({ id, status, rejectedReason }: { id: string; status: 'APPROVED' | 'REJECTED'; rejectedReason?: string }) =>
      leavesApi.approve(id, { status, rejectedReason }),
    onSuccess: () => {
      message.success('Đã cập nhật trạng thái');
      qc.invalidateQueries({ queryKey: ['leaves'] });
    },
    onError: () => message.error('Thao tác thất bại'),
  });

  function handleApprove(id: string) {
    approve({ id, status: 'APPROVED' });
  }

  function handleReject(id: string) {
    setRejectModal({ id });
    setRejectReason('');
  }

  function confirmReject() {
    if (!rejectModal) return;
    approve({ id: rejectModal.id, status: 'REJECTED', rejectedReason: rejectReason });
    setRejectModal(null);
  }

  const columns: ColumnsType<LeaveRequest> = [
    {
      title: 'Nhân viên', dataIndex: ['employee', 'fullName'], width: 150, ellipsis: true,
      render: (name?: string) => name ?? <Text type="secondary">—</Text>,
    },
    {
      title: 'Loại nghỉ phép', dataIndex: 'leaveType', width: 160,
      render: (lt?: LeaveType) =>
        lt ? (
          <Tag color={lt.color} style={{ borderRadius: 12 }}>
            {lt.name}
          </Tag>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: 'Từ ngày', dataIndex: 'startDate', width: 110,
      render: (d: string) => dayjs(d).format('DD/MM/YYYY'),
    },
    {
      title: 'Đến ngày', dataIndex: 'endDate', width: 110,
      render: (d: string) => dayjs(d).format('DD/MM/YYYY'),
    },
    {
      title: 'Số ngày', dataIndex: 'days', width: 80,
      render: (v: number) => <Text strong>{Number(v)}</Text>,
    },
    {
      title: 'Status', dataIndex: 'status', width: 130,
      render: (s: LeaveStatus, record: LeaveRequest) => {
        if (record.processInstanceId && s === 'PENDING') {
          return (
            <Tooltip title="View in Process Monitor">
              <Tag
                color="blue"
                icon={<BranchesOutlined />}
                style={{ cursor: 'pointer' }}
                onClick={() =>
                  window.open(`/processes/instances/${record.processInstanceId}`, '_blank')
                }
              >
                In Review
              </Tag>
            </Tooltip>
          );
        }
        return <Tag color={STATUS_COLOR[s]}>{STATUS_LABEL[s]}</Tag>;
      },
    },
    {
      title: 'Reason', dataIndex: 'reason', ellipsis: true,
      render: (r?: string) => r ?? <Text type="secondary">—</Text>,
    },
    {
      title: 'Thao tác', width: 120,
      render: (_: unknown, record: LeaveRequest) => {
        if (!isPrivileged || record.status !== 'PENDING') return null;
        return (
          <Space size={4}>
            <Tooltip title="Duyệt">
              <Button
                size="small"
                type="primary"
                icon={<CheckOutlined />}
                onClick={(e) => { e.stopPropagation(); handleApprove(record.id); }}
              />
            </Tooltip>
            <Tooltip title="Từ chối">
              <Button
                size="small"
                danger
                icon={<CloseOutlined />}
                onClick={(e) => { e.stopPropagation(); handleReject(record.id); }}
              />
            </Tooltip>
          </Space>
        );
      },
    },
  ];

  const tabs = [
    { key: 'my', label: 'Của tôi' },
    ...(isPrivileged ? [{ key: 'team', label: 'Toàn bộ' }] : []),
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Title level={3} style={{ margin: 0, color: textPrimary }}>
          <CalendarOutlined style={{ marginRight: 8, color: preset.primary }} />
          Nghỉ phép
        </Title>
        <Space>
          <Button
            icon={<DownloadOutlined />}
            onClick={() => downloadExport('/leaves/export', 'nghi-phep.xlsx').catch(() => message.error('Export thất bại'))}
          >
            Export
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setDrawerOpen(true)}
          >
            Tạo yêu cầu
          </Button>
        </Space>
      </div>

      {/* Balance cards */}
      <BalanceWidget
        balances={balances}
        isDark={isDark}
        borderColor={borderColor}
        bgCard={bgCard}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
        isAdmin={isPrivileged}
        onConfigType={(lt) => setConfigLeaveType(lt)}
      />

      {/* Tabs + Filter */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 16, flexWrap: 'wrap', gap: 12,
      }}>
        <Tabs
          activeKey={activeTab}
          onChange={(k) => { setActiveTab(k as 'my' | 'team'); setPage(1); }}
          items={tabs.map((t) => ({ key: t.key, label: t.label }))}
          style={{ marginBottom: 0 }}
        />
        <Space wrap>
          <Select
            allowClear
            placeholder="Trạng thái"
            style={{ width: 150 }}
            onChange={(v) => { setStatusFilter(v); setPage(1); }}
            options={Object.entries(STATUS_LABEL).map(([k, v]) => ({ value: k, label: v }))}
          />
          <Select
            allowClear
            placeholder="Loại nghỉ phép"
            style={{ width: 160 }}
            onChange={() => setPage(1)}
            options={leaveTypes.map((t) => ({ value: t.id, label: t.name }))}
          />
        </Space>
      </div>

      <Table
        dataSource={data?.data}
        loading={isLoading}
        rowKey="id"
        columns={columns}
        onRow={(record) => ({ onClick: (e) => { if ((e.target as HTMLElement).closest('button')) return; setViewLeave(record); }, style: { cursor: 'pointer' } })}
        pagination={{
          total: data?.total,
          pageSize: 20,
          current: page,
          onChange: setPage,
          showSizeChanger: false,
        }}
        style={{ background: bgContainer }}
      />

      {/* Drawer tạo mới */}
      <LeaveDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        leaveTypes={leaveTypes}
        employees={employees}
        isDark={isDark}
        bgContainer={bgContainer}
        borderColor={borderColor}
        textPrimary={textPrimary}
        currentEmployeeId={currentEmployee?.id}
      />

      {/* Modal từ chối */}
      <Modal
        title="Lý do từ chối"
        open={!!rejectModal}
        onOk={confirmReject}
        onCancel={() => setRejectModal(null)}
        okText="Xác nhận từ chối"
        okButtonProps={{ danger: true }}
      >
        <TextArea
          rows={3}
          placeholder="Nhập lý do từ chối..."
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
        />
      </Modal>

      {/* View-detail Drawer cho đơn nghỉ phép */}
      <Drawer
        open={!!viewLeave}
        onClose={() => setViewLeave(null)}
        width={520}
        title={<span style={{ color: textPrimary, fontWeight: 600 }}>Chi tiết đơn nghỉ phép</span>}
        styles={{ body: { background: bgContainer }, header: { background: bgContainer } }}
      >
        {viewLeave && (
          <>
            <Descriptions column={1} bordered size="small" labelStyle={{ color: textSecondary }} contentStyle={{ color: textPrimary }}>
              <Descriptions.Item label="Nhân viên">{viewLeave.employee?.fullName ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Loại nghỉ">{viewLeave.leaveType?.name ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Từ ngày">{dayjs(viewLeave.startDate).format('DD/MM/YYYY')}</Descriptions.Item>
              <Descriptions.Item label="Đến ngày">{dayjs(viewLeave.endDate).format('DD/MM/YYYY')}</Descriptions.Item>
              <Descriptions.Item label="Số ngày">{viewLeave.days}</Descriptions.Item>
              {viewLeave.reason && <Descriptions.Item label="Lý do">{viewLeave.reason}</Descriptions.Item>}
              <Descriptions.Item label="Trạng thái">
                <Tag color={viewLeave.status === 'APPROVED' ? 'success' : viewLeave.status === 'REJECTED' ? 'error' : 'warning'}>
                  {viewLeave.status === 'APPROVED' ? 'Đã duyệt' : viewLeave.status === 'REJECTED' ? 'Từ chối' : 'Chờ duyệt'}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
            <Divider style={{ margin: '16px 0 8px' }}>Thảo luận</Divider>
            <CommentThread entityType="leave" entityId={viewLeave.id} />
          </>
        )}
      </Drawer>

      {/* Modal cấu hình workflow cho LeaveType */}
      <LeaveTypeConfigModal
        leaveType={configLeaveType}
        open={!!configLeaveType}
        onClose={() => setConfigLeaveType(null)}
      />
    </div>
  );
}
