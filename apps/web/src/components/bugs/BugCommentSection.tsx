import { useState } from 'react';
import {
  Typography, Input, Button, Space, Avatar, Divider,
  Popconfirm, App, Spin, Empty, Tooltip,
} from 'antd';
import { SendOutlined, EditOutlined, DeleteOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';
import {
  useGetBugComments, useAddBugComment,
  useUpdateBugComment, useDeleteBugComment,
  type BugComment,
} from '../../api/bugs.api';
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

interface CommentItemProps {
  comment:    BugComment;
  currentId?: string;
  isAdmin:    boolean;
  bugId:      string;
}

function CommentItem({ comment, currentId, isAdmin, bugId }: CommentItemProps) {
  const { message } = App.useApp();
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(comment.content);

  const updateMut = useUpdateBugComment(bugId);
  const deleteMut = useDeleteBugComment(bugId);

  const canEdit   = comment.authorId === currentId;
  const canDelete = comment.authorId === currentId || isAdmin;

  const handleSave = async () => {
    if (!editValue.trim()) return;
    try {
      await updateMut.mutateAsync({ commentId: comment.id, content: editValue.trim() });
      setEditing(false);
    } catch {
      message.error('Cập nhật thất bại');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMut.mutateAsync(comment.id);
    } catch {
      message.error('Xoá thất bại');
    }
  };

  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
      <Avatar
        size={34}
        style={{ backgroundColor: getAvatarColor(comment.author.name), flexShrink: 0, fontSize: 13, fontWeight: 700 }}
      >
        {getInitials(comment.author.name)}
      </Avatar>

      <div style={{ flex: 1, minWidth: 0 }}>
        <Space size={8} style={{ marginBottom: 4 }}>
          <Text strong style={{ fontSize: 13 }}>{comment.author.name}</Text>
          <Tooltip title={dayjs(comment.createdAt).format('DD/MM/YYYY HH:mm')}>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {dayjs(comment.createdAt).fromNow()}
              {comment.updatedAt !== comment.createdAt && ' (đã sửa)'}
            </Text>
          </Tooltip>
        </Space>

        {editing ? (
          <Space.Compact style={{ width: '100%' }}>
            <Input.TextArea
              autoSize={{ minRows: 1, maxRows: 6 }}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              autoFocus
            />
          </Space.Compact>
        ) : (
          <Text style={{ fontSize: 13, whiteSpace: 'pre-wrap', display: 'block' }}>
            {comment.content}
          </Text>
        )}

        <Space size={4} style={{ marginTop: 4 }}>
          {editing ? (
            <>
              <Button
                type="primary" size="small" icon={<CheckOutlined />}
                loading={updateMut.isPending}
                onClick={handleSave}
              >
                Lưu
              </Button>
              <Button
                size="small" icon={<CloseOutlined />}
                onClick={() => { setEditing(false); setEditValue(comment.content); }}
              >
                Huỷ
              </Button>
            </>
          ) : (
            <>
              {canEdit && (
                <Button
                  type="text" size="small" icon={<EditOutlined />}
                  onClick={() => setEditing(true)}
                  style={{ padding: '0 4px', fontSize: 12 }}
                />
              )}
              {canDelete && (
                <Popconfirm title="Xoá comment này?" onConfirm={handleDelete} okText="Xoá" cancelText="Huỷ">
                  <Button
                    type="text" size="small" icon={<DeleteOutlined />}
                    loading={deleteMut.isPending}
                    danger
                    style={{ padding: '0 4px', fontSize: 12 }}
                  />
                </Popconfirm>
              )}
            </>
          )}
        </Space>
      </div>
    </div>
  );
}

interface Props {
  bugId: string;
}

export function BugCommentSection({ bugId }: Props) {
  const { message } = App.useApp();
  const { user } = useAuthStore();
  const [newComment, setNewComment] = useState('');

  const { data: comments = [], isLoading } = useGetBugComments(bugId);
  const addMut = useAddBugComment(bugId);

  const isAdmin = ['PM', 'ADMIN'].includes(user?.role ?? '');

  const handleSubmit = async () => {
    const content = newComment.trim();
    if (!content) return;
    try {
      await addMut.mutateAsync(content);
      setNewComment('');
    } catch {
      message.error('Gửi comment thất bại');
    }
  };

  return (
    <div>
      <Divider orientation="left" style={{ marginTop: 24 }}>
        <Title level={5} style={{ margin: 0 }}>
          Bình luận {comments.length > 0 && `(${comments.length})`}
        </Title>
      </Divider>

      {isLoading && <Spin size="small" />}

      {!isLoading && comments.length === 0 && (
        <Empty description="Chưa có bình luận nào" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      )}

      {comments.map((c) => (
        <CommentItem
          key={c.id}
          comment={c}
          currentId={user?.id}
          isAdmin={isAdmin}
          bugId={bugId}
        />
      ))}

      {/* Compose box */}
      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        <Avatar
          size={34}
          style={{
            backgroundColor: getAvatarColor(user?.name ?? '?'),
            flexShrink: 0, fontSize: 13, fontWeight: 700,
          }}
        >
          {getInitials(user?.name ?? '?')}
        </Avatar>
        <div style={{ flex: 1 }}>
          <Input.TextArea
            placeholder="Thêm bình luận..."
            autoSize={{ minRows: 2, maxRows: 6 }}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit();
            }}
          />
          <div style={{ textAlign: 'right', marginTop: 6 }}>
            <Text type="secondary" style={{ fontSize: 11, marginRight: 8 }}>
              Ctrl+Enter để gửi
            </Text>
            <Button
              type="primary" size="small" icon={<SendOutlined />}
              loading={addMut.isPending}
              disabled={!newComment.trim()}
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
