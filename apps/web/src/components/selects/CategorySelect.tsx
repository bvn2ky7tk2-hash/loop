import { Select } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { categoriesApi } from '../../api/categories';

interface Props {
  type: string;                 // loại danh mục: 'ethnicity' | 'religion' | ...
  value?: string;               // lưu theo TÊN (khớp field text sẵn có)
  onChange?: (v: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  allowClear?: boolean;
}

/**
 * Select đọc từ danh mục hệ thống (Category) theo type, lưu giá trị là TÊN.
 * Dùng cho dân tộc, tôn giáo, trình độ học vấn... — tái sử dụng danh mục thay vì gõ tay.
 */
export function CategorySelect({ type, value, onChange, placeholder, style, allowClear = true }: Props) {
  const { data: items = [] } = useQuery({
    queryKey: ['categories', type],
    queryFn: () => categoriesApi.list({ type }),
    staleTime: 5 * 60_000,
  });

  return (
    <Select
      style={{ width: '100%', ...style }}
      placeholder={placeholder}
      showSearch optionFilterProp="label" allowClear={allowClear}
      value={value || undefined}
      onChange={(v) => onChange?.(v ?? '')}
      options={items.map((c) => ({ value: c.name, label: c.name }))}
    />
  );
}
