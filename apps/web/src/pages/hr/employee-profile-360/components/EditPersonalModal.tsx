import { Button, Form, Input, Select, DatePicker, Space, Row, Col, Divider } from 'antd';
import type { FormInstance } from 'antd';

import { CenteredModal } from '../../../../components/ui/CenteredModal';
import { ProvinceWardSelect, CategorySelect } from '../../../../components/selects';

interface EditPersonalModalProps {
  open: boolean;
  form: FormInstance;
  loading: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

export function EditPersonalModal({ open, form, loading, onClose, onSubmit }: EditPersonalModalProps) {
  return (
    <CenteredModal open={open} onClose={onClose}
      title="Chỉnh sửa thông tin cá nhân" width={700}
      footer={
        <Space>
          <Button onClick={onClose}>Hủy</Button>
          <Button type="primary" onClick={onSubmit} loading={loading}>Lưu thay đổi</Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={12}><Form.Item name="fullName" label="Họ và tên"><Input /></Form.Item></Col>
          <Col span={12}><Form.Item name="email" label="Email"><Input type="email" /></Form.Item></Col>
        </Row>
        <Row gutter={16}>
          <Col span={8}><Form.Item name="birthdate" label="Ngày sinh"><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item></Col>
          <Col span={8}>
            <Form.Item name="gender" label="Giới tính">
              <Select allowClear placeholder="Chọn giới tính">
                <Select.Option value="MALE">Nam</Select.Option>
                <Select.Option value="FEMALE">Nữ</Select.Option>
                <Select.Option value="OTHER">Khác</Select.Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="maritalStatus" label="Tình trạng hôn nhân">
              <Select allowClear placeholder="Chọn tình trạng">
                <Select.Option value="SINGLE">Độc thân</Select.Option>
                <Select.Option value="MARRIED">Đã kết hôn</Select.Option>
                <Select.Option value="DIVORCED">Đã ly hôn</Select.Option>
                <Select.Option value="WIDOWED">Góa</Select.Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}><Form.Item name="phoneNumber" label="Số điện thoại"><Input /></Form.Item></Col>
          <Col span={12}><Form.Item name="nationality" label="Quốc tịch"><Input placeholder="VD: Việt Nam" /></Form.Item></Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}><Form.Item name="hometown" label="Quê quán"><ProvinceWardSelect /></Form.Item></Col>
          <Col span={12}><Form.Item name="placeOfBirth" label="Nơi sinh"><Input placeholder="VD: Hà Nội" /></Form.Item></Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}><Form.Item name="ethnicity" label="Dân tộc"><CategorySelect type="ethnicity" placeholder="Chọn dân tộc" /></Form.Item></Col>
          <Col span={12}><Form.Item name="religion" label="Tôn giáo"><CategorySelect type="religion" placeholder="Chọn tôn giáo" /></Form.Item></Col>
        </Row>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="idType" label="Loại giấy tờ">
              <Select allowClear>
                <Select.Option value="CCCD">CCCD</Select.Option>
                <Select.Option value="CMND">CMND</Select.Option>
                <Select.Option value="PASSPORT">Hộ chiếu</Select.Option>
                <Select.Option value="OTHER">Khác</Select.Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}><Form.Item name="idNumber" label="Số giấy tờ"><Input /></Form.Item></Col>
          <Col span={8}><Form.Item name="idIssueDate" label="Ngày cấp"><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item></Col>
        </Row>
        <Row gutter={16}>
          <Col span={24}><Form.Item name="idIssuePlace" label="Nơi cấp"><Input /></Form.Item></Col>
        </Row>
        <Form.Item name="permanentAddress" label="Địa chỉ thường trú (Tỉnh/Phường)"><ProvinceWardSelect /></Form.Item>
        <Form.Item name="currentAddress" label="Địa chỉ tạm trú (Tỉnh/Phường)"><ProvinceWardSelect /></Form.Item>
        <Row gutter={16}>
          <Col span={12}><Form.Item name="bankName" label="Ngân hàng"><Input placeholder="VD: Vietcombank" /></Form.Item></Col>
          <Col span={12}><Form.Item name="bankAccount" label="Số tài khoản"><Input /></Form.Item></Col>
        </Row>

        <Divider style={{ margin: '8px 0 16px' }}>Liên hệ khẩn cấp & Y tế</Divider>
        <Row gutter={16}>
          <Col span={8}><Form.Item name="emergencyContactName" label="Người liên hệ khẩn cấp"><Input placeholder="Họ tên" /></Form.Item></Col>
          <Col span={8}><Form.Item name="emergencyContactPhone" label="SĐT khẩn cấp"><Input /></Form.Item></Col>
          <Col span={8}><Form.Item name="emergencyContactRelation" label="Quan hệ"><Input placeholder="VD: Vợ/Chồng, Cha/Mẹ" /></Form.Item></Col>
        </Row>
        <Row gutter={16}>
          <Col span={8}><Form.Item name="secondaryPhone" label="SĐT phụ"><Input /></Form.Item></Col>
          <Col span={8}><Form.Item name="bloodType" label="Nhóm máu"><Select allowClear placeholder="Chọn"><Select.Option value="A">A</Select.Option><Select.Option value="B">B</Select.Option><Select.Option value="AB">AB</Select.Option><Select.Option value="O">O</Select.Option></Select></Form.Item></Col>
          <Col span={8}><Form.Item name="guardianName" label="Người giám hộ"><Input placeholder="Nếu có" /></Form.Item></Col>
        </Row>
        <Form.Item name="healthNote" label="Tình trạng sức khỏe"><Input.TextArea rows={2} placeholder="Ghi chú sức khỏe, dị ứng, bệnh nền…" /></Form.Item>
      </Form>
    </CenteredModal>
  );
}
