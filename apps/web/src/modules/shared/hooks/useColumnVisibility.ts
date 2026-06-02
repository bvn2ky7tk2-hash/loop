import { useState, useCallback } from 'react';
import { useAuthStore } from '../store/auth.store';

export interface ColDef {
  key: string;
  label: string;
}

function storageKey(userId: string, pageKey: string) {
  return `loop_cols_${userId}_${pageKey}`;
}

export function useColumnVisibility(
  pageKey: string,
  allColumns: ColDef[],
  defaultHidden: string[] = [],
) {
  const userId = useAuthStore((s) => s.user?.id ?? 'guest');
  const sk = storageKey(userId, pageKey);

  const [visState, setVisState] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(sk);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const isVisible = useCallback(
    (colKey: string): boolean => {
      if (colKey in visState) return visState[colKey];
      return !defaultHidden.includes(colKey);
    },
    [visState, defaultHidden],
  );

  const toggle = useCallback(
    (colKey: string) => {
      setVisState((prev) => {
        const currentlyVisible = colKey in prev ? prev[colKey] : !defaultHidden.includes(colKey);
        const next = { ...prev, [colKey]: !currentlyVisible };
        localStorage.setItem(sk, JSON.stringify(next));
        return next;
      });
    },
    [sk, defaultHidden],
  );

  const reset = useCallback(() => {
    localStorage.removeItem(sk);
    setVisState({});
  }, [sk]);

  const visibleKeys = allColumns.map((c) => c.key).filter((k) => isVisible(k));

  return { isVisible, toggle, reset, visibleKeys };
}
