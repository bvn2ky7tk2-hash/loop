import { Form, Input, Select, Modal, Typography } from 'antd';
import type { FormInstance } from 'antd';
import { CrownOutlined, UserOutlined } from '@ant-design/icons';
import type { OrgUnitTree } from '../../../api/org-units';
import type { Employee } from '../../../api/employees';
import { OrgUnitSelect } from '../../../components/selects';

const { Text } = Typography;

interface EditOrgUnitModalProps {
  editTarget: OrgUnitTree | null;
  form: FormInstance;
  onCancel: () => void;
  onFinish: (values: Record<string, unknown>) => void;
  confirmLoading: boolean;
  jobTitleOptions: { value: string; label: string }[];
  autoLeader: Employee | null;
  watchEditHeadJobTitle: string | null | undefined;
  isDark: boolean;
  linkColor: string;
  textPrimary: string;
  textMuted: string;
  bgContainer: string;
  borderColor: string;
}

export function EditOrgUnitModal({
  editTarget, form, onCancel, onFinish, confirmLoading, jobTitleOptions,
  autoLeader, watchEditHeadJobTitle, isDark, linkColor, textPrimary, textMuted,
  bgContainer, borderColor,
}: EditOrgUnitModalProps) {
  return (
    <Modal
      title={`Sửa: ${editTarget?.name ?? ''}`}
      open={!!editTarget}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={confirmLoading}
      styles={{
        body: { background: bgContainer },
        header: { background: bgContainer, borderBottom: `1px solid ${borderColor}` },
      }}
    >
      <Form form={form} layout="vertical"
        onFinish={onFinish}
        style={{ marginTop: 12 }}
      >
        <Form.Item name="name" label="Tên đơn vị" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item
          name="code" label="Mã đơn vị"
          rules={[{ required: true }, { pattern: /^[A-Z0-9_-]+$/, message: 'Chỉ dùng chữ hoa, số, gạch ngang' }]}
        >
          <Input onChange={(e) => form.setFieldValue('code', e.target.value.toUpperCase())} />
        </Form.Item>
        <Form.Item name="parentId" label="Đơn vị cha (để trống nếu là gốc)">
          <OrgUnitSelect allowClear placeholder="Chọn đơn vị cha..." style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="headJobTitleId" label="Chức danh trưởng đơn vị">
          <Select
            allowClear showSearch optionFilterProp="label"
            placeholder="VD: Trưởng phòng, Giám đốc..."
            options={jobTitleOptions}
          />
        </Form.Item>
        <Form.Item label={
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <CrownOutlined style={{ color: linkColor, fontSize: 12 }} />
            Lãnh đạo đơn vị (tự động theo chức danh)
          </span>
        }>
          <div style={{
            padding: '5px 11px', borderRadius: 6, minHeight: 32,
            display: 'flex', alignItems: 'center',
            border: `1px solid ${borderColor}`,
            background: isDark ? 'rgba(255,255,255,0.03)' : '#FAFAFA',
            color: autoLeader ? textPrimary : textMuted,
            fontSize: 13,
          }}>
            {autoLeader ? (
              <>
                <UserOutlined style={{ marginRight: 8, color: linkColor }} />
                <Text style={{ color: linkColor, fontWeight: 600 }}>{autoLeader.code}</Text>
                <Text style={{ color: textPrimary, marginLeft: 6 }}>— {autoLeader.fullName}</Text>
              </>
            ) : watchEditHeadJobTitle ? (
              <span style={{ fontStyle: 'italic', fontSize: 12 }}>Chưa có nhân viên phù hợp trong đơn vị này</span>
            ) : (
              <span style={{ fontStyle: 'italic', fontSize: 12 }}>Chọn chức danh để xem lãnh đạo</span>
            )}
          </div>
        </Form.Item>
      </Form>
    </Modal>
  );
}
