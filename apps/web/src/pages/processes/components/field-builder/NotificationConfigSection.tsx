import {
  Form, Input, Select, Switch, Tag, Typography, Card, Space,
} from 'antd';
import {
  type NotificationTrigger,
} from '../../../../api/processes.api';
import { useThemePalette } from '../../../../hooks/useThemePalette';
import { TEMPLATE_VARS, RECIPIENT_PRESETS, type AppUser } from './constants';

interface NotificationConfigSectionProps {
  config?: { taskAssigned?: NotificationTrigger; taskCompleted?: NotificationTrigger };
  onChange: (cfg: { taskAssigned?: NotificationTrigger; taskCompleted?: NotificationTrigger } | undefined) => void;
  allUsers: AppUser[];
  isDark: boolean;
  cardStyle: React.CSSProperties;
}

export function NotificationConfigSection({ config, onChange, allUsers, isDark, cardStyle }: NotificationConfigSectionProps) {
  const { textSecondary } = useThemePalette();

  const fixedUserOptions = allUsers
    .filter((u) => u.isActive)
    .map((u) => ({ value: `user:${u.id}`, label: `${u.name} (cố định)` }));

  const allRecipientOptions = [
    ...RECIPIENT_PRESETS,
    ...fixedUserOptions,
  ];

  const updateTrigger = (
    key: 'taskAssigned' | 'taskCompleted',
    patch: Partial<NotificationTrigger>,
  ) => {
    const current = config?.[key] ?? { enabled: false, recipients: [], subject: '', bodyTemplate: '' };
    onChange({ ...config, [key]: { ...current, ...patch } });
  };

  return (
    <div style={{ paddingTop: 8 }}>
      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12, color: textSecondary }}>
        Cấu hình email + notification gửi theo từng sự kiện của bước này.
        Dùng <code style={{ fontSize: 12 }}>{'{{biến}}'}</code> trong nội dung.
      </Typography.Text>

      {/* Template vars hint */}
      <div style={{ marginBottom: 12 }}>
        <Typography.Text type="secondary" style={{ fontSize: 12, color: textSecondary }}>
          Biến khả dụng:{' '}
        </Typography.Text>
        {TEMPLATE_VARS.map((v) => (
          <Tag key={v} style={{ fontFamily: 'monospace', fontSize: 11, marginBottom: 4 }}>{v}</Tag>
        ))}
      </div>

      {/* Trigger: Khi nhận task */}
      <NotificationTriggerCard
        title="Khi nhận task (task assigned)"
        trigger={config?.taskAssigned}
        onUpdate={(patch) => updateTrigger('taskAssigned', patch)}
        allRecipientOptions={allRecipientOptions}
        isDark={isDark}
        cardStyle={cardStyle}
      />

      {/* Trigger: Khi hoàn thành task */}
      <NotificationTriggerCard
        title="Khi hoàn thành task (task completed)"
        trigger={config?.taskCompleted}
        onUpdate={(patch) => updateTrigger('taskCompleted', patch)}
        allRecipientOptions={allRecipientOptions}
        isDark={isDark}
        cardStyle={cardStyle}
      />
    </div>
  );
}

interface NotificationTriggerCardProps {
  title: string;
  trigger?: NotificationTrigger;
  onUpdate: (patch: Partial<NotificationTrigger>) => void;
  allRecipientOptions: { value: string; label: string }[];
  isDark: boolean;
  cardStyle: React.CSSProperties;
}

function NotificationTriggerCard({
  title, trigger, onUpdate, allRecipientOptions, cardStyle,
}: NotificationTriggerCardProps) {
  const enabled = trigger?.enabled ?? false;

  return (
    <Card
      style={cardStyle}
      bodyStyle={{ padding: 16 }}
      title={
        <Space>
          <Switch
            size="small"
            checked={enabled}
            onChange={(v) => onUpdate({ enabled: v })}
          />
          <Typography.Text style={{ fontSize: 13 }}>{title}</Typography.Text>
        </Space>
      }
    >
      {enabled && (
        <Form layout="vertical" component="div">
          <Form.Item label="Người nhận">
            <Select
              mode="multiple"
              placeholder="Chọn người nhận..."
              value={trigger?.recipients ?? []}
              onChange={(v) => onUpdate({ recipients: v })}
              options={allRecipientOptions}
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item label="Tiêu đề email" help="Hỗ trợ {{process.name}}, {{task.name}}, ...">
            <Input
              value={trigger?.subject ?? ''}
              onChange={(e) => onUpdate({ subject: e.target.value })}
              placeholder="{{process.name}} — Bước {{task.name}} cần xử lý"
            />
          </Form.Item>
          <Form.Item label="Nội dung email" help="Hỗ trợ {{recipient.name}}, {{requester.name}}, ...">
            <Input.TextArea
              rows={5}
              value={trigger?.bodyTemplate ?? ''}
              onChange={(e) => onUpdate({ bodyTemplate: e.target.value })}
              placeholder={`Xin chào {{recipient.name}},\n\nYêu cầu "{{process.name}}" từ {{requester.name}} đang chờ bạn xử lý.\nBước: {{task.name}}\nHạn: {{task.dueDate}}\n\nVui lòng đăng nhập hệ thống để tiếp tục.`}
              style={{ fontFamily: 'monospace', fontSize: 12 }}
            />
          </Form.Item>
        </Form>
      )}
    </Card>
  );
}
