import { useState, useEffect, useMemo } from 'react';
import {
  Button, Space, App, Tabs, Typography,
} from 'antd';
import { CenteredModal } from '../../../components/ui/CenteredModal';
import { UnorderedListOutlined } from '@ant-design/icons';
import {
  processesApi,
  useDefinition,
  type ProcessDefinition,
  type FormField,
  type StepConfigItem,
  type StepConfigMap,
} from '../../../api/processes.api';
import { useQueryClient } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { orgUnitsApi } from '../../../api/org-units';
import { useThemePalette } from '../../../hooks/useThemePalette';
import { type UserTaskMeta } from './field-builder/constants';
import { fetchUsers, parseUserTasksFromBpmn, flattenOrgUnits } from './field-builder/helpers';
import { FieldTabContent } from './field-builder/FieldTabContent';
import { UserTaskTabContent } from './field-builder/UserTaskTabContent';

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  definition: ProcessDefinition | null;
  open: boolean;
  onClose: () => void;
}

export function FieldBuilderDrawer({ definition, open, onClose }: Props) {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const { isDark, preset, bgSubPanel, borderColor } = useThemePalette();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('__start__');

  // Start form fields
  const [startFields, setStartFields] = useState<FormField[]>([]);
  // Per-task fields: { [activityId]: FormField[] }
  const [taskFields, setTaskFields] = useState<Record<string, FormField[]>>({});
  // Per-step config: { [activityId]: StepConfigItem }
  const [stepConfig, setStepConfig] = useState<StepConfigMap>({});

  // Fetch full definition (needs bpmnXml to parse UserTasks)
  const { data: fullDefData } = useDefinition(definition?.id ?? '');
  const fullDef = fullDefData?.data;

  // Load users + org units cho pickers
  const { data: allUsers = [] } = useQuery({
    queryKey: ['users-list'],
    queryFn: fetchUsers,
    enabled: open,
  });
  const { data: orgTree = [] } = useQuery({
    queryKey: ['org-units-tree'],
    queryFn: () => orgUnitsApi.getTree(),
    enabled: open,
  });
  const flatOrgUnits = useMemo(() => flattenOrgUnits(orgTree), [orgTree]);

  const userTasks: UserTaskMeta[] = useMemo(() => {
    if (!fullDef?.bpmnXml) return [];
    return parseUserTasksFromBpmn(fullDef.bpmnXml);
  }, [fullDef?.bpmnXml]);

  // Sync fields + stepConfig khi drawer mở
  useEffect(() => {
    if (open && definition) {
      setStartFields((definition.formFields ?? []) as FormField[]);
      setTaskFields((definition.taskFormFields ?? {}) as Record<string, FormField[]>);
      setStepConfig((definition.stepConfig ?? {}) as StepConfigMap);
      setActiveTab('__start__');
    }
  }, [open, definition]);

  const getFields = (tabKey: string): FormField[] => {
    if (tabKey === '__start__') return startFields;
    return taskFields[tabKey] ?? [];
  };

  const setFields = (tabKey: string, fields: FormField[]) => {
    if (tabKey === '__start__') {
      setStartFields(fields);
    } else {
      setTaskFields((prev) => ({ ...prev, [tabKey]: fields }));
    }
  };

  const getStepConfig = (activityId: string): StepConfigItem =>
    stepConfig[activityId] ?? {};

  const setStepConfigItem = (activityId: string, item: StepConfigItem) => {
    setStepConfig((prev) => ({ ...prev, [activityId]: item }));
  };

  const handleSave = async () => {
    if (!definition) return;
    setSaving(true);
    try {
      await processesApi.updateDefinition(definition.id, {
        formFields: startFields,
        taskFormFields: taskFields,
        stepConfig,
      });
      await qc.invalidateQueries({ queryKey: ['process-definitions'] });
      await qc.invalidateQueries({ queryKey: ['process-definition', definition.id] });
      message.success('Đã lưu cấu hình');
      onClose();
    } catch {
      message.error('Không thể lưu');
    } finally {
      setSaving(false);
    }
  };

  const cardStyle = {
    background: bgSubPanel,
    border: `1px solid ${borderColor}`,
    borderRadius: 8,
    marginBottom: 16,
  };

  const tabItems = [
    {
      key: '__start__',
      label: (
        <Space size={4}>
          <UnorderedListOutlined />
          Form bắt đầu
        </Space>
      ),
      children: (
        <FieldTabContent
          tabKey="__start__"
          fields={getFields('__start__')}
          onChange={(fields) => setFields('__start__', fields)}
          description="Trường mà nhân viên điền khi TẠO yêu cầu mới (bước khởi động)."
          isDark={isDark}
          cardStyle={cardStyle}
        />
      ),
    },
    ...userTasks.map((ut) => ({
      key: ut.id,
      label: ut.name,
      children: (
        <UserTaskTabContent
          ut={ut}
          fields={getFields(ut.id)}
          onFieldsChange={(fields) => setFields(ut.id, fields)}
          stepConfigItem={getStepConfig(ut.id)}
          onStepConfigChange={(item) => setStepConfigItem(ut.id, item)}
          allUsers={allUsers}
          flatOrgUnits={flatOrgUnits}
          isDark={isDark}
          preset={preset}
          cardStyle={cardStyle}
        />
      ),
    })),
  ];

  return (
    <CenteredModal
      title={`Cấu hình quy trình — ${definition?.name ?? ''}`}
      open={open}
      onClose={onClose}
      width={780}
      footer={
        <Space style={{ justifyContent: 'flex-end', display: 'flex' }}>
          <Button onClick={onClose}>Huỷ</Button>
          <Button type="primary" loading={saving} onClick={handleSave}>
            Lưu cấu hình
          </Button>
        </Space>
      }
    >
      {userTasks.length === 0 && fullDef?.bpmnXml && (
        <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
          Không phát hiện UserTask trong BPMN. Chỉ hiển thị "Form bắt đầu".
        </Typography.Text>
      )}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        type="card"
      />
    </CenteredModal>
  );
}
