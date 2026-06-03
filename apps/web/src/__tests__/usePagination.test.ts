import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { usePagination, PAGE_SIZE_OPTIONS } from '../hooks/usePagination';

describe('usePagination', () => {
  it('khởi tạo page=1 và pageSize theo tham số', () => {
    const { result } = renderHook(() => usePagination(20));
    expect(result.current.page).toBe(1);
    expect(result.current.pageSize).toBe(20);
  });

  it('paginationProps trả config chuẩn (total + showSizeChanger + showTotal)', () => {
    const { result } = renderHook(() => usePagination(50));
    const props = result.current.paginationProps(137, 'nhân sự');
    expect(props.current).toBe(1);
    expect(props.pageSize).toBe(50);
    expect(props.total).toBe(137);
    expect(props.showSizeChanger).toBe(true);
    expect(props.pageSizeOptions).toEqual(PAGE_SIZE_OPTIONS);
    // showTotal hiển thị "X <label>"
    expect((props.showTotal as (t: number) => string)(137)).toBe('137 nhân sự');
  });

  it('onChange cập nhật page/pageSize; resetPage đưa về trang 1', () => {
    const { result } = renderHook(() => usePagination(20));

    act(() => {
      result.current.paginationProps(100).onChange?.(3, 50);
    });
    expect(result.current.page).toBe(3);
    expect(result.current.pageSize).toBe(50);

    act(() => result.current.resetPage());
    expect(result.current.page).toBe(1);
    // pageSize giữ nguyên sau resetPage
    expect(result.current.pageSize).toBe(50);
  });
});
