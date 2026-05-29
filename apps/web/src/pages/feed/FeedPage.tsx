import { useState, useCallback } from 'react';
import {
  Row, Col, Card, Typography, Tag, Space, Button, Divider,
  Form, Input, Select, Tooltip, App, Popconfirm, Spin, Empty, InputNumber,
} from 'antd';
import {
  TeamOutlined, PushpinOutlined,
  DeleteOutlined, TrophyOutlined, GiftOutlined, StarOutlined,
  NotificationOutlined, FileTextOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';
import { useThemePalette } from '../../hooks/useThemePalette';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { CenteredModal } from '../../components/ui/CenteredModal';
import { useAuthStore } from '../../store/auth.store';
import { usePermissions } from '../../hooks/usePermissions';
import {
  useGetFeedStats, useGetFeedPosts, useCreateFeedPost,
  useDeleteFeedPost, useReactFeedPost,
  type FeedPost, type FeedPostType,
} from '../../api/feed';

dayjs.extend(relativeTime);
dayjs.locale('vi');

const { Text, Paragraph } = Typography;

// ─── Config ──────────────────────────────────────────────────────────────────

const POST_TYPE_CONFIG: Record<FeedPostType, {
  label: string;
  color: string;
  icon: React.ReactNode;
  gradient?: string;
}> = {
  ANNOUNCEMENT: { label: 'Thông báo',  color: '#3B82F6', icon: <NotificationOutlined /> },
  KUDOS:        { label: 'Kudos',       color: '#10B981', icon: <StarOutlined /> },
  BIRTHDAY:     { label: 'Sinh nhật',  color: '#F59E0B', icon: <GiftOutlined />,   gradient: 'linear-gradient(135deg, #F59E0B 0%, #EC4899 100%)' },
  DOCUMENT:     { label: 'Tài liệu',   color: '#8B5CF6', icon: <FileTextOutlined /> },
  ANNIVERSARY:  { label: 'Vinh danh',  color: '#EA580C', icon: <TrophyOutlined />, gradient: 'linear-gradient(135deg, #F59E0B 0%, #EA580C 100%)' },
};

const EMOJIS = ['👍', '❤️', '🎉', '👏'];

function getInitials(name: string) {
  return name.split(' ').slice(-2).map((w) => w[0]).join('').toUpperCase();
}

function getAvatarColor(name: string) {
  const colors = ['#6366F1', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
  return colors[name.charCodeAt(0) % colors.length];
}

// ─── SpecialHeader ────────────────────────────────────────────────────────────

function SpecialHeader({ post }: { post: FeedPost }) {
  const conf = POST_TYPE_CONFIG[post.type];
  if (!conf.gradient) return null;

  if (post.type === 'ANNIVERSARY') {
    return (
      <div
        style={{
          background: conf.gradient,
          borderRadius: '10px 10px 0 0',
          padding: '18px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          margin: '-16px -20px 14px',
        }}
      >
        <Space size={12}>
          <TrophyOutlined style={{ fontSize: 30, color: 'rgba(255,255,255,0.9)' }} />
          <div>
            <div style={{
              fontSize: 10, color: 'rgba(255,255,255,0.75)',
              letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 600,
            }}>
              Tri ân thâm niên
            </div>
            {post.targetName && (
              <div style={{ fontSize: 17, fontWeight: 700, color: '#FFF', lineHeight: 1.3 }}>
                {post.targetName}
              </div>
            )}
          </div>
        </Space>
        {post.targetYears && (
          <div style={{
            background: 'rgba(255,255,255,0.22)',
            borderRadius: 10,
            padding: '8px 16px',
            textAlign: 'center',
            border: '1px solid rgba(255,255,255,0.3)',
          }}>
            <div style={{ fontSize: 30, fontWeight: 900, color: '#FFF', lineHeight: 1 }}>
              {post.targetYears}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.85)', letterSpacing: 1.5, fontWeight: 600 }}>
              NĂM
            </div>
          </div>
        )}
      </div>
    );
  }

  if (post.type === 'BIRTHDAY') {
    return (
      <div
        style={{
          background: conf.gradient,
          borderRadius: '10px 10px 0 0',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          margin: '-16px -20px 14px',
        }}
      >
        <span style={{ fontSize: 22 }}>🎂</span>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#FFF' }}>
          Chúc mừng sinh nhật
          {post.targetName && <span style={{ fontWeight: 800 }}> {post.targetName}</span>}
        </div>
      </div>
    );
  }

  return null;
}

// ─── PostCard ─────────────────────────────────────────────────────────────────

interface PostCardProps {
  post:       FeedPost;
  currentId?: string;
  isAdmin:    boolean;
}

function PostCard({ post, currentId, isAdmin }: PostCardProps) {
  const { message } = App.useApp();
  const { textPrimary, textMuted, bgCard, borderColor, isDark } = useThemePalette();
  const deleteMut = useDeleteFeedPost();
  const reactMut  = useReactFeedPost();

  const typeConf  = POST_TYPE_CONFIG[post.type];
  const isSpecial = post.type === 'ANNIVERSARY' || post.type === 'BIRTHDAY';

  const reactionMap: Record<string, number> = {};
  const myReactions = new Set<string>();
  for (const r of post.reactions) {
    reactionMap[r.emoji] = (reactionMap[r.emoji] ?? 0) + 1;
    if (r.user.id === currentId) myReactions.add(r.emoji);
  }

  const handleReact = async (emoji: string) => {
    try { await reactMut.mutateAsync({ id: post.id, emoji }); }
    catch { message.error('Không thể reaction'); }
  };

  const handleDelete = async () => {
    try { await deleteMut.mutateAsync(post.id); }
    catch { message.error('Xóa thất bại'); }
  };

  const canDelete = isAdmin || post.authorId === currentId;

  return (
    <Card
      style={{
        background: bgCard,
        border: `1px solid ${
          post.isPinned ? '#6366F1'
          : isSpecial   ? `${typeConf.color}40`
          : borderColor
        }`,
        borderRadius: 12,
        marginBottom: 16,
        overflow: 'hidden',
        boxShadow: post.isPinned
          ? '0 0 0 2px rgba(99,102,241,0.15)'
          : isSpecial ? `0 4px 20px ${typeConf.color}25` : undefined,
      }}
      styles={{ body: { padding: '16px 20px' } }}
    >
      {/* Gradient header cho Anniversary / Birthday */}
      <SpecialHeader post={post} />

      {/* Cover image — chỉ hiển thị cho non-special types */}
      {post.imageUrl && !isSpecial && (
        <div style={{ margin: '-16px -20px 14px', overflow: 'hidden' }}>
          <img
            src={post.imageUrl}
            alt="cover"
            style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }}
            onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
          />
        </div>
      )}

      {/* Author row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <Space size={10} align="start">
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
                <Tooltip title="Đang ghim">
                  <PushpinOutlined style={{ color: '#6366F1', fontSize: 14 }} />
                </Tooltip>
              )}
            </Space>
            <div>
              <Text style={{ fontSize: 11, color: textMuted }}>{dayjs(post.createdAt).fromNow()}</Text>
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
            <Button type="text" size="small" icon={<DeleteOutlined />} danger style={{ opacity: 0.6 }} />
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
              {emoji}{count > 0 && <span style={{ marginLeft: 4 }}>{count}</span>}
            </Button>
          );
        })}
      </Space>
    </Card>
  );
}

// ─── ComposerBox ──────────────────────────────────────────────────────────────

interface ComposerBoxProps {
  userName: string;
  onOpen: (type?: FeedPostType) => void;
}

function ComposerBox({ userName, onOpen }: ComposerBoxProps) {
  const { textMuted, bgCard, borderColor, isDark } = useThemePalette();

  return (
    <Card
      style={{ background: bgCard, borderColor, borderRadius: 12, marginBottom: 20 }}
      styles={{ body: { padding: '12px 16px' } }}
    >
      <Space style={{ width: '100%', marginBottom: 10 }} size={10}>
        <div
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: getAvatarColor(userName),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
          }}
        >
          {getInitials(userName)}
        </div>
        <div
          role="button"
          tabIndex={0}
          onClick={() => onOpen()}
          onKeyDown={(e) => e.key === 'Enter' && onOpen()}
          style={{
            flex: 1, height: 36, minWidth: 260,
            background: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
            borderRadius: 20, cursor: 'text',
            display: 'flex', alignItems: 'center',
            paddingLeft: 16, paddingRight: 16,
            color: textMuted, fontSize: 14,
            border: `1px solid ${borderColor}`,
            userSelect: 'none',
          }}
        >
          Đăng thông báo, vinh danh nhân viên...
        </div>
      </Space>

      <Divider style={{ margin: '0 0 8px' }} />

      <Space wrap>
        <Button
          type="text" size="small"
          icon={<NotificationOutlined style={{ color: '#3B82F6' }} />}
          onClick={() => onOpen('ANNOUNCEMENT')}
          style={{ color: textMuted }}
        >
          Thông báo
        </Button>
        <Button
          type="text" size="small"
          icon={<StarOutlined style={{ color: '#10B981' }} />}
          onClick={() => onOpen('KUDOS')}
          style={{ color: textMuted }}
        >
          Kudos
        </Button>
        <Button
          type="text" size="small"
          icon={<TrophyOutlined style={{ color: '#F59E0B' }} />}
          onClick={() => onOpen('ANNIVERSARY')}
          style={{ color: textMuted }}
        >
          Vinh danh
        </Button>
        <Button
          type="text" size="small"
          icon={<FileTextOutlined style={{ color: '#8B5CF6' }} />}
          onClick={() => onOpen('DOCUMENT')}
          style={{ color: textMuted }}
        >
          Tài liệu
        </Button>
      </Space>
    </Card>
  );
}

// ─── FeedPage ─────────────────────────────────────────────────────────────────

export default function FeedPage() {
  const { message } = App.useApp();
  const { user } = useAuthStore();
  const [createOpen, setCreateOpen] = useState(false);
  const [form]       = Form.useForm();
  const [page]       = useState(1);
  const [previewType, setPreviewType] = useState<FeedPostType>('ANNOUNCEMENT');
  const [imgPreview,  setImgPreview]  = useState('');

  const { data: stats }             = useGetFeedStats();
  const { data: feed, isLoading }   = useGetFeedPosts(page, 20);
  const createMut                   = useCreateFeedPost();

  const { can } = usePermissions();
  const canPost = can('feed:create');

  const openCreate = useCallback((type: FeedPostType = 'ANNOUNCEMENT') => {
    form.setFieldValue('type', type);
    setPreviewType(type);
    setCreateOpen(true);
  }, [form]);

  const closeCreate = () => {
    setCreateOpen(false);
    form.resetFields();
    setImgPreview('');
    setPreviewType('ANNOUNCEMENT');
  };

  const handleCreate = async (values: {
    type:        FeedPostType;
    title?:      string;
    content:     string;
    isPinned?:   boolean;
    imageUrl?:   string;
    targetName?: string;
    targetYears?: number;
  }) => {
    try {
      await createMut.mutateAsync({
        type:        values.type,
        title:       values.title,
        content:     values.content,
        isPinned:    values.isPinned ?? false,
        imageUrl:    values.imageUrl || undefined,
        targetName:  values.targetName || undefined,
        targetYears: values.targetYears,
      });
      message.success('Đã đăng bài');
      closeCreate();
    } catch {
      message.error('Đăng bài thất bại');
    }
  };

  const needsTargetFields = previewType === 'ANNIVERSARY' || previewType === 'BIRTHDAY';

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Bảng tin công ty"
        icon={<TeamOutlined />}
        iconColor="#6366F1"
      />

      {/* Stat cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <StatCard label="Tổng bài đăng"  value={stats?.total     ?? 0} color="#6366F1" icon={<TeamOutlined />} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard label="Tháng này"       value={stats?.thisMonth ?? 0} color="#3B82F6" icon={<NotificationOutlined />} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard label="Kudos"           value={stats?.kudos     ?? 0} color="#10B981" icon={<StarOutlined />} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard label="Vinh danh"       value={stats?.anniversary ?? 0} color="#F59E0B" icon={<TrophyOutlined />} />
        </Col>
      </Row>

      {/* Composer box — chỉ hiện với admin/leadership */}
      {canPost && <ComposerBox userName={user?.name ?? ''} onOpen={openCreate} />}

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

      {/* Modal tạo bài */}
      <CenteredModal
        open={createOpen}
        title="Đăng bài mới"
        width={560}
        onClose={closeCreate}
        footer={
          <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
            <Button onClick={closeCreate}>Huỷ</Button>
            <Button type="primary" loading={createMut.isPending} onClick={() => form.submit()}>
              Đăng bài
            </Button>
          </Space>
        }
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreate}
          onValuesChange={(changed) => {
            if (changed.type) setPreviewType(changed.type);
            if ('imageUrl' in changed) setImgPreview(changed.imageUrl ?? '');
          }}
        >
          <Form.Item
            name="type"
            label="Loại bài đăng"
            rules={[{ required: true, message: 'Chọn loại bài đăng' }]}
            initialValue="ANNOUNCEMENT"
          >
            <Select
              options={Object.entries(POST_TYPE_CONFIG).map(([value, conf]) => ({
                value,
                label: (
                  <Space size={6}>
                    {conf.icon}
                    <span>{conf.label}</span>
                  </Space>
                ),
              }))}
            />
          </Form.Item>

          {needsTargetFields && (
            <Form.Item name="targetName" label="Tên nhân viên được vinh danh">
              <Input placeholder="Nguyễn Văn A" maxLength={200} />
            </Form.Item>
          )}

          {previewType === 'ANNIVERSARY' && (
            <Form.Item name="targetYears" label="Số năm thâm niên">
              <InputNumber
                min={1} max={50} placeholder="5"
                style={{ width: '100%' }}
                suffix="năm"
              />
            </Form.Item>
          )}

          <Form.Item name="title" label="Tiêu đề">
            <Input placeholder="Tiêu đề bài đăng (không bắt buộc)" maxLength={300} />
          </Form.Item>

          <Form.Item
            name="content"
            label="Nội dung"
            rules={[{ required: true, message: 'Nhập nội dung' }]}
          >
            <Input.TextArea rows={4} placeholder="Nội dung bài đăng..." showCount maxLength={2000} />
          </Form.Item>

          <Form.Item name="imageUrl" label="Ảnh bìa (URL)">
            <Input placeholder="https://images.unsplash.com/..." maxLength={500} />
          </Form.Item>

          {imgPreview && (
            <div style={{ marginBottom: 16, borderRadius: 8, overflow: 'hidden', maxHeight: 160 }}>
              <img
                src={imgPreview}
                alt="preview"
                style={{ width: '100%', maxHeight: 160, objectFit: 'cover', display: 'block' }}
                onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
              />
            </div>
          )}

          <Form.Item name="isPinned" label="Ghim bài đăng?" initialValue={false}>
            <Select
              options={[
                { value: false, label: 'Không ghim' },
                { value: true,  label: '📌 Ghim lên đầu' },
              ]}
            />
          </Form.Item>
        </Form>
      </CenteredModal>
    </div>
  );
}
