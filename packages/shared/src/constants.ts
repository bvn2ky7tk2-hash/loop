export const WORK_CONSTANTS = {
  HOURS_PER_DAY: 8,
  DAYS_PER_MONTH: 21,
  WORK_DAYS: [1, 2, 3, 4, 5] as const, // Mon–Fri
  MAX_TASK_LEVELS: 5,
  DEFAULT_MAX_ESTIMATE_HOURS: 4,
} as const;
