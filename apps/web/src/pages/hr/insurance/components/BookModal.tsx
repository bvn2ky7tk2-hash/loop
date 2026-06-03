import { Button, Input, DatePicker, Form, Space } from 'antd';
import type { FormInstance } from 'antd';

import { CenteredModal } from '../../../../components/ui/CenteredModal';
import type { InsuranceEnrollment } from '../../../../api/hr-insurance';

interface BookModalProps {
  open: boolean;
  onClose: () => void;
  onCancel: () => void;
  form: FormInstance;
  enrollment: InsuranceEnrollment | null;
  onSubmit: () => void;
  submitting: boolean;
}

export function BookModal({ open, onClose, onCancel, form, enrollment, onSubmit, submitting }: BookModalProps) {
  return (
    <CenteredModal
      open={open}
      onClose={onClose}
      title={`Sổ BHXH — ${enrollment?.employee?.fullName ?? ''}`}
      width={480}
      footer={
        <Space>
          <Button onClick={onCancel}>Hủy</Button>
          <Button type="primary" loading={submitting} disabled={submitting} onClick={onSubmit}>
            Lưu sổ BHXH
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical">
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
  );
}
