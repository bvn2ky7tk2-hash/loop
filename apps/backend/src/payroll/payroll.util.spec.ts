import { calcProgressivePIT, roundUp100, BracketItem } from './payroll.util';

// Biểu thuế TNCN lũy tiến từng phần theo tháng (TT 111/2013) — đơn vị: đồng.
const VN_BRACKETS: BracketItem[] = [
  { from: 0, to: 5_000_000, rate: 0.05 },
  { from: 5_000_000, to: 10_000_000, rate: 0.1 },
  { from: 10_000_000, to: 18_000_000, rate: 0.15 },
  { from: 18_000_000, to: 32_000_000, rate: 0.2 },
  { from: 32_000_000, to: 52_000_000, rate: 0.25 },
  { from: 52_000_000, to: 80_000_000, rate: 0.3 },
  { from: 80_000_000, to: null, rate: 0.35 },
];

describe('calcProgressivePIT', () => {
  it('thu nhập tính thuế = 0 → thuế 0', () => {
    expect(calcProgressivePIT(0, VN_BRACKETS)).toBe(0);
  });

  it('trong bậc 1 (3tr) → 3tr × 5% = 150.000', () => {
    expect(calcProgressivePIT(3_000_000, VN_BRACKETS)).toBe(150_000);
  });

  it('đúng ranh bậc 1 (5tr) → 250.000', () => {
    expect(calcProgressivePIT(5_000_000, VN_BRACKETS)).toBe(250_000);
  });

  it('10tr → 250k (bậc1) + 500k (bậc2) = 750.000', () => {
    expect(calcProgressivePIT(10_000_000, VN_BRACKETS)).toBe(750_000);
  });

  it('20tr → lũy tiến qua 4 bậc = 2.350.000', () => {
    // 5tr*5% + 5tr*10% + 8tr*15% + 2tr*20% = 250k+500k+1.2tr+400k
    expect(calcProgressivePIT(20_000_000, VN_BRACKETS)).toBe(2_350_000);
  });

  it('100tr → chạm bậc cao nhất (to=null) = 25.150.000', () => {
    // 250k+500k+1.2tr+2.8tr+5tr+8.4tr + (20tr*35%=7tr) = 25.150.000
    expect(calcProgressivePIT(100_000_000, VN_BRACKETS)).toBe(25_150_000);
  });

  it('làm tròn XUỐNG đến đồng (rate lẻ)', () => {
    // 1.000.001 trong bậc 1 × 5% = 50.000,05 → floor 50.000
    expect(calcProgressivePIT(1_000_001, VN_BRACKETS)).toBe(50_000);
  });

  it('brackets rỗng → 0', () => {
    expect(calcProgressivePIT(10_000_000, [])).toBe(0);
  });
});

describe('roundUp100 (BHXH làm tròn LÊN bội số 100đ)', () => {
  it('0 → 0', () => expect(roundUp100(0)).toBe(0));
  it('1 → 100', () => expect(roundUp100(1)).toBe(100));
  it('đã là bội 100 → giữ nguyên', () => expect(roundUp100(1_200)).toBe(1_200));
  it('1234 → 1300', () => expect(roundUp100(1_234)).toBe(1_300));
  it('99 → 100', () => expect(roundUp100(99)).toBe(100));
});
