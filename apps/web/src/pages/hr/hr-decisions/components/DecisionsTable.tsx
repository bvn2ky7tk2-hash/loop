import { Table, Button, Space, Typography, Tag, Tooltip } from 'antd';
import {
  EditOutlined,
  SendOutlined,
  CheckOutlined,
  CloseOutlined,
  FilePdfOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

import type { HrDecision } from '../../../../api/hr-decisions';
import { EmployeeInfoCell } from '../../../../components/ui/EmployeeInfoCell';
import { STATUS_MAP, TypeTag } from '../constants';

const { Text } = Typography;

interface DecisionsTableProps {
  decisions: HrDecision[];
  total: number;
  isLoading: boolean;
  paginationProps: (total: number, label: string) => any;
  // palette
  textMuted: string;
  linkColor: string;
  borderColor: string;
  bgContainer: string;
  isDark: boolean;
  // callbacks
  onShowDetail: (record: HrDecision) => void;
  onEdit: (record: HrDecision) => void;
  onSubmit: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  submitPending: boolean;
  approvePending: boolean;
}

export function DecisionsTable({
  decisions,
  total,
  isLoading,
  paginationProps,
  textMuted,
  linkColor,
  borderColor,
  bgContainer,
  isDark,
  onShowDetail,
  onEdit,
  onSubmit,
  onApprove,
  onReject,
  submitPending,
  approvePending,
}: DecisionsTableProps) {
  const columns: ColumnsType<HrDecision> = [
    {
      title: 'Số QĐ',
      key: 'decisionNumber',
      width: 130,
      render: (_, record) => (
        <span
          style={{ color: linkColor, fontWeight: 600, cursor: 'pointer' }}
          onClick={() => onShowDetail(record)}
        >
          {record.decisionNumber ?? '—'}
        </span>
      ),
    },
    {
      title: 'Nhân viên',
      key: 'employee',
      render: (_, record) =>
        record.employee ? (
          <EmployeeInfoCell employee={record.employee} />
        ) : (
          <Text style={{ color: textMuted }}>{record.employeeId}</Text>
        ),
    },
    {
      title: 'Loại quyết định',
      key: 'type',
      width: 160,
      render: (_, record) => <TypeTag type={record.type} isDark={isDark} />,
    },
    {
      title: 'Ngày hiệu lực',
      key: 'effectiveDate',
      width: 130,
      render: (_, record) => (
        <Text style={{ color: textMuted }}>
          {dayjs(record.effectiveDate).format('DD/MM/YYYY')}
        </Text>
      ),
    },
    {
      title: 'Người ký',
      key: 'signedBy',
      render: (_, record) => (
        <Text style={{ color: textMuted }}>{record.signedBy ?? '—'}</Text>
      ),
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 120,
      render: (_, record) => {
        const meta = STATUS_MAP[record.status];
        return <Tag color={meta?.antColor}>{meta?.label ?? record.status}</Tag>;
      },
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 160,
      render: (_, record) => (
        <Space size={4}>
          {(record.status === 'DRAFT') && (
            <Tooltip title="Sửa">
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => onEdit(record)}
              />
            </Tooltip>
          )}
          {record.status === 'DRAFT' && (
            <Tooltip title="Nộp để duyệt">
              <Button
                size="small"
                icon={<SendOutlined />}
                onClick={() => onSubmit(record.id)}
                loading={submitPending}
                disabled={submitPending}
              />
            </Tooltip>
          )}
          {record.status === 'PENDING' && (
            <>
              <Tooltip title="Duyệt">
                <Button
                  size="small"
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={() => onApprove(record.id)}
                  loading={approvePending}
                  disabled={approvePending}
                />
              </Tooltip>
              <Tooltip title="Từ chối">
                <Button
                  size="small"
                  danger
                  icon={<CloseOutlined />}
                  onClick={() => onReject(record.id)}
                />
              </Tooltip>
            </>
          )}
          {record.status === 'APPROVED' && record.pdfPath && (
            <Tooltip title="Tải PDF">
              <Button
                size="small"
                icon={<FilePdfOutlined />}
                href={record.pdfPath}
                target="_blank"
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div
      style={{
        background: bgContainer,
        borderRadius: 12,
        border: `1px solid ${borderColor}`,
        overflow: 'hidden',
      }}
    >
      <Table
        rowKey="id"
        columns={columns}
        dataSource={decisions}
        loading={isLoading}
        pagination={paginationProps(total, 'quyết định')}
        scroll={{ x: 900 }}
      />
    </div>
  );
}
