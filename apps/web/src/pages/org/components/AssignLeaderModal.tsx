import { Button, Form, Select, Modal, Typography } from 'antd';
import type { FormInstance } from 'antd';
import { CrownOutlined } from '@ant-design/icons';
import type { OrgUnitTree } from '../../../api/org-units';
import type { Employee } from '../../../api/employees';

const { Text } = Typography;

interface AssignLeaderModalProps {
  leaderTarget: OrgUnitTree | null;
  form: FormInstance;
  onCancel: () => void;
  onFinish: (values: { leaderId?: string | null }) => void;
  onRemoveLeader: () => void;
  confirmLoading: boolean;
  leaderUnitEmployees: Employee[];
  linkColor: string;
  textMuted: string;
  textSecondary: string;
  bgContainer: string;
  borderColor: string;
}

export function AssignLeaderModal({
  leaderTarget, form, onCancel, onFinish, onRemoveLeader, confirmLoading,
  leaderUnitEmployees, linkColor, textMuted, textSecondary, bgContainer, borderColor,
}: AssignLeaderModalProps) {
  return (
    <Modal
      title={
        <span>
          <CrownOutlined style={{ color: linkColor, marginRight: 8 }} />
          Gán lãnh đạo — {leaderTarget?.name ?? ''}
        </span>
      }
      open={!!leaderTarget}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={confirmLoading}
      footer={[
        <Button key="remove" danger
          disabled={!leaderTarget?.leaderInfo || confirmLoading}
          onClick={onRemoveLeader}
          loading={confirmLoading}
        >
          Xoá lãnh đạo
        </Button>,
        <Button key="cancel" onClick={onCancel}>
          Huỷ
        </Button>,
        <Button key="ok" type="primary" onClick={() => form.submit()} loading={confirmLoading} disabled={confirmLoading}>
          Xác nhận
        </Button>,
      ]}
      styles={{
        body: { background: bgContainer },
        header: { background: bgContainer, borderBottom: `1px solid ${borderColor}` },
      }}
    >
      <Form form={form} layout="vertical" onFinish={onFinish} style={{ marginTop: 12 }}>
        <Form.Item name="leaderId" label="Chọn lãnh đạo đơn vị">
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder={
              leaderUnitEmployees.length === 0
                ? 'Đơn vị chưa có nhân sự'
                : 'Chọn nhân viên làm lãnh đạo...'
            }
            options={leaderUnitEmployees.map((e) => ({
              value: e.id,
              label: `${e.fullName} (${e.code})`,
            }))}
          />
        </Form.Item>
        {leaderUnitEmployees.length === 0 && (
          <p style={{ margin: 0, fontSize: 12, color: textMuted, fontStyle: 'italic' }}>
            Chưa có nhân viên trong đơn vị này. Thêm nhân sự trước khi gán lãnh đạo.
          </p>
        )}
        {leaderTarget?.leaderInfo && (
          <p style={{ margin: '4px 0 0', fontSize: 12, color: textSecondary }}>
            Lãnh đạo hiện tại: <Text style={{ color: linkColor, fontWeight: 600 }}>{leaderTarget.leaderInfo.fullName}</Text>
          </p>
        )}
      </Form>
    </Modal>
  );
}
