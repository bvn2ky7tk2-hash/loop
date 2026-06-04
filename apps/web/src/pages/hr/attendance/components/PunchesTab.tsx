import { useState, useMemo } from 'react';
import {
  Button, Space, DatePicker, Upload, Table, Tag, Alert, Form, App, Typography, Select,
} from 'antd';
import type { UploadFile, UploadProps } from 'antd';
import {
  UploadOutlined, PlusOutlined, DeleteOutlined, CheckCircleOutlined,
  CloseCircleOutlined, InboxOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useThemePalette } from '../../../../hooks/useThemePalette';
import { usePagination } from '../../../../hooks/usePagination';
import { FilterBar } from '../../../../components/FilterBar';
import { EmployeeInfoCell } from '../../../../components/ui/EmployeeInfoCell';
import { StatusBadge, type StatusTone } from '../../../../components/ui/StatusBadge';
import { CenteredModal } from '../../../../components/ui/CenteredModal';
import { confirmDelete } from '../../../../components/ui/confirmDelete';
import { employeesApi } from '../../../../api/employees';
import {
  attendancePunchesApi, type AttendancePunch, type PunchSource, type PunchImportResult,
} from '../../../../api/hr-attendance';

const { Text } = Typography;
const { RangePicker } = DatePicker;

const SOURCE_META: Record<PunchSource, { label: string; tone: StatusTone }> = {
  IMPORT: { label: 'Import', tone: 'info' },
  DEVICE: { label: 'Máy quẹt', tone: 'success' },
  MANUAL: { label: 'Thủ công', tone: 'warning' },
};

