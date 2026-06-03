import { Button, Input, Select, DatePicker, Form, InputNumber, Space } from 'antd';
import type { FormInstance } from 'antd';

import { CenteredModal } from '../../../../components/ui/CenteredModal';
import type { InsuranceEnrollment } from '../../../../api/hr-insurance';
import { EVENT_LABEL } from '../constants';

interface EventModalProps {
  open: boolean;
  onClose: () => void;
  form: FormInstance;
  selectedEnrollment: InsuranceEnrollment | null;
  onSubmit: () => void;
  submitting: boolean;
}

export function EventModal({ open, onClose, form, selectedEnrollment, onSubmit, submitting }: EventModalProps) {
  return (
    <CenteredModal
      open={open}
      onClose={onClose}
      title={
        selectedEnrollment
          ? `Tạo sự kiện — ${selectedEnrollment.employee?.fullName ?? ''}`
          : 'Tạo sự kiện BHXH'
      }
      width={520}
      footer={
        <Space>
          <Button onClick={onClose}>Hủy</Button>
          <Button type="primary" onClick={onSubmit} loading={submitting} disabled={submitting}>
            Tạo sự kiện
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical">
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
        <Form.Item noStyle shouldUpdate={(prev, cur) => prev.eventType !== cur.eventType}>
          {({ getFieldValue }) =>
            getFieldValue('eventType') === 'SALARY_CHANGE' ? (
              <Form.Item
                name="insuranceSalary"
                label="Mức đóng mới (VNĐ)"
                rules={[{ required: true, message: 'Vui lòng nhập mức đóng mới' }]}
              >
                <InputNumber<number>
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
  );
}
