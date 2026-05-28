import { useState, useEffect, useMemo } from 'react';
import {
  Button, Table, Space, Modal, Form, Input,
  Select, Switch, InputNumber, App, Popconfirm, Tag, Tabs,
  Typography, Divider, Radio, Card,
} from 'antd';
import { CenteredModal } from '../../../components/ui/CenteredModal';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, HolderOutlined,
  UserOutlined, BellOutlined, UnorderedListOutlined,
} from '@ant-design/icons';
import {
  processesApi,
  useDefinition,
  type ProcessDefinition,
  type FormField,
  type CriterionConfig,
  type StepConfigItem,
  type StepConfigMap,
  type AssigneeConfig,
  type AssigneeMode,
  type NotificationTrigger,
  type SystemRole,
} from '../../../api/processes.api';
import { useQueryClient } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { usersApi, type UserRecord } from '../../../api/users';
import { orgUnitsApi, type OrgUnitTree } from '../../../api/org-units';
import { useThemeStore } from '../../../store/theme.store';

// ─── Helpers ─────────────────────────────────────────────────────────────────

type FieldType = FormField['type'];

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: 'Văn bản',
  textarea: 'Đoạn văn',
  number: 'Số',
  date: 'Ngày tháng',
  select: 'Lựa chọn',
  criteria_grid: 'Bảng tiêu chí',
};

const ASSIGNEE_MODE_LABELS: Record<AssigneeMode, string> = {
  fixed: 'Người cố định',
  orgunit: 'Theo phòng ban',
  requester_manager: 'Quản lý của người yêu cầu',
  variable: 'Từ biến quy trình',
};

const SYSTEM_ROLE_OPTIONS: { value: SystemRole; label: string }[] = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'LEADERSHIP', label: 'Leadership' },
  { value: 'PM', label: 'PM' },
  { value: 'MEMBER', label: 'Member' },
];

const TEMPLATE_VARS = [
  '{{process.name}}', '{{task.name}}', '{{task.dueDate}}',
  '{{requester.name}}', '{{requester.email}}',
  '{{assignee.name}}', '{{assignee.email}}',
  '{{recipient.name}}', '{{recipient.email}}',
];

const RECIPIENT_PRESETS = [
  { value: 'assignee', label: 'Người xử lý' },
  { value: 'requester', label: 'Người yêu cầu' },
  { value: 'requester_manager', label: 'Quản lý người yêu cầu' },
];

interface UserTaskMeta {
  id: string;
  name: string;
}

function parseUserTasksFromBpmn(xml: string): UserTaskMeta[] {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    const tasks = Array.from(
      doc.getElementsByTagNameNS('http://www.omg.org/spec/BPMN/20100524/MODEL', 'userTask'),
    );
    if (!tasks.length) {
      const fallback = Array.from(doc.querySelectorAll('userTask'));
      return fallback.map((el) => ({
        id: el.getAttribute('id') ?? '',
        name: el.getAttribute('name') ?? el.getAttribute('id') ?? 'UserTask',
      }));
    }
    return tasks.map((el) => ({
      id: el.getAttribute('id') ?? '',
      name: el.getAttribute('name') ?? el.getAttribute('id') ?? 'UserTask',
    }));
  } catch {
    return [];
  }
}

function flattenOrgUnits(nodes: OrgUnitTree[]): OrgUnitTree[] {
  const result: OrgUnitTree[] = [];
  function walk(arr: OrgUnitTree[]) {
    for (const n of arr) {
      result.push(n);
      if (n.children?.length) walk(n.children);
    }
  }
  walk(nodes);
  return result;
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  definition: ProcessDefinition | null;
  open: boolean;
  onClose: () => void;
}

