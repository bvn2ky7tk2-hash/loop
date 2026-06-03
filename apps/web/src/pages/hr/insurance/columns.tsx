import { Tag, Button, Space, Typography } from 'antd';
import { BookOutlined, ThunderboltOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';

import type {
  InsuranceEnrollment,
  InsuranceEnrollmentStatus,
  SocialInsuranceBook,
} from '../../../api/hr-insurance';
import { formatCurrency } from '../../../utils/format';
import { EmployeeInfoCell } from '../../../components/ui/EmployeeInfoCell';
import { STATUS_COLOR, STATUS_LABEL } from './constants';

const { Text } = Typography;

interface PaletteArgs {
  textPrimary: string;
  textMuted: string;
  isDark: boolean;
}

interface EnrollColumnsArgs extends PaletteArgs {
  onEdit: (record: InsuranceEnrollment) => void;
  onBook: (record: InsuranceEnrollment) => void;
  onEvent: (record: InsuranceEnrollment) => void;
}

export function buildEnrollColumns({
  textPrimary,
  textMuted,
  isDark,
  onEdit,
  onBook,
  onEvent,
}: EnrollColumnsArgs): ColumnsType<InsuranceEnrollment> {
  return [
    {
      title: 'Nhân viên',
      key: 'employee',
      render: (_: unknown, r: InsuranceEnrollment) =>
        r.employee ? (
          <EmployeeInfoCell employee={r.employee} />
        ) : (
          <Text style={{ color: textMuted }}>—</Text>
        ),
    },
    {
      title: 'Mức đóng BHXH',
      dataIndex: 'insuranceSalary',
      width: 160,
      render: (v: number) => (
        <Text style={{ color: textPrimary }}>{formatCurrency(v)}</Text>
      ),
    },
    {
      title: 'Ngày bắt đầu',
      dataIndex: 'startDate',
      width: 130,
      render: (v: string) => (
        <Text style={{ color: textMuted }}>{dayjs(v).format('DD/MM/YYYY')}</Text>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 120,
      render: (v: InsuranceEnrollmentStatus) => (
        <Tag
          color={isDark ? undefined : STATUS_COLOR[v]}
          style={
            isDark
              ? v === 'ACTIVE'
                ? { background: 'rgba(52,211,153,0.15)', color: '#6EE7B7', borderColor: 'rgba(52,211,153,0.3)' }
                : v === 'SUSPENDED'
                ? { background: 'rgba(251,191,36,0.15)', color: '#FCD34D', borderColor: 'rgba(251,191,36,0.3)' }
                : {}
              : {}
          }
        >
          {STATUS_LABEL[v]}
        </Tag>
      ),
    },
    {
      title: 'Số sổ BHXH',
      dataIndex: 'bhxhBookNumber',
      width: 140,
      render: (v?: string) =>
        v ? (
          <Text style={{ color: textPrimary }}>{v}</Text>
        ) : (
          <Text style={{ color: textMuted }}>Chưa có</Text>
        ),
    },
    {
      title: 'Hành động',
      width: 220,
      render: (_: unknown, record: InsuranceEnrollment) => (
        <Space size={4}>
          <Button size="small" onClick={() => onEdit(record)}>
            Sửa
          </Button>
          <Button size="small" icon={<BookOutlined />} onClick={() => onBook(record)}>
            Sổ BH
          </Button>
          <Button size="small" icon={<ThunderboltOutlined />} onClick={() => onEvent(record)}>
            Sự kiện
          </Button>
        </Space>
      ),
    },
  ];
}

interface BookColumnsArgs extends PaletteArgs {
  onConfirmReceived: (book: SocialInsuranceBook) => void;
  confirmPending: boolean;
}

export function buildBookColumns({
  textPrimary,
  textMuted,
  onConfirmReceived,
  confirmPending,
}: BookColumnsArgs): ColumnsType<InsuranceEnrollment> {
  return [
    {
      title: 'Mã NV',
      dataIndex: ['employee', 'code'],
      width: 100,
      render: (v?: string) =>
        v ? <Text style={{ color: textPrimary }}>{v}</Text> : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      title: 'Họ và tên',
      dataIndex: ['employee', 'fullName'],
      render: (v?: string) =>
        v ? <Text style={{ color: textPrimary }}>{v}</Text> : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      title: 'Số sổ BHXH',
      dataIndex: ['socialInsuranceBook', 'bookNumber'],
      render: (v?: string) =>
        v ? <Text style={{ color: textPrimary }}>{v}</Text> : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      title: 'Ngày cấp',
      dataIndex: ['socialInsuranceBook', 'issueDate'],
      width: 130,
      render: (v?: string) =>
        v ? (
          <Text style={{ color: textMuted }}>{dayjs(v).format('DD/MM/YYYY')}</Text>
        ) : (
          <Text style={{ color: textMuted }}>—</Text>
        ),
    },
    {
      title: 'Nơi cấp',
      dataIndex: ['socialInsuranceBook', 'issueAuthority'],
      render: (v?: string) =>
        v ? <Text style={{ color: textPrimary }}>{v}</Text> : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      title: 'Hành động',
      width: 160,
      render: (_: unknown, record: InsuranceEnrollment) => {
        const book = record.socialInsuranceBook as SocialInsuranceBook | undefined;
        if (!book) return null;
        return (
          <Button
            size="small"
            type="primary"
            onClick={() => onConfirmReceived(book)}
            loading={confirmPending}
            disabled={confirmPending}
          >
            Xác nhận đã trả
          </Button>
        );
      },
    },
  ];
}

export function buildD02EnrolledCols({ textPrimary, textMuted }: Pick<PaletteArgs, 'textPrimary' | 'textMuted'>) {
  return [
    {
      title: 'Mã NV',
      dataIndex: 'employeeCode',
      render: (v: string) => <Text style={{ color: textPrimary }}>{v}</Text>,
    },
    {
      title: 'Họ và tên',
      dataIndex: 'fullName',
      render: (v: string) => <Text style={{ color: textPrimary }}>{v}</Text>,
    },
    {
      title: 'Mức đóng',
      dataIndex: 'insuranceSalary',
      render: (v: number) => <Text style={{ color: textPrimary }}>{formatCurrency(v)}</Text>,
    },
    {
      title: 'Ngày hiệu lực',
      dataIndex: 'effectiveDate',
      render: (v: string) => <Text style={{ color: textMuted }}>{dayjs(v).format('DD/MM/YYYY')}</Text>,
    },
  ];
}

export function buildD02SalaryChangedCols({ textPrimary, textMuted }: Pick<PaletteArgs, 'textPrimary' | 'textMuted'>) {
  return [
    {
      title: 'Mã NV',
      dataIndex: 'employeeCode',
      render: (v: string) => <Text style={{ color: textPrimary }}>{v}</Text>,
    },
    {
      title: 'Họ và tên',
      dataIndex: 'fullName',
      render: (v: string) => <Text style={{ color: textPrimary }}>{v}</Text>,
    },
    {
      title: 'Mức cũ',
      dataIndex: 'oldSalary',
      render: (v: number) => <Text style={{ color: textMuted }}>{formatCurrency(v)}</Text>,
    },
    {
      title: 'Mức mới',
      dataIndex: 'newSalary',
      render: (v: number) => <Text style={{ color: textPrimary }}>{formatCurrency(v)}</Text>,
    },
    {
      title: 'Ngày hiệu lực',
      dataIndex: 'effectiveDate',
      render: (v: string) => <Text style={{ color: textMuted }}>{dayjs(v).format('DD/MM/YYYY')}</Text>,
    },
  ];
}
