import { useState, useMemo } from 'react';
import {
  Table, Button, Space, Typography, Tag,
  Select, DatePicker, Popconfirm, message,
} from 'antd';
import { CheckOutlined, LockOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useThemePalette } from '../../../../hooks/useThemePalette';
import { usePagination } from '../../../../hooks/usePagination';
import { EmployeeInfoCell } from '../../../../components/ui/EmployeeInfoCell';
import { FilterBar } from '../../../../components/FilterBar';
import { SectionCard } from '../../../../components/ui/SectionCard';
import {
  hrAttendanceApi,
  type MonthlyAttendance,
} from '../../../../api/hr-attendance';
import { orgUnitsApi } from '../../../../api/org-units';
import { flattenOrgTree, type OrgTreeNode } from '../constants';

const { Text } = Typography;

export function MonthlyTab() {
  const { textPrimary, textMuted, isDark } = useThemePalette();
  const { paginationProps } = usePagination(20);
  const qc = useQueryClient();

  const [selectedMonth, setSelectedMonth] = useState<Dayjs>(dayjs());
  const [orgUnitId, setOrgUnitId] = useState<string | undefined>();

  const year = selectedMonth.year();
  const month = selectedMonth.month() + 1;

  const { data: orgTree = [] } = useQuery({
    queryKey: ['org-units'],
    queryFn: orgUnitsApi.list,
  });

  const orgUnitOptions = useMemo(
    () => flattenOrgTree(orgTree as OrgTreeNode[]).map((u) => ({ value: u.id, label: u.name })),
    [orgTree],
  );

  const { data: monthlyRows = [], isLoading, refetch } = useQuery({
    queryKey: ['attendance-monthly', year, month, orgUnitId],
    queryFn: () => hrAttendanceApi.monthlyReport({ year, month, orgUnitId }),
  });

  const summarizeMutation = useMutation({
    mutationFn: () => hrAttendanceApi.summarize({ year, month, orgUnitId }),
    onSuccess: () => {
      refetch();
      // Nút Tổng hợp đã tính lại chi tiết từng ngày → làm mới luôn tab Chi tiết
      qc.invalidateQueries({ queryKey: ['attendance-detail'] });
      message.success('Đã tính lại chi tiết & tổng hợp bảng công');
    },
    onError: () => message.error('Tổng hợp thất bại'),
  });

  const lockMutation = useMutation({
    mutationFn: () => hrAttendanceApi.lock({ year, month, orgUnitId }),
    onSuccess: () => { refetch(); message.success('Đã khóa bảng công'); },
    onError: () => message.error('Khóa thất bại'),
  });

  const columns: ColumnsType<MonthlyAttendance> = [
    {
      title: 'Nhân viên',
      key: 'employee',
      render: (_: unknown, r: MonthlyAttendance) =>
        r.employee ? <EmployeeInfoCell employee={r.employee} /> : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      title: 'Phòng ban',
      key: 'orgUnit',
      render: (_: unknown, r: MonthlyAttendance) => (
        <Text style={{ color: textMuted }}>{r.employee?.orgUnit?.name ?? '—'}</Text>
      ),
    },
    {
      title: 'Ngày công',
      dataIndex: 'workDays',
      width: 100,
      render: (v: number) => <Text style={{ color: textPrimary }}>{v}</Text>,
    },
    {
      title: 'Nghỉ phép',
      dataIndex: 'paidLeaveDays',
      width: 100,
      render: (v: number) => <Text style={{ color: textPrimary }}>{v}</Text>,
    },
    {
      title: 'Nghỉ không lương',
      dataIndex: 'unpaidLeaveDays',
      width: 130,
      render: (v: number) => <Text style={{ color: v > 0 ? '#EF4444' : textMuted }}>{v}</Text>,
    },
    {
      title: 'OT (giờ)',
      dataIndex: 'otHours',
      width: 100,
      render: (v: number) => <Text style={{ color: v > 0 ? '#F97316' : textPrimary }}>{v}h</Text>,
    },
    {
      title: 'Vắng mặt',
      dataIndex: 'absentDays',
      width: 100,
      render: (v: number) => <Text style={{ color: v > 0 ? '#EF4444' : textPrimary }}>{v}</Text>,
    },
    {
      title: 'Ngày lễ',
      dataIndex: 'holidayDays',
      width: 90,
      render: (v: number) => <Text style={{ color: textPrimary }}>{v}</Text>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 110,
      render: (v: string) => (
        <Tag
          style={isDark
            ? v === 'LOCKED'
              ? { background: 'rgba(248,113,113,0.15)', color: '#FCA5A5', borderColor: 'rgba(248,113,113,0.3)' }
              : { background: 'rgba(96,165,250,0.15)', color: '#93C5FD', borderColor: 'rgba(96,165,250,0.3)' }
            : {}}
          color={isDark ? undefined : v === 'LOCKED' ? 'red' : 'blue'}
        >
          {v === 'LOCKED' ? 'Đã khóa' : 'Mở'}
        </Tag>
      ),
    },
  ];

  return (
    <div>
      <FilterBar
        right={
          <Space>
            <Button
              icon={<CheckOutlined />}
              loading={summarizeMutation.isPending}
              disabled={summarizeMutation.isPending}
              onClick={() => summarizeMutation.mutate()}
            >
              Tổng hợp tháng
            </Button>
            <Popconfirm
              title="Khóa bảng công"
              description="Sau khi khóa không thể sửa. Xác nhận?"
              onConfirm={() => lockMutation.mutate()}
              okText="Khóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Button danger icon={<LockOutlined />} loading={lockMutation.isPending} disabled={lockMutation.isPending}>
                Khóa bảng công
              </Button>
            </Popconfirm>
          </Space>
        }
      >
        <DatePicker
          picker="month"
          value={selectedMonth}
          onChange={v => v && setSelectedMonth(v)}
          format="MM/YYYY"
          allowClear={false}
          style={{ width: 150 }}
        />
        <Select
          showSearch
          placeholder="Phòng ban"
          allowClear
          style={{ width: 220 }}
          value={orgUnitId}
          onChange={setOrgUnitId}
          filterOption={(input, opt) =>
            String(opt?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
          options={orgUnitOptions}
        />
      </FilterBar>

      <SectionCard noPadding>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={monthlyRows}
          loading={isLoading}
          pagination={paginationProps(monthlyRows.length, 'bản ghi')}
          size="middle"
        />
      </SectionCard>
    </div>
  );
}
