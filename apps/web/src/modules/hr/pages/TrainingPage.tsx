import { useState } from 'react';
import {
  Table, Button, Space, Typography, Tabs, Tag, Modal,
  Form, Input, InputNumber, Select, DatePicker, message,
} from 'antd';
import { PlusOutlined, ReadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useThemePalette } from '../../hooks/useThemePalette';
import { usePagination } from '../../hooks/usePagination';
import {
  useGetTrainingPrograms, useGetTrainingRecords, useCreateTrainingProgram,
  useCreateTrainingRecord, useUpdateTrainingRecord,
  type TrainingRecord, type TrainingProgram, type TrainingStatus,
} from '../../api/hr-ext';
import { OrgUnitSelect } from '../../components/selects';
import { EmployeeInfoCell } from '../../components/ui/EmployeeInfoCell';
import { useQuery } from '@tanstack/react-query';
import { employeesApi } from '../../api/employees';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const STATUS_META: Record<TrainingStatus, { label: string; color: string }> = {
  SCHEDULED:   { label: 'Đã lên lịch', color: 'blue'    },
  IN_PROGRESS: { label: 'Đang học',    color: 'orange'  },
  COMPLETED:   { label: 'Hoàn thành',  color: 'green'   },
  CANCELLED:   { label: 'Huỷ',         color: 'default' },
};

