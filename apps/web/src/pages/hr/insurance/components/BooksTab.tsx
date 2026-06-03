import { Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';

import type { InsuranceEnrollment } from '../../../../api/hr-insurance';

interface BooksTabProps {
  columns: ColumnsType<InsuranceEnrollment>;
  bookNotReceived: InsuranceEnrollment[];
  isLoading: boolean;
  pagination: object | false;
}

export function BooksTab({ columns, bookNotReceived, isLoading, pagination }: BooksTabProps) {
  return (
    <Table
      rowKey="id"
      columns={columns}
      dataSource={bookNotReceived}
      loading={isLoading}
      pagination={pagination}
      size="middle"
      scroll={{ x: 800 }}
    />
  );
}
