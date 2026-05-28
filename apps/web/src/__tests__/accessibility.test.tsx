import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ConfigProvider } from 'antd';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AllocationConflictModal, { type ConflictDay } from '../components/AllocationConflictModal';
import CostBreakdownTooltip, { type MemberCost } from '../components/CostBreakdownTooltip';
import NotificationBell from '../components/NotificationBell';

expect.extend(toHaveNoViolations);

vi.mock('../api/notifications', () => ({
  notificationsApi: {
    list: vi.fn().mockResolvedValue([]),
    markRead: vi.fn().mockResolvedValue(undefined),
    markAllRead: vi.fn().mockResolvedValue(undefined),
    unreadCount: vi.fn().mockResolvedValue(0),
  },
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <MemoryRouter>
      <QueryClientProvider client={qc}>
        <ConfigProvider>{children}</ConfigProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

const CONFLICT_DAYS: ConflictDay[] = [
  { date: '2026-06-01', existingProjects: [{ name: 'Dự án A', pct: 70 }], newPct: 50, totalPct: 120 },
];

const MEMBER_COST: MemberCost = {
  fullName: 'Nguyễn Văn A',
  level: 'SENIOR',
  allocationRole: 'Developer',
  ratePerDay: 1_500_000,
  actualHours: 160,
  cost: 30_000_000,
};

describe('Accessibility — AllocationConflictModal', () => {
  it('không có vi phạm WCAG AA khi modal mở', async () => {
    const { container } = render(
      <Wrapper>
        <AllocationConflictModal
          open={true}
          conflicts={CONFLICT_DAYS}
          onAdjust={vi.fn()}
          onForceOverride={vi.fn()}
          onCancel={vi.fn()}
        />
      </Wrapper>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('Accessibility — CostBreakdownTooltip', () => {
  it('không có vi phạm WCAG AA', async () => {
    const { container } = render(
      <Wrapper>
        <CostBreakdownTooltip member={MEMBER_COST}>
          <strong>30,000,000</strong>
        </CostBreakdownTooltip>
      </Wrapper>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('Accessibility — NotificationBell', () => {
  it('không có vi phạm WCAG AA', async () => {
    const { container } = render(
      <Wrapper>
        <NotificationBell unreadCount={3} />
      </Wrapper>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
