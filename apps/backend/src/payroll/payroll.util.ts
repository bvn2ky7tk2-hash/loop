// Hàm tính toán lương THUẦN (không I/O) — tách ra để test độc lập + tái dùng.

export interface BracketItem {
  from: number;
  to: number | null;
  rate: number;
}

/**
 * Thuế TNCN lũy tiến từng phần (TT 111/2013) — làm tròn xuống đến đồng.
 * `brackets` phải sắp xếp tăng dần theo `from`; `to=null` = bậc cao nhất (vô cực).
 */
export function calcProgressivePIT(taxableIncome: number, brackets: BracketItem[]): number {
  let pit = 0;
  for (const bracket of brackets) {
    if (taxableIncome <= bracket.from) break;
    const upper = bracket.to !== null ? bracket.to : Infinity;
    const slice = Math.min(taxableIncome, upper) - bracket.from;
    pit += slice * bracket.rate;
  }
  return Math.floor(pit);
}

/** NĐ 115/2015: BHXH làm tròn LÊN bội số 100đ. */
export function roundUp100(amount: number): number {
  return Math.ceil(amount / 100) * 100;
}
