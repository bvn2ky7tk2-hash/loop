import {
  Button, Space, Descriptions, Progress, Tag, Divider, theme,
} from 'antd';
import { CheckCircleOutlined, RollbackOutlined } from '@ant-design/icons';
import { TaskStatusPill } from '../../../components/ui/TaskStatusPill';
import type { TaskStatus as TaskStatusType } from '../../../components/ui/TaskStatusPill';
import { CenteredModal } from '../../../components/ui/CenteredModal';
import { CommentThread } from '../../../components/comments/CommentThread';
import type { Task } from '../../../api/tasks';
import dayjs from 'dayjs';

interface Props {
  detailTaskId: string | null;
  detailTask: Task | undefined;
  detailLoading: boolean;
  onClose: () => void;
  onReturn: (id: string) => void;
  onApprove: (id: string) => void;
  approvePending: boolean;
}

export function TaskDetailModal({
  detailTaskId, detailTask, detailLoading, onClose, onReturn, onApprove, approvePending,
}: Props) {
  const { token } = theme.useToken();

  return (
    <CenteredModal
      open={!!detailTaskId}
      onClose={onClose}
      title={detailTask ? detailTask.title : 'Chi tiết công việc'}
      width={640}
      loading={detailLoading}
      footer={
        detailTask ? (
          <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
            <Button
              danger
              icon={<RollbackOutlined />}
              onClick={() => onReturn(detailTask.id)}
            >
              Trả lại
            </Button>
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              loading={approvePending}
              disabled={approvePending}
              onClick={() => onApprove(detailTask.id)}
            >
              Duyệt công việc
            </Button>
          </Space>
        ) : null
      }
    >
      {detailTask && (
        <div>
          {/* Trạng thái + Tiến độ */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <TaskStatusPill status={detailTask.status as TaskStatusType} />
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Progress
                percent={Number(detailTask.progress)}
                size="small"
                showInfo={false}
                style={{ flex: 1, margin: 0 }}
                strokeColor={Number(detailTask.progress) >= 100 ? '#10B981' : '#F59E0B'}
              />
              <span style={{
                fontSize: 13, fontWeight: 700, minWidth: 36,
                color: Number(detailTask.progress) >= 100 ? '#10B981' : '#F59E0B',
              }}>
                {Number(detailTask.progress)}%
              </span>
            </div>
          </div>

          {/* Thông tin chi tiết */}
          <Descriptions
            column={2}
            size="small"
            bordered
            labelStyle={{ fontWeight: 600, width: 130, color: token.colorTextSecondary }}
            contentStyle={{ color: token.colorText }}
          >
            <Descriptions.Item label="Dự án" span={2}>
              {detailTask.project
                ? <><Tag color="geekblue" style={{ marginRight: 6 }}>{detailTask.project.code}</Tag>{detailTask.project.name}</>
                : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Người thực hiện">
              {detailTask.assignee?.fullName ?? '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Ngày nộp">
              {detailTask.createdAt ? dayjs(detailTask.createdAt).format('DD/MM/YYYY HH:mm') : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Ngày bắt đầu">
              {detailTask.startDate ? dayjs(detailTask.startDate).format('DD/MM/YYYY') : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Hạn hoàn thành">
              {detailTask.dueDate ? (
                (() => {
                  const overdue = dayjs(detailTask.dueDate).isBefore(dayjs(), 'day');
                  return (
                    <span style={{ color: overdue ? '#EF4444' : undefined, fontWeight: overdue ? 700 : undefined }}>
                      {dayjs(detailTask.dueDate).format('DD/MM/YYYY')}
                      {overdue && <span style={{ marginLeft: 6, fontSize: 11 }}>⚠ Quá hạn</span>}
                    </span>
                  );
                })()
              ) : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Giờ ước tính">
              <span style={{ fontWeight: 500 }}>{Number(detailTask.estimateHours)}h</span>
            </Descriptions.Item>
            <Descriptions.Item label="Giờ thực tế">
              <span style={{
                fontWeight: 600,
                color: Number(detailTask.actualHours) > Number(detailTask.estimateHours) ? '#EF4444' : '#10B981',
              }}>
                {Number(detailTask.actualHours)}h
              </span>
            </Descriptions.Item>
          </Descriptions>

          {/* Mô tả */}
          {detailTask.description && (
            <>
              <Divider style={{ marginTop: 16, marginBottom: 12 }} />
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: token.colorTextSecondary }}>
                Mô tả công việc
              </div>
              <div style={{
                fontSize: 13,
                color: token.colorText,
                lineHeight: 1.65,
                background: token.colorBgLayout,
                border: `1px solid ${token.colorBorder}`,
                borderRadius: 8,
                padding: '10px 14px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}>
                {detailTask.description}
              </div>
            </>
          )}

          {/* Sub-tasks */}
          {(detailTask.children?.length ?? 0) > 0 && (
            <>
              <Divider style={{ marginTop: 16, marginBottom: 12 }} />
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: token.colorTextSecondary }}>
                Sub-tasks ({detailTask.children!.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {detailTask.children!.map((child) => (
                  <div
                    key={child.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '6px 10px',
                      background: token.colorBgLayout,
                      border: `1px solid ${token.colorBorder}`,
                      borderRadius: 6,
                    }}
                  >
                    <TaskStatusPill status={child.status as TaskStatusType} />
                    <span style={{ fontSize: 12, flex: 1, color: token.colorText }}>{child.title}</span>
                    <span style={{ fontSize: 11, color: token.colorTextSecondary, fontWeight: 500 }}>
                      {Number(child.progress)}%
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
          <Divider style={{ margin: '16px 0 8px' }}>Thảo luận</Divider>
          <CommentThread entityType="task" entityId={detailTaskId!} />
        </div>
      )}
    </CenteredModal>
  );
}
