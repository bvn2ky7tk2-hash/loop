import { useState } from 'react';
import type { CSSProperties } from 'react';
import {
  DndContext, DragOverlay, closestCorners,
  PointerSensor, useSensor, useSensors, useDroppable, useDraggable,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Typography, Select, Tag, Avatar, Spin, App, Row, Col, Tooltip } from 'antd';
import {
  UserOutlined, AppstoreAddOutlined, PhoneOutlined,
  EnvironmentOutlined, SolutionOutlined, DollarOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useThemePalette } from '../../hooks/useThemePalette';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { CandidateDetailDrawer } from './CandidateDetailDrawer';
import {
  useGetJobs, useGetCandidates, useTransitionCandidateStage,
  type Candidate, type CandidateStage,
} from '../../api/recruit';

const { Text } = Typography;

const STAGE_META: Record<CandidateStage, { label: string; color: string }> = {
  APPLIED:   { label: 'Đã nộp',    color: '#3B82F6' },
  SCREENING: { label: 'Sàng lọc',  color: '#06B6D4' },
  INTERVIEW: { label: 'Phỏng vấn', color: '#8B5CF6' },
  OFFER:     { label: 'Offer',      color: '#F97316' },
  HIRED:     { label: 'Đã tuyển',  color: '#10B981' },
  REJECTED:  { label: 'Từ chối',   color: '#EF4444' },
};

const COLUMNS: CandidateStage[] = ['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED'];

const fmtMoney = (v?: string) => (v ? `${(Number(v) / 1_000_000).toFixed(0)}tr` : null);

// ── Candidate Card ───────────────────────────────────────────────────────────
function CandidateCard({ c, isDragging, onOpen }: { c: Candidate; isDragging?: boolean; onOpen?: (c: Candidate) => void }) {
  const { isDark, bgCard, borderColor, textPrimary, textMuted } = useThemePalette();
  const meta = STAGE_META[c.stage];

  const style: CSSProperties = {
    background: bgCard, border: `1px solid ${borderColor}`, borderRadius: 8,
    padding: '10px 12px',
    boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.18)' : isDark ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 4px rgba(0,0,0,0.06)',
    cursor: 'grab', userSelect: 'none',
  };

  return (
    <div style={style} onClick={() => onOpen?.(c)}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <Avatar size={30} icon={<UserOutlined />} style={{ background: `${meta.color}33`, color: meta.color, flexShrink: 0, fontSize: 13 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontWeight: 600, fontSize: 13, color: textPrimary, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {c.name}
          </Text>
          <Text style={{ fontSize: 11, color: textMuted, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {c.jobOpening?.title ?? '—'}
          </Text>
        </div>
      </div>

      {/* Thông tin nhanh */}
      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
        {(c.currentPosition || c.yearsOfExperience != null) && (
          <Text style={{ fontSize: 11, color: textMuted, display: 'flex', alignItems: 'center', gap: 5 }}>
            <SolutionOutlined style={{ fontSize: 11 }} />
            {c.currentPosition ?? '—'}
            {c.yearsOfExperience != null && <span style={{ color: meta.color, fontWeight: 600 }}>· {c.yearsOfExperience} năm KN</span>}
          </Text>
        )}
        {c.educationLevel && (
          <Text style={{ fontSize: 11, color: textMuted, display: 'flex', alignItems: 'center', gap: 5 }}>
            <AppstoreAddOutlined style={{ fontSize: 11 }} />{c.educationLevel}
          </Text>
        )}
        {c.phone && (
          <Text style={{ fontSize: 11, color: textMuted, display: 'flex', alignItems: 'center', gap: 5 }}>
            <PhoneOutlined style={{ fontSize: 11 }} />{c.phone}
          </Text>
        )}
        {c.address && (
          <Text style={{ fontSize: 11, color: textMuted, display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <EnvironmentOutlined style={{ fontSize: 11 }} />{c.address}
          </Text>
        )}
      </div>

      {/* Skills + lương kỳ vọng */}
      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
        {(c.skills ?? []).slice(0, 3).map((s) => (
          <Tag key={s} style={{ margin: 0, fontSize: 10, lineHeight: '16px', padding: '0 5px', ...(isDark ? { background: 'rgba(96,165,250,0.15)', color: '#93C5FD', borderColor: 'rgba(96,165,250,0.3)' } : {}) }} color={isDark ? undefined : 'blue'}>
            {s}
          </Tag>
        ))}
        {(c.skills?.length ?? 0) > 3 && <Text style={{ fontSize: 10, color: textMuted }}>+{c.skills!.length - 3}</Text>}
        {fmtMoney(c.expectedSalary) && (
          <Tag style={{ margin: '0 0 0 auto', fontSize: 10, lineHeight: '16px', padding: '0 5px', ...(isDark ? { background: 'rgba(16,185,129,0.15)', color: '#6EE7B7', borderColor: 'rgba(16,185,129,0.3)' } : {}) }} color={isDark ? undefined : 'green'} icon={<DollarOutlined style={{ fontSize: 10 }} />}>
            {fmtMoney(c.expectedSalary)}
          </Tag>
        )}
      </div>

      <Text style={{ fontSize: 10, color: textMuted, display: 'block', marginTop: 6 }}>
        Cập nhật {dayjs(c.updatedAt).format('DD/MM/YYYY')}
      </Text>
    </div>
  );
}

function DraggableCandidate({ c, onOpen }: { c: Candidate; onOpen: (c: Candidate) => void }) {
  const disabled = c.stage === 'HIRED';
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: c.id, data: { stage: c.stage }, disabled,
  });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), zIndex: isDragging ? 999 : undefined, marginBottom: 8 }} {...attributes}>
      <div {...(!disabled ? listeners : {})} style={{ touchAction: 'none' }}>
        <CandidateCard c={c} isDragging={isDragging} onOpen={onOpen} />
      </div>
    </div>
  );
}

