import { useState } from 'react';
import {
  Row, Col, Card, Typography, Tag, Space, Button,
  Form, Input, Select, Tooltip, App, Popconfirm, Spin, Empty,
} from 'antd';
import {
  TeamOutlined, PlusOutlined, PushpinOutlined,
  LikeOutlined, CheckCircleOutlined, EyeOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';
import { useThemePalette } from '../../hooks/useThemePalette';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { CenteredModal } from '../../components/ui/CenteredModal';
import { useAuthStore } from '../../store/auth.store';
import {
  useGetFeedStats, useGetFeedPosts, useCreateFeedPost,
  useDeleteFeedPost, useReactFeedPost,
  type FeedPost, type FeedPostType,
} from '../../api/feed';

dayjs.extend(relativeTime);
dayjs.locale('vi');

const { Text, Paragraph } = Typography;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const POST_TYPE_CONFIG: Record<FeedPostType, { label: string; color: string }> = {
  ANNOUNCEMENT: { label: 'Thông báo',   color: '#3B82F6' },
  KUDOS:        { label: 'Kudos',        color: '#10B981' },
  BIRTHDAY:     { label: 'Sinh nhật',   color: '#F59E0B' },
  DOCUMENT:     { label: 'Tài liệu',    color: '#8B5CF6' },
};

function getInitials(name: string) {
  return name.split(' ').slice(-2).map((w) => w[0]).join('').toUpperCase();
}

function getAvatarColor(name: string) {
  const colors = ['#6366F1', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
  return colors[name.charCodeAt(0) % colors.length];
}

const EMOJIS = ['👍', '✅', '👀'];

// ─── PostCard ─────────────────────────────────────────────────────────────────

interface PostCardProps {
  post:      FeedPost;
  currentId?: string;
  isAdmin:   boolean;
}

function PostCard({ post, currentId, isAdmin }: PostCardProps) {
  const { message } = App.useApp();
  const { textPrimary, textMuted, bgCard, borderColor, isDark } = useThemePalette();
  const deleteMut = useDeleteFeedPost();
  const reactMut  = useReactFeedPost();

  const typeConf = POST_TYPE_CONFIG[post.type];

  const reactionMap: Record<string, number> = {};
  const myReactions = new Set<string>();
  for (const r of post.reactions) {
    reactionMap[r.emoji] = (reactionMap[r.emoji] ?? 0) + 1;
    if (r.user.id === currentId) myReactions.add(r.emoji);
  }

  const handleReact = async (emoji: string) => {
    try {
      await reactMut.mutateAsync({ id: post.id, emoji });
    } catch {
      message.error('Không thể reaction');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMut.mutateAsync(post.id);
    } catch {
      message.error('Xóa thất bại');
    }
  };

  const canDelete = isAdmin || post.authorId === currentId;

  return (
    <Card
      style={{
        background: bgCard,
        border: `1px solid ${post.isPinned ? '#6366F1' : borderColor}`,
        borderRadius: 12,
        marginBottom: 16,
        boxShadow: post.isPinned ? '0 0 0 2px rgba(99,102,241,0.15)' : undefined,
      }}
      bodyStyle={{ padding: '16px 20px' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <Space size={10} align="start">
          {/* Avatar */}
          <div
            style={{
              width: 38, height: 38, borderRadius: '50%',
              background: getAvatarColor(post.author.name),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
            }}
          >
            {getInitials(post.author.name)}
          </div>

          <div>
            <Space size={6} wrap>
              <Text strong style={{ fontSize: 14, color: textPrimary }}>{post.author.name}</Text>
              <Tag
                style={isDark
                  ? { background: `${typeConf.color}20`, color: typeConf.color, borderColor: `${typeConf.color}40` }
                  : undefined
                }
                color={isDark ? undefined : typeConf.color.replace('#', '')}
              >
                {typeConf.label}
              </Tag>
              {post.isPinned && (
                <Tooltip title="Ghim">
                  <PushpinOutlined style={{ color: '#6366F1', fontSize: 14 }} />
                </Tooltip>
              )}
            </Space>
            <div>
              <Text style={{ fontSize: 11, color: textMuted }}>
                {dayjs(post.createdAt).fromNow()}
              </Text>
            </div>
          </div>
        </Space>

        {canDelete && (
          <Popconfirm
            title="Xóa bài đăng này?"
            onConfirm={handleDelete}
            okText="Xóa"
            cancelText="Huỷ"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="text"
              size="small"
              icon={<DeleteOutlined />}
              danger
              style={{ opacity: 0.6 }}
            />
          </Popconfirm>
        )}
      </div>

      {/* Content */}
      {post.title && (
        <Text strong style={{ fontSize: 15, color: textPrimary, display: 'block', marginBottom: 6 }}>
          {post.title}
        </Text>
      )}
      <Paragraph
        style={{ color: textPrimary, marginBottom: 12, whiteSpace: 'pre-wrap' }}
        ellipsis={{ rows: 4, expandable: true, symbol: 'Xem thêm' }}
      >
        {post.content}
      </Paragraph>

      {/* Reactions */}
      <Space size={6} wrap>
        {EMOJIS.map((emoji) => {
          const count  = reactionMap[emoji] ?? 0;
          const active = myReactions.has(emoji);
          return (
            <Button
              key={emoji}
              size="small"
              type={active ? 'primary' : 'default'}
              ghost={active}
              onClick={() => handleReact(emoji)}
              loading={reactMut.isPending}
              style={{ borderRadius: 20, fontSize: 13, padding: '0 10px' }}
            >
              {emoji} {count > 0 && <span style={{ marginLeft: 2 }}>{count}</span>}
            </Button>
          );
        })}
      </Space>
    </Card>
  );
}

// ─── FeedPage ─────────────────────────────────────────────────────────────────

export default function FeedPage() {
  const { message } = App.useApp();
  const { user } = useAuthStore();
  const [createOpen, setCreateOpen] = useState(false);
  const [form]      = Form.useForm();
  const [page]      = useState(1);

  const { data: stats } = useGetFeedStats();
  const { data: feed, isLoading } = useGetFeedPosts(page, 20);
  const createMut = useCreateFeedPost();

  const canPost = ['ADMIN', 'LEADERSHIP'].includes(user?.role ?? '');

  const handleCreate = async (values: {
    type: FeedPostType;
    title?: string;
    content: string;
    isPinned?: boolean;
  }) => {
    try {
      await createMut.mutateAsync({
        type:     values.type,
        title:    values.title,
        content:  values.content,
        isPinned: values.isPinned ?? false,
      });
      message.success('Đã đăng bài');
      form.resetFields();
      setCreateOpen(false);
    } catch {
      message.error('Đăng bài thất bại');
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Company Feed"
        icon={<TeamOutlined />}
        iconColor="#6366F1"
        actions={
          canPost && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateOpen(true)}
            >
              Đăng bài
            </Button>
          )
        }
      />

      {/* Stat Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <StatCard
            label="Tổng bài đăng"
            value={stats?.total ?? 0}
            color="#6366F1"
            icon={<TeamOutlined />}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            label="Tháng này"
            value={stats?.thisMonth ?? 0}
            color="#3B82F6"
            icon={<LikeOutlined />}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            label="Kudos"
            value={stats?.kudos ?? 0}
            color="#10B981"
            icon={<CheckCircleOutlined />}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            label="Đang ghim"
            value={stats?.pinned ?? 0}
            color="#F59E0B"
            icon={<EyeOutlined />}
          />
        </Col>
      </Row>

      {/* Feed list */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" />
        </div>
      ) : !feed?.data?.length ? (
        <Empty description="Chưa có bài đăng nào" />
      ) : (
        feed.data.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            currentId={user?.id}
            isAdmin={['ADMIN', 'LEADERSHIP'].includes(user?.role ?? '')}
          />
        ))
      )}

      {/* Modal tạo bài đăng */}
      <CenteredModal
        open={createOpen}
        title="Đăng bài mới"
        width={520}
        onClose={() => { setCreateOpen(false); form.resetFields(); }}
        footer={
          <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
            <Button onClick={() => { setCreateOpen(false); form.resetFields(); }}>Huỷ</Button>
            <Button
              type="primary"
              loading={createMut.isPending}
              onClick={() => form.submit()}
            >
              Đăng
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item
            name="type"
            label="Loại bài đăng"
            rules={[{ required: true, message: 'Chọn loại bài đăng' }]}
            initialValue="ANNOUNCEMENT"
          >
            <Select
              options={Object.entries(POST_TYPE_CONFIG).map(([value, conf]) => ({
                value,
                label: conf.label,
              }))}
            />
          </Form.Item>

          <Form.Item name="title" label="Tiêu đề">
            <Input placeholder="Tiêu đề bài đăng (không bắt buộc)" maxLength={300} />
          </Form.Item>

          <Form.Item
            name="content"
            label="Nội dung"
            rules={[{ required: true, message: 'Nhập nội dung' }]}
          >
            <Input.TextArea
              rows={5}
              placeholder="Nội dung bài đăng..."
              showCount
              maxLength={2000}
            />
          </Form.Item>

          <Form.Item name="isPinned" label="Ghim bài đăng?" valuePropName="checked">
            <Select
              defaultValue={false}
              options={[
                { value: false, label: 'Không ghim' },
                { value: true,  label: 'Ghim lên đầu' },
              ]}
            />
          </Form.Item>
        </Form>
      </CenteredModal>
    </div>
  );
}
