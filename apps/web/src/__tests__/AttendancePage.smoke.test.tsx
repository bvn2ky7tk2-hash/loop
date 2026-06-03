import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ConfigProvider, App as AntdApp } from 'antd';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ── Mock toàn bộ API mạng để render không phụ thuộc backend ─────────────────────
vi.mock('../api/hr-attendance', () => ({
  hrAttendanceApi: {
    list: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    monthlyReport: vi.fn().mockResolvedValue([]),
    summarize: vi.fn().mockResolvedValue({}),
    lock: vi.fn().mockResolvedValue({}),
    upsert: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('../api/work-shifts', () => ({
  workShiftsApi: {
    listShifts: vi.fn().mockResolvedValue([]),
    swapShift: vi.fn().mockResolvedValue({ updated: 0 }),
    recalculate: vi.fn().mockResolvedValue({ updated: 0, total: 0 }),
  },
}));

vi.mock('../api/employees', () => ({
  employeesApi: {
    list: vi.fn().mockResolvedValue([]),
    get: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('../api/org-units', () => ({
  orgUnitsApi: {
    list: vi.fn().mockResolvedValue([]),
  },
}));

import AttendancePage from '../pages/hr/AttendancePage';

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <MemoryRouter>
      <QueryClientProvider client={qc}>
        <ConfigProvider>
          <AntdApp>{children}</AntdApp>
        </ConfigProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

describe('AttendancePage — smoke', () => {
  it('render không throw với dữ liệu rỗng', () => {
    const { getAllByText } = render(
      <Wrapper>
        <AttendancePage />
      </Wrapper>,
    );
    // PageHeader title "Bảng công"
    expect(getAllByText('Bảng công').length).toBeGreaterThan(0);
  });
});
