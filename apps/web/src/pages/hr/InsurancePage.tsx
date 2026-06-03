import { useState } from 'react';
import { Row, Col, Tabs, Button, Form, message } from 'antd';
import {
  SafetyOutlined,
  PlusOutlined,
  TeamOutlined,
  BookOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs, { Dayjs } from 'dayjs';

import { apiClient } from '../../api/client';
import { useThemePalette } from '../../hooks/useThemePalette';
import { usePagination } from '../../hooks/usePagination';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { hrInsuranceApi } from '../../api/hr-insurance';
import type {
  InsuranceEnrollment,
  InsuranceEnrollmentStatus,
  SocialInsuranceBook,
} from '../../api/hr-insurance';
import { employeesApi } from '../../api/employees';
import { downloadExport } from '../../utils/exportApi';

import {
  buildEnrollColumns,
  buildBookColumns,
  buildD02EnrolledCols,
  buildD02SalaryChangedCols,
} from './insurance/columns';
import { EnrollmentsTab } from './insurance/components/EnrollmentsTab';
import { BooksTab } from './insurance/components/BooksTab';
import { D02Tab } from './insurance/components/D02Tab';
import { EnrollModal } from './insurance/components/EnrollModal';
import { EventModal } from './insurance/components/EventModal';
import { EditEnrollModal } from './insurance/components/EditEnrollModal';
import { BookModal } from './insurance/components/BookModal';

// ─── Component ──────────────────────────────────────────────────────────────

export default function InsurancePage() {
  const qc = useQueryClient();
  const { textPrimary, textMuted, isDark } = useThemePalette();
  const { paginationProps: enrollPaginationProps } = usePagination(20);
  const { paginationProps: bookPaginationProps } = usePagination(20);

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
    queryFn: () => employeesApi.list(),
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

  const enrollColumns = buildEnrollColumns({
    textPrimary,
    textMuted,
    isDark,
    onEdit: (record) => {
      setEditEnrollRecord(record);
      editEnrollForm.setFieldsValue({ insuranceSalary: record.insuranceSalary, status: record.status });
      setEditEnrollOpen(true);
    },
    onBook: (record) => {
      setBookEnrollment(record);
      bookForm.setFieldsValue({
        bookNumber: record.socialInsuranceBook?.bookNumber ?? '',
        issueAuthority: record.socialInsuranceBook?.issueAuthority ?? '',
      });
      setBookOpen(true);
    },
    onEvent: (record) => {
      setSelectedEnrollment(record);
      setEventOpen(true);
    },
  });

  const bookColumns = buildBookColumns({
    textPrimary,
    textMuted,
    isDark,
    confirmPending: bookReceivedMutation.isPending,
    onConfirmReceived: (book: SocialInsuranceBook) =>
      bookReceivedMutation.mutate({
        id: book.id,
        data: {
          receivedByEmployee: true,
          receivedDate: dayjs().format('YYYY-MM-DD'),
        },
      }),
  });

  // ─── D02 preview tables ──────────────────────────────────────────────────

  const d02EnrolledCols = buildD02EnrolledCols({ textPrimary, textMuted });
  const d02SalaryChangedCols = buildD02SalaryChangedCols({ textPrimary, textMuted });

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
              <EnrollmentsTab
                search={search}
                setSearch={setSearch}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                orgUnitFilter={orgUnitFilter}
                setOrgUnitFilter={setOrgUnitFilter}
                columns={enrollColumns}
                enrollments={enrollments}
                isLoading={isLoading}
                pagination={enrollPaginationProps(enrollments.length, 'nhân sự')}
              />
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
              <BooksTab
                columns={bookColumns}
                bookNotReceived={bookNotReceived}
                isLoading={isLoading}
                pagination={bookPaginationProps(bookNotReceived.length, 'nhân sự')}
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
              <D02Tab
                textPrimary={textPrimary}
                d02Month={d02Month}
                setD02Month={setD02Month}
                setD02Preview={setD02Preview}
                d02Preview={d02Preview}
                d02Loading={d02Loading}
                onPreview={handleD02Preview}
                onExport={handleD02Export}
                enrolledCols={d02EnrolledCols}
                salaryChangedCols={d02SalaryChangedCols}
              />
            ),
          },
        ]}
      />

      {/* Modal đăng ký BHXH mới */}
      <EnrollModal
        open={enrollOpen}
        onClose={() => {
          setEnrollOpen(false);
          enrollForm.resetFields();
        }}
        form={enrollForm}
        employees={employees}
        onSubmit={handleEnrollSubmit}
        submitting={enrollMutation.isPending}
      />

      {/* Modal tạo InsuranceEvent */}
      <EventModal
        open={eventOpen}
        onClose={() => {
          setEventOpen(false);
          eventForm.resetFields();
          setSelectedEnrollment(null);
        }}
        form={eventForm}
        selectedEnrollment={selectedEnrollment}
        onSubmit={handleEventSubmit}
        submitting={eventMutation.isPending}
      />

      {/* Modal: Sửa đăng ký BHXH */}
      <EditEnrollModal
        open={editEnrollOpen}
        onClose={() => { setEditEnrollOpen(false); editEnrollForm.resetFields(); setEditEnrollRecord(null); }}
        onCancel={() => { setEditEnrollOpen(false); editEnrollForm.resetFields(); }}
        form={editEnrollForm}
        record={editEnrollRecord}
        onSubmit={() => {
          editEnrollForm.validateFields().then((vals) => {
            if (!editEnrollRecord) return;
            editEnrollMutation.mutate({ id: editEnrollRecord.id, data: vals });
          });
        }}
        submitting={editEnrollMutation.isPending}
      />

      {/* Modal: Quản lý sổ BHXH */}
      <BookModal
        open={bookOpen}
        onClose={() => { setBookOpen(false); bookForm.resetFields(); setBookEnrollment(null); }}
        onCancel={() => { setBookOpen(false); bookForm.resetFields(); }}
        form={bookForm}
        enrollment={bookEnrollment}
        onSubmit={() => {
          bookForm.validateFields().then((vals) => {
            if (!bookEnrollment) return;
            upsertBookMutation.mutate({ employeeId: bookEnrollment.employeeId, ...vals });
          });
        }}
        submitting={upsertBookMutation.isPending}
      />
    </div>
  );
}
