import { Tabs } from 'antd';
import {
  SettingOutlined, SafetyOutlined, BarsOutlined, CalculatorOutlined,
  GiftOutlined,
} from '@ant-design/icons';
import { PageHeader } from '../../components/ui/PageHeader';
import { InsuranceTab } from './payroll-settings/components/InsuranceTab';
import { TaxBracketTab } from './payroll-settings/components/TaxBracketTab';
import { SalaryColumnsTab } from './payroll-settings/components/SalaryColumnsTab';
import { AllowanceTab } from './payroll-settings/components/AllowanceTab';

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function PayrollSettingsPage() {

  const tabs = [
    {
      key: 'insurance',
      label: <span><SafetyOutlined /> Bảo hiểm XH</span>,
      children: <InsuranceTab />,
    },
    {
      key: 'tax',
      label: <span><CalculatorOutlined /> Thuế TNCN</span>,
      children: <TaxBracketTab />,
    },
    {
      key: 'allowances',
      label: <span><GiftOutlined /> Phụ cấp</span>,
      children: <AllowanceTab />,
    },
    {
      key: 'columns',
      label: <span><BarsOutlined /> Cột lương</span>,
      children: <SalaryColumnsTab />,
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Cấu hình Payroll"
        icon={<SettingOutlined />}
        iconColor="#0D9488"
      />
      <Tabs items={tabs} defaultActiveKey="insurance" />
    </div>
  );
}
