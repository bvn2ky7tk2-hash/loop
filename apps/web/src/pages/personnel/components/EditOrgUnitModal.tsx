import { Modal, Form, Input, Select, theme } from 'antd';
import type { FormInstance, FormProps } from 'antd';
import { CrownOutlined, UserOutlined } from '@ant-design/icons';
import { OrgUnitSelect } from '../../../components/selects';
import type { OrgUnitTree } from '../../../api/org-units';
import type { Employee } from '../../../api/employees';

interface OptionItem { value: string; label: string }

interface Props {
  editOrgTarget: OrgUnitTree | null;
  editOrgForm: FormInstance;
  confirmLoading: boolean;
  jobTitleOptions: OptionItem[];
  watchEditOrgHeadJobTitle?: string;
  autoOrgLeader: Employee | null;
  onCancel: () => void;
  onAfterOpenChange: (visible: boolean) => void;
  onFinish: FormProps['onFinish'];
}

export function EditOrgUnitModal({
  editOrgTarget, editOrgForm, confirmLoading, jobTitleOptions,
  watchEditOrgHeadJobTitle, autoOrgLeader, onCancel, onAfterOpenChange, onFinish,
}: Props) {
  const { token } = theme.useToken();
  return (
    <Modal
      title={`Sửa: ${editOrgTarget?.name ?? ''}`} open={!!editOrgTarget}
      onCancel={onCancel} onOk={() => editOrgForm.submit()}
      confirmLoading={confirmLoading}
      afterOpenChange={onAfterOpenChange}
    >
      <Form form={editOrgForm} layout="vertical" onFinish={onFinish}>
        <Form.Item name="name" label="Tên đơn vị" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="code" label="Mã đơn vị"
          rules={[{ required: true }, { pattern: /^[A-Z0-9_-]+$/, message: 'Chỉ dùng chữ hoa, số, gạch ngang' }]}
        >
          <Input onChange={(e) => editOrgForm.setFieldValue('code', e.target.value.toUpperCase())} />
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
        <Form.Item label={
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <CrownOutlined style={{ color: token.colorPrimary, fontSize: 12 }} />
            Lãnh đạo đơn vị (tự động theo chức danh)
          </span>
        }>
          <div style={{
            padding: '5px 11px', borderRadius: 6, minHeight: 32,
            display: 'flex', alignItems: 'center',
            border: `1px solid ${token.colorBorder}`,
            background: token.colorFillAlter,
            fontSize: 13,
          }}>
            {autoOrgLeader ? (
              <>
                <UserOutlined style={{ marginRight: 8, color: token.colorPrimary }} />
                <span style={{ color: token.colorPrimary, fontWeight: 600 }}>{autoOrgLeader.code}</span>
                <span style={{ color: token.colorText, marginLeft: 6 }}>— {autoOrgLeader.fullName}</span>
              </>
            ) : watchEditOrgHeadJobTitle ? (
              <span style={{ fontStyle: 'italic', fontSize: 12, color: token.colorTextTertiary }}>
                Chưa có nhân viên phù hợp trong đơn vị này
              </span>
            ) : (
              <span style={{ fontStyle: 'italic', fontSize: 12, color: token.colorTextTertiary }}>
                Chọn chức danh để xem lãnh đạo
              </span>
            )}
          </div>
        </Form.Item>
      </Form>
    </Modal>
  );
}
