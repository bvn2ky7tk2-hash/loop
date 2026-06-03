import { Button, Form, Input, Select, DatePicker, Space, Row, Col } from 'antd';
import type { FormInstance } from 'antd';

import { CenteredModal } from '../../../../components/ui/CenteredModal';
import { RELATIONSHIP_LABEL } from '../constants';
import type { FamilyMember } from '../../../../api/hr-profile';

interface FamilyModalProps {
  open: boolean;
  form: FormInstance;
  editing: FamilyMember | null;
  loading: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

export function FamilyModal({ open, form, editing, loading, onClose, onSubmit }: FamilyModalProps) {
  return (
    <CenteredModal open={open} onClose={onClose}
      title={editing ? 'Sửa thông tin thân nhân' : 'Thêm thân nhân'} width={520}
      footer={
        <Space>
          <Button onClick={onClose}>Hủy</Button>
          <Button type="primary" onClick={onSubmit} loading={loading}>
            {editing ? 'Lưu thay đổi' : 'Thêm mới'}
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="relationship" label="Quan hệ" rules={[{ required: true }]}>
              <Select placeholder="Chọn quan hệ">
                {Object.entries(RELATIONSHIP_LABEL).map(([k, v]) => <Select.Option key={k} value={k}>{v}</Select.Option>)}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}><Form.Item name="fullName" label="Họ và tên" rules={[{ required: true }]}><Input /></Form.Item></Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}><Form.Item name="birthdate" label="Ngày sinh"><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item></Col>
          <Col span={12}><Form.Item name="idNumber" label="Số CCCD / MST"><Input placeholder="CCCD hoặc MST cá nhân" /></Form.Item></Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}><Form.Item name="occupation" label="Nghề nghiệp"><Input /></Form.Item></Col>
          <Col span={12}><Form.Item name="phoneNumber" label="Số điện thoại"><Input /></Form.Item></Col>
        </Row>
        <Form.Item name="address" label="Địa chỉ"><Input /></Form.Item>
        <Form.Item name="note" label="Ghi chú"><Input.TextArea rows={2} /></Form.Item>
      </Form>
    </CenteredModal>
  );
}
