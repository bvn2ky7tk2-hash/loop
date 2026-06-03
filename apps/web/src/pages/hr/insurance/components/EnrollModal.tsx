import { Button, Input, Select, DatePicker, Form, InputNumber, Space } from 'antd';
import type { FormInstance } from 'antd';

import { CenteredModal } from '../../../../components/ui/CenteredModal';
import type { Employee } from '../../../../api/employees';

interface EnrollModalProps {
  open: boolean;
  onClose: () => void;
  form: FormInstance;
  employees: Employee[];
  onSubmit: () => void;
  submitting: boolean;
}

export function EnrollModal({ open, onClose, form, employees, onSubmit, submitting }: EnrollModalProps) {
  return (
    <CenteredModal
      open={open}
      onClose={onClose}
      title="Đăng ký BHXH mới"
      width={520}
      footer={
        <Space>
          <Button onClick={onClose}>Hủy</Button>
          <Button type="primary" onClick={onSubmit} loading={submitting} disabled={submitting}>
            Đăng ký
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical">
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
          <InputNumber<number>
            min={0}
            style={{ width: '100%' }}
            formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
            parser={(v) => Number(v?.replace(/\./g, '') ?? 0)}
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
  );
}
