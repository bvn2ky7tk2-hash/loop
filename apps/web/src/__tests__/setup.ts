import '@testing-library/jest-dom';
import { vi } from 'vitest';

// jsdom thiếu một số API mà antd 6 / theme.store cần. Polyfill tối thiểu để test chạy.

// theme.store.getSystemPreference() gọi matchMedia khi import store.
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}

// antd 6 (rc-*) dùng ResizeObserver cho Modal/Select/Table.
if (!('ResizeObserver' in globalThis)) {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
