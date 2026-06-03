import { Button, Form, Input, DatePicker, Space, Row, Col } from 'antd';
import type { FormInstance } from 'antd';

import { CenteredModal } from '../../../../components/ui/CenteredModal';
import type { WorkExperience } from '../../../../api/hr-profile';

interface WorkExperienceModalProps {
  open: boolean;
  form: FormInstance;
  editing: WorkExperience | null;
  loading: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

export function WorkExperienceModal({ open, form, editing, loading, onClose, onSubmit }: WorkExperienceModalProps) {
  return (
    <CenteredModal open={open} onClose={onClose}
      title={editing ? 'Sửa kinh nghiệm làm việc' : 'Thêm kinh nghiệm làm việc'} width={520}
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
        <Form.Item name="companyName" label="Tên công ty" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="position" label="Chức danh / Vị trí"><Input /></Form.Item>
        <Row gutter={16}>
          <Col span={12}><Form.Item name="startDate" label="Từ tháng"><DatePicker picker="month" style={{ width: '100%' }} format="MM/YYYY" /></Form.Item></Col>
          <Col span={12}><Form.Item name="endDate" label="Đến tháng"><DatePicker picker="month" style={{ width: '100%' }} format="MM/YYYY" placeholder="Để trống nếu vẫn đang làm" /></Form.Item></Col>
        </Row>
        <Form.Item name="description" label="Mô tả công việc"><Input.TextArea rows={3} /></Form.Item>
      </Form>
    </CenteredModal>
  );
}
