import { Modal, Form, InputNumber, DatePicker } from 'antd';
import type { FormInstance, FormProps } from 'antd';

interface Props {
  open: boolean;
  rateForm: FormInstance;
  confirmLoading: boolean;
  onCancel: () => void;
  onFinish: FormProps['onFinish'];
}

export function AddRateModal({ open, rateForm, confirmLoading, onCancel, onFinish }: Props) {
  return (
    <Modal
      title="Thêm mức lương" open={open}
      onCancel={onCancel} onOk={() => rateForm.submit()}
      confirmLoading={confirmLoading}
    >
      <Form form={rateForm} layout="vertical" onFinish={onFinish}>
        <Form.Item name="ratePerDay" label="Mức lương / ngày (VND)" rules={[{ required: true }]}>
          <InputNumber<number>
            min={0} style={{ width: '100%' }}
            formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={(v) => Number(v?.replace(/,/g, '') ?? 0)}
          />
        </Form.Item>
        <Form.Item name="effectiveDate" label="Ngày có hiệu lực" rules={[{ required: true }]}>
          <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
