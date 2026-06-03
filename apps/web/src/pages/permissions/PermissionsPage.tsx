import { App, Tabs, Typography, Divider } from 'antd';
import {
  TeamOutlined, SafetyCertificateOutlined, UserOutlined,
} from '@ant-design/icons';
import { UserGroupsTab } from './components/UserGroupsTab';
import { UserOverridesTab } from './components/UserOverridesTab';

const { Text, Title } = Typography;

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function PermissionsPage() {
  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <SafetyCertificateOutlined />
          Quản lý phân quyền
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          Tạo nhóm người dùng, phân quyền theo màn hình & chức năng, và giới hạn phạm vi tổ chức
        </Text>
      </div>

      <Divider style={{ margin: '0 0 16px' }} />

      <App>
        <Tabs
          defaultActiveKey="groups"
          items={[
            {
              key: 'groups',
              label: <span><TeamOutlined /> Nhóm người dùng</span>,
              children: <UserGroupsTab />,
            },
            {
              key: 'user-overrides',
              label: <span><UserOutlined /> Override cá nhân</span>,
              children: <UserOverridesTab />,
            },
          ]}
        />
      </App>
    </div>
  );
}
