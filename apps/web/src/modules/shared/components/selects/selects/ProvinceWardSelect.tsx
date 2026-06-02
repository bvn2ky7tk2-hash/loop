import { useEffect, useState } from 'react';
import { Select, Space } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { categoriesApi } from '../../api/categories';

interface Props {
  value?: string;                       // chuỗi đã lưu, vd "Phường Ba Đình, Thành phố Hà Nội"
  onChange?: (v: string) => void;
  style?: React.CSSProperties;
}

const stripPrefix = (n: string) => n.replace(/^(Tỉnh|Thành phố)\s+/i, '').trim();

/**
 * Chọn địa danh phân cấp Tỉnh/Thành → Phường/Xã, đọc từ danh mục hệ thống.
 * Xuất ra chuỗi "Phường/Xã, Tỉnh/Thành" để lưu vào trường text sẵn có.
 */
export function ProvinceWardSelect({ value, onChange, style }: Props) {
  const [provinceId, setProvinceId] = useState<string | undefined>();

  const { data: provinces = [] } = useQuery({
    queryKey: ['categories', 'province'],
    queryFn: () => categoriesApi.list({ type: 'province' }),
    staleTime: 5 * 60_000,
  });

  const { data: wards = [] } = useQuery({
    queryKey: ['categories', 'ward', provinceId],
    queryFn: () => categoriesApi.list({ type: 'ward', parentId: provinceId }),
    enabled: !!provinceId,
    staleTime: 5 * 60_000,
  });

  // Pre-select tỉnh từ chuỗi đã lưu (best-effort)
  useEffect(() => {
    if (value && provinces.length && !provinceId) {
      const p = provinces.find((pv) => value.includes(stripPrefix(pv.name)));
      if (p) setProvinceId(p.id);
    }
  }, [value, provinces, provinceId]);

  const provinceName = provinces.find((p) => p.id === provinceId)?.name;

  return (
    <Space.Compact style={{ width: '100%', ...style }}>
      <Select
        style={{ width: '50%' }}
        placeholder="Tỉnh/Thành phố"
        showSearch optionFilterProp="label" allowClear
        value={provinceId}
        options={provinces.map((p) => ({ value: p.id, label: p.name }))}
        onChange={(pid) => {
          setProvinceId(pid);
          const pn = provinces.find((p) => p.id === pid)?.name;
          onChange?.(pn ?? '');
        }}
      />
      <Select
        style={{ width: '50%' }}
        placeholder="Phường/Xã"
        showSearch optionFilterProp="label" allowClear
        disabled={!provinceId}
        options={wards.map((w) => ({ value: w.id, label: w.name }))}
        onChange={(wid) => {
          const wn = wards.find((w) => w.id === wid)?.name;
          onChange?.(wn ? `${wn}, ${provinceName ?? ''}` : (provinceName ?? ''));
        }}
      />
    </Space.Compact>
  );
}
