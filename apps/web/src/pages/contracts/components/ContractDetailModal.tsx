import { Button, Space, Typography, Descriptions } from 'antd';
import { CenteredModal } from '../../../components/ui/CenteredModal';
import { EditOutlined, SyncOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Contract } from '../../../api/contracts';
import { useThemePalette } from '../../../hooks/useThemePalette';
import { EmployeeInfoCell } from '../../../components/ui/EmployeeInfoCell';
import { formatNumber } from '../../../utils/format';
import { TypeBadge, StatusBadge } from './Badges';

const { Text } = Typography;

interface ContractDetailModalProps {
  detailContract: Contract | null;
  onClose: () => void;
  onEdit: (contract: Contract) => void;
  onRenew: (contract: Contract) => void;
}

export function ContractDetailModal({ detailContract, onClose, onEdit, onRenew }: ContractDetailModalProps) {
  const { isDark, textPrimary, textMuted, linkColor } = useThemePalette();

  return (
    <CenteredModal
      open={!!detailContract}
      onClose={onClose}
      title="Chi tiết hợp đồng lao động"
      width={560}
      footer={
        <Space>
          <Button
            icon={<EditOutlined />}
            onClick={() => { if (detailContract) { onClose(); onEdit(detailContract); } }}
          >
            Chỉnh sửa
          </Button>
          <Button
            icon={<SyncOutlined />}
            disabled={detailContract?.status === 'TERMINATED'}
            onClick={() => { if (detailContract) { onClose(); onRenew(detailContract); } }}
          >
            Gia hạn
          </Button>
          <Button onClick={onClose}>Đóng</Button>
        </Space>
      }
    >
      {detailContract && (() => {
        const totalAllowance = (detailContract.allowances ?? []).reduce((s, a) => s + Number(a.amount), 0);
        return (
          <Descriptions bordered size="small" column={1} labelStyle={{ width: 160 }}>
            <Descriptions.Item label="Nhân viên">
              <EmployeeInfoCell employee={detailContract.employee} variant="descriptions" />
            </Descriptions.Item>
            <Descriptions.Item label="Loại hợp đồng">
              <TypeBadge type={detailContract.type} isDark={isDark} />
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              <StatusBadge status={detailContract.status} isDark={isDark} />
            </Descriptions.Item>
            <Descriptions.Item label="Ngày bắt đầu">
              <Text style={{ color: textMuted }}>{dayjs(detailContract.startDate).format('DD/MM/YYYY')}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Ngày kết thúc">
              {detailContract.endDate
                ? <Text style={{ color: textMuted }}>{dayjs(detailContract.endDate).format('DD/MM/YYYY')}</Text>
                : <Text style={{ color: '#10B981', fontWeight: 600 }}>Vô thời hạn</Text>}
            </Descriptions.Item>
            <Descriptions.Item label="Lương cơ bản">
              <Text style={{ color: textPrimary, fontWeight: 600 }}>{formatNumber(detailContract.salaryMonthly)} {detailContract.currency}</Text>
            </Descriptions.Item>
            {totalAllowance > 0 && (
              <Descriptions.Item label="Phụ cấp">
                <div>
                  {(detailContract.allowances ?? []).map((a) => (
                    <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                      <Text style={{ color: textMuted }}>{a.allowanceType?.name ?? '—'}</Text>
                      <Text style={{ color: '#10B981', fontVariantNumeric: 'tabular-nums' }}>+{formatNumber(Number(a.amount))}</Text>
                    </div>
                  ))}
                </div>
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Tổng thu nhập">
              <Text style={{ color: linkColor, fontWeight: 700, fontSize: 15 }}>
                {formatNumber(detailContract.salaryMonthly + totalAllowance)} {detailContract.currency}
              </Text>
            </Descriptions.Item>
            {detailContract.signedAt && (
              <Descriptions.Item label="Ngày ký">
                <Text style={{ color: textMuted }}>{dayjs(detailContract.signedAt).format('DD/MM/YYYY')}</Text>
              </Descriptions.Item>
            )}
            {detailContract.renewalCount > 0 && (
              <Descriptions.Item label="Lần gia hạn">
                <Text style={{ color: linkColor }}>Gia hạn lần {detailContract.renewalCount}</Text>
              </Descriptions.Item>
            )}
            {detailContract.note && (
              <Descriptions.Item label="Ghi chú">
                <Text style={{ color: textMuted }}>{detailContract.note}</Text>
              </Descriptions.Item>
            )}
          </Descriptions>
        );
      })()}
    </CenteredModal>
  );
}
