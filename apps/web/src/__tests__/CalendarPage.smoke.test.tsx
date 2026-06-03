import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ConfigProvider, App as AntdApp } from 'antd';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ── Mock toàn bộ API/hook mạng để render không phụ thuộc backend ─────────────────
vi.mock('../api/calendar', () => ({
  useMonthView: () => ({ data: { events: [], bookings: [] }, isLoading: false }),
  useCreateEvent: () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }),
  useUpdateEvent: () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }),
  useDeleteEvent: () => ({ mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false }),
}));

vi.mock('../api/room-booking', () => ({
  useAvailableRooms: () => ({ data: [] }),
  roomBookingApi: { createBooking: vi.fn().mockResolvedValue({}) },
}));

vi.mock('../api/employees', () => ({
  employeesApi: { list: vi.fn().mockResolvedValue([]) },
}));

import CalendarPage from '../pages/calendar/CalendarPage';

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

describe('CalendarPage — smoke', () => {
  it('render không throw với dữ liệu rỗng', () => {
    const { getByText } = render(
      <Wrapper>
        <CalendarPage />
      </Wrapper>,
    );
    expect(getByText('Lịch công ty')).toBeTruthy();
  });
});
