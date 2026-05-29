import { useState, useMemo } from 'react';
import {
  Button, Form, Space, Spin, Typography, Divider,
  Alert, Tag, Popconfirm, App, Collapse, Badge,
  theme as antTheme,
} from 'antd';
import { CenteredModal } from '../../../components/ui/CenteredModal';
import {
  CheckOutlined, LikeOutlined, DislikeOutlined, RollbackOutlined,
  FileTextOutlined, CalendarOutlined, UserOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  useUserTask,
  useUserTasks,
  useCompleteTask,
  useReturnTask,
  type ProcessUserTask,
  type FormField,
  type CriteriaGridValue,
  type CriterionConfig,
} from '../../../api/processes.api';
import { DynamicFormFields } from './DynamicFormFields';
import { CriteriaGridField } from './CriteriaGridField';

const { useToken } = antTheme;
const { Text, Title } = Typography;

interface Props {
  task: ProcessUserTask | null;
  open: boolean;
  onClose: () => void;
}

export function TaskCompleteDrawer({ task, open, onClose }: Props) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const { token } = useToken();
  const completeMutation = useCompleteTask();
  const returnMutation = useReturnTask();

  const { data: taskDetail, isLoading } = useUserTask(task?.id ?? '');
  const fullTask = taskDetail?.data ?? task;

  // Lấy tất cả tasks của cùng instance để hiển thị previous steps
  const { data: allTasksData } = useUserTasks({
    instanceId: fullTask?.instanceId,
    pageSize: 30,
  });

  const taskFormFields: FormField[] = useMemo(() => {
    if (!fullTask) return [];
    const tfFields = fullTask.instance?.definition?.taskFormFields;
    if (!tfFields) return [];
    return tfFields[fullTask.activityId] ?? [];
  }, [fullTask]);

  // Các bước đã hoàn thành trước bước hiện tại (có formData)
  const completedPrevTasks: ProcessUserTask[] = useMemo(() => {
    if (!allTasksData?.data || !fullTask) return [];
    return allTasksData.data
      .filter(
        (t) =>
          t.status === 'COMPLETED' &&
          t.activityId !== fullTask.activityId &&
          t.formData &&
          Object.keys(t.formData).length > 0,
      )
      .sort((a, b) =>
        dayjs(a.completedAt).valueOf() - dayjs(b.completedAt).valueOf(),
      );
  }, [allTasksData, fullTask]);

  const isApprovalTask = (name: string) =>
    /duyệt|phê duyệt|review|approve/i.test(name);

  const hasTaskForm = taskFormFields.length > 0;
  const isApproval = task ? isApprovalTask(task.name) : false;

  const handleComplete = async (extraVars?: Record<string, unknown>) => {
    if (!task) return;

    let formVars: Record<string, unknown> = {};
    if (hasTaskForm) {
      try {
        const values = await form.validateFields();
        for (const field of taskFormFields) {
          const val = values[field.name];
          if (val !== undefined && val !== null && val !== '') {
            formVars[field.name] = dayjs.isDayjs(val) ? val.format('YYYY-MM-DD') : val;
          }
        }
      } catch {
        return;
      }
    }

    const variables = { ...formVars, ...extraVars };
    completeMutation.mutate(
      { id: task.id, variables: Object.keys(variables).length ? variables : undefined },
      {
        onSuccess: () => {
          message.success('Đã hoàn thành task');
          form.resetFields();
          onClose();
        },
        onError: () => message.error('Không thể hoàn thành task'),
      },
    );
  };

  const handleReturn = () => {
    if (!task) return;
    returnMutation.mutate(
      { id: task.id },
      {
        onSuccess: () => {
          message.success('Đã trả lại task');
          onClose();
        },
        onError: () => message.error('Không thể trả lại task'),
      },
    );
  };

  const footerButtons = (
    <Space style={{ justifyContent: 'space-between', width: '100%', display: 'flex' }}>
      <Popconfirm title="Trả lại task này?" onConfirm={handleReturn}>
        <Button icon={<RollbackOutlined />} loading={returnMutation.isPending} disabled={returnMutation.isPending}>
          Trả lại
        </Button>
      </Popconfirm>
      <Space>
        <Button onClick={onClose}>Đóng</Button>
        {isApproval ? (
          <>
            <Popconfirm title="Từ chối yêu cầu?" onConfirm={() => handleComplete({ approved: false })}>
              <Button danger icon={<DislikeOutlined />} loading={completeMutation.isPending} disabled={completeMutation.isPending}>
                Từ chối
              </Button>
            </Popconfirm>
            <Popconfirm title="Đồng ý duyệt yêu cầu?" onConfirm={() => handleComplete({ approved: true })}>
              <Button type="primary" icon={<LikeOutlined />} loading={completeMutation.isPending} disabled={completeMutation.isPending}>
                Đồng ý
              </Button>
            </Popconfirm>
          </>
        ) : (
          <Button
            type="primary"
            icon={<CheckOutlined />}
            loading={completeMutation.isPending}
            disabled={completeMutation.isPending}
            onClick={() => handleComplete()}
          >
            Hoàn thành
          </Button>
        )}
      </Space>
    </Space>
  );

  return (
    <CenteredModal
      title={
        <Space>
          <span style={{ fontWeight: 700, fontSize: 16 }}>{task?.name ?? 'Xử lý task'}</span>
          {task && (
            <Tag
              color="purple"
              style={{ fontFamily: 'monospace', fontSize: 11, marginLeft: 4 }}
            >
              {task.activityId}
            </Tag>
          )}
        </Space>
      }
      open={open}
      onClose={onClose}
      width={620}
      footer={footerButtons}
      destroyOnClose
      styles={{
        body: { padding: 0 },
        footer: {
          padding: '12px 24px',
          borderTop: `1px solid ${token.colorBorderSecondary}`,
        },
      }}
    >
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 80 }}>
          <Spin size="large" />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

          {/* ── Previous steps ──────────────────────────────────────── */}
          {completedPrevTasks.length > 0 && (
            <PreviousStepsSection
              prevTasks={completedPrevTasks}
              taskFormFields={fullTask?.instance?.definition?.taskFormFields ?? {}}
              token={token}
            />
          )}

          {/* ── Current task form ────────────────────────────────────── */}
          <div style={{ padding: '20px 24px', flex: 1 }}>
            {hasTaskForm ? (
              <>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 16,
                  }}
                >
                  <FileTextOutlined style={{ color: token.colorPrimary, fontSize: 16 }} />
                  <Title level={5} style={{ margin: 0 }}>
                    Nội dung cần điền
                  </Title>
                </div>
                <Form form={form} layout="vertical">
                  <DynamicFormFields fields={taskFormFields} />
                </Form>
              </>
            ) : (
              <Alert
                type="info"
                showIcon
                message="Task này không yêu cầu điền thêm thông tin"
                description={
                  isApproval
                    ? 'Vui lòng chọn Đồng ý hoặc Từ chối để hoàn thành.'
                    : 'Nhấn "Hoàn thành" để xác nhận.'
                }
              />
            )}
          </div>
        </div>
      )}
    </CenteredModal>
  );
}

