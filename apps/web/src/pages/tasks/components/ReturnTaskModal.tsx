import { Modal, Form, Input } from 'antd';
import type { FormInstance } from 'antd';

interface Props {
  open: boolean;
  onCancel: () => void;
  form: FormInstance;
  confirmLoading: boolean;
  onFinish: (v: any) => void;
}

export function ReturnTaskModal({ open, onCancel, form, confirmLoading, onFinish }: Props) {
  return (
    <Modal
      title="Trả lại task"
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      okText="Xác nhận trả lại"
      okButtonProps={{ danger: true }}
      confirmLoading={confirmLoading}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
      >
        <Form.Item name="reason" label="Lý do trả lại" rules={[{ required: true, message: 'Vui lòng nhập lý do' }]}>
          <Input.TextArea rows={3} placeholder="Nhập lý do trả lại task cho nhân viên..." />
        </Form.Item>
      </Form>
    </Modal>
  );
}
