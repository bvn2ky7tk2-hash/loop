import {
  Modal, Form, Input, Select, Space, DatePicker, Alert, Divider,
} from 'antd';
import type { FormInstance, FormProps } from 'antd';
import { ProvinceWardSelect } from '../../../components/selects';
import { LEVELS } from '../personnelConstants';

interface OptionItem { value: string; label: string }

interface Props {
  open: boolean;
  createForm: FormInstance;
  createError: string;
  confirmLoading: boolean;
  orgOptions: OptionItem[];
  jobTitleOptions: OptionItem[];
  allPositionOptions: OptionItem[];
  onCancel: () => void;
  onFinish: FormProps['onFinish'];
}

export function CreateEmployeeModal({
  open, createForm, createError, confirmLoading,
  orgOptions, jobTitleOptions, allPositionOptions, onCancel, onFinish,
}: Props) {
  return (
    <Modal
      title="Thêm nhân sự mới" open={open} width={520}
      onCancel={onCancel}
      onOk={() => createForm.submit()}
      confirmLoading={confirmLoading}
    >
      {createError && (
        <Alert type="error" showIcon style={{ marginBottom: 12 }} message="Dữ liệu không hợp lệ"
          description={<ul style={{ margin: 0, paddingLeft: 16 }}>{createError.split('\n').map((l, i) => <li key={i}>{l}</li>)}</ul>}
        />
      )}
      <Form form={createForm} layout="vertical" onFinish={onFinish}>
        <Form.Item name="level" label="Cấp độ" rules={[{ required: true, message: 'Chọn cấp độ' }]}>
          <Select options={LEVELS.map((l) => ({ value: l, label: l }))} placeholder="Chọn cấp độ" />
        </Form.Item>
        <Form.Item name="fullName" label="Họ và tên đầy đủ" rules={[{ required: true, message: 'Nhập họ tên' }]}>
          <Input />
        </Form.Item>
        <Form.Item name="orgUnitId" label="Phòng ban" rules={[{ required: true, message: 'Chọn phòng ban' }]}>
          <Select showSearch placeholder="Chọn phòng ban..."
            filterOption={(input, opt) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())}
            options={orgOptions}
          />
        </Form.Item>
        <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
          <Form.Item name="jobTitleId" label="Chức danh" style={{ flex: 1 }}>
            <Select showSearch placeholder="Chọn chức danh..." allowClear
              filterOption={(input, opt) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())}
              options={jobTitleOptions}
            />
          </Form.Item>
          <Form.Item name="positionId" label="Vị trí biên chế" style={{ flex: 1 }}>
            <Select showSearch placeholder="Chọn vị trí..." allowClear
              filterOption={(input, opt) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())}
              options={allPositionOptions}
            />
          </Form.Item>
        </Space>
        <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
          <Form.Item name="startDate" label="Ngày vào làm" style={{ flex: 1 }} rules={[{ required: true, message: 'Chọn ngày' }]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="birthdate" label="Ngày sinh" style={{ flex: 1 }}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
        </Space>
        <Form.Item name="techStack" label="Kỹ năng / Tech Stack">
          <Select mode="tags" placeholder="Gõ và Enter: React, Node.js, Java..." />
        </Form.Item>
        <Form.Item name="email" label="Email" rules={[{ type: 'email', message: 'Email không hợp lệ' }]}>
          <Input placeholder="nguyen.van.a@company.vn" />
        </Form.Item>
        <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
          <Form.Item name="gender" label="Giới tính" style={{ flex: 1 }}>
            <Select allowClear placeholder="Chọn giới tính">
              <Select.Option value="MALE">Nam</Select.Option>
              <Select.Option value="FEMALE">Nữ</Select.Option>
              <Select.Option value="OTHER">Khác</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="maritalStatus" label="Tình trạng hôn nhân" style={{ flex: 1 }}>
            <Select allowClear placeholder="Chọn tình trạng">
              <Select.Option value="SINGLE">Độc thân</Select.Option>
              <Select.Option value="MARRIED">Đã kết hôn</Select.Option>
              <Select.Option value="DIVORCED">Đã ly hôn</Select.Option>
              <Select.Option value="WIDOWED">Góa</Select.Option>
            </Select>
          </Form.Item>
        </Space>
        <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
          <Form.Item name="phoneNumber" label="Số điện thoại" style={{ flex: 1 }}><Input placeholder="0912345678" /></Form.Item>
          <Form.Item name="hometown" label="Quê quán" style={{ flex: 1 }}><ProvinceWardSelect /></Form.Item>
        </Space>
        <Divider style={{ fontSize: 13 }}>Căn cước công dân</Divider>
        <Form.Item name="cccd" label="Số CCCD"><Input placeholder="012345678901" /></Form.Item>
        <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
          <Form.Item name="cccdIssueDate" label="Ngày cấp" style={{ flex: 1 }}><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item>
          <Form.Item name="cccdIssuePlace" label="Nơi cấp" style={{ flex: 1 }}><Input placeholder="Cục Cảnh sát QLHC..." /></Form.Item>
        </Space>
      </Form>
    </Modal>
  );
}