// ─── Previous Steps Section ───────────────────────────────────────────────────

interface PrevStepsSectionProps {
  prevTasks: ProcessUserTask[];
  taskFormFields: Record<string, FormField[]>;
  token: ReturnType<typeof useToken>['token'];
}

function PreviousStepsSection({ prevTasks, taskFormFields, token }: PrevStepsSectionProps) {
  const [expandedKeys, setExpandedKeys] = useState<string[]>(
    prevTasks.length === 1 ? [prevTasks[0].id] : [],
  );

  const items = prevTasks.map((prevTask, idx) => {
    const fields = taskFormFields[prevTask.activityId] ?? [];
    return {
      key: prevTask.id,
      label: (
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space size={8}>
            <Badge
              count={idx + 1}
              style={{
                backgroundColor: token.colorSuccess,
                fontSize: 11,
                fontWeight: 700,
              }}
            />
            <Text strong style={{ fontSize: 14 }}>
              {prevTask.name}
            </Text>
          </Space>
          <Space size={12}>
            {prevTask.assignee && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                <UserOutlined style={{ marginRight: 4 }} />
                {prevTask.assignee.name}
              </Text>
            )}
            {prevTask.completedAt && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                <CalendarOutlined style={{ marginRight: 4 }} />
                {dayjs(prevTask.completedAt).format('DD/MM HH:mm')}
              </Text>
            )}
          </Space>
        </Space>
      ),
      children: (
        <PrevTaskFormData
          formData={prevTask.formData ?? {}}
          fields={fields}
          token={token}
        />
      ),
    };
  });

  return (
    <div
      style={{
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
        background: token.colorFillAlter,
      }}
    >
      <div
        style={{
          padding: '12px 24px 8px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <CheckOutlined style={{ color: token.colorSuccess, fontSize: 14 }} />
        <Text
          style={{
            fontWeight: 600,
            fontSize: 13,
            color: token.colorSuccess,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Dữ liệu từ bước trước
        </Text>
        <Tag color="success" style={{ marginLeft: 'auto', fontSize: 11 }}>
          {prevTasks.length} bước đã hoàn thành
        </Tag>
      </div>
      <Collapse
        ghost
        items={items}
        activeKey={expandedKeys}
        onChange={(keys) => setExpandedKeys(keys as string[])}
        style={{ padding: '0 8px 8px' }}
      />
    </div>
  );
}

// ─── Previous Task Form Data Display ─────────────────────────────────────────

function PrevTaskFormData({
  formData,
  fields,
  token,
}: {
  formData: Record<string, unknown>;
  fields: FormField[];
  token: ReturnType<typeof useToken>['token'];
}) {
  if (Object.keys(formData).length === 0) {
    return <Text type="secondary">Không có dữ liệu</Text>;
  }

  // Dùng field definitions để render đúng loại
  const fieldMap = new Map(fields.map((f) => [f.name, f]));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Object.entries(formData).map(([key, value]) => {
        const fieldDef = fieldMap.get(key);
        const label = fieldDef?.label ?? key;

        // criteria_grid
        if (
          fieldDef?.type === 'criteria_grid' ||
          (value !== null &&
            typeof value === 'object' &&
            !Array.isArray(value) &&
            'scores' in (value as object) &&
            'weightedTotal' in (value as object))
        ) {
          const gridVal = value as CriteriaGridValue;
          const criteria: CriterionConfig[] =
            fieldDef?.type === 'criteria_grid' ? fieldDef.criteria : [];
          const scoreMin = fieldDef?.type === 'criteria_grid' ? fieldDef.scoreMin : 1;
          const scoreMax = fieldDef?.type === 'criteria_grid' ? fieldDef.scoreMax : 5;

          return (
            <div key={key}>
              <Text
                type="secondary"
                style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}
              >
                {label}
              </Text>
              <div style={{ marginTop: 8 }}>
                {criteria.length > 0 ? (
                  <CriteriaGridField
                    criteria={criteria}
                    scoreMin={scoreMin}
                    scoreMax={scoreMax}
                    value={gridVal.scores}
                    readonly
                  />
                ) : (
                  <CriteriaGridSimpleView scores={gridVal.scores} weightedTotal={gridVal.weightedTotal} token={token} />
                )}
              </div>
            </div>
          );
        }

        // textarea/text
        if (typeof value === 'string' && value) {
          return (
            <div key={key}>
              <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {label}
              </Text>
              <div
                style={{
                  marginTop: 4,
                  padding: '8px 12px',
                  background: token.colorBgContainer,
                  border: `1px solid ${token.colorBorderSecondary}`,
                  borderRadius: token.borderRadiusSM,
                  fontSize: 14,
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {value}
              </div>
            </div>
          );
        }

        // select / other primitive
        if (value !== null && value !== undefined) {
          return (
            <div
              key={key}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 0',
                borderBottom: `1px solid ${token.colorBorderSecondary}`,
              }}
            >
              <Text type="secondary" style={{ fontSize: 13 }}>
                {label}
              </Text>
              <Tag style={{ margin: 0 }}>{String(value)}</Tag>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}

// Simple view khi không có criteria config (fallback)
function CriteriaGridSimpleView({
  scores,
  weightedTotal,
  token,
}: {
  scores: Record<string, number>;
  weightedTotal: number;
  token: ReturnType<typeof useToken>['token'];
}) {
  return (
    <div
      style={{
        background: token.colorBgContainer,
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: token.borderRadius,
        overflow: 'hidden',
      }}
    >
      {Object.entries(scores).map(([key, score]) => (
        <div
          key={key}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '6px 12px',
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <Text style={{ fontSize: 13 }}>{key}</Text>
          <ScoreBadge score={score} />
        </div>
      ))}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 12px',
          background: token.colorFillSecondary,
        }}
      >
        <Text strong>Tổng điểm</Text>
        <Tag color="blue" style={{ fontSize: 14, fontWeight: 700, padding: '2px 10px' }}>
          {weightedTotal}
        </Tag>
      </div>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 4.5 ? '#52c41a' :
    score >= 3.5 ? '#73d13d' :
    score >= 2.5 ? '#faad14' :
    score >= 1.5 ? '#fa8c16' : '#ff4d4f';

  return (
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: '50%',
        background: color + '20',
        border: `2px solid ${color}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: 13,
        color,
      }}
    >
      {score}
    </div>
  );
}
