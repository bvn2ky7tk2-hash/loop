import { Modal, Select, Space, Typography, Alert, Spin } from 'antd';
import { BranchesOutlined, WarningOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { useState } from 'react';
import {
  leavesApi,
  processDefsApi,
  type LeaveType,
  type ProcessDefinitionRef,
} from '../../api/leaves';
import { useThemePalette } from '../../hooks/useThemePalette';

const { Text } = Typography;

interface Props {
  leaveType: LeaveType | null;
  open: boolean;
  onClose: () => void;
}

export default function LeaveTypeConfigModal({ leaveType, open, onClose }: Props) {
  const { preset, textPrimary, textSecondary, bgContainer, bgCard, borderColor } = useThemePalette();

  const qc = useQueryClient();

  const [selectedKey, setSelectedKey] = useState<string | null | undefined>(
    leaveType?.processDefinitionKey,
  );

  // Reset khi leaveType thay đổi
  const currentKey = leaveType?.processDefinitionKey;

  const { data: defs = [], isLoading: defsLoading } = useQuery<ProcessDefinitionRef[]>({
    queryKey: ['process-definitions', 'active'],
    queryFn: processDefsApi.listActive,
    enabled: open,
    staleTime: 30_000,
  });

  const { mutate: save, isPending } = useMutation({
    mutationFn: (key: string | null) =>
      leavesApi.updateType(leaveType!.id, { processDefinitionKey: key }),
    onSuccess: () => {
      message.success('Đã cập nhật workflow cho leave type');
      qc.invalidateQueries({ queryKey: ['leave-types'] });
      onClose();
    },
    onError: () => message.error('Cập nhật thất bại'),
  });

  function handleOk() {
    if (!leaveType) return;
    save(selectedKey ?? null);
  }

  function handleOpen(vis: boolean) {
    if (vis) {
      // Sync selected key khi modal mở
      setSelectedKey(currentKey);
    }
  }

  // Chỉ lấy definitions có key (có thể link được)
  const activeDefs = defs.filter(
    (d) => d.status === 'ACTIVE' || d.status === 'DEPLOYED',
  );
  const defsWithKey = activeDefs.filter((d) => d.key);
  const defsNoKey   = activeDefs.filter((d) => !d.key);

  const selectedDef = selectedKey
    ? defs.find((d) => d.key === selectedKey)
    : undefined;

  const showNoKeyWarning =
    selectedKey && selectedDef && !selectedDef.key;

  return (
    <Modal
      title={
        <Space>
          <BranchesOutlined style={{ color: preset.primary }} />
          <span style={{ color: textPrimary }}>
            Cấu hình Workflow — {leaveType?.name}
          </span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      okText="Lưu"
      cancelText="Huỷ"
      confirmLoading={isPending}
      afterOpenChange={handleOpen}
      styles={{
        content: { background: bgContainer, border: `1px solid ${borderColor}` },
        header: { background: bgContainer, borderBottom: `1px solid ${borderColor}` },
        body:   { background: bgContainer },
        footer: { background: bgContainer, borderTop: `1px solid ${borderColor}` },
        mask:   { backdropFilter: 'blur(2px)' },
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <Text style={{ color: textSecondary, fontSize: 13 }}>
          Select the BPM process definition to run when a leave request of this type is submitted.
          If no workflow is selected, requests will go through direct approval.
        </Text>
      </div>

      {defsLoading ? (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <Spin />
        </div>
      ) : (
        <>
          <div
            style={{
              background: bgCard,
              border: `1px solid ${borderColor}`,
              borderRadius: 8,
              padding: '12px 16px',
              marginBottom: 12,
            }}
          >
            <div style={{ marginBottom: 8 }}>
              <Text strong style={{ color: textPrimary, fontSize: 13 }}>
                Process Definition
              </Text>
            </div>
            <Select
              style={{ width: '100%' }}
              value={selectedKey ?? null}
              onChange={(v) => setSelectedKey(v)}
              placeholder="No workflow (direct approval)"
              allowClear
              onClear={() => setSelectedKey(null)}
            >
              <Select.Option value={null}>
                <Space>
                  <span>—</span>
                  <span style={{ color: textSecondary }}>No workflow (direct approval)</span>
                </Space>
              </Select.Option>
              {defsWithKey.map((d) => (
                <Select.Option key={d.key!} value={d.key!}>
                  <Space>
                    <BranchesOutlined style={{ color: preset.primary }} />
                    <span style={{ color: textPrimary }}>{d.name}</span>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      ({d.key})
                    </Text>
                  </Space>
                </Select.Option>
              ))}
              {defsNoKey.length > 0 && (
                <>
                  {defsNoKey.map((d) => (
                    <Select.Option key={d.id} value={d.id} disabled>
                      <Space>
                        <WarningOutlined style={{ color: '#FA8C16' }} />
                        <span style={{ color: textSecondary }}>{d.name}</span>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          (no key — cannot link)
                        </Text>
                      </Space>
                    </Select.Option>
                  ))}
                </>
              )}
            </Select>
          </div>

          {showNoKeyWarning && (
            <Alert
              type="warning"
              showIcon
              message="This process definition has no key set. It cannot be automatically linked to leave requests."
            />
          )}

          {selectedKey && !showNoKeyWarning && (
            <Alert
              type="info"
              showIcon
              message={`When a new "${leaveType?.name}" request is submitted, it will automatically start the "${selectedDef?.name ?? selectedKey}" workflow.`}
            />
          )}

          {!selectedKey && (
            <Alert
              type="success"
              showIcon
              message={`"${leaveType?.name}" requests will be approved directly by managers without a BPM workflow.`}
            />
          )}
        </>
      )}
    </Modal>
  );
}
