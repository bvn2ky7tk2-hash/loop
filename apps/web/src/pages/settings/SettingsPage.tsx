import { MenuConfigPanel } from '../../components/settings/MenuConfigPanel';
import { PageHeader } from '../../components/ui/PageHeader';

export default function SettingsPage() {
  return (
    <div style={{ padding: '24px' }}>
      <PageHeader title="Cấu hình Menu" />
      <MenuConfigPanel />
    </div>
  );
}
