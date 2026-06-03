import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ConfigProvider, App as AntdApp } from 'antd';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ── Mock toàn bộ API mạng để render không phụ thuộc backend ─────────────────────
vi.mock('../api/work-shifts', () => ({
  workShiftsApi: {
    listShifts: vi.fn().mockResolvedValue([]),
    listAssignments: vi.fn().mockResolvedValue([]),
    listSchedules: vi.fn().mockResolvedValue([]),
    listEnrollments: vi.fn().mockResolvedValue([]),
    createShift: vi.fn().mockResolvedValue({}),
    updateShift: vi.fn().mockResolvedValue({}),
    deleteShift: vi.fn().mockResolvedValue(undefined),
    createAssignment: vi.fn().mockResolvedValue({}),
    deleteAssignment: vi.fn().mockResolvedValue(undefined),
    createSchedule: vi.fn().mockResolvedValue({}),
    deleteSchedule: vi.fn().mockResolvedValue(undefined),
    enrollEmployees: vi.fn().mockResolvedValue({}),
    removeEnrollment: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../api/employees', () => ({
  employeesApi: {
    list: vi.fn().mockResolvedValue([]),
    get: vi.fn().mockResolvedValue(null),
  },
}));

import HrShiftsPage from '../pages/hr/HrShiftsPage';

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

describe('HrShiftsPage — smoke', () => {
  it('render không throw với dữ liệu rỗng', () => {
    const { getAllByText } = render(
      <Wrapper>
        <HrShiftsPage />
      </Wrapper>,
    );
    // PageHeader title "Ca làm việc"
    expect(getAllByText('Ca làm việc').length).toBeGreaterThan(0);
  });
});
