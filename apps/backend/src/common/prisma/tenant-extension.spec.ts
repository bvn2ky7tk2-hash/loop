import { flattenCompoundWhere } from './tenant-extension';

/**
 * flattenCompoundWhere là điểm DỄ VỠ nhất của tenant-isolation: nó phân biệt
 * "selector khóa ghép" (cần trải phẳng để rewrite findUnique→findFirst) với
 * "filter scalar" (giữ nguyên) bằng heuristic cấu trúc. Test khoá hành vi này.
 */
describe('flattenCompoundWhere', () => {
  it('trải phẳng khóa unique GHÉP (object con không chứa filter op)', () => {
    const out = flattenCompoundWhere({
      periodId_employeeId: { periodId: 'p1', employeeId: 'e1' },
    });
    expect(out).toEqual({ periodId: 'p1', employeeId: 'e1' });
    expect(out).not.toHaveProperty('periodId_employeeId');
  });

  it('giữ nguyên selector scalar đơn (id)', () => {
    expect(flattenCompoundWhere({ id: 'abc' })).toEqual({ id: 'abc' });
  });

  it('KHÔNG trải object là filter operator (vd { in: [...] })', () => {
    const where = { id: { in: ['a', 'b'] } };
    expect(flattenCompoundWhere(where)).toEqual(where);
  });

  it('KHÔNG trải các filter op khác (equals/gt/contains)', () => {
    for (const op of ['equals', 'gt', 'lte', 'contains', 'not', 'startsWith']) {
      const where = { field: { [op]: 'x' } };
      expect(flattenCompoundWhere(where)).toEqual(where);
    }
  });

  it('object con rỗng {} coi là filter (không trải)', () => {
    const where = { foo: {} };
    expect(flattenCompoundWhere(where)).toEqual(where);
  });

  it('xử lý hỗn hợp: trải khóa ghép, giữ scalar', () => {
    const out = flattenCompoundWhere({
      tenantId_code: { tenantId: 't1', code: 'C001' },
      status: 'ACTIVE',
    });
    expect(out).toEqual({ tenantId: 't1', code: 'C001', status: 'ACTIVE' });
  });

  it('không đột biến object đầu vào', () => {
    const input = { tenantId_code: { tenantId: 't1', code: 'C001' } };
    const snapshot = JSON.parse(JSON.stringify(input));
    flattenCompoundWhere(input);
    expect(input).toEqual(snapshot);
  });
});
