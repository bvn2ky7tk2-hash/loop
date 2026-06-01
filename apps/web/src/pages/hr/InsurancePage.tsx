import { useState } from 'react';
import {
  Row,
  Col,
  Tabs,
  Table,
  Tag,
  Button,
  Input,
  Select,
  DatePicker,
  Form,
  InputNumber,
  Space,
  Typography,
  message,
} from 'antd';
import {
  SafetyOutlined,
  PlusOutlined,
  SearchOutlined,
  TeamOutlined,
  BookOutlined,
  FileTextOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs, { Dayjs } from 'dayjs';
import type { ColumnsType } from 'antd/es/table';

import { apiClient } from '../../api/client';
import { useThemePalette } from '../../hooks/useThemePalette';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { FilterBar } from '../../components/FilterBar';
import { CenteredModal } from '../../components/ui/CenteredModal';
import { hrInsuranceApi } from '../../api/hr-insurance';
import { OrgUnitSelect } from '../../components/selects';
import type {
  InsuranceEnrollment,
  InsuranceEnrollmentStatus,
  InsuranceEventType,
  SocialInsuranceBook,
} from '../../api/hr-insurance';
import { employeesApi } from '../../api/employees';
import { formatCurrency } from '../../utils/format';
import { downloadExport } from '../../utils/exportApi';
import { EmployeeInfoCell } from '../../components/ui/EmployeeInfoCell';

const { Text } = Typography;

// ─── Helpers ────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<InsuranceEnrollmentStatus, string> = {
  ACTIVE: 'green',
  TERMINATED: 'default',
  SUSPENDED: 'warning',
};

const STATUS_LABEL: Record<InsuranceEnrollmentStatus, string> = {
  ACTIVE: 'Đang đóng',
  TERMINATED: 'Đã nghỉ',
  SUSPENDED: 'Tạm dừng',
};

