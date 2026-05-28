import { QueryClient } from '@tanstack/query-core';

export type LogoutHandler = () => void;

let _onLogout: LogoutHandler | null = null;

export function registerLogoutHandler(handler: LogoutHandler): void {
  _onLogout = handler;
}

function isUnauthorized(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    (error as { status: number }).status === 401
  );
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        retry: (failureCount, error) => {
          if (isUnauthorized(error)) return false;
          return failureCount < 1;
        },
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
        onError: (error) => {
          if (isUnauthorized(error)) _onLogout?.();
        },
      },
    },
  });
}
