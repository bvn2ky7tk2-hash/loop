import type { CSSProperties } from 'react';
import { Input, Select } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

interface SearchInputProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  width?: number | string;
  allowClear?: boolean;
  style?: CSSProperties;
}

/**
 * Ô tìm kiếm chuẩn — icon kính lúp + allowClear + width nhất quán.
 * Trả thẳng chuỗi value qua onChange (không phải event) cho gọn.
 *
 * @example
 * <SearchInput value={q} onChange={setQ} placeholder="Tìm theo tên, mã..." />
 */
export function SearchInput({ value, onChange, placeholder = 'Tìm kiếm...', width = 240, allowClear = true, style }: SearchInputProps) {
  return (
    <Input
      prefix={<SearchOutlined />}
      placeholder={placeholder}
      value={value}
      allowClear={allowClear}
      onChange={(e) => onChange(e.target.value)}
      style={{ width, ...style }}
    />
  );
}

interface FilterSelectOption {
  label: string;
  value: string | number;
}

interface FilterSelectProps {
  value?: string | number;
  onChange: (value: string | number | undefined) => void;
  options: FilterSelectOption[];
  placeholder?: string;
  width?: number | string;
  allowClear?: boolean;
  style?: CSSProperties;
}

/**
 * Select lọc chuẩn — allowClear + width nhất quán, dùng trong <FilterBar>.
 *
 * @example
 * <FilterSelect value={status} onChange={setStatus} placeholder="Trạng thái" options={STATUS_OPTIONS} />
 */
export function FilterSelect({ value, onChange, options, placeholder = 'Trạng thái', width = 160, allowClear = true, style }: FilterSelectProps) {
  return (
    <Select
      placeholder={placeholder}
      value={value}
      allowClear={allowClear}
      onChange={(v) => onChange(v)}
      options={options}
      style={{ width, ...style }}
    />
  );
}
