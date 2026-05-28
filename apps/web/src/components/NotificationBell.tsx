import { useState } from 'react';
import { Badge, Button, Popover, Tabs, List, Typography, Space, Tooltip, Divider } from 'antd';
import {
  BellOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';
import { notificationsApi, type Notification } from '../api/notifications';

dayjs.extend(relativeTime);
dayjs.locale('vi');

const { Text } = Typography;

type TabKey = 'all' | 'task' | 'resource' | 'budget' | 'bugs';

const TAB_FILTERS: Record<TabKey, (n: Notification) => boolean> = {
  all: () => true,
  task: (n) => n.type.startsWith('TASK_'),
  resource: (n) => n.type.startsWith('RESOURCE_') || n.type.startsWith('EFFORT_'),
  budget: (n) => n.type.startsWith('BUDGET_'),
  bugs: (n) => ['BUG_ASSIGNED', 'BUG_STATUS_CHANGED', 'BUG_CRITICAL'].includes(n.type),
};

interface Props {
  unreadCount: number;
}

function NotifList({
  items,
  onItemClick,
}: {
  items: Notification[];
  onItemClick: (n: Notification) => void;
}) {
  return (
    <List
      dataSource={items.slice(0, 10)}
      locale={{ emptyText: 'Không có thông báo' }}
      renderItem={(item) => (
        <List.Item
          onClick={() => onItemClick(item)}
          style={{ cursor: 'pointer', padding: '8px 0', opacity: item.isRead ? 0.65 : 1 }}
        >
          <div style={{ width: '100%' }}>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Space size={6}>
                <Text strong={!item.isRead} style={{ fontSize: 13 }}>{item.title}</Text>
              </Space>
              <Text type="secondary" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
                {dayjs(item.createdAt).fromNow()}
              </Text>
            </Space>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 2 }}>
              {item.body}
            </Text>
          </div>
        </List.Item>
      )}
    />
  );
}

export default function NotificationBell({ unreadCount }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TabKey>('all');
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list(),
    refetchInterval: 30_000,
    enabled: open,
  });

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

  const handleItemClick = (n: Notification) => {
    if (!n.isRead) markReadMutation.mutate(n.id);
    if (n.entityType === 'BUG' && n.entityId) {
      navigate(`/bugs?bugId=${n.entityId}`);
    } else if (n.entityType === 'ISSUE' && n.entityId) {
      navigate(`/bugs?bugId=${n.entityId}`);
    } else {
      const payload = n.payload ?? {};
      if (payload['taskId']) navigate(`/tasks?projectId=${payload['projectId'] ?? ''}`);
      else if (payload['projectId']) navigate(`/projects`);
    }
    setOpen(false);
  };

  const filtered = notifications.filter(TAB_FILTERS[tab]);

  const content = (
    <div style={{ width: 360 }}>
      <Tabs
        size="small"
        activeKey={tab}
        onChange={(k) => setTab(k as TabKey)}
        items={[
          { key: 'all',      label: 'Tất cả' },
          { key: 'task',     label: 'Task' },
          { key: 'resource', label: 'Nguồn lực' },
          { key: 'budget',   label: 'Ngân sách' },
          { key: 'bugs',     label: 'Bugs' },
        ]}
        style={{ marginBottom: 0 }}
      />
      <div style={{ maxHeight: 360, overflowY: 'auto' }}>
        <NotifList
          items={filtered}
          onItemClick={handleItemClick}
        />
      </div>
      <Divider style={{ margin: '8px 0' }} />
      <Space style={{ justifyContent: 'space-between', width: '100%' }}>
        <Button
          type="link"
          size="small"
          onClick={() => { navigate('/alerts'); setOpen(false); }}
        >
          Xem tất cả
        </Button>
        <Button
          type="text"
          size="small"
          icon={<CheckOutlined />}
          loading={markAllMutation.isPending}
          onClick={() => markAllMutation.mutate()}
          disabled={unreadCount === 0}
        >
          Đánh dấu đã đọc
        </Button>
      </Space>
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
      styles={{ body: { padding: '8px 12px 12px' } }}
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
