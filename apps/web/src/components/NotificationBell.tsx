import { useState } from 'react';
import { Badge, Button, Popover, List, Typography, Space, Tooltip, Divider, Segmented, message } from 'antd';
import {
  BellOutlined,
  CheckOutlined,
  BugOutlined,
  CheckSquareOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  BellFilled,
  InfoCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';
import {
  notificationsApi,
  inlineActionApi,
  countActionable,
  ACTIONABLE_TYPES,
  type AppNotification,
} from '../api/notifications';
import { useThemePalette } from '../hooks/useThemePalette';

dayjs.extend(relativeTime);
dayjs.locale('vi');

const { Text } = Typography;

type FilterTab = 'all' | 'unread';

/** Các type được gộp group khi >= 3 items */
const GROUP_LABEL: Record<string, { label: string; path: string }> = {
  EXPENSE_PENDING:  { label: 'phiếu chi chờ duyệt', path: '/expenses' },
  LEAVE_PENDING:    { label: 'đơn nghỉ phép chờ duyệt', path: '/leaves' },
  TASK_ASSIGNED:    { label: 'task được giao', path: '/tasks' },
  BUG_ASSIGNED:     { label: 'bug được giao', path: '/bugs' },
};

function getNotifIcon(type: string): React.ReactNode {
  if (type.startsWith('TASK_')) return <CheckSquareOutlined style={{ color: '#6366F1' }} />;
  if (type.startsWith('BUG_') || type.startsWith('ISSUE_')) return <BugOutlined style={{ color: '#EF4444' }} />;
  if (type.startsWith('LEAVE_')) return <ClockCircleOutlined style={{ color: '#10B981' }} />;
  if (type.startsWith('EXPENSE_')) return <DollarOutlined style={{ color: '#F59E0B' }} />;
  if (type.startsWith('PROCESS_')) return <InfoCircleOutlined style={{ color: '#3B82F6' }} />;
  return <BellFilled style={{ color: '#94A3B8' }} />;
}

// ─── Grouped item (type xuất hiện >= 3 lần) ─────────────────────────────────

interface GroupedItemProps {
  type: string;
  count: number;
  onViewAll: (path: string) => void;
}

function GroupedNotifItem({ type, count, onViewAll }: GroupedItemProps) {
  const { textPrimary, textMuted, bgCard, borderColor } = useThemePalette();
  const meta = GROUP_LABEL[type];
  if (!meta) return null;
  return (
    <List.Item
      style={{
        padding: '8px 10px',
        borderRadius: 8,
        marginBottom: 2,
        background: bgCard,
        border: `1px solid ${borderColor}`,
      }}
    >
      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
        <Space>
          {getNotifIcon(type)}
          <Text style={{ fontSize: 13, color: textPrimary }}>
            <Text strong style={{ color: textPrimary }}>{count}</Text>
            {' '}{meta.label}
          </Text>
        </Space>
        <Button
          type="link"
          size="small"
          icon={<RightOutlined />}
          onClick={() => onViewAll(meta.path)}
          style={{ fontSize: 12, color: textMuted, padding: 0 }}
        >
          Xem tất cả
        </Button>
      </Space>
    </List.Item>
  );
}

// ─── Single notification item ─────────────────────────────────────────────────

interface SingleItemProps {
  item: AppNotification;
  onClick: (n: AppNotification) => void;
  onApprove?: (n: AppNotification) => void;
  onReject?: (n: AppNotification) => void;
  approving?: boolean;
  rejecting?: boolean;
}

function SingleNotifItem({ item, onClick, onApprove, onReject, approving, rejecting }: SingleItemProps) {
  const { textPrimary, textMuted, preset, isDark } = useThemePalette();
  const showActions = (item.type === 'EXPENSE_PENDING' || item.type === 'LEAVE_PENDING')
    && (item.resourceId || item.entityId);

  return (
    <List.Item
      onClick={() => onClick(item)}
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
            {showActions && (
              <Space size={6} style={{ marginTop: 6 }} onClick={(e) => e.stopPropagation()}>
                <Button
                  size="small"
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  loading={approving}
                  disabled={approving || rejecting}
                  onClick={() => onApprove?.(item)}
                  style={{ fontSize: 11, height: 24 }}
                >
                  Duyệt
                </Button>
                <Button
                  size="small"
                  danger
                  icon={<CloseCircleOutlined />}
                  loading={rejecting}
                  disabled={approving || rejecting}
                  onClick={() => onReject?.(item)}
                  style={{ fontSize: 11, height: 24 }}
                >
                  Từ chối
                </Button>
              </Space>
            )}
          </div>
        </Space>
      </div>
    </List.Item>
  );
}

// ─── NotifList — tự gộp group khi >= 3 cùng type ────────────────────────────

interface NotifListProps {
  items: AppNotification[];
  onItemClick: (n: AppNotification) => void;
  onNavigate: (path: string) => void;
}

function NotifList({ items, onItemClick, onNavigate }: NotifListProps) {
  const [actionState, setActionState] = useState<Record<string, 'approving' | 'rejecting'>>({});
  const qc = useQueryClient();
  const [msg, msgCtx] = message.useMessage();

  // Đếm từng type trong group candidates
  const typeCounts: Record<string, number> = {};
  items.forEach((n) => {
    if (GROUP_LABEL[n.type]) {
      typeCounts[n.type] = (typeCounts[n.type] ?? 0) + 1;
    }
  });

  // Types sẽ được gộp (>= 3)
  const groupedTypes = new Set(
    Object.entries(typeCounts)
      .filter(([, count]) => count >= 3)
      .map(([type]) => type)
  );

  // Items hiển thị lẻ (không bị gộp)
  const singularItems = items.filter((n) => !groupedTypes.has(n.type)).slice(0, 15);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['notifications'] });
    qc.invalidateQueries({ queryKey: ['notifications-count'] });
  };

  const handleApprove = async (n: AppNotification) => {
    const id = n.resourceId ?? n.entityId ?? '';
    if (!id) return;
    setActionState((s) => ({ ...s, [n.id]: 'approving' }));
    try {
      if (n.type === 'EXPENSE_PENDING') {
        await inlineActionApi.approveExpense(id);
        msg.success('Đã duyệt phiếu chi');
      } else {
        await inlineActionApi.approveLeave(id);
        msg.success('Đã duyệt đơn nghỉ phép');
      }
      invalidate();
    } catch {
      msg.error('Không thể duyệt, vui lòng thử lại');
    } finally {
      setActionState((s) => { const ns = { ...s }; delete ns[n.id]; return ns; });
    }
  };

  const handleReject = async (n: AppNotification) => {
    const id = n.resourceId ?? n.entityId ?? '';
    if (!id) return;
    setActionState((s) => ({ ...s, [n.id]: 'rejecting' }));
    try {
      if (n.type === 'EXPENSE_PENDING') {
        await inlineActionApi.rejectExpense(id);
        msg.success('Đã từ chối phiếu chi');
      } else {
        await inlineActionApi.rejectLeave(id);
        msg.success('Đã từ chối đơn nghỉ phép');
      }
      invalidate();
    } catch {
      msg.error('Không thể từ chối, vui lòng thử lại');
    } finally {
      setActionState((s) => { const ns = { ...s }; delete ns[n.id]; return ns; });
    }
  };

  return (
    <>
      {msgCtx}
      <List
        dataSource={[]} // dummy — rendered manually below
        locale={{ emptyText: '' }}
      />
      {/* Grouped rows */}
      {[...groupedTypes].map((type) => (
        <GroupedNotifItem
          key={`group-${type}`}
          type={type}
          count={typeCounts[type]}
          onViewAll={(path) => onNavigate(path)}
        />
      ))}
      {/* Singular rows */}
      {singularItems.map((item) => (
        <SingleNotifItem
          key={item.id}
          item={item}
          onClick={onItemClick}
          onApprove={ACTIONABLE_TYPES.has(item.type) ? handleApprove : undefined}
          onReject={ACTIONABLE_TYPES.has(item.type) ? handleReject : undefined}
          approving={actionState[item.id] === 'approving'}
          rejecting={actionState[item.id] === 'rejecting'}
        />
      ))}
      {singularItems.length === 0 && groupedTypes.size === 0 && (
        <div style={{ textAlign: 'center', padding: '20px 0', color: '#94A3B8', fontSize: 13 }}>
          Không có thông báo
        </div>
      )}
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  unreadCount: number;
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

  // Badge đếm chỉ actionable items (chưa đọc + cần action)
  const actionableBadge = countActionable(notifications);
  // Khi dropdown chưa mở dùng unreadCount từ topbar; khi mở dùng actionable count chính xác hơn
  const badgeCount = open ? actionableBadge : unreadCount;

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
      if (payload['taskId']) navigate('/tasks');
      else if (payload['projectId']) navigate('/projects');
    }
    setOpen(false);
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  const content = (
    <div style={{ width: 400 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ fontWeight: 600, fontSize: 15, color: textPrimary }}>Thông báo</Text>
        <Button
          type="text"
          size="small"
          icon={<CheckOutlined />}
          loading={markAllMutation.isPending}
          onClick={() => markAllMutation.mutate()}
          disabled={unreadCount === 0 || markAllMutation.isPending}
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
      <div style={{ maxHeight: 420, overflowY: 'auto', marginRight: -4, paddingRight: 4 }}>
        <NotifList
          items={notifications}
          onItemClick={handleItemClick}
          onNavigate={handleNavigate}
        />
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
        content: {
          padding: '12px 14px 10px',
          background: bgContainer,
          borderRadius: 12,
          boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
        },
      }}
    >
      <Tooltip title="Thông báo">
        <Badge count={badgeCount} size="small" overflowCount={99}>
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
