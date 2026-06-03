import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App, ConfigProvider } from 'antd';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PayrollSettingsPage from '../pages/payroll/PayrollSettingsPage';

// Giữ các type/export thuần thật, chỉ override payrollApi (gọi mạng).
vi.mock('../api/payroll', async (importActual) => {
  const actual = await importActual<typeof import('../api/payroll')>();
  const emptyPage = { data: [], total: 0, page: 1, limit: 20, totalPages: 0 };
  return {
    ...actual,
    payrollApi: {
      ...actual.payrollApi,
      listInsuranceConfigs: vi.fn().mockResolvedValue(emptyPage),
      listTaxBrackets: vi.fn().mockResolvedValue(emptyPage),
      listTaxDeductions: vi.fn().mockResolvedValue(emptyPage),
      listSalaryColumns: vi.fn().mockResolvedValue([]),
      listAllowanceTypes: vi.fn().mockResolvedValue([]),
    },
  };
});

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <MemoryRouter>
      <QueryClientProvider client={qc}>
        <ConfigProvider>
          <App>{children}</App>
        </ConfigProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

describe('PayrollSettingsPage smoke', () => {
  it('render được header và 4 tab mà không crash', async () => {
    render(<PayrollSettingsPage />, { wrapper: Wrapper });
    expect(await screen.findByText('Cấu hình Payroll')).toBeTruthy();
    expect(screen.getByText('Bảo hiểm XH')).toBeTruthy();
    expect(screen.getByText('Thuế TNCN')).toBeTruthy();
    expect(screen.getByText('Phụ cấp')).toBeTruthy();
    expect(screen.getByText('Cột lương')).toBeTruthy();
  });
});