const EVENT_LABEL: Record<InsuranceEventType, string> = {
  ENROLL: 'Tăng lao động',
  TERMINATE: 'Giảm lao động',
  SALARY_CHANGE: 'Điều chỉnh mức đóng',
  SUSPEND: 'Tạm dừng',
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function InsurancePage() {
  const qc = useQueryClient();
  const { textPrimary, textMuted, isDark } = useThemePalette();

  // Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [orgUnitFilter, setOrgUnitFilter] = useState<string | undefined>();

  // Modal state
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [editEnrollOpen, setEditEnrollOpen] = useState(false);
  const [editEnrollRecord, setEditEnrollRecord] = useState<InsuranceEnrollment | null>(null);
  const [bookOpen, setBookOpen] = useState(false);
  const [bookEnrollment, setBookEnrollment] = useState<InsuranceEnrollment | null>(null);
  const [eventOpen, setEventOpen] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState<InsuranceEnrollment | null>(null);

  // D02 state
  const [d02Month, setD02Month] = useState<Dayjs | null>(null);
  const [d02Preview, setD02Preview] = useState<Awaited<ReturnType<typeof hrInsuranceApi.exportD02>> | null>(null);
  const [d02Loading, setD02Loading] = useState(false);

  const [enrollForm] = Form.useForm();
  const [editEnrollForm] = Form.useForm();
  const [bookForm] = Form.useForm();
  const [eventForm] = Form.useForm();

  // ─── Queries ──────────────────────────────────────────────────────────────

  const { data: dashboard } = useQuery({
    queryKey: ['hr-insurance-dashboard'],
    queryFn: hrInsuranceApi.getDashboard,
  });

  const { data: enrollmentsResp, isLoading } = useQuery({
    queryKey: ['hr-insurance-enrollments', search, statusFilter, orgUnitFilter],
    queryFn: () =>
      hrInsuranceApi.listEnrollments({ search: search || undefined, status: statusFilter, orgUnitId: orgUnitFilter }),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees-list'],
    queryFn: employeesApi.list,
  });

  const enrollments: InsuranceEnrollment[] = Array.isArray(enrollmentsResp)
    ? enrollmentsResp
    : (enrollmentsResp as { data?: InsuranceEnrollment[] })?.data ?? [];

  // Sổ chưa trả
  const bookNotReceived = enrollments.filter(
    (e) => e.socialInsuranceBook && !e.socialInsuranceBook.receivedByEmployee,
  );

  // ─── Mutations ────────────────────────────────────────────────────────────

  const enrollMutation = useMutation({
    mutationFn: hrInsuranceApi.enroll,
    onSuccess: () => {
      message.success('Đăng ký BHXH thành công');
      setEnrollOpen(false);
      enrollForm.resetFields();
      qc.invalidateQueries({ queryKey: ['hr-insurance-enrollments'] });
      qc.invalidateQueries({ queryKey: ['hr-insurance-dashboard'] });
    },
    onError: () => message.error('Đăng ký thất bại, vui lòng thử lại'),
  });

  const eventMutation = useMutation({
    mutationFn: hrInsuranceApi.createEvent,
    onSuccess: () => {
      message.success('Tạo sự kiện thành công');
      setEventOpen(false);
      eventForm.resetFields();
      setSelectedEnrollment(null);
      qc.invalidateQueries({ queryKey: ['hr-insurance-enrollments'] });
      qc.invalidateQueries({ queryKey: ['hr-insurance-dashboard'] });
    },
    onError: () => message.error('Tạo sự kiện thất bại, vui lòng thử lại'),
  });

  const bookReceivedMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { receivedByEmployee: boolean; receivedDate: string } }) =>
      hrInsuranceApi.updateBook(id, data),
    onSuccess: () => {
      message.success('Cập nhật sổ thành công');
      qc.invalidateQueries({ queryKey: ['hr-insurance-enrollments'] });
      qc.invalidateQueries({ queryKey: ['hr-insurance-dashboard'] });
    },
  });

  const editEnrollMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { insuranceSalary?: number; status?: InsuranceEnrollmentStatus; endDate?: string } }) =>
      apiClient.patch(`/hr-insurance/enrollments/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      message.success('Cập nhật thành công');
      setEditEnrollOpen(false);
      editEnrollForm.resetFields();
      qc.invalidateQueries({ queryKey: ['hr-insurance-enrollments'] });
      qc.invalidateQueries({ queryKey: ['hr-insurance-dashboard'] });
    },
    onError: () => message.error('Cập nhật thất bại'),
  });

  const upsertBookMutation = useMutation({
    mutationFn: (data: { employeeId: string; bookNumber: string; issueDate?: string; issueAuthority?: string }) =>
      hrInsuranceApi.upsertBook(data),
    onSuccess: () => {
      message.success('Lưu thông tin sổ BHXH thành công');
      setBookOpen(false);
      bookForm.resetFields();
      setBookEnrollment(null);
      qc.invalidateQueries({ queryKey: ['hr-insurance-enrollments'] });
    },
    onError: () => message.error('Lưu thất bại'),
  });

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleEnrollSubmit = () => {
    enrollForm.validateFields().then((vals) => {
      enrollMutation.mutate({
        ...vals,
        startDate: (vals.startDate as Dayjs).format('YYYY-MM-DD'),
      });
    });
  };

  const handleEventSubmit = () => {
    if (!selectedEnrollment) return;
    eventForm.validateFields().then((vals) => {
      eventMutation.mutate({
        enrollmentId: selectedEnrollment.id,
        ...vals,
        effectiveDate: (vals.effectiveDate as Dayjs).format('YYYY-MM-DD'),
      });
    });
  };

  const handleD02Preview = async () => {
    if (!d02Month) {
      message.warning('Vui lòng chọn tháng/năm');
      return;
    }
    setD02Loading(true);
    try {
      const result = await hrInsuranceApi.exportD02(d02Month.year(), d02Month.month() + 1);
      setD02Preview(result);
    } catch {
      message.error('Không thể tải dữ liệu D02');
    } finally {
      setD02Loading(false);
    }
  };

  const handleD02Export = async () => {
    if (!d02Month) {
      message.warning('Vui lòng chọn tháng/năm');
      return;
    }
    try {
      await downloadExport(
        `/hr-insurance/export/d02?year=${d02Month.year()}&month=${d02Month.month() + 1}&format=excel`,
        `D02-LT_${d02Month.format('MM-YYYY')}.xlsx`,
      );
    } catch {
      message.error('Xuất Excel thất bại');
    }
  };

  // ─── Table columns ────────────────────────────────────────────────────────

  const enrollColumns: ColumnsType<InsuranceEnrollment> = [
    {
      title: 'Nhân viên',
      key: 'employee',
      render: (_: unknown, r: InsuranceEnrollment) =>
        r.employee ? (
          <EmployeeInfoCell employee={r.employee} />
        ) : (
          <Text style={{ color: textMuted }}>—</Text>
        ),
    },
    {
      title: 'Mức đóng BHXH',
      dataIndex: 'insuranceSalary',
      width: 160,
      render: (v: number) => (
        <Text style={{ color: textPrimary }}>{formatCurrency(v)}</Text>
      ),
    },
    {
      title: 'Ngày bắt đầu',
      dataIndex: 'startDate',
      width: 130,
      render: (v: string) => (
        <Text style={{ color: textMuted }}>{dayjs(v).format('DD/MM/YYYY')}</Text>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 120,
      render: (v: InsuranceEnrollmentStatus) => (
        <Tag
          color={isDark ? undefined : STATUS_COLOR[v]}
          style={
            isDark
              ? v === 'ACTIVE'
                ? { background: 'rgba(52,211,153,0.15)', color: '#6EE7B7', borderColor: 'rgba(52,211,153,0.3)' }
                : v === 'SUSPENDED'
                ? { background: 'rgba(251,191,36,0.15)', color: '#FCD34D', borderColor: 'rgba(251,191,36,0.3)' }
                : {}
              : {}
          }
        >
          {STATUS_LABEL[v]}
        </Tag>
      ),
    },
    {
      title: 'Số sổ BHXH',
      dataIndex: 'bhxhBookNumber',
      width: 140,
      render: (v?: string) =>
        v ? (
          <Text style={{ color: textPrimary }}>{v}</Text>
        ) : (
          <Text style={{ color: textMuted }}>Chưa có</Text>
        ),
    },
    {
      title: 'Hành động',
      width: 220,
      render: (_: unknown, record: InsuranceEnrollment) => (
        <Space size={4}>
          <Button
            size="small"
            onClick={() => {
              setEditEnrollRecord(record);
              editEnrollForm.setFieldsValue({ insuranceSalary: record.insuranceSalary, status: record.status });
              setEditEnrollOpen(true);
            }}
          >
            Sửa
          </Button>
          <Button
            size="small"
            icon={<BookOutlined />}
            onClick={() => {
              setBookEnrollment(record);
              bookForm.setFieldsValue({
                bookNumber: record.socialInsuranceBook?.bookNumber ?? '',
                issueAuthority: record.socialInsuranceBook?.issueAuthority ?? '',
              });
              setBookOpen(true);
            }}
          >
            Sổ BH
          </Button>
          <Button
            size="small"
            icon={<ThunderboltOutlined />}
            onClick={() => {
              setSelectedEnrollment(record);
              setEventOpen(true);
            }}
          >
            Sự kiện
          </Button>
        </Space>
      ),
    },
  ];

  const bookColumns: ColumnsType<InsuranceEnrollment> = [
    {
      title: 'Mã NV',
      dataIndex: ['employee', 'code'],
      width: 100,
      render: (v?: string) =>
        v ? <Text style={{ color: textPrimary }}>{v}</Text> : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      title: 'Họ và tên',
      dataIndex: ['employee', 'fullName'],
      render: (v?: string) =>
        v ? <Text style={{ color: textPrimary }}>{v}</Text> : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      title: 'Số sổ BHXH',
      dataIndex: ['socialInsuranceBook', 'bookNumber'],
      render: (v?: string) =>
        v ? <Text style={{ color: textPrimary }}>{v}</Text> : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      title: 'Ngày cấp',
      dataIndex: ['socialInsuranceBook', 'issueDate'],
      width: 130,
      render: (v?: string) =>
        v ? (
          <Text style={{ color: textMuted }}>{dayjs(v).format('DD/MM/YYYY')}</Text>
        ) : (
          <Text style={{ color: textMuted }}>—</Text>
        ),
    },
    {
      title: 'Nơi cấp',
      dataIndex: ['socialInsuranceBook', 'issueAuthority'],
      render: (v?: string) =>
        v ? <Text style={{ color: textPrimary }}>{v}</Text> : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      title: 'Hành động',
      width: 160,
      render: (_: unknown, record: InsuranceEnrollment) => {
        const book = record.socialInsuranceBook as SocialInsuranceBook | undefined;
        if (!book) return null;
        return (
          <Button
            size="small"
            type="primary"
            onClick={() =>
              bookReceivedMutation.mutate({
                id: book.id,
                data: {
                  receivedByEmployee: true,
                  receivedDate: dayjs().format('YYYY-MM-DD'),
                },
              })
            }
            loading={bookReceivedMutation.isPending}
            disabled={bookReceivedMutation.isPending}
          >
            Xác nhận đã trả
          </Button>
        );
      },
    },
  ];

  // ─── D02 preview tables ──────────────────────────────────────────────────

  const d02EnrolledCols = [
    {
      title: 'Mã NV',
      dataIndex: 'employeeCode',
      render: (v: string) => <Text style={{ color: textPrimary }}>{v}</Text>,
    },
    {
      title: 'Họ và tên',
      dataIndex: 'fullName',
      render: (v: string) => <Text style={{ color: textPrimary }}>{v}</Text>,
    },
    {
      title: 'Mức đóng',
      dataIndex: 'insuranceSalary',
      render: (v: number) => <Text style={{ color: textPrimary }}>{formatCurrency(v)}</Text>,
    },
    {
      title: 'Ngày hiệu lực',
      dataIndex: 'effectiveDate',
      render: (v: string) => <Text style={{ color: textMuted }}>{dayjs(v).format('DD/MM/YYYY')}</Text>,
    },
  ];

  const d02SalaryChangedCols = [
    {
      title: 'Mã NV',
      dataIndex: 'employeeCode',
      render: (v: string) => <Text style={{ color: textPrimary }}>{v}</Text>,
    },
    {
      title: 'Họ và tên',
      dataIndex: 'fullName',
      render: (v: string) => <Text style={{ color: textPrimary }}>{v}</Text>,
    },
    {
      title: 'Mức cũ',
      dataIndex: 'oldSalary',
      render: (v: number) => <Text style={{ color: textMuted }}>{formatCurrency(v)}</Text>,
    },
    {
      title: 'Mức mới',
      dataIndex: 'newSalary',
      render: (v: number) => <Text style={{ color: textPrimary }}>{formatCurrency(v)}</Text>,
    },
    {
      title: 'Ngày hiệu lực',
      dataIndex: 'effectiveDate',
      render: (v: string) => <Text style={{ color: textMuted }}>{dayjs(v).format('DD/MM/YYYY')}</Text>,
    },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Bảo hiểm xã hội"
        icon={<SafetyOutlined />}
        iconColor="#8B5CF6"
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setEnrollOpen(true)}>
            Đăng ký BHXH
          </Button>
        }
      />

      {/* Stat Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <StatCard
            label="Đang đóng BHXH"
            value={dashboard?.totalActive ?? 0}
            color="#10B981"
            icon={<TeamOutlined />}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            label="Tháng này tăng"
            value={dashboard?.thisMonth.enrolled ?? 0}
            color="#3B82F6"
            icon={<PlusOutlined />}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            label="Tháng này giảm"
            value={dashboard?.thisMonth.terminated ?? 0}
            color="#EF4444"
            icon={<SafetyOutlined />}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            label="Chưa có sổ BHXH"
            value={dashboard?.missingBook ?? 0}
            color="#F59E0B"
            icon={<BookOutlined />}
          />
        </Col>
      </Row>

      {/* Tabs */}
      <Tabs
        defaultActiveKey="enrollments"
        items={[
          {
            key: 'enrollments',
            label: (
              <span>
                <TeamOutlined /> Danh sách tham gia
              </span>
            ),
            children: (
              <>
                <FilterBar>
                  <Input
                    prefix={<SearchOutlined />}
                    placeholder="Tìm mã NV hoặc tên..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ width: 240 }}
                    allowClear
                  />
                  <Select
                    placeholder="Trạng thái"
                    value={statusFilter}
                    onChange={setStatusFilter}
                    allowClear
                    style={{ width: 160 }}
                    options={[
                      { value: 'ACTIVE', label: 'Đang đóng' },
                      { value: 'TERMINATED', label: 'Đã nghỉ' },
                      { value: 'SUSPENDED', label: 'Tạm dừng' },
                    ]}
                  />
                  <OrgUnitSelect
                    placeholder="Phòng ban"
                    style={{ minWidth: 180 }}
                    value={orgUnitFilter}
                    onChange={setOrgUnitFilter}
                    allowClear
                  />
                </FilterBar>
                <Table
                  rowKey="id"
                  columns={enrollColumns}
                  dataSource={enrollments}
                  loading={isLoading}
                  pagination={{ pageSize: 20, showTotal: (t) => `Tổng ${t} bản ghi` }}
                  size="middle"
                  scroll={{ x: 900 }}
                />
              </>
            ),
          },
          {
            key: 'books',
            label: (
              <span>
                <BookOutlined /> Sổ BHXH chưa trả
              </span>
            ),
            children: (
              <Table
                rowKey="id"
                columns={bookColumns}
                dataSource={bookNotReceived}
                loading={isLoading}
                pagination={{ pageSize: 20, showTotal: (t) => `Tổng ${t} bản ghi` }}
                size="middle"
                scroll={{ x: 800 }}
              />
            ),
          },
          {
            key: 'd02',
            label: (
              <span>
                <FileTextOutlined /> Xuất D02-LT
              </span>
            ),
            children: (
              <div>
                <Space style={{ marginBottom: 16 }}>
                  <DatePicker.MonthPicker
                    placeholder="Chọn tháng/năm"
                    value={d02Month}
                    onChange={(val) => {
                      setD02Month(val);
                      setD02Preview(null);
                    }}
                    format="MM/YYYY"
                    style={{ width: 160 }}
                  />
                  <Button onClick={handleD02Preview} loading={d02Loading}>
                    Xem trước
                  </Button>
                  <Button type="primary" icon={<FileTextOutlined />} onClick={handleD02Export} disabled={!d02Month}>
                    Xuất Excel
                  </Button>
                </Space>

                {d02Preview && (
                  <div>
                    <Text strong style={{ color: textPrimary, display: 'block', marginBottom: 8, fontSize: 15 }}>
                      Tăng lao động ({d02Preview.enrolled.length} người)
                    </Text>
                    <Table
                      rowKey="employeeCode"
                      columns={d02EnrolledCols}
                      dataSource={d02Preview.enrolled}
                      pagination={false}
                      size="small"
                      style={{ marginBottom: 24 }}
                    />

                    <Text strong style={{ color: textPrimary, display: 'block', marginBottom: 8, fontSize: 15 }}>
                      Giảm lao động ({d02Preview.terminated.length} người)
                    </Text>
                    <Table
                      rowKey="employeeCode"
                      columns={d02EnrolledCols}
                      dataSource={d02Preview.terminated}
                      pagination={false}
                      size="small"
                      style={{ marginBottom: 24 }}
                    />

                    <Text strong style={{ color: textPrimary, display: 'block', marginBottom: 8, fontSize: 15 }}>
                      Điều chỉnh mức đóng ({d02Preview.salaryChanged.length} người)
                    </Text>
                    <Table
                      rowKey="employeeCode"
                      columns={d02SalaryChangedCols}
                      dataSource={d02Preview.salaryChanged}
                      pagination={false}
                      size="small"
                    />
                  </div>
                )}
              </div>
            ),
          },
        ]}
      />

      {/* Modal đăng ký BHXH mới */}
      <CenteredModal
        open={enrollOpen}
        onClose={() => {
          setEnrollOpen(false);
          enrollForm.resetFields();
        }}
        title="Đăng ký BHXH mới"
        width={520}
        footer={
          <Space>
            <Button onClick={() => { setEnrollOpen(false); enrollForm.resetFields(); }}>Hủy</Button>
            <Button type="primary" onClick={handleEnrollSubmit} loading={enrollMutation.isPending} disabled={enrollMutation.isPending}>
              Đăng ký
            </Button>
          </Space>
        }
      >
        <Form form={enrollForm} layout="vertical">
          <Form.Item
            name="employeeId"
            label="Nhân viên"
            rules={[{ required: true, message: 'Vui lòng chọn nhân viên' }]}
          >
            <Select
              showSearch
              placeholder="Tìm theo tên hoặc mã NV..."
              optionFilterProp="label"
              options={employees.map((e) => ({
                value: e.id,
                label: `${e.code} — ${e.fullName}`,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="insuranceSalary"
            label="Mức đóng BHXH (VNĐ)"
            rules={[{ required: true, message: 'Vui lòng nhập mức đóng' }]}
          >
            <InputNumber
              min={0}
              style={{ width: '100%' }}
              formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
              parser={(v): number => Number(v?.replace(/\./g, '') ?? 0)}
              placeholder="Ví dụ: 5.000.000"
            />
          </Form.Item>
          <Form.Item
            name="startDate"
            label="Ngày bắt đầu"
            rules={[{ required: true, message: 'Vui lòng chọn ngày bắt đầu' }]}
          >
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="bhxhBookNumber" label="Số sổ BHXH (nếu có)">
            <Input placeholder="VD: 0100100001234" />
          </Form.Item>
        </Form>
      </CenteredModal>

      {/* Modal tạo InsuranceEvent */}
      <CenteredModal
        open={eventOpen}
        onClose={() => {
          setEventOpen(false);
          eventForm.resetFields();
          setSelectedEnrollment(null);
        }}
        title={
          selectedEnrollment
            ? `Tạo sự kiện — ${selectedEnrollment.employee?.fullName ?? ''}`
            : 'Tạo sự kiện BHXH'
        }
        width={520}
        footer={
          <Space>
            <Button
              onClick={() => {
                setEventOpen(false);
                eventForm.resetFields();
                setSelectedEnrollment(null);
              }}
            >
              Hủy
            </Button>
            <Button type="primary" onClick={handleEventSubmit} loading={eventMutation.isPending} disabled={eventMutation.isPending}>
              Tạo sự kiện
            </Button>
          </Space>
        }
      >
        <Form form={eventForm} layout="vertical">
          <Form.Item
            name="eventType"
            label="Loại sự kiện"
            rules={[{ required: true, message: 'Vui lòng chọn loại sự kiện' }]}
          >
            <Select
              placeholder="Chọn loại sự kiện"
              options={[
                { value: 'SALARY_CHANGE', label: EVENT_LABEL.SALARY_CHANGE },
                { value: 'TERMINATE', label: EVENT_LABEL.TERMINATE },
                { value: 'SUSPEND', label: EVENT_LABEL.SUSPEND },
              ]}
            />
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prev, cur) => prev.eventType !== cur.eventType}
          >
            {({ getFieldValue }) =>
              getFieldValue('eventType') === 'SALARY_CHANGE' ? (
                <Form.Item
                  name="insuranceSalary"
                  label="Mức đóng mới (VNĐ)"
                  rules={[{ required: true, message: 'Vui lòng nhập mức đóng mới' }]}
                >
                  <InputNumber
                    min={0}
                    style={{ width: '100%' }}
                    formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                    parser={(v) => Number(v?.replace(/\./g, '') ?? 0)}
                  />
                </Form.Item>
              ) : null
            }
          </Form.Item>
          <Form.Item
            name="effectiveDate"
            label="Ngày hiệu lực"
            rules={[{ required: true, message: 'Vui lòng chọn ngày hiệu lực' }]}
          >
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="reason" label="Lý do">
            <Input.TextArea rows={3} placeholder="Nhập lý do (không bắt buộc)..." />
          </Form.Item>
        </Form>
      </CenteredModal>

      {/* Modal: Sửa đăng ký BHXH */}
      <CenteredModal
        open={editEnrollOpen}
        onClose={() => { setEditEnrollOpen(false); editEnrollForm.resetFields(); setEditEnrollRecord(null); }}
        title={`Cập nhật BHXH — ${editEnrollRecord?.employee?.fullName ?? ''}`}
        width={440}
        footer={
          <Space>
            <Button onClick={() => { setEditEnrollOpen(false); editEnrollForm.resetFields(); }}>Hủy</Button>
            <Button
              type="primary"
              loading={editEnrollMutation.isPending}
              disabled={editEnrollMutation.isPending}
              onClick={() => {
                editEnrollForm.validateFields().then((vals) => {
                  if (!editEnrollRecord) return;
                  editEnrollMutation.mutate({ id: editEnrollRecord.id, data: vals });
                });
              }}
            >
              Lưu
            </Button>
          </Space>
        }
      >
        <Form form={editEnrollForm} layout="vertical">
          <Form.Item name="insuranceSalary" label="Mức đóng BHXH (VNĐ)" rules={[{ required: true }]}>
            <InputNumber
              min={0}
              style={{ width: '100%' }}
              formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
              parser={(v): number => Number(v?.replace(/\./g, '') ?? 0)}
            />
          </Form.Item>
          <Form.Item name="status" label="Trạng thái">
            <Select options={[
              { value: 'ACTIVE', label: 'Đang đóng' },
              { value: 'SUSPENDED', label: 'Tạm dừng' },
              { value: 'TERMINATED', label: 'Đã nghỉ' },
            ]} />
          </Form.Item>
        </Form>
      </CenteredModal>

      {/* Modal: Quản lý sổ BHXH */}
      <CenteredModal
        open={bookOpen}
        onClose={() => { setBookOpen(false); bookForm.resetFields(); setBookEnrollment(null); }}
        title={`Sổ BHXH — ${bookEnrollment?.employee?.fullName ?? ''}`}
        width={480}
        footer={
          <Space>
            <Button onClick={() => { setBookOpen(false); bookForm.resetFields(); }}>Hủy</Button>
            <Button
              type="primary"
              loading={upsertBookMutation.isPending}
              disabled={upsertBookMutation.isPending}
              onClick={() => {
                bookForm.validateFields().then((vals) => {
                  if (!bookEnrollment) return;
                  upsertBookMutation.mutate({ employeeId: bookEnrollment.employeeId, ...vals });
                });
              }}
            >
              Lưu sổ BHXH
            </Button>
          </Space>
        }
      >
        <Form form={bookForm} layout="vertical">
          <Form.Item name="bookNumber" label="Số sổ BHXH" rules={[{ required: true, message: 'Bắt buộc' }]}>
            <Input placeholder="VD: 0100100001234" />
          </Form.Item>
          <Form.Item name="issueDate" label="Ngày cấp">
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="issueAuthority" label="Cơ quan cấp">
            <Input placeholder="VD: BHXH TP.HCM" />
          </Form.Item>
        </Form>
      </CenteredModal>
    </div>
  );
}
