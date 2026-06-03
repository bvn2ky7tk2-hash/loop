import { Button, Space, Typography, Form, Input } from 'antd';

import { CenteredModal } from '../../../../components/ui/CenteredModal';

const { Text } = Typography;
const { TextArea } = Input;

interface RejectModalProps {
  open: boolean;
  onClose: () => void;
  onCancel: () => void;
  rejectReason: string;
  onReasonChange: (value: string) => void;
  onConfirm: () => void;
  rejectPending: boolean;
  // palette
  textPrimary: string;
}

export function RejectModal({
  open,
  onClose,
  onCancel,
  rejectReason,
  onReasonChange,
  onConfirm,
  rejectPending,
  textPrimary,
}: RejectModalProps) {
  return (
    <CenteredModal
      open={open}
      onClose={onClose}
      title="Từ chối quyết định"
      width={440}
      footer={
        <Space>
          <Button onClick={onCancel}>Huỷ</Button>
          <Button
            danger
            loading={rejectPending}
            disabled={rejectPending}
            onClick={onConfirm}
          >
            Xác nhận từ chối
          </Button>
        </Space>
      }
    >
      <Form layout="vertical">
        <Form.Item label={<Text style={{ color: textPrimary }}>Lý do từ chối</Text>}>
          <TextArea
            rows={3}
            value={rejectReason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="Nhập lý do từ chối..."
          />
        </Form.Item>
      </Form>
    </CenteredModal>
  );
}
