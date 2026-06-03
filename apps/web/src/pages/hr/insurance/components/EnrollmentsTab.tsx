import { Table, Input, Select } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

import { FilterBar } from '../../../../components/FilterBar';
import { OrgUnitSelect } from '../../../../components/selects';
import type { InsuranceEnrollment } from '../../../../api/hr-insurance';

interface EnrollmentsTabProps {
  search: string;
  setSearch: (v: string) => void;
  statusFilter: string | undefined;
  setStatusFilter: (v: string | undefined) => void;
  orgUnitFilter: string | undefined;
  setOrgUnitFilter: (v: string | undefined) => void;
  columns: ColumnsType<InsuranceEnrollment>;
  enrollments: InsuranceEnrollment[];
  isLoading: boolean;
  pagination: object | false;
}

export function EnrollmentsTab({
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  orgUnitFilter,
  setOrgUnitFilter,
  columns,
  enrollments,
  isLoading,
  pagination,
}: EnrollmentsTabProps) {
  return (
    <>
      <FilterBar>
        <Input
          prefix={<SearchOutlined />}
          placeholder="Tìm mã NV hoặc tên..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 240 }}
          allowClear
        />
        <Select
          placeholder="Trạng thái"
          value={statusFilter}
          onChange={setStatusFilter}
          allowClear
          style={{ width: 160 }}
          options={[
            { value: 'ACTIVE', label: 'Đang đóng' },
            { value: 'TERMINATED', label: 'Đã nghỉ' },
            { value: 'SUSPENDED', label: 'Tạm dừng' },
          ]}
        />
        <OrgUnitSelect
          placeholder="Phòng ban"
          style={{ minWidth: 180 }}
          value={orgUnitFilter}
          onChange={setOrgUnitFilter}
          allowClear
        />
      </FilterBar>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={enrollments}
        loading={isLoading}
        pagination={pagination}
        size="middle"
        scroll={{ x: 900 }}
      />
    </>
  );
}
