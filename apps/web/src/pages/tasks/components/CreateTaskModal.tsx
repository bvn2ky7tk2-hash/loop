import {
  Modal, Form, Input, Select, DatePicker, Space, InputNumber,
} from 'antd';
import type { FormInstance } from 'antd';
import type { Task } from '../../../api/tasks';

interface EmployeeOption { id: string; code: string; fullName: string }

interface Props {
  open: boolean;
  onCancel: () => void;
  form: FormInstance;
  confirmLoading: boolean;
  onFinish: (v: any) => void;
  employees: EmployeeOption[];
  flatTasks: Task[];
}

export function CreateTaskModal({
  open, onCancel, form, confirmLoading, onFinish, employees, flatTasks,
}: Props) {
  return (
    <Modal
      title="Tạo task mới"
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={confirmLoading}
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item name="title" label="Tên task" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="description" label="Mô tả">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item name="assigneeId" label="Người thực hiện">
          <Select
            allowClear showSearch
            placeholder="Chọn nhân sự..."
            filterOption={(input, opt) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())}
            options={employees.map((e) => ({ value: e.id, label: `${e.code} - ${e.fullName}` }))}
          />
        </Form.Item>
        <Form.Item name="parentId" label="Task cha">
          <Select
            allowClear showSearch
            placeholder="Không có (task gốc)"
            filterOption={(input, opt) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())}
            options={flatTasks.map((t) => ({ value: t.id, label: t.title }))}
          />
        </Form.Item>
        <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
          <Form.Item name="startDate" label="Ngày bắt đầu" style={{ flex: 1 }}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="dueDate" label="Hạn hoàn thành" style={{ flex: 1 }}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
        </Space>
        <Form.Item name="estimateHours" label="Giờ ước tính">
          <InputNumber min={0} step={0.5} style={{ width: '100%' }} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
