import {
  Table, Button, Space, Typography, Descriptions, Timeline, Tooltip, Tabs, theme,
} from 'antd';
import { IdcardOutlined, PlayCircleOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { CenteredModal } from '../../../components/ui/CenteredModal';
import { EmployeeInfoCell } from '../../../components/ui/EmployeeInfoCell';
import { formatNumber } from '../../../utils/format';
import { useThemePalette } from '../../../hooks/useThemePalette';
import { LEVEL_HUE } from '../personnelConstants';
import { TaxProfileTab } from './TaxProfileTab';
import type { Employee } from '../../../api/employees';

const { Text } = Typography;

interface RateItem { effectiveDate: string; ratePerDay: number; currency: string }
interface ProjectHistoryItem { id: string }

interface Props {
  detailId: string | null;
  detail: Employee | undefined;
  rates: RateItem[];
  projectHistory: ProjectHistoryItem[];
  onClose: () => void;
  onOpenFullProfile: () => void;
  onStartOnboarding: () => void;
  onAddRate: () => void;
  getOnboardingTooltip: (employee: Employee) => string;
  isOnboardingDisabled: () => boolean;
  onboardingLoading: string | null;
}

export function EmployeeDetailModal({
  detailId, detail, rates, projectHistory,
  onClose, onOpenFullProfile, onStartOnboarding, onAddRate,
  getOnboardingTooltip, isOnboardingDisabled, onboardingLoading,
}: Props) {
  const { token } = theme.useToken();
  const { textMuted } = useThemePalette();

  const projectHistoryColumns = [
    { title: 'Dự án', dataIndex: ['project', 'name'], ellipsis: true },
    {
      title: 'Mã', dataIndex: ['project', 'code'], width: 80,
      render: (v: string) => (
        <span style={{
          fontSize: 11, borderRadius: 4, padding: '1px 6px',
          background: token.colorFillSecondary,
          color: token.colorTextSecondary,
        }}>{v}</span>
      ),
    },
    { title: 'Vai trò', dataIndex: 'role', width: 90 },
    {
      title: 'Phân bổ', dataIndex: 'allocationPct', width: 80,
      render: (v: number) => (
        <span style={{ fontSize: 13, fontWeight: 600, color: Number(v) >= 90 ? '#EF4444' : Number(v) >= 70 ? '#F59E0B' : '#10B981' }}>
          {Number(v)}%
        </span>
      ),
    },
    { title: 'Từ',  dataIndex: 'startDate', width: 90, render: (v: string) => <Text style={{ color: textMuted }}>{dayjs(v).format('DD/MM/YY')}</Text> },
    { title: 'Đến', dataIndex: 'endDate',   width: 90, render: (v: string) => <Text style={{ color: textMuted }}>{dayjs(v).format('DD/MM/YY')}</Text> },
  ];

  return (
    <CenteredModal
      title={detail?.fullName ?? 'Chi tiết nhân sự'}
      open={!!detailId}
      onClose={onClose}
      width={800}
      extra={
        <Space>
          <Button
            type="primary"
            icon={<IdcardOutlined />}
            onClick={onOpenFullProfile}
          >
            Hồ sơ đầy đủ
          </Button>
          <Tooltip title={detail ? getOnboardingTooltip(detail) : 'No onboarding process configured'}>
            <Button
              icon={<PlayCircleOutlined />}
              disabled={isOnboardingDisabled()}
              loading={!!detail && onboardingLoading === detail.id}
              onClick={onStartOnboarding}
            >
              Start Onboarding
            </Button>
          </Tooltip>
          <Button icon={<PlusOutlined />} onClick={onAddRate}>Thêm mức lương</Button>
        </Space>
      }
    >
      {detail && (
        <Tabs items={[
          {
            key: 'info', label: 'Thông tin',
            children: (
              <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label="Nhân sự">
                  <EmployeeInfoCell employee={detail} variant="descriptions" />
                </Descriptions.Item>
                <Descriptions.Item label="Chức danh">
                  {detail.jobTitle?.name ?? detail.position?.jobTitle?.name ?? '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Vị trí biên chế">
                  {detail.position?.code ?? '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Cấp độ">
                  {(() => {
                    const hue = LEVEL_HUE[detail.level] ?? token.colorTextSecondary;
                    return (
                      <span style={{ fontSize: 12, fontWeight: 500, borderRadius: 4, padding: '2px 8px', color: hue, background: `${hue}1e` }}>
                        {detail.level}
                      </span>
                    );
                  })()}
                </Descriptions.Item>
                <Descriptions.Item label="Ngày vào làm">
                  {(detail as Employee).startDate ? dayjs((detail as Employee).startDate).format('DD/MM/YYYY') : '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Ngày sinh">
                  {(detail as Employee).birthdate ? dayjs((detail as Employee).birthdate).format('DD/MM/YYYY') : '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Tech Stack">
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {detail.techStack?.map((t) => (
                      <span key={t} style={{
                        fontSize: 11, borderRadius: 4, padding: '2px 6px',
                        background: token.colorFillTertiary,
                        color: token.colorTextSecondary,
                        border: `1px solid ${token.colorBorderSecondary}`,
                      }}>{t}</span>
                    ))}
                  </div>
                </Descriptions.Item>
                <Descriptions.Item label="Email công việc">{detail.email ?? '—'}</Descriptions.Item>
                <Descriptions.Item label="Số điện thoại">{detail.phoneNumber ?? '—'}</Descriptions.Item>
                <Descriptions.Item label="Giới tính">
                  {detail.gender === 'MALE' ? 'Nam' : detail.gender === 'FEMALE' ? 'Nữ' : detail.gender === 'OTHER' ? 'Khác' : '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Tình trạng hôn nhân">
                  {detail.maritalStatus === 'SINGLE' ? 'Độc thân' : detail.maritalStatus === 'MARRIED' ? 'Đã kết hôn' : detail.maritalStatus === 'DIVORCED' ? 'Đã ly hôn' : detail.maritalStatus === 'WIDOWED' ? 'Góa' : '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Quê quán">{detail.hometown ?? '—'}</Descriptions.Item>
                <Descriptions.Item label="Tài khoản hệ thống">{detail.user?.email ?? '—'}</Descriptions.Item>
                <Descriptions.Item label="Số CCCD">{detail.cccd ?? '—'}</Descriptions.Item>
                <Descriptions.Item label="Ngày cấp CCCD">
                  {detail.cccdIssueDate ? dayjs(detail.cccdIssueDate).format('DD/MM/YYYY') : '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Nơi cấp">{detail.cccdIssuePlace ?? '—'}</Descriptions.Item>
              </Descriptions>
            ),
          },
          {
            key: 'rates', label: 'Lịch sử lương',
            children: rates.length === 0 ? (
              <p style={{ color: token.colorTextTertiary, paddingTop: 16 }}>Chưa có dữ liệu lương</p>
            ) : (
              <Timeline
                style={{ marginTop: 16 }}
                items={rates.map((r) => ({
                  children: (
                    <Space direction="vertical" size={0}>
                      <span>{dayjs(r.effectiveDate).format('DD/MM/YYYY')}</span>
                      <strong>{formatNumber(r.ratePerDay)} {r.currency}/ngày</strong>
                    </Space>
                  ),
                }))}
              />
            ),
          },
          {
            key: 'projects', label: `Dự án (${projectHistory.length})`,
            children: (
              <Table
                dataSource={projectHistory} columns={projectHistoryColumns}
                rowKey="id" size="small" pagination={false}
                style={{ marginTop: 8 }}
                locale={{ emptyText: 'Chưa tham gia dự án nào' }}
              />
            ),
          },
          {
            key: 'tax',
            label: 'Thuế & BHXH',
            children: detail ? <TaxProfileTab employeeId={detail.id} /> : null,
          },
        ]} />
      )}
    </CenteredModal>
  );
}