export default function TrainingPage() {
  const { isDark, bgContainer, bgCard, textPrimary, textSecondary, textMuted, borderColor, linkColor, preset } = useThemePalette();
  const { paginationProps: recordPaginationProps } = usePagination(20);
  const { paginationProps: progPaginationProps } = usePagination(20);

  const [progModalOpen, setProgModalOpen] = useState(false);
  const [recModalOpen, setRecModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [orgUnitFilter, setOrgUnitFilter] = useState<string | undefined>(undefined);
  const [progForm] = Form.useForm();
  const [recForm] = Form.useForm();

  const { data: programs = [], isLoading: progLoading } = useGetTrainingPrograms();
  const { data: recordsData, isLoading: recLoading } = useGetTrainingRecords({ limit: 50, status: statusFilter, orgUnitId: orgUnitFilter });
  const { data: employees = [] } = useQuery({ queryKey: ['employees'], queryFn: employeesApi.list });
  const createProgram = useCreateTrainingProgram();
  const createRecord  = useCreateTrainingRecord();
  const updateRecord  = useUpdateTrainingRecord();

  const records = recordsData?.data ?? [];

  const programOptions = programs.map(p => ({ value: p.id, label: p.title }));
  const employeeOptions = employees.map(e => ({ value: e.id, label: `${e.code} — ${e.fullName}` }));

  const handleCreateProgram = async () => {
    const values = await progForm.validateFields();
    await createProgram.mutateAsync(values);
    message.success('Tạo chương trình thành công');
    setProgModalOpen(false);
    progForm.resetFields();
  };

  const handleCreateRecord = async () => {
    const values = await recForm.validateFields();
    await createRecord.mutateAsync({
      ...values,
      startDate: values.startDate.format('YYYY-MM-DD'),
      endDate:   values.endDate ? values.endDate.format('YYYY-MM-DD') : undefined,
    });
    message.success('Tạo bản ghi đào tạo thành công');
    setRecModalOpen(false);
    recForm.resetFields();
  };

  const handleUpdateStatus = async (id: string, status: TrainingStatus) => {
    await updateRecord.mutateAsync({ id, status });
    message.success('Cập nhật trạng thái thành công');
  };

  const programColumns: ColumnsType<TrainingProgram> = [
    { title: 'Tên chương trình', dataIndex: 'title', render: v => <span style={{ color: textPrimary, fontWeight: 500 }}>{v}</span> },
    { title: 'Loại', dataIndex: 'type', width: 120, render: v => <Tag color={v === 'internal' ? 'blue' : 'purple'}>{v === 'internal' ? 'Nội bộ' : 'Bên ngoài'}</Tag> },
    { title: 'Thời lượng (giờ)', dataIndex: 'durationHours', width: 140, align: 'right' as const, render: v => v ? <Text style={{ color: textPrimary }}>{v}</Text> : <Text style={{ color: textMuted }}>—</Text> },
    { title: 'Mô tả', dataIndex: 'description', render: v => v ? <span style={{ color: textSecondary }}>{v}</span> : <Text style={{ color: textMuted }}>—</Text> },
  ];

  const recordColumns: ColumnsType<TrainingRecord> = [
    { title: 'Nhân viên', render: (_, r) => r.employee ? <EmployeeInfoCell employee={r.employee} /> : <span style={{ color: textPrimary }}>{r.employeeId}</span> },
    { title: 'Chương trình', render: (_, r) => <span style={{ color: textPrimary }}>{r.program?.title ?? r.programId}</span> },
    { title: 'Loại', render: (_, r) => r.program?.type ? <Tag color={r.program.type === 'internal' ? 'blue' : 'purple'}>{r.program.type === 'internal' ? 'Nội bộ' : 'Bên ngoài'}</Tag> : <Text style={{ color: textMuted }}>—</Text> },
    { title: 'Bắt đầu', dataIndex: 'startDate', width: 110, render: v => <Text style={{ color: textMuted }}>{dayjs(v).format('DD/MM/YYYY')}</Text> },
    { title: 'Kết thúc', dataIndex: 'endDate', width: 110, render: v => v ? <Text style={{ color: textMuted }}>{dayjs(v).format('DD/MM/YYYY')}</Text> : <Text style={{ color: textMuted }}>—</Text> },
    {
      title: 'Trạng thái', dataIndex: 'status', width: 130,
      render: (v: TrainingStatus) => <Tag color={STATUS_META[v].color}>{STATUS_META[v].label}</Tag>,
    },
    { title: 'Điểm', dataIndex: 'score', width: 70, align: 'right' as const, render: v => v ? <span style={{ color: linkColor, fontWeight: 600 }}>{v}</span> : <Text style={{ color: textMuted }}>—</Text> },
    {
      title: 'Hành động', width: 180,
      render: (_, r) => (
        <Space size={4}>
          {r.status === 'SCHEDULED' && (
            <Button size="small" type="primary" ghost onClick={() => handleUpdateStatus(r.id, 'IN_PROGRESS')}>Bắt đầu</Button>
          )}
          {r.status === 'IN_PROGRESS' && (
            <Button size="small" type="primary" onClick={() => handleUpdateStatus(r.id, 'COMPLETED')}>Hoàn thành</Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Space>
          <ReadOutlined style={{ fontSize: 22, color: linkColor }} />
          <Title level={4} style={{ margin: 0, color: textPrimary }}>Đào tạo & Phát triển</Title>
        </Space>
      </div>

      <Tabs
        defaultActiveKey="records"
        items={[
          {
            key: 'records',
            label: 'Bản ghi đào tạo',
            children: (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
                  <Space wrap>
                    <Select
                      placeholder="Lọc trạng thái"
                      style={{ width: 180 }}
                      allowClear
                      options={Object.entries(STATUS_META).map(([k, v]) => ({ value: k, label: v.label }))}
                      onChange={setStatusFilter}
                    />
                    <OrgUnitSelect
                      placeholder="Phòng ban"
                      style={{ minWidth: 180 }}
                      value={orgUnitFilter}
                      onChange={setOrgUnitFilter}
                      allowClear
                    />
                  </Space>
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => setRecModalOpen(true)}>Thêm bản ghi</Button>
                </div>
                <div style={{ background: bgContainer, borderRadius: 8, border: `1px solid ${borderColor}`, overflow: 'hidden' }}>
                  <Table<TrainingRecord>
                    rowKey="id"
                    dataSource={records}
                    columns={recordColumns}
                    loading={recLoading}
                    pagination={recordPaginationProps(records.length, 'khóa đào tạo')}
                    size="middle"
                    locale={{
                      emptyText: (
                        <div style={{ padding: '40px 0', textAlign: 'center' }}>
                          {/* Icon và text khi chưa có bản ghi đào tạo nào */}
                          <ReadOutlined style={{ fontSize: 48, color: '#94A3B8', marginBottom: 12, display: 'block' }} />
                          <div style={{ color: textMuted, fontSize: 14 }}>Chưa có bản ghi đào tạo nào</div>
                          <div style={{ color: textMuted, fontSize: 12, marginTop: 4 }}>Nhấn nút Thêm bản ghi để tạo mới</div>
                        </div>
                      ),
                    }}
                  />
                </div>
              </>
            ),
          },
          {
            key: 'programs',
            label: 'Chương trình đào tạo',
            children: (
              <>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => setProgModalOpen(true)}>Tạo chương trình</Button>
                </div>
                <div style={{ background: bgContainer, borderRadius: 8, border: `1px solid ${borderColor}`, overflow: 'hidden' }}>
                  <Table<TrainingProgram>
                    rowKey="id"
                    dataSource={programs}
                    columns={programColumns}
                    loading={progLoading}
                    pagination={progPaginationProps(programs.length, 'khóa đào tạo')}
                    size="middle"
                    locale={{
                      emptyText: (
                        <div style={{ padding: '40px 0', textAlign: 'center' }}>
                          {/* Icon và text khi chưa có khóa đào tạo nào */}
                          <ReadOutlined style={{ fontSize: 48, color: '#94A3B8', marginBottom: 12, display: 'block' }} />
                          <div style={{ color: textMuted, fontSize: 14 }}>Chưa có khóa đào tạo nào</div>
                          <div style={{ color: textMuted, fontSize: 12, marginTop: 4 }}>Nhấn nút Tạo chương trình để thêm mới</div>
                        </div>
                      ),
                    }}
                  />
                </div>
              </>
            ),
          },
        ]}
      />

      {/* Create Program Modal */}
      <Modal
        title={<span style={{ color: textPrimary }}>Tạo chương trình đào tạo</span>}
        open={progModalOpen}
        onOk={handleCreateProgram}
        onCancel={() => { setProgModalOpen(false); progForm.resetFields(); }}
        okText="Tạo" confirmLoading={createProgram.isPending}
        styles={{ content: { background: bgContainer }, header: { background: bgContainer } }}
      >
        <Form form={progForm} layout="vertical">
          <Form.Item name="title" label={<span style={{ color: textPrimary }}>Tên chương trình</span>} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="type" label={<span style={{ color: textPrimary }}>Loại</span>} rules={[{ required: true }]}>
            <Select options={[{ value: 'internal', label: 'Nội bộ' }, { value: 'external', label: 'Bên ngoài' }]} />
          </Form.Item>
          <Form.Item name="durationHours" label={<span style={{ color: textPrimary }}>Thời lượng (giờ)</span>} rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="description" label={<span style={{ color: textPrimary }}>Mô tả</span>}>
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Create Record Modal */}
      <Modal
        title={<span style={{ color: textPrimary }}>Thêm bản ghi đào tạo</span>}
        open={recModalOpen}
        onOk={handleCreateRecord}
        onCancel={() => { setRecModalOpen(false); recForm.resetFields(); }}
        okText="Tạo" confirmLoading={createRecord.isPending}
        styles={{ content: { background: bgContainer }, header: { background: bgContainer } }}
      >
        <Form form={recForm} layout="vertical">
          <Form.Item name="employeeId" label={<span style={{ color: textPrimary }}>Nhân viên</span>} rules={[{ required: true }]}>
            <Select options={employeeOptions} showSearch filterOption={(i, o) => (o?.label ?? '').toLowerCase().includes(i.toLowerCase())} placeholder="Chọn nhân viên" />
          </Form.Item>
          <Form.Item name="programId" label={<span style={{ color: textPrimary }}>Chương trình</span>} rules={[{ required: true }]}>
            <Select options={programOptions} placeholder="Chọn chương trình" />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="startDate" label={<span style={{ color: textPrimary }}>Bắt đầu</span>} rules={[{ required: true }]}>
              <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="endDate" label={<span style={{ color: textPrimary }}>Kết thúc (dự kiến)</span>}>
              <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
