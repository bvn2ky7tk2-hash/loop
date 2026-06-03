import { Button, Select, Form, InputNumber, Space } from 'antd';
import type { FormInstance } from 'antd';

import { CenteredModal } from '../../../../components/ui/CenteredModal';
import type { InsuranceEnrollment } from '../../../../api/hr-insurance';

interface EditEnrollModalProps {
  open: boolean;
  onClose: () => void;
  onCancel: () => void;
  form: FormInstance;
  record: InsuranceEnrollment | null;
  onSubmit: () => void;
  submitting: boolean;
}

export function EditEnrollModal({ open, onClose, onCancel, form, record, onSubmit, submitting }: EditEnrollModalProps) {
  return (
    <CenteredModal
      open={open}
      onClose={onClose}
      title={`Cập nhật BHXH — ${record?.employee?.fullName ?? ''}`}
      width={440}
      footer={
        <Space>
          <Button onClick={onCancel}>Hủy</Button>
          <Button type="primary" loading={submitting} disabled={submitting} onClick={onSubmit}>
            Lưu
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical">
        <Form.Item name="insuranceSalary" label="Mức đóng BHXH (VNĐ)" rules={[{ required: true }]}>
          <InputNumber<number>
            min={0}
            style={{ width: '100%' }}
            formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
            parser={(v) => Number(v?.replace(/\./g, '') ?? 0)}
          />
        </Form.Item>
        <Form.Item name="status" label="Trạng thái">
          <Select
            options={[
              { value: 'ACTIVE', label: 'Đang đóng' },
              { value: 'SUSPENDED', label: 'Tạm dừng' },
              { value: 'TERMINATED', label: 'Đã nghỉ' },
            ]}
          />
        </Form.Item>
      </Form>
    </CenteredModal>
  );
}
