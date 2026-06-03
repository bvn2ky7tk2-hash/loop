import { Form, Input, Select, Modal } from 'antd';
import type { FormInstance } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { OrgUnitSelect } from '../../../components/selects';

interface CreateOrgUnitModalProps {
  open: boolean;
  form: FormInstance;
  onCancel: () => void;
  onFinish: (values: { name: string; code: string; parentId?: string; headJobTitleId?: string }) => void;
  confirmLoading: boolean;
  jobTitleOptions: { value: string; label: string }[];
  isDark: boolean;
  linkColor: string;
  bgContainer: string;
  borderColor: string;
}

export function CreateOrgUnitModal({
  open, form, onCancel, onFinish, confirmLoading, jobTitleOptions,
  isDark, linkColor, bgContainer, borderColor,
}: CreateOrgUnitModalProps) {
  return (
    <Modal
      title="Thêm đơn vị tổ chức"
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={confirmLoading}
      styles={{
        body: { background: bgContainer },
        header: { background: bgContainer, borderBottom: `1px solid ${borderColor}` },
      }}
    >
      <Form form={form} layout="vertical" onFinish={onFinish} style={{ marginTop: 12 }}>
        <Form.Item name="name" label="Tên đơn vị" rules={[{ required: true, message: 'Nhập tên đơn vị' }]}>
          <Input placeholder="VD: Phòng Kỹ thuật" />
        </Form.Item>
        <Form.Item
          name="code" label="Mã đơn vị"
          rules={[{ required: true }, { pattern: /^[A-Z0-9_-]+$/, message: 'Chỉ dùng chữ hoa, số, gạch ngang' }]}
        >
          <Input placeholder="VD: KT001" onChange={(e) => form.setFieldValue('code', e.target.value.toUpperCase())} />
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
          background: isDark ? 'rgba(147,197,253,0.08)' : 'rgba(99,102,241,0.06)',
          border: `1px dashed ${isDark ? 'rgba(147,197,253,0.25)' : 'rgba(99,102,241,0.25)'}`,
          fontSize: 12, color: linkColor,
        }}>
          <InfoCircleOutlined style={{ marginTop: 2, flexShrink: 0 }} />
          <span>Lãnh đạo đơn vị sẽ được tự động xác định sau khi tạo, dựa trên nhân viên có chức danh trưởng đơn vị.</span>
        </div>
      </Form>
    </Modal>
  );
}
