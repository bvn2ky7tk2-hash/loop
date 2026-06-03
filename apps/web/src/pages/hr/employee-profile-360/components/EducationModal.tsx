import { Button, Form, Input, Select, Space, Row, Col, InputNumber, Switch } from 'antd';
import type { FormInstance } from 'antd';

import { CenteredModal } from '../../../../components/ui/CenteredModal';
import { DEGREE_LEVEL_LABEL } from '../constants';
import type { EducationRecord } from '../../../../api/hr-profile';

interface EducationModalProps {
  open: boolean;
  form: FormInstance;
  editing: EducationRecord | null;
  loading: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

export function EducationModal({ open, form, editing, loading, onClose, onSubmit }: EducationModalProps) {
  return (
    <CenteredModal open={open} onClose={onClose}
      title={editing ? 'Sửa bằng cấp / học vấn' : 'Thêm bằng cấp / học vấn'} width={560}
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
            <Form.Item name="degreeLevel" label="Trình độ học vấn" rules={[{ required: true }]}>
              <Select placeholder="Chọn trình độ">
                {Object.entries(DEGREE_LEVEL_LABEL).map(([k, v]) => <Select.Option key={k} value={k}>{v}</Select.Option>)}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="isMainDegree" label="Bằng chính" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="schoolName" label="Tên trường" rules={[{ required: true }]}><Input placeholder="VD: Đại học Bách Khoa Hà Nội" /></Form.Item>
        <Form.Item name="major" label="Chuyên ngành"><Input placeholder="VD: Công nghệ thông tin" /></Form.Item>
        <Row gutter={16}>
          <Col span={8}><Form.Item name="startYear" label="Năm bắt đầu"><InputNumber style={{ width: '100%' }} min={1950} max={2100} /></Form.Item></Col>
          <Col span={8}><Form.Item name="endYear" label="Năm kết thúc"><InputNumber style={{ width: '100%' }} min={1950} max={2100} /></Form.Item></Col>
          <Col span={8}><Form.Item name="graduationYear" label="Năm tốt nghiệp"><InputNumber style={{ width: '100%' }} min={1950} max={2100} /></Form.Item></Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}><Form.Item name="result" label="Kết quả / Xếp loại"><Input placeholder="VD: Giỏi, 3.5/4.0" /></Form.Item></Col>
          <Col span={12}><Form.Item name="certificateNumber" label="Số bằng / chứng chỉ"><Input /></Form.Item></Col>
        </Row>
        <Form.Item name="description" label="Ghi chú"><Input.TextArea rows={2} /></Form.Item>
      </Form>
    </CenteredModal>
  );
}
