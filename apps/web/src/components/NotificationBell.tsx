import { useState } from 'react';
import { Badge, Button, Popover, List, Typography, Space, Tooltip, Divider, Segmented } from 'antd';
import {
  BellOutlined,
  CheckOutlined,
  BugOutlined,
  CheckSquareOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  BellFilled,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';
import { notificationsApi, type AppNotification } from '../api/notifications';
import { useThemePalette } from '../hooks/useThemePalette';

dayjs.extend(relativeTime);
dayjs.locale('vi');

const { Text } = Typography;

type FilterTab = 'all' | 'unread';

function getNotifIcon(type: string): React.ReactNode {
  if (type.startsWith('TASK_')) return <CheckSquareOutlined style={{ color: '#6366F1' }} />;
  if (type.startsWith('BUG_') || type.startsWith('ISSUE_')) return <BugOutlined style={{ color: '#EF4444' }} />;
  if (type.startsWith('LEAVE_')) return <ClockCircleOutlined style={{ color: '#10B981' }} />;
  if (type.startsWith('EXPENSE_')) return <DollarOutlined style={{ color: '#F59E0B' }} />;
  if (type.startsWith('PROCESS_')) return <InfoCircleOutlined style={{ color: '#3B82F6' }} />;
  return <BellFilled style={{ color: '#94A3B8' }} />;
}

interface Props {
  unreadCount: number;
}

function NotifList({
  items,
  onItemClick,
}: {
  items: AppNotification[];
  onItemClick: (n: AppNotification) => void;
}) {
  const { textPrimary, textMuted, preset, isDark } = useThemePalette();

  return (
    <List
      dataSource={items.slice(0, 15)}
      locale={{ emptyText: 'Không có thông báo' }}
      renderItem={(item) => (
        <List.Item
          onClick={() => onItemClick(item)}
          style={{
            cursor: 'pointer',
            padding: '8px 10px',
            borderRadius: 8,
            marginBottom: 2,
            background: item.isRead
              ? 'transparent'
              : isDark
              ? `${preset.primary}15`
              : `${preset.primary}08`,
            transition: 'background 0.15s',
          }}
        >
          <div style={{ width: '100%' }}>
            <Space align="start" size={8} style={{ width: '100%' }}>
              <div style={{ marginTop: 2, flexShrink: 0 }}>{getNotifIcon(item.type)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <Text
                    strong={!item.isRead}
                    style={{
                      fontSize: 13,
                      color: textPrimary,
                      lineHeight: '1.4',
                      flex: 1,
                    }}
                  >
                    {item.title}
                  </Text>
                  <Text style={{ fontSize: 11, color: textMuted, whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {dayjs(item.createdAt).fromNow()}
                  </Text>
                </div>
                <Text style={{ fontSize: 12, color: textMuted, display: 'block', marginTop: 2, lineHeight: '1.4' }}>
                  {item.body}
                </Text>
              </div>
            </Space>
          </div>
        </List.Item>
      )}
    />
  );
}

export default function NotificationBell({ unreadCount }: Props) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<FilterTab>('all');
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { textPrimary, borderColor, bgContainer } = useThemePalette();

  const { data: feed } = useQuery({
    queryKey: ['notifications', filter],
    queryFn: () => notificationsApi.list({ page: 1, limit: 30, unreadOnly: filter === 'unread' }),
    refetchInterval: 30_000,
    enabled: open,
  });

  const notifications = feed?.data ?? [];

  const markReadMutation = useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-count'] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-count'] });
    },
  });

  const handleItemClick = (n: AppNotification) => {
    if (!n.isRead) markReadMutation.mutate(n.id);

    // Ưu tiên link tường minh
    if (n.link) {
      navigate(n.link);
    } else if (n.entityType === 'BUG' && n.entityId) {
      navigate(`/bugs?bugId=${n.entityId}`);
    } else if (n.entityType === 'ISSUE' && n.entityId) {
      navigate(`/bugs?bugId=${n.entityId}`);
    } else if (n.entityType === 'TASK' && n.entityId) {
      navigate('/tasks');
    } else {
      const payload = n.payload ?? {};
      if (payload['taskId']) navigate(`/tasks`);
      else if (payload['projectId']) navigate('/projects');
    }
    setOpen(false);
  };

  const content = (
    <div style={{ width: 380 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ fontWeight: 600, fontSize: 15, color: textPrimary }}>Thông báo</Text>
        <Button
          type="text"
          size="small"
          icon={<CheckOutlined />}
          loading={markAllMutation.isPending}
          onClick={() => markAllMutation.mutate()}
          disabled={unreadCount === 0}
          style={{ fontSize: 12 }}
        >
          Đánh dấu tất cả đã đọc
        </Button>
      </div>

      {/* Filter tabs */}
      <Segmented
        size="small"
        value={filter}
        onChange={(v) => setFilter(v as FilterTab)}
        options={[
          { label: 'Tất cả', value: 'all' },
          {
            label: unreadCount > 0 ? `Chưa đọc (${unreadCount})` : 'Chưa đọc',
            value: 'unread',
          },
        ]}
        style={{ marginBottom: 8, width: '100%' }}
        block
      />

      {/* List */}
      <div style={{ maxHeight: 380, overflowY: 'auto', marginRight: -4, paddingRight: 4 }}>
        <NotifList items={notifications} onItemClick={handleItemClick} />
      </div>

      <Divider style={{ margin: '8px 0', borderColor }} />
      <div style={{ textAlign: 'center' }}>
        <Button
          type="link"
          size="small"
          onClick={() => { navigate('/alerts'); setOpen(false); }}
          style={{ fontSize: 12 }}
        >
          Xem tất cả thông báo
        </Button>
      </div>
    </div>
  );

  return (
    <Popover
      content={content}
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="bottomRight"
      arrow={false}
      styles={{
        body: {
          padding: '12px 14px 10px',
          background: bgContainer,
          borderRadius: 12,
          boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
        },
      }}
    >
      <Tooltip title="Thông báo">
        <Badge count={unreadCount} size="small" overflowCount={99}>
          <Button
            type="text"
            icon={<BellOutlined />}
            size="large"
            aria-label="Thông báo"
          />
        </Badge>
      </Tooltip>
    </Popover>
  );
}
