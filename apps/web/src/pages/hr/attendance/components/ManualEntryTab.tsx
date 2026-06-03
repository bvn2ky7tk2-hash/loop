import {
  Button, Form,
  Select, DatePicker, TimePicker, Input, message,
} from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import { type Dayjs } from 'dayjs';
import { useQuery, useMutation } from '@tanstack/react-query';
import { employeesApi } from '../../../../api/employees';
import { hrAttendanceApi } from '../../../../api/hr-attendance';
import { ATTENDANCE_STATUS_MAP } from '../constants';

export function ManualEntryTab() {
  const [form] = Form.useForm();

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeesApi.list(),
  });

  const upsertMutation = useMutation({
    mutationFn: (data: Parameters<typeof hrAttendanceApi.upsert>[0]) =>
      hrAttendanceApi.upsert(data),
    onSuccess: () => { message.success('Đã lưu chấm công'); form.resetFields(); },
    onError: () => message.error('Có lỗi xảy ra'),
  });

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const { date, checkIn, checkOut, ...rest } = values;
    upsertMutation.mutate({
      ...rest,
      date: (date as Dayjs).format('YYYY-MM-DD'),
      checkIn: checkIn ? (checkIn as Dayjs).toISOString() : undefined,
      checkOut: checkOut ? (checkOut as Dayjs).toISOString() : undefined,
      isManual: true,
    });
  };

  return (
    <div style={{ maxWidth: 560 }}>
      <Form form={form} layout="vertical">
        <Form.Item
          name="employeeId"
          label="Nhân viên"
          rules={[{ required: true, message: 'Vui lòng chọn nhân viên' }]}
        >
          <Select
            showSearch
            placeholder="Chọn nhân viên"
            filterOption={(input, opt) =>
              String(opt?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={employees.map(e => ({ value: e.id, label: `${e.code} — ${e.fullName}` }))}
          />
        </Form.Item>

        <Form.Item
          name="date"
          label="Ngày"
          rules={[{ required: true, message: 'Vui lòng chọn ngày' }]}
        >
          <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
        </Form.Item>

        <Form.Item name="checkIn" label="Giờ check-in">
          <TimePicker style={{ width: '100%' }} format="HH:mm" minuteStep={5} />
        </Form.Item>

        <Form.Item name="checkOut" label="Giờ check-out">
          <TimePicker style={{ width: '100%' }} format="HH:mm" minuteStep={5} />
        </Form.Item>

        <Form.Item
          name="status"
          label="Trạng thái"
          rules={[{ required: true, message: 'Vui lòng chọn trạng thái' }]}
          initialValue="PRESENT"
        >
          <Select
            options={Object.entries(ATTENDANCE_STATUS_MAP).map(([k, v]) => ({
              value: k,
              label: v.label,
            }))}
          />
        </Form.Item>

        <Form.Item name="note" label="Ghi chú">
          <Input.TextArea rows={3} placeholder="Lý do nhập thủ công, ghi chú..." />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            loading={upsertMutation.isPending}
            disabled={upsertMutation.isPending}
            onClick={handleSubmit}
            icon={<CheckOutlined />}
          >
            Lưu chấm công
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
