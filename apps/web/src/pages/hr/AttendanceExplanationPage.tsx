import { useState } from 'react';
import {
  Row, Col, Table, Tag, Button, Input, Select, Form,
  DatePicker, Space, Typography, message,
} from 'antd';
import {
  FormOutlined, PlusOutlined, CheckOutlined, CloseOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';

import { useThemePalette } from '../../hooks/useThemePalette';
import { usePagination } from '../../hooks/usePagination';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { FilterBar } from '../../components/FilterBar';
import { CenteredModal } from '../../components/ui/CenteredModal';
import { StatusBadge, type StatusTone } from '../../components/ui/StatusBadge';
import { OrgUnitSelect } from '../../components/selects';
import {
  attendanceExplanationApi,
  type AttendanceExplanation,
  type ExplanationType,
  type ExplanationStatus,
} from '../../api/hr-attendance';
import { employeesApi } from '../../api/employees';
import { EmployeeInfoCell } from '../../components/ui/EmployeeInfoCell';

const { Text } = Typography;
const { Option } = Select;

const EXPLANATION_TYPE_MAP: Record<ExplanationType, { label: string }> = {
  MISSING_CHECKIN:  { label: 'Thiếu giờ vào' },
  MISSING_CHECKOUT: { label: 'Thiếu giờ ra' },
  LATE_ARRIVAL:     { label: 'Đến muộn' },
  EARLY_DEPARTURE:  { label: 'Về sớm' },
  BUSINESS_TRIP:    { label: 'Công tác' },
  ONSITE:           { label: 'Làm việc tại chỗ' },
  WFH:              { label: 'Làm việc từ xa' },
};

function ExplanationStatusTag({ status }: { status: ExplanationStatus }) {
  const map: Record<ExplanationStatus, { label: string; tone: StatusTone }> = {
    PENDING:  { label: 'Chờ duyệt', tone: 'warning' },
    APPROVED: { label: 'Đã duyệt',  tone: 'success' },
    REJECTED: { label: 'Từ chối',   tone: 'error' },
  };
  const m = map[status];
  return <StatusBadge label={m.label} tone={m.tone} />;
}

function TypeTag({ type, isDark }: { type: ExplanationType; isDark: boolean }) {
  const label = EXPLANATION_TYPE_MAP[type]?.label ?? type;
  return (
    <Tag
      style={isDark ? { background: 'rgba(96,165,250,0.15)', color: '#93C5FD', borderColor: 'rgba(96,165,250,0.3)' } : {}}
      color={isDark ? undefined : 'blue'}
    >
      {label}
    </Tag>
  );
}

export default function AttendanceExplanationPage() {
  const { textPrimary, textMuted, bgContainer, borderColor, isDark } = useThemePalette();
  const { page, pageSize, resetPage, paginationProps } = usePagination(20);
  const qc = useQueryClient();
  const [form] = Form.useForm();

  const [filterStatus, setFilterStatus] = useState<string | undefined>();
  const [filterEmployeeId, setFilterEmployeeId] = useState<string | undefined>();
  const [filterOrgUnitId, setFilterOrgUnitId] = useState<string | undefined>();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [rejectModal, setRejectModal] = useState<{ open: boolean; id: string }>({ open: false, id: '' });
  const [rejectReason, setRejectReason] = useState('');

  const { data: employees = [] } = useQuery({
    queryKey: ['employees-all'],
    queryFn: () => employeesApi.list({ limit: 500 }),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['attendance-explanations', filterStatus, filterEmployeeId, filterOrgUnitId, page],
    queryFn: () =>
      attendanceExplanationApi.list({
        status: filterStatus as ExplanationStatus | undefined,
        employeeId: filterEmployeeId,
        orgUnitId: filterOrgUnitId,
        page,
        limit: pageSize,
      }),
  });

  const list: AttendanceExplanation[] = data?.data ?? [];
  const total = data?.total ?? 0;

  const pending  = list.filter(e => e.status === 'PENDING').length;
  const approved = list.filter(e => e.status === 'APPROVED').length;
  const rejected = list.filter(e => e.status === 'REJECTED').length;

  const createMut = useMutation({
    mutationFn: (vals: any) =>
      attendanceExplanationApi.create({
        employeeId: vals.employeeId,
        date: vals.date ? dayjs(vals.date).format('YYYY-MM-DD') : '',
        type: vals.type,
        reason: vals.reason,
        requestedCheckIn: vals.requestedCheckIn
          ? dayjs(vals.requestedCheckIn).toISOString()
          : undefined,
        requestedCheckOut: vals.requestedCheckOut
          ? dayjs(vals.requestedCheckOut).toISOString()
          : undefined,
      }),
    onSuccess: () => {
      message.success('Đã tạo giải trình');
      qc.invalidateQueries({ queryKey: ['attendance-explanations'] });
      setModalOpen(false);
      form.resetFields();
    },
    onError: () => message.error('Lỗi khi tạo giải trình'),
  });

  const approveMut = useMutation({
    mutationFn: (id: string) => attendanceExplanationApi.approve(id),
    onSuccess: () => {
      message.success('Đã duyệt giải trình');
      qc.invalidateQueries({ queryKey: ['attendance-explanations'] });
    },
    onError: () => message.error('Lỗi khi duyệt'),
  });

  const rejectMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      attendanceExplanationApi.reject(id, reason),
    onSuccess: () => {
      message.success('Đã từ chối giải trình');
      qc.invalidateQueries({ queryKey: ['attendance-explanations'] });
      setRejectModal({ open: false, id: '' });
      setRejectReason('');
    },
    onError: () => message.error('Lỗi khi từ chối'),
  });

  const displayList = search
    ? list.filter(e =>
        e.employee?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
        EXPLANATION_TYPE_MAP[e.type]?.label.toLowerCase().includes(search.toLowerCase()),
      )
    : list;

  const columns: ColumnsType<AttendanceExplanation> = [
    {
      title: 'Nhân viên',
      dataIndex: 'employee',
      width: 220,
      render: (emp) =>
        emp ? (
          <EmployeeInfoCell employee={emp} />
        ) : (
          <Text style={{ color: textMuted }}>—</Text>
        ),
    },
    {
      title: 'Ngày',
      dataIndex: 'date',
      width: 110,
      render: (v: string) => (
        <Text style={{ color: textMuted }}>{dayjs(v).format('DD/MM/YYYY')}</Text>
      ),
    },
    {
      title: 'Loại giải trình',
      dataIndex: 'type',
      width: 160,
      render: (v: ExplanationType) => <TypeTag type={v} isDark={isDark} />,
    },
    {
      title: 'Lý do',
      dataIndex: 'reason',
      ellipsis: true,
      render: (v: string) => <Text style={{ color: textPrimary }}>{v}</Text>,
    },
    {
      title: 'Giờ yêu cầu',
      width: 180,
      render: (_: any, rec: AttendanceExplanation) => {
        const ci = rec.requestedCheckIn ? dayjs(rec.requestedCheckIn).format('HH:mm') : null;
        const co = rec.requestedCheckOut ? dayjs(rec.requestedCheckOut).format('HH:mm') : null;
        if (!ci && !co) return <Text style={{ color: textMuted }}>—</Text>;
        return (
          <Text style={{ color: textMuted }}>
            {ci ? `Vào: ${ci}` : ''}{ci && co ? ' / ' : ''}{co ? `Ra: ${co}` : ''}
          </Text>
        );
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 120,
      render: (v: ExplanationStatus) => <ExplanationStatusTag status={v} />,
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      width: 120,
      render: (v: string) => (
        <Text style={{ color: textMuted }}>{dayjs(v).format('DD/MM/YYYY')}</Text>
      ),
    },
    {
      title: 'Thao tác',
      width: 140,
      render: (_: any, rec: AttendanceExplanation) => {
        if (rec.status !== 'PENDING') return null;
        return (
          <Space size={4}>
            <Button
              type="primary"
              size="small"
              icon={<CheckOutlined />}
              onClick={() => approveMut.mutate(rec.id)}
              loading={approveMut.isPending}
            >
              Duyệt
            </Button>
            <Button
              danger
              size="small"
              icon={<CloseOutlined />}
              onClick={() => {
                setRejectModal({ open: true, id: rec.id });
                setRejectReason('');
              }}
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
        title="Giải trình Chấm công"
        icon={<FormOutlined />}
        iconColor="#3B82F6"
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            Tạo giải trình
          </Button>
        }
      />

      {/* Stat cards */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}>
          <StatCard label="Tổng giải trình" value={total} color="#6366F1" icon={<FormOutlined />} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard label="Chờ duyệt" value={pending} color="#F59E0B" icon={<FormOutlined />} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard label="Đã duyệt" value={approved} color="#10B981" icon={<CheckOutlined />} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard label="Từ chối" value={rejected} color="#EF4444" icon={<CloseOutlined />} />
        </Col>
      </Row>

      {/* Filter */}
      <FilterBar>
        <Input
          prefix={<SearchOutlined />}
          placeholder="Tìm theo nhân viên, loại giải trình..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 260 }}
          allowClear
        />
        <Select
          placeholder="Nhân viên"
          allowClear
          showSearch
          optionFilterProp="children"
          style={{ width: 200 }}
          value={filterEmployeeId}
          onChange={v => { setFilterEmployeeId(v); resetPage(); }}
        >
          {employees.map((e: any) => (
            <Option key={e.id} value={e.id}>{e.fullName}</Option>
          ))}
        </Select>
        <Select
          placeholder="Trạng thái"
          allowClear
          style={{ width: 140 }}
          value={filterStatus}
          onChange={v => { setFilterStatus(v); resetPage(); }}
        >
          <Option value="PENDING">Chờ duyệt</Option>
          <Option value="APPROVED">Đã duyệt</Option>
          <Option value="REJECTED">Từ chối</Option>
        </Select>
        <OrgUnitSelect
          placeholder="Phòng ban"
          style={{ minWidth: 180 }}
          value={filterOrgUnitId}
          onChange={(v) => { setFilterOrgUnitId(v); resetPage(); }}
          allowClear
        />
      </FilterBar>

      {/* Table */}
      <div style={{ background: bgContainer, borderRadius: 8, border: `1px solid ${borderColor}`, overflow: 'hidden' }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={displayList}
          loading={isLoading}
          pagination={paginationProps(total, 'giải trình')}
          size="small"
        />
      </div>

      {/* Modal tạo giải trình */}
      <CenteredModal
        title="Tạo giải trình chấm công"
        open={modalOpen}
        onClose={() => { setModalOpen(false); form.resetFields(); }}
        width={540}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => { setModalOpen(false); form.resetFields(); }}>Hủy</Button>
            <Button type="primary" loading={createMut.isPending} onClick={() => form.submit()}>Tạo giải trình</Button>
          </div>
        }
      >
        <Form form={form} layout="vertical" onFinish={vals => createMut.mutate(vals)}>
          <Form.Item name="employeeId" label="Nhân viên" rules={[{ required: true, message: 'Chọn nhân viên' }]}>
            <Select
              showSearch
              optionFilterProp="children"
              placeholder="Chọn nhân viên"
            >
              {employees.map((e: any) => (
                <Option key={e.id} value={e.id}>{e.fullName}</Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="date" label="Ngày" rules={[{ required: true, message: 'Chọn ngày' }]}>
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="type" label="Loại giải trình" rules={[{ required: true, message: 'Chọn loại' }]}>
                <Select placeholder="Chọn loại">
                  {Object.entries(EXPLANATION_TYPE_MAP).map(([val, { label }]) => (
                    <Option key={val} value={val}>{label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="reason" label="Lý do" rules={[{ required: true, message: 'Nhập lý do' }]}>
            <Input.TextArea rows={3} placeholder="Mô tả lý do giải trình..." maxLength={1000} showCount />
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="requestedCheckIn" label="Giờ vào yêu cầu (nếu có)">
                <DatePicker showTime style={{ width: '100%' }} format="HH:mm DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="requestedCheckOut" label="Giờ ra yêu cầu (nếu có)">
                <DatePicker showTime style={{ width: '100%' }} format="HH:mm DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </CenteredModal>

      {/* Modal từ chối */}
      <CenteredModal
        title="Từ chối giải trình"
        open={rejectModal.open}
        onClose={() => setRejectModal({ open: false, id: '' })}
        width={440}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setRejectModal({ open: false, id: '' })}>Hủy</Button>
            <Button danger type="primary" loading={rejectMut.isPending} onClick={() => rejectMut.mutate({ id: rejectModal.id, reason: rejectReason || undefined })}>Từ chối</Button>
          </div>
        }
      >
        <div style={{ marginBottom: 8 }}>
          <Text style={{ color: textMuted }}>Lý do từ chối (tùy chọn):</Text>
        </div>
        <Input.TextArea
          rows={3}
          value={rejectReason}
          onChange={e => setRejectReason(e.target.value)}
          placeholder="Nhập lý do từ chối..."
          maxLength={500}
        />
      </CenteredModal>
    </div>
  );
}
