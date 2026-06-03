import { Button, Form, Input, Select, DatePicker, Space, Row, Col } from 'antd';
import type { FormInstance } from 'antd';

import { CenteredModal } from '../../../../components/ui/CenteredModal';

export interface SelectOption {
  value: string;
  label: string;
}

export function AssignmentFormModal({
  open,
  onClose,
  form,
  employeeOptions,
  shiftOptions,
  onSave,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  form: FormInstance;
  employeeOptions: SelectOption[];
  shiftOptions: SelectOption[];
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <CenteredModal
      open={open}
      onClose={onClose}
      title="Phân công ca làm việc"
      width={520}
      footer={
        <Space>
          <Button onClick={onClose}>Huỷ</Button>
          <Button type="primary" loading={saving} disabled={saving} onClick={onSave}>Phân công</Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" requiredMark="optional">
        <Form.Item name="employeeId" label="Nhân viên" rules={[{ required: true }]}>
          <Select showSearch placeholder="Tìm và chọn nhân viên..." optionFilterProp="label" options={employeeOptions} />
        </Form.Item>
        <Form.Item name="shiftId" label="Ca làm việc" rules={[{ required: true }]}>
          <Select showSearch placeholder="Chọn ca làm việc" optionFilterProp="label" options={shiftOptions} />
        </Form.Item>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="effectiveFrom" label="Hiệu lực từ ngày" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="effectiveTo" label="Đến ngày (nếu có)">
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="note" label="Ghi chú">
          <Input.TextArea rows={2} placeholder="Ghi chú thêm..." />
        </Form.Item>
      </Form>
    </CenteredModal>
  );
}
