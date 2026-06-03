import { describe, it, expect } from 'vitest';
import {
  formatNumber,
  formatCurrency,
  formatPercent,
  formatHours,
  formatCompact,
} from '../utils/format';

describe('format utils — guard', () => {
  it('trả "—" cho null/undefined/NaN', () => {
    for (const fn of [formatNumber, formatCurrency, formatPercent, formatHours, formatCompact]) {
      expect(fn(null)).toBe('—');
      expect(fn(undefined)).toBe('—');
      expect(fn(NaN)).toBe('—');
    }
  });
});

describe('formatCurrency / formatNumber', () => {
  it('có hậu tố " đ" cho tiền tệ', () => {
    expect(formatCurrency(1000)).toMatch(/ đ$/);
  });
  it('định dạng số có phân tách hàng nghìn (vi-VN)', () => {
    // vi-VN dùng '.' làm dấu phân tách hàng nghìn
    expect(formatNumber(1234567)).toBe('1.234.567');
  });
  it('số 0 hợp lệ (không bị guard loại)', () => {
    expect(formatNumber(0)).toBe('0');
  });
});

describe('formatHours', () => {
  it('0 → "0h"', () => expect(formatHours(0)).toBe('0h'));
  it('giờ chẵn → "8h"', () => expect(formatHours(8)).toBe('8h'));
  it('có phút → "8h 30m"', () => expect(formatHours(8.5)).toBe('8h 30m'));
  it('chỉ phút → "30m"', () => expect(formatHours(0.5)).toBe('30m'));
});

describe('formatPercent', () => {
  it('thêm hậu tố "%"', () => expect(formatPercent(12.5)).toMatch(/%$/));
});

describe('formatCompact', () => {
  it('>= 1 triệu → hậu tố M', () => expect(formatCompact(1_500_000)).toMatch(/M$/));
  it('>= 1 nghìn → hậu tố K', () => expect(formatCompact(2_500)).toMatch(/K$/));
  it('< 1 nghìn → số thường', () => expect(formatCompact(999)).toBe('999'));
});
