import { useState, useCallback } from 'react';
import type { TablePaginationConfig } from 'antd';

export const PAGE_SIZE_OPTIONS = [50, 100, 200, 500];

interface UsePaginationReturn {
  page: number;
  pageSize: number;
  /** Gọi khi filter thay đổi để reset về trang 1 */
  resetPage: () => void;
  /**
   * Tạo `TablePaginationConfig` chuẩn để truyền vào `<Table pagination={...} />`.
   * - `total`: tổng số bản ghi (undefined = ẩn phân trang)
   * - `label`: tên đơn vị hiển thị trong "X [label]", mặc định "bản ghi"
   */
  paginationProps: (total: number | undefined, label?: string) => TablePaginationConfig;
}

/**
 * Hook phân trang dùng chung cho mọi màn hình — hỗ trợ cả client-side lẫn server-side.
 *
 * Client-side (load tất cả, FE phân trang):
 *   const { resetPage, paginationProps } = usePagination(20);
 *   useEffect(() => { resetPage(); }, [filter1, filter2, ...]);
 *   <Table dataSource={filtered} pagination={paginationProps(filtered.length, 'nhân sự')} />
 *
 * Server-side (gọi API theo page/limit):
 *   const { page, pageSize, resetPage, paginationProps } = usePagination(20);
 *   const { data } = useGetItems({ page, limit: pageSize, ...filters });
 *   <Table pagination={paginationProps(data?.total, 'hóa đơn')} />
 */
export function usePagination(defaultPageSize = 50): UsePaginationReturn {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const resetPage = useCallback(() => setPage(1), []);

  const onChange = useCallback((newPage: number, newSize: number) => {
    setPage(newPage);
    setPageSize(newSize);
  }, []);

  const paginationProps = useCallback(
    (total: number | undefined, label = 'bản ghi'): TablePaginationConfig => ({
      current: page,
      pageSize,
      total,
      onChange,
      showSizeChanger: true,
      pageSizeOptions: PAGE_SIZE_OPTIONS,
      showTotal: (t) => `${t} ${label}`,
      locale: { items_per_page: '/ trang' },
    }),
    [page, pageSize, onChange],
  );

  return { page, pageSize, resetPage, paginationProps };
}
