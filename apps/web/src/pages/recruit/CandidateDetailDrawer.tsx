import { Descriptions, Tag, Avatar, Typography, Divider, Empty } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useThemePalette } from '../../hooks/useThemePalette';
import { CenteredModal } from '../../components/ui/CenteredModal';
import type { Candidate, CandidateStage } from '../../api/recruit';

const { Text } = Typography;

const STAGE_LABEL: Record<CandidateStage, { label: string; color: string }> = {
  APPLIED:   { label: 'Đã nộp',    color: '#3B82F6' },
  SCREENING: { label: 'Sàng lọc',  color: '#06B6D4' },
  INTERVIEW: { label: 'Phỏng vấn', color: '#8B5CF6' },
  OFFER:     { label: 'Offer',      color: '#F97316' },
  HIRED:     { label: 'Đã tuyển',  color: '#10B981' },
  REJECTED:  { label: 'Từ chối',   color: '#EF4444' },
};

const SOURCE_LABEL: Record<string, string> = {
  WEBSITE: 'Website', REFERRAL: 'Giới thiệu', SOCIAL: 'Mạng xã hội',
  EVENT: 'Sự kiện', COLD_OUTREACH: 'Chủ động liên hệ', OTHER: 'Khác',
};

const fmtMoney = (v?: string) => (v ? `${Number(v).toLocaleString('vi-VN')} đ` : '—');

export function CandidateDetailDrawer({
  candidate, open, onClose,
}: {
  candidate: Candidate | null;
  open: boolean;
  onClose: () => void;
}) {
  const { isDark, textPrimary, textMuted, linkColor } = useThemePalette();
  if (!candidate) return null;
  const c = candidate;
  const stage = STAGE_LABEL[c.stage];

  const item = (label: string, value: React.ReactNode) => (
    <Descriptions.Item label={<Text style={{ color: textMuted }}>{label}</Text>}>
      <Text style={{ color: textPrimary }}>{value ?? '—'}</Text>
    </Descriptions.Item>
  );

  return (
    <CenteredModal
      open={open}
      onClose={onClose}
      width={560}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar size={40} icon={<UserOutlined />} style={{ background: `${stage.color}33`, color: stage.color }} />
          <div>
            <Text style={{ color: textPrimary, fontWeight: 700, fontSize: 16, display: 'block' }}>{c.name}</Text>
            <Tag color={stage.color} style={{ marginTop: 2 }}>{stage.label}</Tag>
          </div>
        </div>
      }
    >
      <Descriptions column={1} size="small">
        {item('Vị trí ứng tuyển', c.jobOpening?.title)}
        {item('Ngày sinh', c.birthdate ? dayjs(c.birthdate).format('DD/MM/YYYY') : '—')}
        {item('Email', c.email
          ? <a href={`mailto:${c.email}`} style={{ color: linkColor }}>{c.email}</a> : '—')}
        {item('Điện thoại', c.phone
          ? <a href={`tel:${c.phone}`} style={{ color: linkColor }}>{c.phone}</a> : '—')}
        {item('Địa chỉ', c.address)}
      </Descriptions>

      <Divider style={{ margin: '12px 0' }}>Kinh nghiệm & Học vấn</Divider>
      <Descriptions column={1} size="small">
        {item('Trình độ học vấn', c.educationLevel)}
        {item('Số năm kinh nghiệm', c.yearsOfExperience != null ? `${c.yearsOfExperience} năm` : '—')}
        {item('Vị trí hiện tại', c.currentPosition)}
        {item('Công ty hiện tại', c.currentCompany)}
        {item('Lương kỳ vọng', fmtMoney(c.expectedSalary))}
        {item('Nguồn ứng viên', c.source ? SOURCE_LABEL[c.source] ?? c.source : '—')}
      </Descriptions>

      <Divider style={{ margin: '12px 0' }}>Kỹ năng</Divider>
      {c.skills && c.skills.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {c.skills.map((s) => (
            <Tag key={s} style={isDark ? { background: 'rgba(96,165,250,0.15)', color: '#93C5FD', borderColor: 'rgba(96,165,250,0.3)' } : {}}
              color={isDark ? undefined : 'blue'}>{s}</Tag>
          ))}
        </div>
      ) : <Text style={{ color: textMuted, fontSize: 12 }}>Chưa có kỹ năng</Text>}

      {c.notes && (
        <>
          <Divider style={{ margin: '12px 0' }}>Ghi chú</Divider>
          <Text style={{ color: textPrimary, whiteSpace: 'pre-wrap' }}>{c.notes}</Text>
        </>
      )}

      <Divider style={{ margin: '12px 0' }}>Phỏng vấn ({c.interviews?.length ?? 0})</Divider>
      {c.interviews && c.interviews.length > 0 ? (
        c.interviews.map((iv) => (
          <div key={iv.id} style={{ marginBottom: 8, fontSize: 13 }}>
            <Text style={{ color: textPrimary, fontWeight: 600 }}>{iv.type}</Text>
            <Text style={{ color: textMuted }}> · {dayjs(iv.scheduledAt).format('DD/MM/YYYY HH:mm')}</Text>
            {iv.result && <Tag style={{ marginLeft: 8 }} color={iv.result === 'PASS' ? 'green' : iv.result === 'FAIL' ? 'red' : 'default'}>{iv.result}</Tag>}
          </div>
        ))
      ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<Text style={{ color: textMuted }}>Chưa có phỏng vấn</Text>} />}
    </CenteredModal>
  );
}
