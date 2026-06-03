import {
  Modal, Form, Input, Select, Space, DatePicker, Divider,
} from 'antd';
import type { FormInstance, FormProps } from 'antd';
import { ProvinceWardSelect } from '../../../components/selects';
import { LEVELS } from '../personnelConstants';
import type { Employee } from '../../../api/employees';

interface OptionItem { value: string; label: string }

interface Props {
  editEmployee: Employee | null;
  editForm: FormInstance;
  confirmLoading: boolean;
  orgOptions: OptionItem[];
  jobTitleOptions: OptionItem[];
  positionOptions: OptionItem[];
  editOrgUnitId?: string | null;
  onCancel: () => void;
  onFinish: FormProps['onFinish'];
}

export function EditEmployeeModal({
  editEmployee, editForm, confirmLoading,
  orgOptions, jobTitleOptions, positionOptions, editOrgUnitId,
  onCancel, onFinish,
}: Props) {
  return (
    <Modal
      title={`Sửa: ${editEmployee?.fullName ?? ''}`} open={!!editEmployee}
      onCancel={onCancel} onOk={() => editForm.submit()}
      confirmLoading={confirmLoading}
    >
      <Form form={editForm} layout="vertical" onFinish={onFinish}>
        <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
          <Form.Item name="code" label="Mã nhân sự" style={{ flex: 1 }}>
            <Input disabled />
          </Form.Item>
          <Form.Item name="fullName" label="Họ và tên" style={{ flex: 1 }} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Space>
        <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
          <Form.Item name="level" label="Cấp độ" style={{ flex: 1 }} rules={[{ required: true }]}>
            <Select options={LEVELS.map((l) => ({ value: l, label: l }))} />
          </Form.Item>
          <Form.Item name="orgUnitId" label="Phòng ban" style={{ flex: 1 }}>
            <Select showSearch allowClear placeholder="Chọn phòng ban..."
              filterOption={(input, opt) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())}
              options={orgOptions}
              onChange={() => editForm.setFieldValue('positionId', null)}
            />
          </Form.Item>
        </Space>
        <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
          <Form.Item name="jobTitleId" label="Chức danh" style={{ flex: 1 }}>
            <Select showSearch placeholder="Chọn chức danh..." allowClear
              filterOption={(input, opt) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())}
              options={jobTitleOptions}
            />
          </Form.Item>
          <Form.Item name="positionId" label="Vị trí biên chế" style={{ flex: 1 }}>
            <Select
              allowClear showSearch
              placeholder={editOrgUnitId ? 'Chọn vị trí...' : 'Chọn phòng ban trước'}
              disabled={!editOrgUnitId}
              filterOption={(input, opt) => (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())}
              options={positionOptions}
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
          <Select mode="tags" placeholder="React, Node.js..." />
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
          <Form.Item name="phoneNumber" label="Số điện thoại" style={{ flex: 1 }}><Input /></Form.Item>
          <Form.Item name="hometown" label="Quê quán" style={{ flex: 1 }}><ProvinceWardSelect /></Form.Item>
        </Space>
        <Divider style={{ fontSize: 13 }}>Căn cước công dân</Divider>
        <Form.Item name="cccd" label="Số CCCD"><Input /></Form.Item>
        <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
          <Form.Item name="cccdIssueDate" label="Ngày cấp" style={{ flex: 1 }}><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item>
          <Form.Item name="cccdIssuePlace" label="Nơi cấp" style={{ flex: 1 }}><Input /></Form.Item>
        </Space>
      </Form>
    </Modal>
  );
}
