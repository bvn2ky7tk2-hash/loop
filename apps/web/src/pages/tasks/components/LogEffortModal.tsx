import {
  Modal, Form, Input, DatePicker, InputNumber,
} from 'antd';
import type { FormInstance } from 'antd';
import dayjs from 'dayjs';

interface Props {
  open: boolean;
  onCancel: () => void;
  form: FormInstance;
  confirmLoading: boolean;
  onFinish: (v: any) => void;
}

export function LogEffortModal({ open, onCancel, form, confirmLoading, onFinish }: Props) {
  return (
    <Modal
      title="Ghi giờ thực tế"
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={confirmLoading}
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item name="hours" label="Số giờ" rules={[{ required: true }]}>
          <InputNumber min={0.5} step={0.5} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="logDate" label="Ngày" rules={[{ required: true }]} initialValue={dayjs()}>
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="note" label="Ghi chú">
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
