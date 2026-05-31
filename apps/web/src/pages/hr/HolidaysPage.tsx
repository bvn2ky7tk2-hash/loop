import { useState } from 'react';
import {
  Table, Button, Space, Typography, Tag, Form, Input,
  Select, DatePicker, Popconfirm, message,
} from 'antd';
import { PlusOutlined, StarOutlined, DeleteOutlined, ThunderboltOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import 'dayjs/locale/vi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useThemePalette } from '../../hooks/useThemePalette';
import { PageHeader } from '../../components/ui/PageHeader';
import { CenteredModal } from '../../components/ui/CenteredModal';
import { hrHolidaysApi, type HolidayCalendar, type HolidayType } from '../../api/hr-attendance';

dayjs.locale('vi');

const { Text } = Typography;

const HOLIDAY_TYPE_META: Record<HolidayType, { label: string; color: string; darkStyle: React.CSSProperties }> = {
  NATIONAL_HOLIDAY: {
    label: 'Ngày lễ quốc gia',
    color: '#EF4444',
    darkStyle: { background: 'rgba(248,113,113,0.15)', color: '#FCA5A5', borderColor: 'rgba(248,113,113,0.3)' },
  },
  COMPANY_HOLIDAY: {
    label: 'Ngày lễ công ty',
    color: '#8B5CF6',
    darkStyle: { background: 'rgba(139,92,246,0.15)', color: '#C4B5FD', borderColor: 'rgba(139,92,246,0.3)' },
  },
  COMPENSATORY_DAY: {
    label: 'Nghỉ bù',
    color: '#F97316',
    darkStyle: { background: 'rgba(251,146,60,0.15)', color: '#FED7AA', borderColor: 'rgba(251,146,60,0.3)' },
  },
};

const WEEKDAY_NAMES: Record<number, string> = {
  0: 'Chủ nhật',
  1: 'Thứ Hai',
  2: 'Thứ Ba',
  3: 'Thứ Tư',
  4: 'Thứ Năm',
  5: 'Thứ Sáu',
  6: 'Thứ Bảy',
};

export default function HolidaysPage() {
  const { textPrimary, textMuted, bgContainer, borderColor, isDark } = useThemePalette();
  const qc = useQueryClient();

  const currentYear = dayjs().year();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const { data: holidays = [], isLoading } = useQuery({
    queryKey: ['hr-holidays', selectedYear],
    queryFn: () => hrHolidaysApi.list(selectedYear),
  });

  const createMutation = useMutation({
    mutationFn: (data: { date: string; name: string; type: HolidayType }) =>
      hrHolidaysApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr-holidays'] });
      message.success('Đã thêm ngày lễ');
      setModalOpen(false);
    },
    onError: () => message.error('Có lỗi xảy ra'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => hrHolidaysApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr-holidays'] });
      message.success('Đã xóa ngày lễ');
    },
    onError: () => message.error('Có lỗi xảy ra'),
  });

  const seedMutation = useMutation({
    mutationFn: () => hrHolidaysApi.seedVN(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr-holidays'] });
      message.success('Đã seed ngày lễ Việt Nam');
    },
    onError: () => message.error('Seed thất bại'),
  });

  const handleCreate = async () => {
    const values = await form.validateFields();
    createMutation.mutate({
      date: (values.date as Dayjs).format('YYYY-MM-DD'),
      name: values.name,
      type: values.type,
    });
  };

  const sortedHolidays = [...holidays].sort((a, b) =>
    dayjs(a.date).isBefore(dayjs(b.date)) ? -1 : 1
  );

  const columns: ColumnsType<HolidayCalendar> = [
    {
      title: 'Ngày',
      dataIndex: 'date',
      width: 130,
      render: (v: string) => (
        <Text style={{ color: textPrimary, fontWeight: 500 }}>
          {dayjs(v).format('DD/MM/YYYY')}
        </Text>
      ),
    },
    {
      title: 'Thứ',
      dataIndex: 'date',
      width: 110,
      render: (v: string) => (
        <Text style={{ color: textMuted }}>
          {WEEKDAY_NAMES[dayjs(v).day()] ?? dayjs(v).format('dddd')}
        </Text>
      ),
    },
    {
      title: 'Tên ngày lễ',
      dataIndex: 'name',
      render: (v: string) => <Text style={{ color: textPrimary }}>{v}</Text>,
    },
    {
      title: 'Loại',
      dataIndex: 'type',
      width: 180,
      render: (v: HolidayType) => {
        const meta = HOLIDAY_TYPE_META[v];
        if (!meta) return <Text style={{ color: textMuted }}>{v}</Text>;
        return (
          <Tag
            style={isDark ? meta.darkStyle : {}}
            color={isDark ? undefined : v === 'NATIONAL_HOLIDAY' ? 'red' : v === 'COMPANY_HOLIDAY' ? 'purple' : 'orange'}
          >
            {meta.label}
          </Tag>
        );
      },
    },
    {
      title: 'Hành động',
      key: 'actions',
      width: 80,
      render: (_: unknown, record: HolidayCalendar) => (
        <Popconfirm
          title="Xóa ngày lễ này?"
          onConfirm={() => deleteMutation.mutate(record.id)}
          okText="Xóa"
          cancelText="Hủy"
          okButtonProps={{ danger: true }}
        >
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            size="small"
            loading={deleteMutation.isPending}
            disabled={deleteMutation.isPending}
          />
        </Popconfirm>
      ),
    },
  ];

  const yearOptions = Array.from({ length: 5 }, (_, i) => {
    const y = currentYear - 1 + i;
    return { value: y, label: String(y) };
  });

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Ngày lễ & Ngày nghỉ bù"
        icon={<StarOutlined />}
        iconColor="#F97316"
        actions={
          <Space>
            <Popconfirm
              title="Seed ngày lễ Việt Nam"
              description={`Sẽ thêm các ngày lễ VN năm ${selectedYear} vào hệ thống. Tiếp tục?`}
              onConfirm={() => seedMutation.mutate()}
              okText="Seed"
              cancelText="Hủy"
            >
              <Button
                icon={<ThunderboltOutlined />}
                loading={seedMutation.isPending}
                disabled={seedMutation.isPending}
              >
                Seed ngày lễ VN
              </Button>
            </Popconfirm>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => { form.resetFields(); setModalOpen(true); }}
            >
              + Thêm ngày lễ
            </Button>
          </Space>
        }
      />

      {/* Year filter */}
      <div style={{ marginBottom: 16 }}>
        <Select
          value={selectedYear}
          onChange={setSelectedYear}
          options={yearOptions}
          style={{ width: 120 }}
        />
        <Text style={{ color: textMuted, marginLeft: 12 }}>
          {sortedHolidays.length} ngày lễ năm {selectedYear}
        </Text>
      </div>

      <div style={{ background: bgContainer, border: `1px solid ${borderColor}`, borderRadius: 8, overflow: 'hidden' }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={sortedHolidays}
          loading={isLoading}
          pagination={{ pageSize: 20 }}
          size="middle"
        />
      </div>

      {/* Modal thêm ngày lễ */}
      <CenteredModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Thêm ngày lễ"
        width={480}
        footer={
          <Space>
            <Button onClick={() => setModalOpen(false)}>Hủy</Button>
            <Button type="primary" loading={createMutation.isPending} disabled={createMutation.isPending} onClick={handleCreate}>
              Thêm
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="date"
            label="Ngày"
            rules={[{ required: true, message: 'Vui lòng chọn ngày' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
              disabledDate={d => d.year() !== selectedYear}
            />
          </Form.Item>

          <Form.Item
            name="name"
            label="Tên ngày lễ"
            rules={[{ required: true, message: 'Vui lòng nhập tên ngày lễ' }]}
          >
            <Input placeholder="VD: Tết Nguyên Đán, Quốc Khánh..." />
          </Form.Item>

          <Form.Item
            name="type"
            label="Loại"
            rules={[{ required: true, message: 'Vui lòng chọn loại ngày lễ' }]}
            initialValue="NATIONAL_HOLIDAY"
          >
            <Select
              options={[
                { value: 'NATIONAL_HOLIDAY', label: 'Ngày lễ quốc gia' },
                { value: 'COMPANY_HOLIDAY',  label: 'Ngày lễ công ty' },
                { value: 'COMPENSATORY_DAY', label: 'Nghỉ bù' },
              ]}
            />
          </Form.Item>
        </Form>
      </CenteredModal>
    </div>
  );
}
