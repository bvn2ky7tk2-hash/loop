import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Space, App, Spin, Alert, Typography } from 'antd';
import { SaveOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useDefinition, useUpdateDefinition, type ProcessDefinition } from '../../api/processes.api';
import { DefinitionStatusBadge } from './components/ProcessStatusBadge';
import { BpmnModeler } from './components/BpmnModeler';

const { Title } = Typography;

export default function ProcessModelerPage() {
  const { message } = App.useApp();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [currentXml, setCurrentXml] = useState<string>('');
  const [isDirty, setIsDirty] = useState(false);

  const { data, isLoading, error } = useDefinition(id ?? '');
  const updateMutation = useUpdateDefinition();

  const definition = data?.data as ProcessDefinition | undefined;

  const handleXmlChange = useCallback((xml: string) => {
    setCurrentXml(xml);
    setIsDirty(true);
  }, []);

  const handleSave = async () => {
    if (!id || !currentXml) return;
    try {
      await updateMutation.mutateAsync({
        id,
        data: { bpmnXml: currentXml },
      });
      setIsDirty(false);
      message.success('Đã lưu BPMN');
    } catch {
      message.error('Lưu thất bại');
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !definition) {
    return <Alert type="error" message="Không tìm thấy process definition" />;
  }

  const isReadOnly = false;

  return (
    <div className="page-wrapper" style={{ padding: '0 24px 24px' }}>
      <div
        className="page-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}
      >
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/processes')}>
            Quay lại
          </Button>
          <Title level={4} style={{ margin: 0 }}>
            {definition.name}
            <span style={{ marginLeft: 8, fontSize: 14, fontWeight: 400, color: '#8c8c8c' }}>
              v{definition.version}
            </span>
          </Title>
          <DefinitionStatusBadge status={definition.status} />
        </Space>

        <Space>
          {isDirty && !isReadOnly && (
            <span style={{ color: '#faad14', fontSize: 13 }}>Có thay đổi chưa lưu</span>
          )}
          {!isReadOnly && (
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={updateMutation.isPending}
              onClick={handleSave}
              disabled={!isDirty || updateMutation.isPending}
            >
              Lưu
            </Button>
          )}
        </Space>
      </div>

      {definition.status === 'ACTIVE' && (
        <Alert
          type="info"
          message="Definition đang ACTIVE — lưu thay đổi sẽ tạo phiên bản mới (version + 1)"
          style={{ marginBottom: 12 }}
        />
      )}

      <BpmnModeler
        xml={definition.bpmnXml}
        onChange={isReadOnly ? undefined : handleXmlChange}
      />
    </div>
  );
}
