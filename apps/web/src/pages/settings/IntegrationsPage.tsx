import TelegramSettingsSection from '../../components/settings/TelegramSettingsSection';

export default function IntegrationsPage() {
  return (
    <div style={{ padding: '24px' }}>
      <h1 className="page-title" style={{ marginBottom: 24 }}>Tích hợp</h1>
      <TelegramSettingsSection />
    </div>
  );
}
