import { useState } from 'react';
import { Typography, Select, Tag, Card, Avatar, Spin, Button, Modal, message } from 'antd';
import { UserOutlined, AppstoreAddOutlined, ArrowRightOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useThemePalette } from '../../hooks/useThemePalette';
import {
  useGetJobs, useGetCandidates, useTransitionCandidateStage,
  type Candidate, type CandidateStage,
} from '../../api/recruit';

const { Title, Text } = Typography;

const STAGE_META: Record<CandidateStage, { label: string; color: string; bg: string; border: string }> = {
  APPLIED:   { label: 'Đã nộp',    color: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE' },
  SCREENING: { label: 'Sàng lọc',  color: '#06B6D4', bg: '#ECFEFF', border: '#A5F3FC' },
  INTERVIEW: { label: 'Phỏng vấn', color: '#8B5CF6', bg: '#F5F3FF', border: '#DDD6FE' },
  OFFER:     { label: 'Offer',      color: '#F97316', bg: '#FFF7ED', border: '#FED7AA' },
  HIRED:     { label: 'Đã tuyển',  color: '#10B981', bg: '#ECFDF5', border: '#A7F3D0' },
  REJECTED:  { label: 'Từ chối',   color: '#EF4444', bg: '#FEF2F2', border: '#FECACA' },
};

const STAGE_META_DARK: Record<CandidateStage, { bg: string; border: string }> = {
  APPLIED:   { bg: '#1E3A5F', border: '#3B82F6' },
  SCREENING: { bg: '#164E63', border: '#0891B2' },
  INTERVIEW: { bg: '#2E1065', border: '#8B5CF6' },
  OFFER:     { bg: '#431407', border: '#EA580C' },
  HIRED:     { bg: '#064E3B', border: '#059669' },
  REJECTED:  { bg: '#450A0A', border: '#DC2626' },
};

const NEXT_STAGE: Partial<Record<CandidateStage, CandidateStage>> = {
  APPLIED: 'SCREENING', SCREENING: 'INTERVIEW', INTERVIEW: 'OFFER', OFFER: 'HIRED',
};

const COLUMNS: CandidateStage[] = ['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED'];

export default function PipelinePage() {
  const { isDark, bgContainer, bgCard, borderColor, textPrimary, textMuted, preset } = useThemePalette();

  const [jobId, setJobId] = useState<string | undefined>();
  const stageMutation = useTransitionCandidateStage();

  const { data: jobsData } = useGetJobs({ limit: 200 });
  const { data, isLoading } = useGetCandidates({ jobOpeningId: jobId, limit: 500 });

  const jobs = jobsData?.data ?? [];
  const allCandidates = data?.data ?? [];

  const byStage = COLUMNS.reduce<Record<CandidateStage, Candidate[]>>((acc, s) => {
    acc[s] = allCandidates.filter(c => c.stage === s);
    return acc;
  }, {} as Record<CandidateStage, Candidate[]>);

  const handleAdvance = (c: Candidate) => {
    const next = NEXT_STAGE[c.stage];
    if (!next) return;
    Modal.confirm({
      title: `Chuyển "${c.name}" → ${STAGE_META[next].label}?`,
      onOk: async () => {
        await stageMutation.mutateAsync({ id: c.id, stage: next });
        message.success(`Đã chuyển sang ${STAGE_META[next].label}`);
      },
    });
  };

  const handleReject = (c: Candidate) => {
    Modal.confirm({
      title: `Từ chối ứng viên "${c.name}"?`,
      okType: 'danger',
      onOk: async () => {
        await stageMutation.mutateAsync({ id: c.id, stage: 'REJECTED' });
        message.success('Đã từ chối');
      },
    });
  };

  if (isLoading) return <div style={{ padding: 24, textAlign: 'center' }}><Spin size="large" /></div>;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AppstoreAddOutlined style={{ color: '#0EA5E9', fontSize: 20 }} />
          <Title level={4} style={{ margin: 0, color: textPrimary }}>Pipeline</Title>
        </div>
        <Select placeholder="Tất cả vị trí" style={{ width: 260 }} allowClear showSearch optionFilterProp="label"
          options={jobs.map(j => ({ value: j.id, label: j.title }))}
          onChange={v => setJobId(v)} />
      </div>

      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 12 }}>
        {COLUMNS.map(stage => {
          const meta = STAGE_META[stage];
          const metaDark = STAGE_META_DARK[stage];
          const cards = byStage[stage];

          return (
            <div key={stage} style={{
              minWidth: 220, flex: '0 0 220px',
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              {/* Column header */}
              <div style={{
                padding: '8px 12px', borderRadius: 8,
                background: isDark ? metaDark.bg : meta.bg,
                border: `1px solid ${isDark ? metaDark.border : meta.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <Text style={{ fontWeight: 600, fontSize: 13, color: meta.color }}>{meta.label}</Text>
                <Tag color={meta.color} style={{ margin: 0, fontSize: 11 }}>{cards.length}</Tag>
              </div>

              {/* Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 120 }}>
                {cards.map(c => (
                  <Card key={c.id} size="small" style={{
                    background: bgCard, border: `1px solid ${borderColor}`,
                    borderRadius: 8, cursor: 'default',
                  }}
                    styles={{ body: { padding: '10px 12px' } }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <Avatar size={28} icon={<UserOutlined />}
                        style={{ background: `${preset.primary}33`, color: preset.primary, flexShrink: 0, fontSize: 13 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ fontWeight: 600, fontSize: 13, color: textPrimary, display: 'block',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {c.name}
                        </Text>
                        <Text style={{ fontSize: 11, color: textMuted, display: 'block',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {c.jobOpening?.title ?? '—'}
                        </Text>
                        <Text style={{ fontSize: 11, color: textMuted }}>
                          {dayjs(c.updatedAt).format('DD/MM/YYYY')}
                        </Text>
                      </div>
                    </div>

                    {stage !== 'HIRED' && stage !== 'REJECTED' && (
                      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                        {NEXT_STAGE[stage] && (
                          <Button size="small" type="primary" icon={<ArrowRightOutlined />}
                            style={{ background: '#0EA5E9', borderColor: '#0EA5E9', flex: 1, fontSize: 11 }}
                            onClick={() => handleAdvance(c)}>
                            {STAGE_META[NEXT_STAGE[stage]!].label}
                          </Button>
                        )}
                        <Button size="small" danger style={{ fontSize: 11 }}
                          onClick={() => handleReject(c)}>Từ chối</Button>
                      </div>
                    )}
                  </Card>
                ))}

                {cards.length === 0 && (
                  <div style={{
                    padding: '20px 12px', textAlign: 'center',
                    background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                    border: `1px dashed ${borderColor}`, borderRadius: 8,
                  }}>
                    <Text style={{ fontSize: 12, color: textMuted }}>Chưa có ứng viên</Text>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
