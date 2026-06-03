import { Modal, Form, Input, Select, theme } from 'antd';
import type { FormInstance, FormProps } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { OrgUnitSelect } from '../../../components/selects';

interface OptionItem { value: string; label: string }

interface Props {
  open: boolean;
  createOrgForm: FormInstance;
  confirmLoading: boolean;
  jobTitleOptions: OptionItem[];
  onCancel: () => void;
  onFinish: FormProps['onFinish'];
}

export function CreateOrgUnitModal({
  open, createOrgForm, confirmLoading, jobTitleOptions, onCancel, onFinish,
}: Props) {
  const { token } = theme.useToken();
  return (
    <Modal
      title="Thêm đơn vị tổ chức" open={open}
      onCancel={onCancel}
      onOk={() => createOrgForm.submit()}
      confirmLoading={confirmLoading}
    >
      <Form form={createOrgForm} layout="vertical" onFinish={onFinish}>
        <Form.Item name="name" label="Tên đơn vị" rules={[{ required: true, message: 'Nhập tên' }]}>
          <Input placeholder="VD: Phòng Kỹ thuật" />
        </Form.Item>
        <Form.Item name="code" label="Mã đơn vị"
          rules={[{ required: true, message: 'Nhập mã' }, { pattern: /^[A-Z0-9_-]+$/, message: 'Chỉ dùng chữ hoa, số, gạch ngang' }]}
        >
          <Input placeholder="VD: KT001" onChange={(e) => createOrgForm.setFieldValue('code', e.target.value.toUpperCase())} />
        </Form.Item>
        <Form.Item name="parentId" label="Đơn vị cha (để trống nếu là gốc)">
          <OrgUnitSelect allowClear placeholder="Chọn đơn vị cha..." style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="headJobTitleId" label="Chức danh trưởng đơn vị">
          <Select allowClear showSearch optionFilterProp="label"
            placeholder="VD: Trưởng phòng, Giám đốc..."
            options={jobTitleOptions}
          />
        </Form.Item>
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 8,
          padding: '8px 12px', borderRadius: 6, marginTop: 4,
          background: token.colorInfoBg,
          border: `1px dashed ${token.colorInfoBorder}`,
          fontSize: 12, color: token.colorInfoText,
        }}>
          <InfoCircleOutlined style={{ marginTop: 2, flexShrink: 0 }} />
          <span>Lãnh đạo sẽ được tự động xác định dựa trên nhân viên có chức danh trưởng đơn vị đã chọn.</span>
        </div>
      </Form>
    </Modal>
  );
}
