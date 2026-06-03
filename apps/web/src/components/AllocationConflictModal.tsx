import { Modal, Table, Button, Popconfirm, Typography, Space, theme } from 'antd';
import { WarningOutlined } from '@ant-design/icons';
import { usePagination } from '../hooks/usePagination';

export interface ConflictDay {
  date: string;
  existingProjects: { name: string; pct: number }[];
  newPct: number;
  totalPct: number;
}

interface Props {
  open: boolean;
  conflicts: ConflictDay[];
  onAdjust: () => void;
  onForceOverride: () => void;
  onCancel: () => void;
}

const { Text } = Typography;

export default function AllocationConflictModal({ open, conflicts, onAdjust, onForceOverride, onCancel }: Props) {
  const { token } = theme.useToken();
  const { paginationProps } = usePagination(10);
  const columns = [
    {
      title: 'Ngày',
      dataIndex: 'date',
      width: 110,
      render: (v: string) => <span style={{ color: token.colorText }}>{v}</span>,
    },
    {
      title: 'Dự án hiện tại',
      dataIndex: 'existingProjects',
      render: (projects: { name: string; pct: number }[]) => (
        <Space direction="vertical" size={2}>
          {projects.map((p) => (
            <Text key={p.name}>
              {p.name}: <span style={{ fontSize: 11, fontWeight: 600, borderRadius: 9999, padding: '2px 8px', background: '#EEF2FF', color: '#4338CA' }}>{p.pct}%</span>
            </Text>
          ))}
        </Space>
      ),
    },
    {
      title: 'Dự án mới (%)',
      dataIndex: 'newPct',
      width: 120,
      render: (v: number) => <span style={{ fontSize: 11, fontWeight: 600, borderRadius: 9999, padding: '2px 8px', background: '#FFF7ED', color: '#C2410C' }}>{v}%</span>,
    },
    {
      title: 'Tổng (%)',
      dataIndex: 'totalPct',
      width: 100,
      render: (v: number) => (
        <span style={{ fontSize: 11, fontWeight: 600, borderRadius: 9999, padding: '2px 8px', background: v > 100 ? '#FEF2F2' : '#ECFDF5', color: v > 100 ? '#DC2626' : '#065F46' }}>
          {v}%
        </span>
      ),
    },
  ];

  return (
    <Modal
      open={open}
      title={
        <Space>
          <WarningOutlined style={{ color: '#F59E0B' }} />
          <span>Xung đột phân bổ nguồn lực</span>
        </Space>
      }
      onCancel={onCancel}
      width={680}
      footer={
        <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
          <Button onClick={onAdjust}>Điều chỉnh</Button>
          <Popconfirm
            title="Xác nhận lưu đè"
            description="Tổng phân bổ sẽ vượt 100% trên một số ngày. Bạn chắc chắn muốn lưu?"
            onConfirm={onForceOverride}
            okText="Vẫn lưu"
            cancelText="Huỷ"
            okButtonProps={{ danger: true }}
          >
            <Button danger>Vẫn lưu</Button>
          </Popconfirm>
          <Button onClick={onCancel}>Huỷ</Button>
        </Space>
      }
    >
      <Text type="warning" style={{ display: 'block', marginBottom: 12 }}>
        Nhân sự này đã được phân bổ vào dự án khác. Các ngày sau đây sẽ vượt 100%:
      </Text>
      <Table
        dataSource={conflicts}
        columns={columns}
        rowKey="date"
        size="small"
        pagination={paginationProps(conflicts.length, 'ngày')}
        scroll={{ y: 300 }}
      />
    </Modal>
  );
}
