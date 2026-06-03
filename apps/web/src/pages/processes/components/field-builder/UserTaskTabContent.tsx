import { useState } from 'react';
import { Space, Tabs } from 'antd';
import {
  UserOutlined, BellOutlined, UnorderedListOutlined,
} from '@ant-design/icons';
import {
  type FormField,
  type StepConfigItem,
} from '../../../../api/processes.api';
import { type OrgUnitTree } from '../../../../api/org-units';
import { type AppUser, type UserTaskMeta } from './constants';
import { FieldTabContent } from './FieldTabContent';
import { AssigneeConfigSection } from './AssigneeConfigSection';
import { NotificationConfigSection } from './NotificationConfigSection';

interface UserTaskTabProps {
  ut: UserTaskMeta;
  fields: FormField[];
  onFieldsChange: (fields: FormField[]) => void;
  stepConfigItem: StepConfigItem;
  onStepConfigChange: (item: StepConfigItem) => void;
  allUsers: AppUser[];
  flatOrgUnits: OrgUnitTree[];
  isDark: boolean;
  preset: { primary: string };
  cardStyle: React.CSSProperties;
}

export function UserTaskTabContent({
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
