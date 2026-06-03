import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import { timesheetApi, type WorkStatusType, type TodaySummary } from '../api/timesheet';

const CACHE_KEY = 'cached_work_status';
const PENDING_KEY = 'pending_status_update';

interface CachedStatus {
  currentStatus: WorkStatusType | null;
  since: string | null;
}

async function readCache(): Promise<CachedStatus | null> {
  try {
    const raw = await SecureStore.getItemAsync(CACHE_KEY);
    return raw ? (JSON.parse(raw) as CachedStatus) : null;
  } catch {
    return null;
  }
}

async function writeCache(status: WorkStatusType | null, since: string | null) {
  try {
    await SecureStore.setItemAsync(CACHE_KEY, JSON.stringify({ currentStatus: status, since }));
  } catch { /* ignore storage errors */ }
}

async function savePending(statusType: WorkStatusType) {
  try {
    await SecureStore.setItemAsync(PENDING_KEY, statusType);
  } catch { /* ignore */ }
}

async function clearPending() {
  try {
    await SecureStore.deleteItemAsync(PENDING_KEY);
  } catch { /* ignore */ }
}

export async function flushPendingStatus() {
  try {
    const pending = await SecureStore.getItemAsync(PENDING_KEY);
    if (pending) {
      await timesheetApi.setStatus(pending as WorkStatusType);
      await clearPending();
    }
  } catch {
    // still offline — leave pending
  }
}

const FALLBACK_SUMMARY: TodaySummary = {
  checkIn: null,
  checkOut: null,
  currentStatus: null,
  since: null,
  workingHours: null,
};

export function useWorkStatus() {
  const qc = useQueryClient();

  const { data: summary, isLoading } = useQuery<TodaySummary>({
    queryKey: ['timesheet-today'],
    queryFn: async () => {
      // Flush pending offline update before fetching fresh data
      await flushPendingStatus();
      try {
        const result = await timesheetApi.todaySummary();
        await writeCache(result.currentStatus, result.since);
        return result;
      } catch {
        // Offline: return cached status merged into fallback
        const cached = await readCache();
        return cached
          ? { ...FALLBACK_SUMMARY, currentStatus: cached.currentStatus, since: cached.since }
          : FALLBACK_SUMMARY;
      }
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const { mutate: setStatus, isPending: isUpdating } = useMutation({
    mutationFn: async (statusType: WorkStatusType) => {
      try {
        const result = await timesheetApi.setStatus(statusType);
        await writeCache(result.currentStatus, result.since);
        await clearPending();
        return result;
      } catch {
        // Offline: persist locally only
        await writeCache(statusType, new Date().toISOString());
        await savePending(statusType);
        return { currentStatus: statusType, since: new Date().toISOString() };
      }
    },
    onMutate: async (statusType) => {
      await qc.cancelQueries({ queryKey: ['timesheet-today'] });
      const prev = qc.getQueryData<TodaySummary>(['timesheet-today']);
      qc.setQueryData<TodaySummary>(['timesheet-today'], (old) =>
        old ? { ...old, currentStatus: statusType, since: new Date().toISOString() } : old,
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['timesheet-today'], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['timesheet-today'] }),
  });

  const updateStatus = useCallback(
    (statusType: WorkStatusType) => setStatus(statusType),
    [setStatus],
  );

  return {
    currentStatus: summary?.currentStatus ?? null,
    since: summary?.since ?? null,
    checkIn: summary?.checkIn ?? null,
    checkOut: summary?.checkOut ?? null,
    workingHours: summary?.workingHours ?? null,
    isLoading,
    isUpdating,
    updateStatus,
  };
}
