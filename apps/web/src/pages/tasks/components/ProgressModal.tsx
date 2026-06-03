import { Modal, Form, Slider } from 'antd';
import type { FormInstance } from 'antd';

interface Props {
  open: boolean;
  onCancel: () => void;
  onOk: () => void;
  form: FormInstance;
  confirmLoading: boolean;
}

export function ProgressModal({ open, onCancel, onOk, form, confirmLoading }: Props) {
  return (
    <Modal
      title="Cập nhật tiến độ"
      open={open}
      onCancel={onCancel}
      onOk={onOk}
      confirmLoading={confirmLoading}
    >
      <Form form={form}>
        <Form.Item name="_pct" initialValue={0}>
          <Slider min={0} max={100} marks={{ 0: '0%', 50: '50%', 100: '100%' }} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
