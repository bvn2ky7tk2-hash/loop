import { useState } from 'react';
import {
  Button, Space, Typography, Divider,
  Descriptions, Image, Spin, Popconfirm, Form, Input, Select,
  Radio, Upload, App, Alert, Modal, Tag,
} from 'antd';
import { CenteredModal } from '../ui/CenteredModal';
import { EditOutlined, PaperClipOutlined, PlusOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  useGetBug, useTransitionBug, useUpdateBug, useGetAttachmentUrl,
  useUploadBugAttachment, useApproveBug,
  type BugStatus, type BugSeverity,
} from '../../api/bugs.api';
import { BugSeverityBadge } from './BugSeverityBadge';
import { BugStatusPill } from './BugStatusPill';
import { CommentThread } from '../comments/CommentThread';
import { useAuthStore } from '../../store/auth.store';
import { projectsApi } from '../../api/projects';
import { tasksApi } from '../../api/tasks';

const { Text, Title } = Typography;

const SEVERITY_COLORS: Record<BugSeverity, string> = {
  CRITICAL: '#FF4D4F',
  HIGH:     '#FA8C16',
  MEDIUM:   '#FADB14',
  LOW:      '#52C41A',
};

const OVERDUE_STATUSES = ['RESOLVED', 'CLOSED', 'CANCELLED', 'REJECTED'];

interface AttachmentThumbProps {
  attId: string;
  filename: string;
}

function AttachmentThumb({ attId, filename }: AttachmentThumbProps) {
  const { data } = useGetAttachmentUrl(attId);
  if (!data?.url) return null;
  return (
    <Image
      src={data.url}
      width={80}
      height={80}
      style={{ objectFit: 'cover', borderRadius: 4 }}
      alt={filename}
      preview={{ src: data.url }}
    />
  );
}

interface Props {
  bugId:   string;
  onClose: () => void;
}

