const GUARD = (n: unknown): n is number =>
  n !== null && n !== undefined && !Number.isNaN(Number(n));

const viNum  = new Intl.NumberFormat('vi-VN');
const viNum1 = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });
const viNum2 = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 });

export function formatNumber(n: number | null | undefined): string {
  if (!GUARD(n)) return '—';
  return viNum.format(Number(n));
}

export function formatCurrency(n: number | null | undefined): string {
  if (!GUARD(n)) return '—';
  return viNum.format(Number(n)) + ' đ';
}

export function formatPercent(n: number | null | undefined): string {
  if (!GUARD(n)) return '—';
  return viNum1.format(Number(n)) + '%';
}

export function formatHours(n: number | null | undefined): string {
  if (!GUARD(n)) return '—';
  const num = Number(n);
  if (num === 0) return '0h';
  const h = Math.floor(num);
  const m = Math.round((num - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatCompact(n: number | null | undefined): string {
  if (!GUARD(n)) return '—';
  const num = Number(n);
  if (Math.abs(num) >= 1_000_000) return viNum2.format(num / 1_000_000) + 'M';
  if (Math.abs(num) >= 1_000)     return viNum2.format(num / 1_000) + 'K';
  return viNum.format(num);
}
