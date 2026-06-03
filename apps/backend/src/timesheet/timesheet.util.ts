// Helper THUẦN (không I/O) dùng chung giữa các timesheet provider.
// Tách khỏi service để provider import trực tiếp, không cần inject lẫn nhau cho logic ngày/giờ.

// Mon=1 … Fri=5 (ISO weekday)
export const WORK_DAYS = new Set([1, 2, 3, 4, 5]);

export function toDateOnly(d: Date | string): Date {
  const dt = new Date(d);
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
}

export function isoWeekday(d: Date): number {
  const day = d.getDay(); // 0=Sun … 6=Sat
  return day === 0 ? 7 : day; // 1=Mon … 7=Sun
}

export function eachWorkDay(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const cur = toDateOnly(start);
  const fin = toDateOnly(end);
  while (cur <= fin) {
    if (WORK_DAYS.has(isoWeekday(cur))) days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

// Tính tổng thời lượng ca (giờ) từ startTime/endTime dạng "HH:MM".
// Xử lý ca đêm (endTime < startTime) vắt qua ngày mới.
export function calcShiftDurationHours(startTime: string, endTime: string): number {
  const toMins = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  const startMins = toMins(startTime);
  let endMins = toMins(endTime);
  if (endMins <= startMins) endMins += 24 * 60; // ca đêm vắt qua ngày mới
  return (endMins - startMins) / 60;
}
