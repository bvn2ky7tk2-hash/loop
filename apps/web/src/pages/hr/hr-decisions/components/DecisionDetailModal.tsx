import { Button, Space, Typography, Tag, Descriptions } from 'antd';
import {
  SendOutlined,
  CheckOutlined,
  CloseOutlined,
  FilePdfOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

import { CenteredModal } from '../../../../components/ui/CenteredModal';
import { EmployeeInfoCell } from '../../../../components/ui/EmployeeInfoCell';
import type { HrDecision } from '../../../../api/hr-decisions';
import { STATUS_MAP, TypeTag } from '../constants';

const { Text } = Typography;

interface DecisionDetailModalProps {
  detailRecord: HrDecision | null;
  onClose: () => void;
  onSubmit: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  submitPending: boolean;
  approvePending: boolean;
  // palette
  textPrimary: string;
  textMuted: string;
  linkColor: string;
  isDark: boolean;
}

export function DecisionDetailModal({
  detailRecord,
  onClose,
  onSubmit,
  onApprove,
  onReject,
  submitPending,
  approvePending,
  textPrimary,
  textMuted,
  linkColor,
  isDark,
}: DecisionDetailModalProps) {
  return (
    <CenteredModal
      open={!!detailRecord}
      onClose={onClose}
      title="Chi tiết quyết định"
      width={560}
      footer={
        detailRecord && (
          <Space wrap>
            {detailRecord.status === 'DRAFT' && (
              <Button
                type="primary"
                icon={<SendOutlined />}
                loading={submitPending}
                disabled={submitPending}
                onClick={() => onSubmit(detailRecord.id)}
              >
                Nộp để duyệt
              </Button>
            )}
            {detailRecord.status === 'PENDING' && (
              <>
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  loading={approvePending}
                  disabled={approvePending}
                  onClick={() => onApprove(detailRecord.id)}
                >
                  Duyệt
                </Button>
                <Button
                  danger
                  icon={<CloseOutlined />}
                  onClick={() => onReject(detailRecord.id)}
                >
                  Từ chối
                </Button>
              </>
            )}
            {detailRecord.status === 'APPROVED' && detailRecord.pdfPath && (
              <Button icon={<FilePdfOutlined />} href={detailRecord.pdfPath} target="_blank">
                Tải PDF
              </Button>
            )}
            <Button onClick={onClose}>Đóng</Button>
          </Space>
        )
      }
    >
      {detailRecord && (
        <Descriptions
          bordered
          size="small"
          column={1}
          labelStyle={{ color: textMuted, width: 160 }}
          contentStyle={{ color: textPrimary }}
        >
          <Descriptions.Item label="Số quyết định">
            <Text style={{ color: linkColor, fontWeight: 600 }}>
              {detailRecord.decisionNumber ?? '—'}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="Nhân viên">
            {detailRecord.employee ? (
              <EmployeeInfoCell employee={detailRecord.employee} variant="descriptions" />
            ) : (
              <Text style={{ color: textMuted }}>{detailRecord.employeeId}</Text>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Loại QĐ">
            <TypeTag type={detailRecord.type} isDark={isDark} />
          </Descriptions.Item>
          <Descriptions.Item label="Trạng thái">
            <Tag color={STATUS_MAP[detailRecord.status]?.antColor}>
              {STATUS_MAP[detailRecord.status]?.label ?? detailRecord.status}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Ngày ký">
            <Text style={{ color: textMuted }}>
              {detailRecord.signedDate ? dayjs(detailRecord.signedDate).format('DD/MM/YYYY') : '—'}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="Ngày hiệu lực">
            <Text style={{ color: textMuted }}>
              {dayjs(detailRecord.effectiveDate).format('DD/MM/YYYY')}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="Người ký">
            <Text style={{ color: textMuted }}>{detailRecord.signedBy ?? '—'}</Text>
          </Descriptions.Item>
          {detailRecord.toSalary !== undefined && (
            <Descriptions.Item label="Lương mới">
              <Text style={{ color: linkColor, fontWeight: 600 }}>
                {detailRecord.toSalary.toLocaleString('vi-VN')} ₫
              </Text>
            </Descriptions.Item>
          )}
          {detailRecord.fromSalary !== undefined && (
            <Descriptions.Item label="Lương cũ">
              <Text style={{ color: textMuted }}>
                {detailRecord.fromSalary.toLocaleString('vi-VN')} ₫
              </Text>
            </Descriptions.Item>
          )}
          <Descriptions.Item label="Nội dung">
            <Text style={{ color: textPrimary }}>{detailRecord.content ?? '—'}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Ghi chú">
            <Text style={{ color: textMuted }}>{detailRecord.notes ?? '—'}</Text>
          </Descriptions.Item>
        </Descriptions>
      )}
    </CenteredModal>
  );
}
