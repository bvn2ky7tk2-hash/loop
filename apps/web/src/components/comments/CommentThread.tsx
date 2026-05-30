import { useState, useRef, useCallback } from 'react';
import {
  Typography, Input, Button, Space, Avatar, Divider,
  Popconfirm, App, Spin, Empty, Tooltip, List,
} from 'antd';
import {
  SendOutlined, DeleteOutlined, MessageOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';
import { useQuery } from '@tanstack/react-query';
import { useThemePalette } from '../../hooks/useThemePalette';
import {
  useGetComments, useCreateComment, useDeleteComment,
  type Comment,
} from '../../api/comments';
import { useAuthStore } from '../../store/auth.store';
import { usersApi } from '../../api/users';

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

// ─── MentionInput ─────────────────────────────────────────────────────────────

interface MentionInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  autoSize?: { minRows: number; maxRows: number };
  onSubmit?: () => void;
  disabled?: boolean;
}

function MentionInput({ value, onChange, placeholder, autoSize, onSubmit, disabled }: MentionInputProps) {
  const { bgCard, borderColor, textPrimary, textMuted } = useThemePalette();
  const [mentionSearch, setMentionSearch]   = useState('');
  const [mentionVisible, setMentionVisible] = useState(false);
  const [mentionIndex, setMentionIndex]     = useState(0);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

  const { data: mentionResults = [] } = useQuery({
    queryKey: ['users-mention', mentionSearch],
    queryFn: () => usersApi.search(mentionSearch),
    enabled: mentionVisible && mentionSearch.length >= 1,
    staleTime: 10_000,
  });

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    onChange(text);

    // Phát hiện @mention tại vị trí con trỏ
    const cursor = e.target.selectionStart ?? text.length;
    const beforeCursor = text.slice(0, cursor);
    const match = /@(\w[\w\s]*)$/.exec(beforeCursor);
    if (match) {
      setMentionSearch(match[1]);
      setMentionVisible(true);
      setMentionIndex(0);
    } else {
      setMentionVisible(false);
      setMentionSearch('');
    }
  }, [onChange]);

  const insertMention = useCallback((name: string) => {
    if (!textAreaRef.current) return;
    const cursor = textAreaRef.current.selectionStart ?? value.length;
    const beforeCursor = value.slice(0, cursor);
    const afterCursor  = value.slice(cursor);
    // Thay thế @search đang gõ bằng @fullName + khoảng trắng
    const replaced = beforeCursor.replace(/@(\w[\w\s]*)$/, `@${name} `);
    onChange(replaced + afterCursor);
    setMentionVisible(false);
    setMentionSearch('');
    // Focus lại textarea
    setTimeout(() => textAreaRef.current?.focus(), 50);
  }, [value, onChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionVisible && mentionResults.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex((i) => (i + 1) % mentionResults.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex((i) => (i - 1 + mentionResults.length) % mentionResults.length);
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        insertMention(mentionResults[mentionIndex].name);
        return;
      }
      if (e.key === 'Escape') {
        setMentionVisible(false);
        return;
      }
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && onSubmit) {
      onSubmit();
    }
  };

  return (
    <div style={{ position: 'relative', flex: 1 }}>
      <Input.TextArea
        ref={(el) => { textAreaRef.current = el?.resizableTextArea?.textArea ?? null; }}
        placeholder={placeholder}
        autoSize={autoSize}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
      />
      {mentionVisible && mentionResults.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            zIndex: 9999,
            background: bgCard,
            border: `1px solid ${borderColor}`,
            borderRadius: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            minWidth: 200,
            maxHeight: 200,
            overflowY: 'auto',
          }}
        >
          <List
            size="small"
            dataSource={mentionResults}
            renderItem={(user, idx) => (
              <List.Item
                style={{
                  padding: '6px 12px',
                  cursor: 'pointer',
                  background: idx === mentionIndex ? `rgba(99,102,241,0.15)` : 'transparent',
                  color: textPrimary,
                }}
                onMouseDown={(e) => {
                  e.preventDefault(); // Không mất focus textarea
                  insertMention(user.name);
                }}
                onMouseEnter={() => setMentionIndex(idx)}
              >
                <Space>
                  <Avatar size={22} style={{ background: getAvatarColor(user.name), fontSize: 10, fontWeight: 700 }}>
                    {getInitials(user.name)}
                  </Avatar>
                  <Text style={{ color: textPrimary, fontSize: 13 }}>{user.name}</Text>
                </Space>
              </List.Item>
            )}
          />
        </div>
      )}
    </div>
  );
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
  const { textPrimary, textMuted, borderColor, linkColor } = useThemePalette();
  const deleteMut = useDeleteComment(entityType, entityId);

  const canDelete = comment.authorId === currentId || isAdmin;

  const handleDelete = async () => {
    try {
      await deleteMut.mutateAsync(comment.id);
    } catch {
      message.error('Xoá thất bại');
    }
  };

  // Highlight @mentions trong nội dung
  const renderContent = (content: string) => {
    const parts = content.split(/(@\S+(?:\s\S+)*?(?=\s@|\s|$))/g);
    return parts.map((part, i) =>
      part.startsWith('@')
        ? <span key={i} style={{ color: linkColor, fontWeight: 500 }}>{part}</span>
        : <span key={i}>{part}</span>,
    );
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
          {renderContent(comment.content)}
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
              <MentionInput
                placeholder={`Trả lời ${c.author.name}... (gõ @ để nhắc ai đó)`}
                autoSize={{ minRows: 1, maxRows: 4 }}
                value={replyText}
                onChange={setReplyText}
                onSubmit={() => handleReplySubmit(c.id)}
                disabled={createMut.isPending}
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
          <MentionInput
            placeholder="Viết comment... (gõ @ để nhắc ai đó)"
            autoSize={{ minRows: 2, maxRows: 6 }}
            value={newComment}
            onChange={setNewComment}
            onSubmit={handleSubmit}
            disabled={createMut.isPending}
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