function Column({ stage, cards, onOpen }: { stage: CandidateStage; cards: Candidate[]; onOpen: (c: Candidate) => void }) {
  const { isDark, borderColor, textMuted } = useThemePalette();
  const meta = STAGE_META[stage];
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div style={{ minWidth: 230, flex: '0 0 230px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{
        padding: '8px 12px', borderRadius: 8,
        background: isDark ? `${meta.color}22` : `${meta.color}12`,
        border: `1px solid ${meta.color}40`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Text style={{ fontWeight: 700, fontSize: 12, color: meta.color, textTransform: 'uppercase', letterSpacing: 0.5 }}>{meta.label}</Text>
        <span style={{ fontSize: 11, fontWeight: 700, background: `${meta.color}22`, color: meta.color, borderRadius: 20, padding: '1px 8px', minWidth: 22, textAlign: 'center' }}>{cards.length}</span>
      </div>

      <div ref={setNodeRef} style={{
        flex: 1, minHeight: 140, padding: 4, borderRadius: 8,
        background: isOver ? `${meta.color}0F` : 'transparent',
        border: isOver ? `2px dashed ${meta.color}60` : '2px dashed transparent',
        transition: 'all 0.15s',
      }}>
        {cards.map((c) => <DraggableCandidate key={c.id} c={c} onOpen={onOpen} />)}
        {cards.length === 0 && (
          <div style={{ padding: '20px 12px', textAlign: 'center', border: `1px dashed ${borderColor}`, borderRadius: 8 }}>
            <Text style={{ fontSize: 12, color: textMuted }}>{stage === 'HIRED' ? 'Tuyển qua Onboarding' : 'Kéo ứng viên vào đây'}</Text>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const { message } = App.useApp();
  const [jobId, setJobId] = useState<string | undefined>();
  const [activeCard, setActiveCard] = useState<Candidate | null>(null);
  const [detail, setDetail] = useState<Candidate | null>(null);
  const stageMutation = useTransitionCandidateStage();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const { data: jobsData } = useGetJobs({ limit: 200 });
  const { data, isLoading } = useGetCandidates({ jobOpeningId: jobId, limit: 500 });

  const jobs = jobsData?.data ?? [];
  const allCandidates = data?.data ?? [];

  const byStage = COLUMNS.reduce<Record<CandidateStage, Candidate[]>>((acc, s) => {
    acc[s] = allCandidates.filter((c) => c.stage === s);
    return acc;
  }, {} as Record<CandidateStage, Candidate[]>);

  function handleDragStart(e: DragStartEvent) {
    setActiveCard(allCandidates.find((c) => c.id === e.active.id) ?? null);
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveCard(null);
    const { active, over } = e;
    if (!over) return;
    const id = active.id as string;
    const target = over.id as CandidateStage;
    const c = allCandidates.find((x) => x.id === id);
    if (!c || c.stage === target) return;
    if (target === 'HIRED') {
      message.info('Để chuyển sang "Đã tuyển", dùng màn Onboarding (cần mã NV, ngày vào…).');
      return;
    }
    try {
      await stageMutation.mutateAsync({ id, stage: target });
      message.success(`Đã chuyển "${c.name}" → ${STAGE_META[target].label}`);
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      message.error(msg ?? 'Không thể chuyển trạng thái');
    }
  }

  if (isLoading) return <div style={{ padding: 24, textAlign: 'center' }}><Spin size="large" /></div>;

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Phễu tuyển dụng"
        icon={<AppstoreAddOutlined />}
        iconColor="#3B82F6"
        actions={
          <Select placeholder="Tất cả vị trí" style={{ width: 260 }} allowClear showSearch optionFilterProp="label"
            options={jobs.map((j) => ({ value: j.id, label: j.title }))}
            onChange={(v) => setJobId(v)} />
        }
      />

      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}><StatCard label="Đã nộp" value={byStage.APPLIED?.length ?? 0} color="#3B82F6" icon={<AppstoreAddOutlined />} /></Col>
        <Col xs={12} sm={6}><StatCard label="Sàng lọc" value={byStage.SCREENING?.length ?? 0} color="#06B6D4" icon={<AppstoreAddOutlined />} /></Col>
        <Col xs={12} sm={6}><StatCard label="Phỏng vấn" value={byStage.INTERVIEW?.length ?? 0} color="#8B5CF6" icon={<AppstoreAddOutlined />} /></Col>
        <Col xs={12} sm={6}><StatCard label="Offer" value={byStage.OFFER?.length ?? 0} color="#F97316" icon={<AppstoreAddOutlined />} /></Col>
      </Row>

      <Tooltip title="Kéo-thả thẻ để chuyển trạng thái · Bấm thẻ để xem chi tiết" placement="topLeft">
        <Text style={{ fontSize: 12, color: '#94A3B8', display: 'block', marginBottom: 8 }}>
          💡 Kéo-thả để đổi trạng thái · bấm vào thẻ để xem nhanh hồ sơ
        </Text>
      </Tooltip>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 12, alignItems: 'flex-start' }}>
          {COLUMNS.map((stage) => <Column key={stage} stage={stage} cards={byStage[stage]} onOpen={setDetail} />)}
        </div>
        <DragOverlay>{activeCard && <CandidateCard c={activeCard} isDragging />}</DragOverlay>
      </DndContext>

      <CandidateDetailDrawer candidate={detail} open={!!detail} onClose={() => setDetail(null)} />
    </div>
  );
}