export function FieldBuilderDrawer({ definition, open, onClose }: Props) {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const { mode, preset } = useThemeStore();
  const isDark = mode === 'dark';
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
    queryFn: () => usersApi.list(),
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
    background: isDark ? '#1A2744' : '#F8FAFC',
    border: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`,
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

// ─── UserTask Tab (Fields + Assignee + Notification) ─────────────────────────

interface UserTaskTabProps {
  ut: UserTaskMeta;
  fields: FormField[];
  onFieldsChange: (fields: FormField[]) => void;
  stepConfigItem: StepConfigItem;
  onStepConfigChange: (item: StepConfigItem) => void;
  allUsers: UserRecord[];
  flatOrgUnits: OrgUnitTree[];
  isDark: boolean;
  preset: { primary: string };
  cardStyle: React.CSSProperties;
}

function UserTaskTabContent({
  ut, fields, onFieldsChange, stepConfigItem, onStepConfigChange,
  allUsers, flatOrgUnits, isDark, preset, cardStyle,
}: UserTaskTabProps) {
  const [innerTab, setInnerTab] = useState('fields');

  const innerTabs = [
    {
      key: 'fields',
      label: <Space size={4}><UnorderedListOutlined />Trường nhập liệu</Space>,
      children: (
        <FieldTabContent
          tabKey={ut.id}
          fields={fields}
          onChange={onFieldsChange}
          description={`Trường nhập liệu khi người dùng XỬ LÝ task "${ut.name}".`}
          isDark={isDark}
          cardStyle={cardStyle}
        />
      ),
    },
    {
      key: 'assignee',
      label: <Space size={4}><UserOutlined />Người xử lý</Space>,
      children: (
        <AssigneeConfigSection
          config={stepConfigItem.assigneeConfig}
          onChange={(cfg) => onStepConfigChange({ ...stepConfigItem, assigneeConfig: cfg })}
          allUsers={allUsers}
          flatOrgUnits={flatOrgUnits}
          isDark={isDark}
          preset={preset}
          cardStyle={cardStyle}
        />
      ),
    },
    {
      key: 'notification',
      label: <Space size={4}><BellOutlined />Thông báo</Space>,
      children: (
        <NotificationConfigSection
          config={stepConfigItem.notificationConfig}
          onChange={(cfg) => onStepConfigChange({ ...stepConfigItem, notificationConfig: cfg })}
          allUsers={allUsers}
          isDark={isDark}
          cardStyle={cardStyle}
        />
      ),
    },
  ];

  return (
    <Tabs
      activeKey={innerTab}
      onChange={setInnerTab}
      items={innerTabs}
      size="small"
      style={{ marginTop: 4 }}
    />
  );
}

// ─── Assignee Config Section ──────────────────────────────────────────────────

interface AssigneeConfigSectionProps {
  config?: AssigneeConfig;
  onChange: (cfg: AssigneeConfig | undefined) => void;
  allUsers: UserRecord[];
  flatOrgUnits: OrgUnitTree[];
  isDark: boolean;
  preset: { primary: string };
  cardStyle: React.CSSProperties;
}

function AssigneeConfigSection({
  config, onChange, allUsers, flatOrgUnits, isDark, cardStyle,
}: AssigneeConfigSectionProps) {
  const textSecondary = isDark ? 'rgba(255,255,255,0.5)' : '#475569';
  const mode = config?.mode ?? 'fixed';

  const userOptions = allUsers
    .filter((u) => u.isActive)
    .map((u) => ({ value: u.id, label: `${u.name} (${u.email})` }));

  const orgOptions = flatOrgUnits.map((o) => ({ value: o.id, label: o.name }));

  return (
    <div style={{ paddingTop: 8 }}>
      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12, color: textSecondary }}>
        Cấu hình cách hệ thống xác định người xử lý cho bước này khi quy trình chạy.
        Nếu không cấu hình, hệ thống dùng giá trị từ BPMN.
      </Typography.Text>

      <Card style={cardStyle} bodyStyle={{ padding: 16 }}>
        <Form layout="vertical" component="div">
          <Form.Item label="Chế độ gán người xử lý">
            <Radio.Group
              value={mode}
              onChange={(e) => onChange({ ...(config ?? {}), mode: e.target.value as AssigneeMode })}
            >
              <Space direction="vertical" size={6}>
                {(Object.keys(ASSIGNEE_MODE_LABELS) as AssigneeMode[]).map((m) => (
                  <Radio key={m} value={m}>{ASSIGNEE_MODE_LABELS[m]}</Radio>
                ))}
              </Space>
            </Radio.Group>
          </Form.Item>

          {mode === 'fixed' && (
            <Form.Item label="Chọn người xử lý">
              <Select
                showSearch
                placeholder="Chọn người dùng..."
                value={config?.userId}
                onChange={(v) => onChange({ ...config!, mode: 'fixed', userId: v })}
                options={userOptions}
                filterOption={(input, opt) =>
                  (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
                }
                style={{ width: '100%' }}
              />
            </Form.Item>
          )}

          {mode === 'orgunit' && (
            <>
              <Form.Item label="Phòng ban">
                <Select
                  showSearch
                  placeholder="Chọn phòng ban..."
                  value={config?.orgUnitId}
                  onChange={(v) => onChange({ ...config!, mode: 'orgunit', orgUnitId: v })}
                  options={orgOptions}
                  filterOption={(input, opt) =>
                    (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  style={{ width: '100%' }}
                />
              </Form.Item>
              <Form.Item
                label="Lọc theo role hệ thống (tuỳ chọn)"
                help="Nếu để trống, lấy bất kỳ user active nào trong phòng ban"
              >
                <Select
                  allowClear
                  placeholder="Không lọc theo role"
                  value={config?.role}
                  onChange={(v) => onChange({ ...config!, mode: 'orgunit', role: v as SystemRole })}
                  options={SYSTEM_ROLE_OPTIONS}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </>
          )}

          {mode === 'variable' && (
            <Form.Item
              label="Tên biến"
              help='Tên field trong instance.variables chứa userId của người xử lý. Ví dụ: "approver_id"'
            >
              <Input
                placeholder="approver_id"
                value={config?.variablePath}
                onChange={(e) => onChange({ ...config!, mode: 'variable', variablePath: e.target.value })}
                style={{ fontFamily: 'monospace' }}
              />
            </Form.Item>
          )}

          {mode === 'requester_manager' && (
            <Typography.Text type="secondary" style={{ color: textSecondary, fontSize: 13 }}>
              Hệ thống tự động tìm user có role <strong>Leadership</strong> hoặc <strong>PM</strong>{' '}
              trong cùng phòng ban với người tạo yêu cầu.
            </Typography.Text>
          )}
        </Form>
      </Card>
    </div>
  );
}

// ─── Notification Config Section ──────────────────────────────────────────────

interface NotificationConfigSectionProps {
  config?: { taskAssigned?: NotificationTrigger; taskCompleted?: NotificationTrigger };
  onChange: (cfg: { taskAssigned?: NotificationTrigger; taskCompleted?: NotificationTrigger } | undefined) => void;
  allUsers: UserRecord[];
  isDark: boolean;
  cardStyle: React.CSSProperties;
}

function NotificationConfigSection({ config, onChange, allUsers, isDark, cardStyle }: NotificationConfigSectionProps) {
  const textSecondary = isDark ? 'rgba(255,255,255,0.5)' : '#475569';

  const fixedUserOptions = allUsers
    .filter((u) => u.isActive)
    .map((u) => ({ value: `user:${u.id}`, label: `${u.name} (cố định)` }));

  const allRecipientOptions = [
    ...RECIPIENT_PRESETS,
    ...fixedUserOptions,
  ];

  const updateTrigger = (
    key: 'taskAssigned' | 'taskCompleted',
    patch: Partial<NotificationTrigger>,
  ) => {
    const current = config?.[key] ?? { enabled: false, recipients: [], subject: '', bodyTemplate: '' };
    onChange({ ...config, [key]: { ...current, ...patch } });
  };

  return (
    <div style={{ paddingTop: 8 }}>
      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12, color: textSecondary }}>
        Cấu hình email + notification gửi theo từng sự kiện của bước này.
        Dùng <code style={{ fontSize: 12 }}>{'{{biến}}'}</code> trong nội dung.
      </Typography.Text>

      {/* Template vars hint */}
      <div style={{ marginBottom: 12 }}>
        <Typography.Text type="secondary" style={{ fontSize: 12, color: textSecondary }}>
          Biến khả dụng:{' '}
        </Typography.Text>
        {TEMPLATE_VARS.map((v) => (
          <Tag key={v} style={{ fontFamily: 'monospace', fontSize: 11, marginBottom: 4 }}>{v}</Tag>
        ))}
      </div>

      {/* Trigger: Khi nhận task */}
      <NotificationTriggerCard
        title="Khi nhận task (task assigned)"
        trigger={config?.taskAssigned}
        onUpdate={(patch) => updateTrigger('taskAssigned', patch)}
        allRecipientOptions={allRecipientOptions}
        isDark={isDark}
        cardStyle={cardStyle}
      />

      {/* Trigger: Khi hoàn thành task */}
      <NotificationTriggerCard
        title="Khi hoàn thành task (task completed)"
        trigger={config?.taskCompleted}
        onUpdate={(patch) => updateTrigger('taskCompleted', patch)}
        allRecipientOptions={allRecipientOptions}
        isDark={isDark}
        cardStyle={cardStyle}
      />
    </div>
  );
}

interface NotificationTriggerCardProps {
  title: string;
  trigger?: NotificationTrigger;
  onUpdate: (patch: Partial<NotificationTrigger>) => void;
  allRecipientOptions: { value: string; label: string }[];
  isDark: boolean;
  cardStyle: React.CSSProperties;
}

function NotificationTriggerCard({
  title, trigger, onUpdate, allRecipientOptions, cardStyle,
}: NotificationTriggerCardProps) {
  const enabled = trigger?.enabled ?? false;

  return (
    <Card
      style={cardStyle}
      bodyStyle={{ padding: 16 }}
      title={
        <Space>
          <Switch
            size="small"
            checked={enabled}
            onChange={(v) => onUpdate({ enabled: v })}
          />
          <Typography.Text style={{ fontSize: 13 }}>{title}</Typography.Text>
        </Space>
      }
    >
      {enabled && (
        <Form layout="vertical" component="div">
          <Form.Item label="Người nhận">
            <Select
              mode="multiple"
              placeholder="Chọn người nhận..."
              value={trigger?.recipients ?? []}
              onChange={(v) => onUpdate({ recipients: v })}
              options={allRecipientOptions}
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item label="Tiêu đề email" help="Hỗ trợ {{process.name}}, {{task.name}}, ...">
            <Input
              value={trigger?.subject ?? ''}
              onChange={(e) => onUpdate({ subject: e.target.value })}
              placeholder="{{process.name}} — Bước {{task.name}} cần xử lý"
            />
          </Form.Item>
          <Form.Item label="Nội dung email" help="Hỗ trợ {{recipient.name}}, {{requester.name}}, ...">
            <Input.TextArea
              rows={5}
              value={trigger?.bodyTemplate ?? ''}
              onChange={(e) => onUpdate({ bodyTemplate: e.target.value })}
              placeholder={`Xin chào {{recipient.name}},\n\nYêu cầu "{{process.name}}" từ {{requester.name}} đang chờ bạn xử lý.\nBước: {{task.name}}\nHạn: {{task.dueDate}}\n\nVui lòng đăng nhập hệ thống để tiếp tục.`}
              style={{ fontFamily: 'monospace', fontSize: 12 }}
            />
          </Form.Item>
        </Form>
      )}
    </Card>
  );
}

// ─── Field Tab Content ────────────────────────────────────────────────────────

interface FieldTabContentProps {
  tabKey: string;
  fields: FormField[];
  onChange: (fields: FormField[]) => void;
  description: string;
  isDark: boolean;
  cardStyle: React.CSSProperties;
}

function FieldTabContent({ fields, onChange, description }: FieldTabContentProps) {
  const { message } = App.useApp();
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<FormField | null>(null);
  const [fieldForm] = Form.useForm<FormField & { optionsRaw?: string; criteriaRaw?: string }>();
  const [watchType, setWatchType] = useState<FieldType>('text');

  const openAdd = () => {
    setEditTarget(null);
    fieldForm.resetFields();
    setWatchType('text');
    setAddOpen(true);
  };

  const openEdit = (field: FormField) => {
    setEditTarget(field);
    if (field.type === 'select') {
      const optionsRaw = field.options?.map((o) => `${o.label}:${o.value}`).join('\n') ?? '';
      fieldForm.setFieldsValue({ ...field, optionsRaw });
    } else if (field.type === 'criteria_grid') {
      const criteriaRaw = field.criteria.map((c) => `${c.label}:${c.key}:${c.weight}`).join('\n');
      fieldForm.setFieldsValue({ ...field, criteriaRaw });
    } else {
      fieldForm.setFieldsValue({ ...field });
    }
    setWatchType(field.type);
    setAddOpen(true);
  };

  const handleSaveField = (values: FormField & { optionsRaw?: string; criteriaRaw?: string }) => {
    let parsed: FormField;

    if (values.type === 'criteria_grid') {
      const criteria: CriterionConfig[] = (values.criteriaRaw ?? '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const parts = line.split(':');
          return {
            label: parts[0]?.trim() ?? line,
            key: parts[1]?.trim() ?? parts[0]?.trim().toLowerCase().replace(/\s+/g, '_') ?? line,
            weight: parseFloat(parts[2] ?? '0') || 0,
          };
        });
      parsed = {
        name: values.name.trim(),
        label: values.label.trim(),
        type: 'criteria_grid',
        required: values.required ?? false,
        criteria,
        scoreMin: (values as { scoreMin?: number }).scoreMin ?? 1,
        scoreMax: (values as { scoreMax?: number }).scoreMax ?? 5,
      };
    } else if (values.type === 'select') {
      parsed = {
        name: values.name.trim(),
        label: values.label.trim(),
        type: 'select',
        required: values.required ?? false,
        placeholder: (values as { placeholder?: string }).placeholder || undefined,
        options: (values.optionsRaw ?? '').split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => {
            const [label, value] = line.split(':');
            return { label: label?.trim() ?? line, value: value?.trim() ?? line };
          }),
      };
    } else {
      parsed = {
        name: values.name.trim(),
        label: values.label.trim(),
        type: values.type as 'text' | 'textarea' | 'number' | 'date',
        required: values.required ?? false,
        placeholder: (values as { placeholder?: string }).placeholder || undefined,
        min: (values as { min?: number }).min,
        max: (values as { max?: number }).max,
      } as FormField;
    }

    if (editTarget) {
      onChange(fields.map((f) => (f.name === editTarget.name ? parsed : f)));
    } else {
      if (fields.some((f) => f.name === parsed.name)) {
        message.error('Tên field đã tồn tại, vui lòng dùng tên khác');
        return;
      }
      onChange([...fields, parsed]);
    }
    setAddOpen(false);
  };

  const columns = [
    {
      title: '',
      width: 24,
      render: () => <HolderOutlined style={{ color: '#8c8c8c', cursor: 'grab' }} />,
    },
    {
      title: 'Tên field',
      dataIndex: 'name',
      render: (n: string) => <code style={{ fontSize: 12 }}>{n}</code>,
    },
    { title: 'Nhãn hiển thị', dataIndex: 'label' },
    {
      title: 'Loại',
      dataIndex: 'type',
      render: (t: FieldType) => (
        <Tag color={t === 'criteria_grid' ? 'purple' : undefined}>
          {FIELD_TYPE_LABELS[t]}
        </Tag>
      ),
      width: 130,
    },
    {
      title: 'Bắt buộc',
      dataIndex: 'required',
      render: (r: boolean) => r ? <Tag color="red">Có</Tag> : <Tag>Không</Tag>,
      width: 90,
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      render: (_: unknown, record: FormField) => (
        <Space size={4}>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm
            title="Xoá trường này?"
            onConfirm={() => onChange(fields.filter((f) => f.name !== record.name))}
          >
            <Button size="small" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
        {description}
      </Typography.Text>

      <Table
        dataSource={fields}
        columns={columns}
        rowKey="name"
        size="small"
        pagination={false}
        locale={{ emptyText: 'Chưa có trường nào — nhấn "Thêm trường" để bắt đầu' }}
      />

      <Button
        icon={<PlusOutlined />}
        onClick={openAdd}
        style={{ marginTop: 12 }}
        block
        type="dashed"
      >
        Thêm trường nhập liệu
      </Button>

      <Modal
        title={editTarget ? 'Sửa trường nhập liệu' : 'Thêm trường nhập liệu'}
        open={addOpen}
        onCancel={() => setAddOpen(false)}
        onOk={() => fieldForm.submit()}
        okText="Lưu"
        width={520}
        destroyOnClose
      >
        <Form
          form={fieldForm}
          layout="vertical"
          onFinish={handleSaveField}
          onValuesChange={(changed) => {
            if (changed.type) setWatchType(changed.type as FieldType);
          }}
          style={{ marginTop: 8 }}
        >
          <Form.Item name="type" label="Loại dữ liệu" rules={[{ required: true }]} initialValue="text">
            <Select
              options={Object.entries(FIELD_TYPE_LABELS).map(([v, l]) => ({
                value: v,
                label: l,
              }))}
            />
          </Form.Item>

          <Space style={{ width: '100%' }} align="start">
            <Form.Item
              name="name"
              label="Tên field (key)"
              rules={[
                { required: true, message: 'Bắt buộc' },
                { pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/, message: 'Chỉ dùng chữ cái, số, dấu _' },
              ]}
              style={{ width: 180 }}
              tooltip="Tên biến trong hệ thống, ví dụ: selfEval, managerScore"
            >
              <Input placeholder="selfEval" disabled={!!editTarget} />
            </Form.Item>

            <Form.Item
              name="label"
              label="Nhãn hiển thị"
              rules={[{ required: true, message: 'Bắt buộc' }]}
              style={{ flex: 1 }}
            >
              <Input placeholder="Tự đánh giá" />
            </Form.Item>
          </Space>

          {watchType === 'criteria_grid' && (
            <>
              <Divider orientation="left" plain style={{ fontSize: 12 }}>
                Cấu hình bảng tiêu chí
              </Divider>
              <Form.Item
                name="criteriaRaw"
                label="Danh sách tiêu chí"
                tooltip="Mỗi dòng: Tên tiêu chí:key:trọng_số. Tổng trọng số nên = 100"
                rules={[{ required: true, message: 'Vui lòng nhập ít nhất 1 tiêu chí' }]}
                help='Ví dụ: "Kỹ năng kỹ thuật:technical:30" — mỗi tiêu chí một dòng'
              >
                <Input.TextArea
                  rows={5}
                  placeholder={
                    'Kỹ năng kỹ thuật:technical:30\nKỹ năng giao tiếp:communication:20\nChủ động sáng tạo:initiative:20\nTiến độ hoàn thành:timeliness:30'
                  }
                  style={{ fontFamily: 'monospace', fontSize: 12 }}
                />
              </Form.Item>
              <Space style={{ width: '100%' }}>
                <Form.Item name="scoreMin" label="Điểm nhỏ nhất" initialValue={1} style={{ width: '50%' }}>
                  <InputNumber style={{ width: '100%' }} min={0} />
                </Form.Item>
                <Form.Item name="scoreMax" label="Điểm lớn nhất" initialValue={5} style={{ width: '50%' }}>
                  <InputNumber style={{ width: '100%' }} min={1} />
                </Form.Item>
              </Space>
            </>
          )}

          {watchType !== 'criteria_grid' && (
            <Form.Item name="placeholder" label="Placeholder (tùy chọn)">
              <Input placeholder="Hướng dẫn nhập liệu..." />
            </Form.Item>
          )}

          {watchType === 'number' && (
            <Space style={{ width: '100%' }}>
              <Form.Item name="min" label="Giá trị nhỏ nhất" style={{ width: '50%' }}>
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="max" label="Giá trị lớn nhất" style={{ width: '50%' }}>
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
            </Space>
          )}

          {watchType === 'select' && (
            <Form.Item
              name="optionsRaw"
              label="Danh sách lựa chọn"
              tooltip="Mỗi dòng một lựa chọn. Định dạng: Nhãn:giá_trị"
              rules={[{ required: true, message: 'Vui lòng nhập ít nhất 1 lựa chọn' }]}
              help='Ví dụ: "Nghỉ phép năm:annual" — mỗi lựa chọn một dòng'
            >
              <Input.TextArea
                rows={5}
                placeholder={'Nghỉ phép năm:annual\nNghỉ ốm:sick\nNghỉ bù:compensatory'}
                style={{ fontFamily: 'monospace', fontSize: 12 }}
              />
            </Form.Item>
          )}

          <Form.Item name="required" label="Bắt buộc điền" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