export function PunchesTab() {
  const { message } = App.useApp();
  const { textPrimary, textMuted, bgContainer } = useThemePalette();
  const { page, pageSize, resetPage, paginationProps } = usePagination(50);
  const qc = useQueryClient();

  const [employeeId, setEmployeeId] = useState<string | undefined>();
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [preview, setPreview] = useState<PunchImportResult | null>(null);
  const [addForm] = Form.useForm();

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeesApi.list(),
  });
  const employeeOptions = useMemo(
    () => employees.map((e) => ({ value: e.id, label: `${e.code} — ${e.fullName}` })),
    [employees],
  );

  const { data: punchData, isLoading } = useQuery({
    queryKey: ['attendance-punches', page, pageSize, employeeId, range],
    queryFn: () => attendancePunchesApi.list({
      page, limit: pageSize, employeeId,
      dateFrom: range?.[0]?.format('YYYY-MM-DD'),
      dateTo: range?.[1]?.format('YYYY-MM-DD'),
    }),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['attendance-punches'] });
  };

  const previewMutation = useMutation({
    mutationFn: (file: File) => attendancePunchesApi.importPreview(file),
    onSuccess: setPreview,
    onError: () => message.error('Đọc file thất bại'),
  });
  const commitMutation = useMutation({
    mutationFn: (file: File) => attendancePunchesApi.importCommit(file),
    onSuccess: (res) => {
      message.success(`Đã import ${res.imported} lần quẹt (bỏ qua ${res.skipped})`);
      setImportOpen(false);
      setFileList([]);
      setPreview(null);
      invalidate();
    },
    onError: () => message.error('Import thất bại'),
  });
  const createMutation = useMutation({
    mutationFn: (data: { employeeId: string; punchedAt: string }) => attendancePunchesApi.create(data),
    onSuccess: () => {
      message.success('Đã thêm lần quẹt');
      setAddOpen(false);
      addForm.resetFields();
      invalidate();
    },
    onError: () => message.error('Thêm thất bại'),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => attendancePunchesApi.remove(id),
    onSuccess: () => { message.success('Đã xóa'); invalidate(); },
    onError: () => message.error('Xóa thất bại'),
  });

  const uploadProps: UploadProps = {
    accept: '.xlsx,.xls,.csv',
    maxCount: 1,
    fileList,
    beforeUpload: (file) => {
      setFileList([file]);
      setPreview(null);
      previewMutation.mutate(file as unknown as File);
      return false;
    },
    onRemove: () => { setFileList([]); setPreview(null); },
  };

  const columns: ColumnsType<AttendancePunch> = [
    {
      title: 'Nhân viên',
      key: 'employee',
      render: (_, r) => r.employee
        ? <EmployeeInfoCell employee={r.employee} />
        : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      title: 'Thời điểm quẹt',
      dataIndex: 'punchedAt',
      width: 200,
      render: (v: string) => <Text style={{ color: textPrimary }}>{dayjs(v).format('DD/MM/YYYY HH:mm:ss')}</Text>,
    },
    {
      title: 'Nguồn',
      dataIndex: 'source',
      width: 130,
      render: (v: PunchSource) => {
        const m = SOURCE_META[v] ?? { label: v, tone: 'neutral' as StatusTone };
        return <StatusBadge label={m.label} tone={m.tone} />;
      },
    },
    {
      title: '',
      key: 'actions',
      width: 60,
      render: (_, r) => (
        <Button
          type="text"
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => confirmDelete({
            title: 'Xóa lần quẹt này?',
            onConfirm: () => deleteMutation.mutateAsync(r.id),
          })}
        />
      ),
    },
  ];

  const previewCols: ColumnsType<PunchImportResult['valid'][number]> = [
    { title: 'Mã NV', dataIndex: 'code', width: 110, render: (v) => <Text style={{ color: textPrimary }}>{v}</Text> },
    { title: 'Nhân viên', dataIndex: 'fullName', render: (v) => <Text style={{ color: textPrimary }}>{v}</Text> },
    { title: 'Thời điểm quẹt', dataIndex: 'punchedAt', width: 200, render: (v) => <Text style={{ color: textPrimary }}>{dayjs(v).format('DD/MM/YYYY HH:mm:ss')}</Text> },
  ];

  return (
    <div>
      <FilterBar
        right={
          <Space>
            <Button icon={<UploadOutlined />} onClick={() => setImportOpen(true)}>Import giờ quẹt</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>Thêm tay</Button>
          </Space>
        }
      >
        <Select
          showSearch
          allowClear
          value={employeeId}
          onChange={(v) => { setEmployeeId(v); resetPage(); }}
          options={employeeOptions}
          placeholder="Nhân viên"
          style={{ width: 260 }}
          filterOption={(input, opt) => String(opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
        />
        <RangePicker
          format="DD/MM/YYYY"
          value={range}
          onChange={(v) => { setRange(v as [Dayjs, Dayjs] | null); resetPage(); }}
        />
      </FilterBar>

      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16, borderRadius: 8 }}
        message="Giờ quẹt thẻ là dữ liệu gốc tính công"
        description='Sau khi import/chỉnh giờ quẹt, vào tab "Bảng công tháng" bấm "Tổng hợp tháng" để dựng lại bảng công (giờ vào = lần quẹt sớm nhất, giờ ra = muộn nhất).'
      />

      <Table
        rowKey="id"
        columns={columns}
        dataSource={punchData?.data ?? []}
        loading={isLoading}
        pagination={paginationProps(punchData?.total, 'lần quẹt')}
        style={{ background: bgContainer }}
      />

      {/* ─── Modal Import ─── */}
      <CenteredModal
        open={importOpen}
        onClose={() => { setImportOpen(false); setFileList([]); setPreview(null); }}
        title="Import giờ quẹt thẻ"
        width={760}
        footer={
          <Space>
            <Button onClick={() => { setImportOpen(false); setFileList([]); setPreview(null); }}>Hủy</Button>
            <Button
              type="primary"
              disabled={!preview || preview.valid.length === 0}
              loading={commitMutation.isPending}
              onClick={() => fileList[0] && commitMutation.mutate(fileList[0] as unknown as File)}
            >
              {preview ? `Xác nhận import ${preview.valid.length} lần quẹt` : 'Xác nhận import'}
            </Button>
          </Space>
        }
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="File Excel cần 2 cột: Mã NV và Thời gian quẹt"
          description="Mỗi dòng là 1 lần quẹt. Thời gian dạng DD/MM/YYYY HH:mm hoặc ô ngày-giờ Excel. Dòng đầu là tiêu đề cột."
        />
        <Upload.Dragger {...uploadProps} style={{ borderRadius: 12 }}>
          <p className="ant-upload-drag-icon"><InboxOutlined style={{ fontSize: 32 }} /></p>
          <p className="ant-upload-text" style={{ color: textPrimary }}>Click hoặc kéo file vào đây</p>
          <p className="ant-upload-hint" style={{ color: textMuted }}>.xlsx, .xls, .csv — tối đa 5MB</p>
        </Upload.Dragger>

        {preview && (
          <div style={{ marginTop: 16 }}>
            <Space style={{ marginBottom: 12 }}>
              <Tag color="green" icon={<CheckCircleOutlined />}>{preview.valid.length} dòng hợp lệ</Tag>
              <Tag color="red" icon={<CloseCircleOutlined />}>{preview.errors.length} dòng lỗi</Tag>
            </Space>
            {preview.valid.length > 0 && (
              <Table
                size="small"
                rowKey={(_, i) => String(i)}
                columns={previewCols}
                dataSource={preview.valid.slice(0, 100)}
                pagination={false}
                scroll={{ y: 240 }}
                style={{ marginBottom: 12 }}
              />
            )}
            {preview.errors.length > 0 && (
              <Table
                size="small"
                rowKey={(_, i) => String(i)}
                columns={[
                  { title: 'Dòng', dataIndex: 'row', width: 70, render: (v) => <Text style={{ color: textPrimary }}>#{v}</Text> },
                  { title: 'Lỗi', dataIndex: 'message', render: (v) => <Text style={{ color: '#EF4444' }}>{v}</Text> },
                ]}
                dataSource={preview.errors.slice(0, 100)}
                pagination={false}
                scroll={{ y: 160 }}
              />
            )}
          </div>
        )}
      </CenteredModal>

      {/* ─── Modal thêm tay ─── */}
      <CenteredModal
        open={addOpen}
        onClose={() => { setAddOpen(false); addForm.resetFields(); }}
        title="Thêm lần quẹt thủ công"
        footer={
          <Space>
            <Button onClick={() => { setAddOpen(false); addForm.resetFields(); }}>Hủy</Button>
            <Button type="primary" loading={createMutation.isPending} onClick={() => addForm.submit()}>Lưu</Button>
          </Space>
        }
      >
        <Form
          form={addForm}
          layout="vertical"
          onFinish={(vals) => createMutation.mutate({
            employeeId: vals.employeeId,
            punchedAt: (vals.punchedAt as Dayjs).toISOString(),
          })}
        >
          <Form.Item name="employeeId" label="Nhân viên" rules={[{ required: true, message: 'Chọn nhân viên' }]}>
            <Select
              showSearch
              options={employeeOptions}
              placeholder="Chọn nhân viên"
              style={{ width: '100%' }}
              filterOption={(input, opt) => String(opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
            />
          </Form.Item>
          <Form.Item name="punchedAt" label="Thời điểm quẹt" rules={[{ required: true, message: 'Chọn thời điểm' }]}>
            <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </CenteredModal>
    </div>
  );
}
