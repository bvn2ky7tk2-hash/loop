import { MenuConfigPanel } from '../../components/settings/MenuConfigPanel';

export default function SettingsPage() {
  return (
    <div style={{ padding: '24px' }}>
      <h1 className="page-title" style={{ marginBottom: 24 }}>Cấu hình Menu</h1>
      <MenuConfigPanel />
    </div>
  );
}