export function BugDetailDrawer({ bugId, onClose }: Props) {
  const { message } = App.useApp();
  const [editOpen, setEditOpen] = useState(false);
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const [approvalDecision, setApprovalDecision] = useState<'APPROVED' | 'REJECTED' | null>(null);
  const [approvalNote, setApprovalNote] = useState('');

  const { user: currentUser } = useAuthStore();
  const { data: bug, isLoading, isError } = useGetBug(bugId);
  const transitionMut  = useTransitionBug();
  const updateMut      = useUpdateBug();
  const uploadAttach   = useUploadBugAttachment();
  const approveBug     = useApproveBug();

  /* Load tasks + members khi mở edit, dựa vào projectId của bug */
  const projectId = bug?.projectId;
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks-tree', projectId],
    queryFn:  () => projectId ? tasksApi.tree(projectId) : Promise.resolve([]),
    enabled:  !!projectId && editOpen,
  });
  const { data: members = [] } = useQuery({
    queryKey: ['project-members', projectId],
    queryFn:  () => projectId ? projectsApi.getMembers(projectId) : Promise.resolve([]),
    enabled:  !!projectId && editOpen,
  });

  const flatTasks = (arr: typeof tasks): typeof tasks =>
    arr.flatMap((t) => [t, ...flatTasks(t.children ?? [])]);

  if (isLoading) {
    return <CenteredModal open onClose={onClose} width={560} title="Chi tiết" loading />;
  }
  if (isError || !bug) {
    return (
      <CenteredModal open onClose={onClose} width={480} title="Chi tiết bug">
        <div style={{ textAlign: 'center', padding: '32px 0', color: '#888' }}>
          Không thể tải thông tin bug. Bug có thể đã bị xóa hoặc bạn không có quyền xem.
        </div>
      </CenteredModal>
    );
  }

  const isAssignee = bug.assigneeId === currentUser?.id;
  const isReporter = bug.reporterId === currentUser?.id;
  const isPM       = ['PM', 'ADMIN'].includes(currentUser?.role ?? '');

  const doTransition = async (toStatus: BugStatus) => {
    try {
      await transitionMut.mutateAsync({ id: bug.id, toStatus });
      message.success('Đã cập nhật trạng thái');
    } catch {
      message.error('Cập nhật thất bại');
    }
  };

  const openEdit = () => {
    form.setFieldsValue({
      title:       bug.title,
      description: bug.description,
      severity:    bug.severity,
      taskIds:     bug.tasks?.map((bt) => bt.taskId) ?? [],
      assigneeId:  bug.assigneeId ?? undefined,
    });
    setFileList([]);
    setEditOpen(true);
  };

  const handleEdit = async (values: any) => {
    try {
      const updated = await updateMut.mutateAsync({
        id:   bug.id,
        data: {
          title:       values.title,
          description: values.description,
          severity:    values.severity,
          taskIds:     values.taskIds ?? [],
          assigneeId:  values.assigneeId ?? null,
        },
      });

      for (const f of fileList) {
        if (f.originFileObj) {
          await uploadAttach.mutateAsync({ id: updated.id, file: f.originFileObj });
        }
      }

      message.success('Đã cập nhật');
      setEditOpen(false);
    } catch {
      message.error('Cập nhật thất bại');
    }
  };

  const handleApprove = async () => {
    if (approvalDecision === 'REJECTED' && !approvalNote.trim()) {
      message.error('Lý do từ chối là bắt buộc');
      return;
    }
    try {
      await approveBug.mutateAsync({ id: bug.id, decision: approvalDecision!, note: approvalNote });
      message.success(approvalDecision === 'APPROVED' ? 'Đã phê duyệt CR' : 'Đã từ chối CR');
      setApprovalDecision(null);
      setApprovalNote('');
    } catch {
      message.error('Thao tác thất bại');
    }
  };

  const isOverdue = bug.dueDate && new Date(bug.dueDate) < new Date() && !OVERDUE_STATUSES.includes(bug.status);

  const actions: React.ReactNode[] = [];

  if (bug.status === 'OPEN' && !bug.assigneeId) {
    actions.push(
      <Button key="take" onClick={() => updateMut.mutateAsync({ id: bug.id, data: { assigneeId: currentUser?.id } })}>
        Nhận xử lý
      </Button>,
    );
  }
  if (bug.status === 'OPEN' && (isAssignee || isPM)) {
    actions.push(
      <Button key="start" type="primary" onClick={() => doTransition('IN_PROGRESS')}>
        Bắt đầu xử lý
      </Button>,
    );
  }
  if (bug.status === 'IN_PROGRESS' && (isAssignee || isPM)) {
    actions.push(
      <Button key="resolve" type="primary" onClick={() => doTransition('RESOLVED')}>
        Đánh dấu Resolved
      </Button>,
    );
  }
  if (bug.status === 'RESOLVED' && (isReporter || isPM)) {
    actions.push(
      <Button key="close" type="primary" onClick={() => doTransition('CLOSED')}>Đóng</Button>,
    );
    actions.push(
      <Button key="reopen" onClick={() => doTransition('OPEN')}>Mở lại</Button>,
    );
  }
  if (isPM && !['CLOSED', 'CANCELLED'].includes(bug.status)) {
    actions.push(
      <Popconfirm key="cancel" title="Huỷ mục này?" onConfirm={() => doTransition('CANCELLED')}>
        <Button danger>Huỷ</Button>
      </Popconfirm>,
    );
  }
  if (isPM) {
    actions.push(
      <Button key="edit" icon={<EditOutlined />} onClick={openEdit}>
        Chỉnh sửa
      </Button>,
    );
  }

  const itemLabel = bug.itemType === 'ISSUE' ? 'Issue' : 'Bug';

  return (
    <>
      <CenteredModal
        open
        title={
          <Space wrap>
            {bug.itemType === 'ISSUE'
              ? <Tag color="blue" style={{ margin: 0 }}>📋 Issue</Tag>
              : <Tag color="red" style={{ margin: 0 }}>🐛 Bug</Tag>}
            {bug.isCR && <Tag color="orange" style={{ margin: 0 }}>CR</Tag>}
            <BugSeverityBadge severity={bug.severity} />
            <BugStatusPill status={bug.status} />
          </Space>
        }
        onClose={onClose}
        width={560}
        footer={<Space>{actions}</Space>}
      >
        {/* CR pending approval alert */}
        {bug.isCR && bug.status === 'PENDING_REVIEW' && isPM && (
          <Alert
            type="warning"
            showIcon
            message="CR đang chờ phê duyệt"
            style={{ marginBottom: 16 }}
            action={
              <Space>
                <Button size="small" type="primary" onClick={() => setApprovalDecision('APPROVED')}>
                  ✓ Phê duyệt
                </Button>
                <Button size="small" danger onClick={() => setApprovalDecision('REJECTED')}>
                  ✗ Từ chối
                </Button>
              </Space>
            }
          />
        )}

        <Title level={4} style={{ marginTop: 0 }}>{bug.title}</Title>

        {bug.description && (
          <>
            <Text type="secondary">Mô tả</Text>
            <p style={{ whiteSpace: 'pre-wrap' }}>{bug.description}</p>
            <Divider />
          </>
        )}

        <Descriptions column={1} size="small">
          <Descriptions.Item label="Dự án">{bug.project?.name}</Descriptions.Item>
          <Descriptions.Item label="Người báo">{bug.reporter?.name}</Descriptions.Item>
          <Descriptions.Item label="Người xử lý">
            {bug.assignee?.name ?? <Text type="secondary">Chưa assign</Text>}
          </Descriptions.Item>
          {bug.requesterName && (
            <Descriptions.Item label="Người yêu cầu">{bug.requesterName}</Descriptions.Item>
          )}
          {bug.dueDate && (
            <Descriptions.Item label="Hạn xử lý">
              <Space size={4}>
                <Text style={isOverdue ? { color: '#FF4D4F' } : undefined}>
                  {dayjs(bug.dueDate).format('DD/MM/YYYY')}
                </Text>
                {isOverdue && <Tag color="error" style={{ margin: 0, fontSize: 10 }}>Quá hạn</Tag>}
              </Space>
            </Descriptions.Item>
          )}
          {bug.estimatedHours !== undefined && bug.estimatedHours !== null && (
            <Descriptions.Item label="Ước lượng">{bug.estimatedHours} giờ</Descriptions.Item>
          )}
          {bug.isCR && bug.approvalNote && (
            <Descriptions.Item label="Ghi chú duyệt">{bug.approvalNote}</Descriptions.Item>
          )}
          {bug.pmApprover && (
            <Descriptions.Item label="PM duyệt">{bug.pmApprover.name}</Descriptions.Item>
          )}
          <Descriptions.Item label="Ngày tạo">
            {dayjs(bug.createdAt).format('DD/MM/YYYY HH:mm')}
          </Descriptions.Item>
        </Descriptions>

        {bug.tasks && bug.tasks.length > 0 && (
          <>
            <Divider orientation="left">Task liên quan</Divider>
            <Space wrap>
              {bug.tasks.map((bt) => (
                <span key={bt.taskId} style={{ padding: '2px 8px', borderRadius: 4, border: '1px solid #d9d9d9', fontSize: 13 }}>
                  {bt.task?.title ?? bt.taskId}
                </span>
              ))}
            </Space>
          </>
        )}

        {bug.attachments && bug.attachments.length > 0 && (
          <>
            <Divider orientation="left"><PaperClipOutlined /> Đính kèm</Divider>
            <Image.PreviewGroup>
              <Space wrap>
                {bug.attachments.map((att) => (
                  <AttachmentThumb key={att.id} attId={att.id} filename={att.filename} />
                ))}
              </Space>
            </Image.PreviewGroup>
          </>
        )}

        <CommentThread entityType="bug" entityId={bug.id} />
      </CenteredModal>

      {/* CR Approval Modal */}
      <Modal
        open={!!approvalDecision}
        title={approvalDecision === 'APPROVED' ? 'Phê duyệt CR' : 'Từ chối CR'}
        onOk={handleApprove}
        onCancel={() => { setApprovalDecision(null); setApprovalNote(''); }}
        okText={approvalDecision === 'APPROVED' ? 'Xác nhận phê duyệt' : 'Xác nhận từ chối'}
        okButtonProps={{ danger: approvalDecision === 'REJECTED', loading: approveBug.isPending }}
      >
        <p>{bug.title}</p>
        <Input.TextArea
          value={approvalNote}
          onChange={(e) => setApprovalNote(e.target.value)}
          placeholder={approvalDecision === 'APPROVED'
            ? 'Ghi chú phê duyệt (không bắt buộc)'
            : 'Lý do từ chối (bắt buộc)'}
          rows={3}
        />
      </Modal>

      {/* Edit Modal */}
      <CenteredModal
        open={editOpen}
        title={`Chỉnh sửa ${itemLabel}`}
        width={560}
        onClose={() => setEditOpen(false)}
        footer={
          <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
            <Button onClick={() => setEditOpen(false)}>Huỷ</Button>
            <Button
              type="primary"
              loading={updateMut.isPending || uploadAttach.isPending}
              onClick={() => form.submit()}
            >
              Lưu thay đổi
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" onFinish={handleEdit}>
          <Form.Item name="title" label="Tiêu đề" rules={[{ required: true, message: 'Nhập tiêu đề' }]}>
            <Input placeholder="Mô tả ngắn" />
          </Form.Item>

          <Form.Item name="severity" label="Mức độ" rules={[{ required: true }]}>
            <Radio.Group>
              {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as BugSeverity[]).map((s) => (
                <Radio.Button
                  key={s}
                  value={s}
                  style={{ borderColor: SEVERITY_COLORS[s], color: SEVERITY_COLORS[s] }}
                >
                  {s}
                </Radio.Button>
              ))}
            </Radio.Group>
          </Form.Item>

          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={4} placeholder="Mô tả chi tiết, bước tái hiện, kết quả mong đợi..." />
          </Form.Item>

          <Form.Item name="taskIds" label="Task(s) liên quan">
            <Select
              mode="multiple"
              placeholder="Chọn task liên quan..."
              options={flatTasks(tasks).map((t) => ({ value: t.id, label: t.title }))}
              filterOption={(input, opt) =>
                (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>

          <Form.Item name="assigneeId" label="Người xử lý">
            <Select
              showSearch
              allowClear
              placeholder="Chọn người xử lý..."
              filterOption={(input, opt) =>
                (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={members.map((m) => ({
                value: m.employeeId,
                label: m.employee?.fullName ?? m.employeeId,
              }))}
            />
          </Form.Item>

          <Form.Item label="Thêm ảnh đính kèm">
            <Upload
              listType="picture-card"
              accept="image/*"
              fileList={fileList}
              onChange={({ fileList: fl }) => setFileList(fl)}
              maxCount={5}
              beforeUpload={(file) => {
                if (!file.type.startsWith('image/')) {
                  message.error('Chỉ chấp nhận file ảnh');
                  return Upload.LIST_IGNORE;
                }
                if (file.size > 10 * 1024 * 1024) {
                  message.error('File không được vượt quá 10MB');
                  return Upload.LIST_IGNORE;
                }
                return false;
              }}
            >
              {fileList.length < 5 && (
                <div><PlusOutlined /><div style={{ marginTop: 8 }}>Thêm ảnh</div></div>
              )}
            </Upload>
          </Form.Item>
        </Form>
      </CenteredModal>
    </>
  );
}
