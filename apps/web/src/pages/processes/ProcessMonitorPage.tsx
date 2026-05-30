import { useParams, useNavigate } from 'react-router-dom';
import {
  Button,
  Descriptions,
  Spin,
  Alert,
  Tabs,
  Timeline,
  Tag,
  Popconfirm,
  App,
  Space,
} from 'antd';
import { ArrowLeftOutlined, StopOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  useInstance,
  useActivityLog,
  useCancelInstance,
  type ProcessInstance,
  type ProcessActivityLog,
  type InstanceStatus,
} from '../../api/processes.api';
import { InstanceStatusBadge } from './components/ProcessStatusBadge';
import { UserTaskList } from './components/UserTaskList';
import { BpmnViewer } from './components/BpmnViewer';

export default function ProcessMonitorPage() {
  const { message } = App.useApp();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading, error } = useInstance(id ?? '');
  const { data: logData } = useActivityLog(id ?? '');
  const cancelMutation = useCancelInstance();

  const instance = data?.data as ProcessInstance | undefined;
  const logs = logData?.data as ProcessActivityLog[] | undefined;

  const handleCancel = () => {
    if (!id) return;
    cancelMutation.mutate(id, {
      onSuccess: () => message.success('Đã huỷ process instance'),
      onError: () => message.error('Không thể huỷ'),
    });
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !instance) {
    return <Alert type="error" message="Không tìm thấy process instance" />;
  }

  // Tính active và completed activity IDs từ activity logs
  const completedActivityIds = (logs ?? [])
    .filter((l) => !!l.completedAt)
    .map((l) => l.activityId);

  const activeActivityIds = (instance.userTasks ?? [])
    .filter((t) => t.status === 'PENDING' || t.status === 'IN_PROGRESS')
    .map((t) => t.activityId);

  const getTimelineItemColor = (status: InstanceStatus | string) => {
    if (status === 'COMPLETED' || status === 'bpmn:EndEvent') return 'green';
    if (status === 'ERROR') return 'red';
    if (status === 'bpmn:UserTask') return 'blue';
    return 'gray';
  };

  return (
    <div className="page-wrapper">
      <div
        className="page-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}
      >
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/processes/instances')}>
            Quay lại
          </Button>
          <h1 className="page-title" style={{ margin: 0 }}>
            Process Instance
          </h1>
          <InstanceStatusBadge status={instance.status} />
        </Space>

        {instance.status === 'RUNNING' && (
          <Popconfirm title="Huỷ process instance này?" onConfirm={handleCancel}>
            <Button danger icon={<StopOutlined />} loading={cancelMutation.isPending}>
              Huỷ
            </Button>
          </Popconfirm>
        )}
      </div>

      <Descriptions bordered size="small" column={2} style={{ marginBottom: 24 }}>
        <Descriptions.Item label="Quy trình">
          {instance.definition?.name}{' '}
          {instance.definition && <Tag>v{instance.definition.version}</Tag>}
        </Descriptions.Item>
        <Descriptions.Item label="Trạng thái">
          <InstanceStatusBadge status={instance.status} />
        </Descriptions.Item>
        <Descriptions.Item label="Bắt đầu">
          {dayjs(instance.startedAt).format('DD/MM/YYYY HH:mm:ss')}
        </Descriptions.Item>
        <Descriptions.Item label="Kết thúc">
          {instance.completedAt ? dayjs(instance.completedAt).format('DD/MM/YYYY HH:mm:ss') : '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Người khởi động">
          {instance.startedByUser?.name ?? '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Instance ID">
          <code style={{ fontSize: 12 }}>{instance.id}</code>
        </Descriptions.Item>
      </Descriptions>

      <Tabs
        items={[
          {
            key: 'diagram',
            label: 'Sơ đồ quy trình',
            children: instance.definition && (
              <BpmnViewer
                xml={instance.definition.bpmnXml ?? ''}
                activeActivityIds={activeActivityIds}
                completedActivityIds={completedActivityIds}
              />
            ),
          },
          {
            key: 'user-tasks',
            label: `User Tasks (${instance.userTasks?.length ?? 0})`,
            children: <UserTaskList instanceId={instance.id} />,
          },
          {
            key: 'activity-log',
            label: 'Activity Log',
            children: (
              <Timeline
                items={
                  (logs ?? []).map((log) => ({
                    color: getTimelineItemColor(log.activityType),
                    children: (
                      <div key={log.id}>
                        <strong>{log.activityName}</strong>
                        <span style={{ marginLeft: 8, color: '#8c8c8c', fontSize: 12 }}>
                          ({log.activityType})
                        </span>
                        <div style={{ fontSize: 12, color: '#595959' }}>
                          {dayjs(log.startedAt).format('DD/MM/YYYY HH:mm:ss')}
                          {log.completedAt && (
                            <span> → {dayjs(log.completedAt).format('HH:mm:ss')}</span>
                          )}
                        </div>
                        {log.performedBy && (
                          <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                            Bởi: {log.performedBy}
                          </div>
                        )}
                      </div>
                    ),
                  }))
                }
              />
            ),
          },
        ]}
      />
    </div>
  );
}
