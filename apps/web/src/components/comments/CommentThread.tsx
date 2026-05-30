import { useState } from 'react';
import {
  Typography, Input, Button, Space, Avatar, Divider,
  Popconfirm, App, Spin, Empty, Tooltip,
} from 'antd';
import {
  SendOutlined, DeleteOutlined, MessageOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';
import { useThemePalette } from '../../hooks/useThemePalette';
import {
  useGetComments, useCreateComment, useDeleteComment,
  type Comment,
} from '../../api/comments';
import { useAuthStore } from '../../store/auth.store';

dayjs.extend(relativeTime);
dayjs.locale('vi');

const { Text, Title } = Typography;

function getInitials(name: string) {
  return name.split(' ').slice(-2).map((w) => w[0]).join('').toUpperCase();
}

function getAvatarColor(name: string) {
  const colors = ['#4F46E5', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
  const idx = name.charCodeAt(0) % colors.length;
  return colors[idx];
}

// ─── CommentItem ─────────────────────────────────────────────────────────────

interface CommentItemProps {
  comment:     Comment;
  currentId?:  string;
  isAdmin:     boolean;
  entityType:  string;
  entityId:    string;
  isReply?:    boolean;
  onReply?:    (parentId: string) => void;
}

function CommentItem({
  comment, currentId, isAdmin, entityType, entityId, isReply, onReply,
}: CommentItemProps) {
  const { message } = App.useApp();
  const { textPrimary, textMuted, borderColor } = useThemePalette();
  const deleteMut = useDeleteComment(entityType, entityId);

  const canDelete = comment.authorId === currentId || isAdmin;

  const handleDelete = async () => {
    try {
      await deleteMut.mutateAsync(comment.id);
    } catch {
      message.error('Xoá thất bại');
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        marginBottom: isReply ? 10 : 16,
        paddingLeft: isReply ? 40 : 0,
      }}
    >
      <Avatar
        size={isReply ? 28 : 34}
        style={{
          backgroundColor: getAvatarColor(comment.author.name),
          flexShrink: 0,
          fontSize: isReply ? 11 : 13,
          fontWeight: 700,
        }}
      >
        {getInitials(comment.author.name)}
      </Avatar>

      <div style={{ flex: 1, minWidth: 0 }}>
        <Space size={8} style={{ marginBottom: 4 }}>
          <Text strong style={{ fontSize: isReply ? 12 : 13, color: textPrimary }}>
            {comment.author.name}
          </Text>
          <Tooltip title={dayjs(comment.createdAt).format('DD/MM/YYYY HH:mm')}>
            <Text style={{ fontSize: 11, color: textMuted }}>
              {dayjs(comment.createdAt).fromNow()}
            </Text>
          </Tooltip>
        </Space>

        <Text style={{ fontSize: 13, whiteSpace: 'pre-wrap', display: 'block', color: textPrimary }}>
          {comment.content}
        </Text>

        <Space size={4} style={{ marginTop: 4 }}>
          {!isReply && onReply && (
            <Button
              type="text"
              size="small"
              icon={<MessageOutlined />}
              onClick={() => onReply(comment.id)}
              style={{ padding: '0 4px', fontSize: 12, color: textMuted }}
            >
              Trả lời
            </Button>
          )}
          {canDelete && (
            <Popconfirm
              title="Xoá comment này?"
              onConfirm={handleDelete}
              okText="Xoá"
              cancelText="Huỷ"
            >
              <Button
                type="text"
                size="small"
                icon={<DeleteOutlined />}
                loading={deleteMut.isPending}
                disabled={deleteMut.isPending}
                danger
                style={{ padding: '0 4px', fontSize: 12 }}
              />
            </Popconfirm>
          )}
        </Space>

        {/* Replies */}
        {!isReply && comment.replies && comment.replies.length > 0 && (
          <div
            style={{
              marginTop: 8,
              paddingLeft: 0,
              borderLeft: `2px solid ${borderColor}`,
              paddingRight: 0,
            }}
          >
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                currentId={currentId}
                isAdmin={isAdmin}
                entityType={entityType}
                entityId={entityId}
                isReply
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CommentThread ────────────────────────────────────────────────────────────

interface CommentThreadProps {
  entityType: string;
  entityId:   string;
}

export function CommentThread({ entityType, entityId }: CommentThreadProps) {
  const { message } = App.useApp();
  const { user } = useAuthStore();
  const { textPrimary } = useThemePalette();

  const [newComment, setNewComment] = useState('');
  const [replyTo,    setReplyTo]    = useState<string | null>(null);
  const [replyText,  setReplyText]  = useState('');

  const { data: comments = [], isLoading } = useGetComments(entityType, entityId);
  const createMut = useCreateComment(entityType, entityId);

  const isAdmin = ['PM', 'ADMIN'].includes(user?.role ?? '');

  const handleSubmit = async () => {
    const content = newComment.trim();
    if (!content) return;
    try {
      await createMut.mutateAsync({ entityType, entityId, content });
      setNewComment('');
    } catch {
      message.error('Gửi comment thất bại');
    }
  };

  const handleReplySubmit = async (parentId: string) => {
    const content = replyText.trim();
    if (!content) return;
    try {
      await createMut.mutateAsync({ entityType, entityId, content, parentId });
      setReplyTo(null);
      setReplyText('');
    } catch {
      message.error('Gửi reply thất bại');
    }
  };

  const totalCount = comments.reduce(
    (acc, c) => acc + 1 + (c.replies?.length ?? 0),
    0,
  );

  return (
    <div>
      <Divider orientation="left" style={{ marginTop: 24 }}>
        <Title level={5} style={{ margin: 0, color: textPrimary }}>
          Bình luận{totalCount > 0 ? ` (${totalCount})` : ''}
        </Title>
      </Divider>

      {isLoading && <Spin size="small" />}

      {!isLoading && comments.length === 0 && (
        <Empty description="Chưa có bình luận nào" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      )}

      {comments.map((c) => (
        <div key={c.id}>
          <CommentItem
            comment={c}
            currentId={user?.id}
            isAdmin={isAdmin}
            entityType={entityType}
            entityId={entityId}
            onReply={(parentId) => {
              setReplyTo(parentId === replyTo ? null : parentId);
              setReplyText('');
            }}
          />

          {/* Inline reply input */}
          {replyTo === c.id && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, paddingLeft: 44 }}>
              <Input.TextArea
                autoFocus
                placeholder={`Trả lời ${c.author.name}...`}
                autoSize={{ minRows: 1, maxRows: 4 }}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleReplySubmit(c.id);
                  if (e.key === 'Escape') { setReplyTo(null); setReplyText(''); }
                }}
                style={{ flex: 1 }}
              />
              <Space direction="vertical" size={4}>
                <Button
                  type="primary"
                  size="small"
                  icon={<SendOutlined />}
                  loading={createMut.isPending}
                  disabled={!replyText.trim() || createMut.isPending}
                  onClick={() => handleReplySubmit(c.id)}
                >
                  Gửi
                </Button>
                <Button
                  size="small"
                  onClick={() => { setReplyTo(null); setReplyText(''); }}
                >
                  Huỷ
                </Button>
              </Space>
            </div>
          )}
        </div>
      ))}

      {/* Compose box */}
      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        <Avatar
          size={34}
          style={{
            backgroundColor: getAvatarColor(user?.name ?? '?'),
            flexShrink: 0,
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {getInitials(user?.name ?? '?')}
        </Avatar>
        <div style={{ flex: 1 }}>
          <Input.TextArea
            placeholder="Viết comment..."
            autoSize={{ minRows: 2, maxRows: 6 }}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit();
            }}
          />
          <div style={{ textAlign: 'right', marginTop: 6 }}>
            <Text style={{ fontSize: 11, marginRight: 8, color: '#94A3B8' }}>
              Ctrl+Enter để gửi
            </Text>
            <Button
              type="primary"
              size="small"
              icon={<SendOutlined />}
              loading={createMut.isPending}
              disabled={!newComment.trim() || createMut.isPending}
              onClick={handleSubmit}
            >
              Gửi
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
