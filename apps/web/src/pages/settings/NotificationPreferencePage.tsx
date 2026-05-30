import { Table, Select, Typography, Spin } from 'antd';
import { BellOutlined, MailOutlined, AppstoreOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useThemePalette } from '../../hooks/useThemePalette';
import { PageHeader } from '../../components/ui/PageHeader';
import { preferencesApi, type NotificationPreference, type NotificationChannel } from '../../api/notifications';

const { Text } = Typography;

// ─── Danh sách module theo spec E23.4 ─────────────────────────────────────────

const MODULE_LABELS: Record<string, string> = {
  TASK: 'Nhiệm vụ (Task)',
  LEAVE: 'Nghỉ phép',
  EXPENSE: 'Chi phí / Expense',
  TIMESHEET: 'Bảng công / Timesheet',
  CONTRACT: 'Hợp đồng',
  PAYROLL: 'Lương',
  BPM: 'Quy trình BPM',
  ALERT: 'Cảnh báo hệ thống',
};

const CHANNEL_OPTIONS: { value: NotificationChannel; label: string }[] = [
  { value: 'IN_APP', label: 'Trong ứng dụng' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'BOTH', label: 'Cả hai' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function NotificationPreferencePage() {
  const { textPrimary, textMuted, bgContainer, borderColor } = useThemePalette();
  const queryClient = useQueryClient();

  const { data: preferences = [], isLoading } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: preferencesApi.list,
  });

  const { mutate: updatePref } = useMutation({
    mutationFn: ({ moduleType, channel }: { moduleType: string; channel: NotificationChannel }) =>
      preferencesApi.update(moduleType, channel),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
    },
  });

  const columns: ColumnsType<NotificationPreference> = [
    {
      title: <Text style={{ color: textPrimary }}>Module</Text>,
      dataIndex: 'moduleType',
      key: 'moduleType',
      render: (v: string) => (
        <Text style={{ color: textPrimary, fontWeight: 500 }}>
          {MODULE_LABELS[v] ?? v}
        </Text>
      ),
    },
    {
      title: <Text style={{ color: textPrimary }}>Kênh nhận thông báo</Text>,
      dataIndex: 'channel',
      key: 'channel',
      width: 220,
      render: (channel: NotificationChannel, record: NotificationPreference) => (
        <Select
          value={channel}
          options={CHANNEL_OPTIONS}
          style={{ width: 190 }}
          onChange={(val) => updatePref({ moduleType: record.moduleType, channel: val })}
          suffixIcon={<MailOutlined style={{ color: textMuted }} />}
        />
      ),
    },
    {
      title: <Text style={{ color: textPrimary }}>Mô tả</Text>,
      key: 'desc',
      render: (_: unknown, record: NotificationPreference) => {
        const map: Record<NotificationChannel, string> = {
          IN_APP: 'Chỉ nhận thông báo trong ứng dụng',
          EMAIL: 'Chỉ nhận qua email',
          BOTH: 'Nhận cả trong ứng dụng và email',
        };
        return <Text style={{ color: textMuted }}>{map[record.channel]}</Text>;
      },
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Tuỳ chọn Thông báo"
        icon={<BellOutlined />}
        iconColor="#6366F1"
      />

      <div
        style={{
          background: bgContainer,
          border: `1px solid ${borderColor}`,
          borderRadius: 8,
          padding: '4px 0',
          marginBottom: 8,
        }}
      >
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${borderColor}` }}>
          <Text style={{ color: textMuted, fontSize: 13 }}>
            <AppstoreOutlined style={{ marginRight: 6 }} />
            Chọn kênh nhận thông báo cho từng module. Thay đổi được lưu ngay lập tức.
          </Text>
        </div>

        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <Spin />
          </div>
        ) : (
          <Table<NotificationPreference>
            rowKey="id"
            columns={columns}
            dataSource={preferences}
            pagination={false}
            size="middle"
          />
        )}
      </div>
    </div>
  );
}
