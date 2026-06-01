import { useState } from 'react';
import { Typography, Select, Tag, Card, Avatar, Spin, Button, Modal, message, Row, Col } from 'antd';
import { UserOutlined, AppstoreAddOutlined, ArrowRightOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useThemePalette } from '../../hooks/useThemePalette';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import {
  useGetJobs, useGetCandidates, useTransitionCandidateStage,
  type Candidate, type CandidateStage,
} from '../../api/recruit';

const { Title, Text } = Typography;

const STAGE_META: Record<CandidateStage, { label: string; color: string; lightBg: string; lightBorder: string; darkBg: string; darkBorder: string }> = {
  APPLIED:   { label: 'Đã nộp',    color: '#3B82F6', lightBg: '#EFF6FF', lightBorder: '#BFDBFE', darkBg: '#1E3A5F', darkBorder: '#3B82F6' },
  SCREENING: { label: 'Sàng lọc',  color: '#06B6D4', lightBg: '#ECFEFF', lightBorder: '#A5F3FC', darkBg: '#164E63', darkBorder: '#0891B2' },
  INTERVIEW: { label: 'Phỏng vấn', color: '#8B5CF6', lightBg: '#F5F3FF', lightBorder: '#DDD6FE', darkBg: '#2E1065', darkBorder: '#8B5CF6' },
  OFFER:     { label: 'Offer',      color: '#F97316', lightBg: '#FFF7ED', lightBorder: '#FED7AA', darkBg: '#431407', darkBorder: '#EA580C' },
  HIRED:     { label: 'Đã tuyển',  color: '#10B981', lightBg: '#ECFDF5', lightBorder: '#A7F3D0', darkBg: '#064E3B', darkBorder: '#059669' },
  REJECTED:  { label: 'Từ chối',   color: '#EF4444', lightBg: '#FEF2F2', lightBorder: '#FECACA', darkBg: '#450A0A', darkBorder: '#DC2626' },
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

  const appliedCount = byStage.APPLIED?.length ?? 0;
  const screeningCount = byStage.SCREENING?.length ?? 0;
  const interviewCount = byStage.INTERVIEW?.length ?? 0;
  const offerCount = byStage.OFFER?.length ?? 0;
  const hiredCount = byStage.HIRED?.length ?? 0;
  const rejectedCount = byStage.REJECTED?.length ?? 0;

  if (isLoading) return <div style={{ padding: 24, textAlign: 'center' }}><Spin size="large" /></div>;

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Pipeline"
        icon={<AppstoreAddOutlined />}
        iconColor="#3B82F6"
        actions={
          <Select placeholder="Tất cả vị trí" style={{ width: 260 }} allowClear showSearch optionFilterProp="label"
            options={jobs.map(j => ({ value: j.id, label: j.title }))}
            onChange={v => setJobId(v)} />
        }
      />

      {/* Stat Cards */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}><StatCard label="Đã nộp" value={appliedCount} color="#3B82F6" icon={<AppstoreAddOutlined />} /></Col>
        <Col xs={12} sm={6}><StatCard label="Sàng lọc" value={screeningCount} color="#06B6D4" icon={<AppstoreAddOutlined />} /></Col>
        <Col xs={12} sm={6}><StatCard label="Phỏng vấn" value={interviewCount} color="#8B5CF6" icon={<AppstoreAddOutlined />} /></Col>
        <Col xs={12} sm={6}><StatCard label="Offer" value={offerCount} color="#F97316" icon={<AppstoreAddOutlined />} /></Col>
      </Row>

      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 12 }}>
        {COLUMNS.map(stage => {
          const meta = STAGE_META[stage];
          const cards = byStage[stage];

          return (
            <div key={stage} style={{
              minWidth: 220, flex: '0 0 220px',
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              {/* Column header */}
              <div style={{
                padding: '8px 12px', borderRadius: 8,
                background: isDark ? meta.darkBg : meta.lightBg,
                border: `1px solid ${isDark ? meta.darkBorder : meta.lightBorder}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <Text style={{ fontWeight: 600, fontSize: 13, color: meta.color }}>{meta.label}</Text>
                <Tag
                  style={isDark ? { background: `${meta.color}33`, color: meta.color, borderColor: `${meta.color}66`, margin: 0, fontSize: 11 } : { margin: 0, fontSize: 11 }}
                  color={isDark ? undefined : meta.color}
                >
                  {cards.length}
                </Tag>
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
                        style={{ background: `${meta.color}33`, color: meta.color, flexShrink: 0, fontSize: 13 }} />
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
                            style={{ background: preset.primary, borderColor: preset.primary, flex: 1, fontSize: 11 }}
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
