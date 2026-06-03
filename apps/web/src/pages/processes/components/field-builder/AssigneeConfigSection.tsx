import {
  Form, Input, Select, Typography, Radio, Card, Space,
} from 'antd';
import {
  type AssigneeConfig,
  type AssigneeMode,
  type SystemRole,
} from '../../../../api/processes.api';
import { type OrgUnitTree } from '../../../../api/org-units';
import { useThemePalette } from '../../../../hooks/useThemePalette';
import { ASSIGNEE_MODE_LABELS, SYSTEM_ROLE_OPTIONS, type AppUser } from './constants';

interface AssigneeConfigSectionProps {
  config?: AssigneeConfig;
  onChange: (cfg: AssigneeConfig | undefined) => void;
  allUsers: AppUser[];
  flatOrgUnits: OrgUnitTree[];
  isDark: boolean;
  preset: { primary: string };
  cardStyle: React.CSSProperties;
}

export function AssigneeConfigSection({
  config, onChange, allUsers, flatOrgUnits, cardStyle,
}: AssigneeConfigSectionProps) {
  const { textSecondary } = useThemePalette();
  const mode = config?.mode ?? 'fixed';

  const userOptions = allUsers
    .filter((u) => u.isActive)
    .map((u) => ({ value: u.id, label: `${u.name} (${u.email})` }));

  const orgOptions = flatOrgUnits.map((o) => ({ value: o.id, label: o.name }));

  return (
    <div style={{ paddingTop: 8 }}>
      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12, color: textSecondary }}>
        Cấu hình cách hệ thống xác định người xử lý cho bước này khi quy trình chạy.
        Nếu không cấu hình, hệ thống dùng giá trị từ BPMN.
      </Typography.Text>

      <Card style={cardStyle} bodyStyle={{ padding: 16 }}>
        <Form layout="vertical" component="div">
          <Form.Item label="Chế độ gán người xử lý">
            <Radio.Group
              value={mode}
              onChange={(e) => onChange({ ...(config ?? {}), mode: e.target.value as AssigneeMode })}
            >
              <Space direction="vertical" size={6}>
                {(Object.keys(ASSIGNEE_MODE_LABELS) as AssigneeMode[]).map((m) => (
                  <Radio key={m} value={m}>{ASSIGNEE_MODE_LABELS[m]}</Radio>
                ))}
              </Space>
            </Radio.Group>
          </Form.Item>

          {mode === 'fixed' && (
            <Form.Item label="Chọn người xử lý">
              <Select
                showSearch
                placeholder="Chọn người dùng..."
                value={config?.userId}
                onChange={(v) => onChange({ ...config!, mode: 'fixed', userId: v })}
                options={userOptions}
                filterOption={(input, opt) =>
                  (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
                }
                style={{ width: '100%' }}
              />
            </Form.Item>
          )}

          {mode === 'orgunit' && (
            <>
              <Form.Item label="Phòng ban">
                <Select
                  showSearch
                  placeholder="Chọn phòng ban..."
                  value={config?.orgUnitId}
                  onChange={(v) => onChange({ ...config!, mode: 'orgunit', orgUnitId: v })}
                  options={orgOptions}
                  filterOption={(input, opt) =>
                    (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  style={{ width: '100%' }}
                />
              </Form.Item>
              <Form.Item
                label="Lọc theo role hệ thống (tuỳ chọn)"
                help="Nếu để trống, lấy bất kỳ user active nào trong phòng ban"
              >
                <Select
                  allowClear
                  placeholder="Không lọc theo role"
                  value={config?.role}
                  onChange={(v) => onChange({ ...config!, mode: 'orgunit', role: v as SystemRole })}
                  options={SYSTEM_ROLE_OPTIONS}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </>
          )}

          {mode === 'variable' && (
            <Form.Item
              label="Tên biến"
              help='Tên field trong instance.variables chứa userId của người xử lý. Ví dụ: "approver_id"'
            >
              <Input
                placeholder="approver_id"
                value={config?.variablePath}
                onChange={(e) => onChange({ ...config!, mode: 'variable', variablePath: e.target.value })}
                style={{ fontFamily: 'monospace' }}
              />
            </Form.Item>
          )}

          {mode === 'requester_manager' && (
            <Typography.Text type="secondary" style={{ color: textSecondary, fontSize: 13 }}>
              Hệ thống tự động tìm user có role <strong>Leadership</strong> hoặc <strong>PM</strong>{' '}
              trong cùng phòng ban với người tạo yêu cầu.
            </Typography.Text>
          )}
        </Form>
      </Card>
    </div>
  );
}
