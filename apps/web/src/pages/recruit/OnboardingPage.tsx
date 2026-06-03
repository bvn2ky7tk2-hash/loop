import { useState, useMemo } from 'react';
import {
  Tabs, Table, Button, Modal, Form, Input, DatePicker, InputNumber,
  Select, Row, Col, Typography, Space, Badge, Spin, Tooltip,
} from 'antd';
import {
  UserAddOutlined, TeamOutlined, CheckCircleOutlined,
  LoadingOutlined, RocketOutlined, ClockCircleOutlined,
  FileTextOutlined, LaptopOutlined, ScheduleOutlined, EyeOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useThemePalette } from '../../hooks/useThemePalette';
import { usePagination } from '../../hooks/usePagination';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { CandidateDetailDrawer } from './CandidateDetailDrawer';
import { useGetCandidates, useHireCandidate, type Candidate } from '../../api/recruit';
import {
  processesApi,
  type ProcessInstance, type InstanceStatus,
} from '../../api/processes.api';
import { orgUnitsApi } from '../../api/org-units';
import { useQuery } from '@tanstack/react-query';

const { Text } = Typography;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STEP_ICONS: Record<string, React.ReactNode> = {
  HRDocuments:     <FileTextOutlined />,
  ITSetup:         <LaptopOutlined />,
  ManagerHandover: <ScheduleOutlined />,
};
const STEP_LABELS: Record<string, string> = {
  HRDocuments:     'HR hồ sơ',
  ITSetup:         'IT thiết bị',
  ManagerHandover: 'Bàn giao',
};

// ─── Hire Modal ───────────────────────────────────────────────────────────────

function HireModal({
  candidate,
  open,
  onClose,
}: {
  candidate: Candidate | null;
  open: boolean;
  onClose: () => void;
}) {
  const [form] = Form.useForm();
  const { textMuted } = useThemePalette();
  const hire = useHireCandidate();

  const { data: orgUnits = [] } = useQuery({
    queryKey: ['org-units'],
    queryFn: orgUnitsApi.list,
  });

  function flattenOrgUnits(units: typeof orgUnits, depth = 0): { id: string; name: string; depth: number }[] {
    return units.flatMap(u => [
      { id: u.id, name: u.name, depth },
      ...flattenOrgUnits((u as any).children ?? [], depth + 1),
    ]);
  }
  const flatUnits = useMemo(() => flattenOrgUnits(orgUnits), [orgUnits]);

  const handleOk = async () => {
    if (!candidate) return;
    const values = await form.validateFields();
    await hire.mutateAsync({
      id: candidate.id,
      data: {
        employeeCode: values.employeeCode,
        startDate: dayjs(values.startDate).format('YYYY-MM-DD'),
        ratePerDay: values.ratePerDay,
        orgUnitId: values.orgUnitId,
      },
    });
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title={<Space><RocketOutlined style={{ color: '#8B5CF6' }} />Hire & Khởi động Onboarding</Space>}
      open={open}
      onOk={handleOk}
      onCancel={() => { form.resetFields(); onClose(); }}
      confirmLoading={hire.isPending}
      okText="Hire & Onboard"
      width={520}
    >
      {candidate && (
        <>
          <Text style={{ color: textMuted, display: 'block', marginBottom: 16 }}>
            Ứng viên: <strong>{candidate.name}</strong>
            {candidate.jobOpening && (
              <> — Vị trí: <strong>{candidate.jobOpening.title}</strong></>
            )}
          </Text>
          <Form form={form} layout="vertical">
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name="employeeCode" label="Mã nhân viên"
                  rules={[{ required: true }, { pattern: /^[A-Z0-9_-]+$/, message: 'Chỉ chữ hoa, số, gạch ngang' }]}>
                  <Input placeholder="EMP-2024-001" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="startDate" label="Ngày bắt đầu" rules={[{ required: true }]}>
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="orgUnitId" label="Phòng ban" rules={[{ required: true }]}>
              <Select placeholder="Chọn phòng ban" showSearch optionFilterProp="label"
                options={flatUnits.map(u => ({
                  value: u.id,
                  label: `${'　'.repeat(u.depth)}${u.name}`,
                }))}
              />
            </Form.Item>
            <Form.Item name="ratePerDay" label="Rate/ngày (VNĐ)" rules={[{ required: true }]}>
              <InputNumber<number>
                style={{ width: '100%' }}
                min={0}
                formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={v => Number(v!.replace(/,/g, ''))}
                placeholder="800000"
              />
            </Form.Item>
          </Form>
        </>
      )}
    </Modal>
  );
}

// ─── Tab 1: Candidates OFFER ──────────────────────────────────────────────────

function OfferTab({ onHire }: { onHire: (c: Candidate) => void }) {
  const { textPrimary, textMuted, linkColor } = useThemePalette();
  const { paginationProps } = usePagination(20);
  const { data, isLoading } = useGetCandidates({ stage: 'OFFER', limit: 100 });
  const candidates = data?.data ?? [];
  const [detail, setDetail] = useState<Candidate | null>(null);

  const columns = [
    {
      title: 'Ứng viên',
      dataIndex: 'name',
      render: (v: string, r: Candidate) => (
        <div>
          <Text style={{ color: textPrimary, fontWeight: 500, display: 'block' }}>{v}</Text>
          {r.phone && <Text style={{ color: textMuted, fontSize: 12 }}>{r.phone}</Text>}
        </div>
      ),
    },
    {
      title: 'Vị trí ứng tuyển',
      render: (_: unknown, r: Candidate) => (
        <div>
          <Text style={{ color: textPrimary, display: 'block' }}>{r.jobOpening?.title ?? '—'}</Text>
          {r.currentPosition && <Text style={{ color: textMuted, fontSize: 12 }}>Hiện tại: {r.currentPosition}</Text>}
        </div>
      ),
    },
    {
      title: 'Học vấn',
      dataIndex: 'educationLevel',
      render: (v?: string) => <Text style={{ color: v ? textPrimary : textMuted }}>{v ?? '—'}</Text>,
    },
    {
      title: 'Kinh nghiệm',
      dataIndex: 'yearsOfExperience',
      render: (v?: number) => <Text style={{ color: v != null ? textPrimary : textMuted }}>{v != null ? `${v} năm` : '—'}</Text>,
    },
    {
      title: 'Lương kỳ vọng',
      dataIndex: 'expectedSalary',
      render: (v?: string) => v
        ? <Text style={{ color: linkColor }}>{Number(v).toLocaleString('vi-VN')} ₫</Text>
        : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      title: '',
      key: 'action',
      render: (_: unknown, record: Candidate) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => setDetail(record)}>Chi tiết</Button>
          <Button type="primary" size="small" icon={<RocketOutlined />} onClick={() => onHire(record)}>
            Hire & Onboard
          </Button>
        </Space>
      ),
    },
  ];

  if (isLoading) return <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>;
  if (!candidates.length) return <EmptyState title="Không có ứng viên ở giai đoạn Offer" />;

  return (
    <>
      <Table rowKey="id" dataSource={candidates} columns={columns} pagination={paginationProps(candidates.length, 'nhân sự')} />
      <CandidateDetailDrawer candidate={detail} open={!!detail} onClose={() => setDetail(null)} />
    </>
  );
}

// ─── Tab 2 & 3: Onboarding Instances ─────────────────────────────────────────

function OnboardingInstancesTab({ status }: { status: InstanceStatus }) {
  const { textPrimary, textMuted, linkColor, isDark } = useThemePalette();
  const { paginationProps } = usePagination(20);

  // Lấy definition trực tiếp bằng key query param
  const { data: defsData } = useQuery({
    queryKey: ['process-definitions', { key: 'employee-onboarding-v1' }],
    queryFn: () => processesApi.listDefinitions({ pageSize: 1, key: 'employee-onboarding-v1' } as any),
    staleTime: 5 * 60 * 1000,
  });
  const onboardingDef = defsData?.data?.[0];

  const { data: instancesData, isLoading } = useQuery({
    queryKey: ['process-instances', { definitionId: onboardingDef?.id, status }],
    queryFn: () => processesApi.listInstances({ definitionId: onboardingDef!.id, status, pageSize: 50 }),
    enabled: !!onboardingDef?.id,
  });
  const instances = instancesData?.data ?? [];

  const getStepStatus = (instance: ProcessInstance) => {
    const tokenState = (instance as any).tokenState as Record<string, string> | undefined;
    if (!tokenState) return null;
    const activeStep = Object.entries(tokenState).find(([, v]) => v === 'ACTIVE');
    return activeStep ? activeStep[0] : null;
  };

  const columns = [
    {
      title: 'Nhân viên',
      render: (_: unknown, r: ProcessInstance) => {
        const vars = r.variables as Record<string, string> | undefined;
        return (
          <Text style={{ color: textPrimary, fontWeight: 500 }}>
            {vars?.['employeeName'] ?? vars?.['employeeId'] ?? r.id.slice(0, 8)}
          </Text>
        );
      },
    },
    {
      title: 'Ngày bắt đầu',
      render: (_: unknown, r: ProcessInstance) => {
        const vars = r.variables as Record<string, string> | undefined;
        return vars?.['startDate']
          ? <Text style={{ color: textMuted }}>{dayjs(vars['startDate']).format('DD/MM/YYYY')}</Text>
          : <Text style={{ color: textMuted }}>—</Text>;
      },
    },
    {
      title: 'Bước hiện tại',
      render: (_: unknown, r: ProcessInstance) => {
        if (status === 'COMPLETED') {
          return (
            <StatusBadge
              tone="success"
              label={<><CheckCircleOutlined /> Hoàn tất</>}
            />
          );
        }
        const step = getStepStatus(r);
        if (!step) return <Text style={{ color: textMuted }}>—</Text>;
        return (
          <Space>
            <StatusBadge
              tone="warning"
              label={<>{STEP_ICONS[step] ?? <ClockCircleOutlined />} {STEP_LABELS[step] ?? step}</>}
            />
          </Space>
        );
      },
    },
    {
      title: 'Tiến trình',
      render: (_: unknown, r: ProcessInstance) => {
        const STEPS = ['HRDocuments', 'ITSetup', 'ManagerHandover'];
        const step = getStepStatus(r);
        const stepIdx = step ? STEPS.indexOf(step) : (status === 'COMPLETED' ? STEPS.length : -1);
        return (
          <Space size={4}>
            {STEPS.map((s, i) => {
              const done = i < stepIdx || status === 'COMPLETED';
              const active = s === step;
              return (
                <Tooltip key={s} title={STEP_LABELS[s]}>
                  <Badge
                    count={done ? <CheckCircleOutlined style={{ color: '#10B981', fontSize: 12 }} /> : undefined}
                    offset={[-2, 2]}
                  >
                    <div style={{
                      width: 28, height: 28, borderRadius: 14, border: '2px solid',
                      borderColor: done ? '#10B981' : active ? '#F59E0B' : (isDark ? '#334155' : '#E2E8F0'),
                      background: done ? 'rgba(16,185,129,0.15)' : active ? 'rgba(245,158,11,0.15)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12,
                      color: done ? '#10B981' : active ? '#F59E0B' : textMuted,
                    }}>
                      {STEP_ICONS[s]}
                    </div>
                  </Badge>
                </Tooltip>
              );
            })}
          </Space>
        );
      },
    },
    {
      title: 'Khởi tạo lúc',
      dataIndex: 'startedAt',
      render: (v: string) => (
        <Text style={{ color: textMuted }}>
          {dayjs(v).format('DD/MM/YYYY HH:mm')}
        </Text>
      ),
    },
    {
      title: 'Người tạo',
      render: (_: unknown, r: ProcessInstance) => (
        <Text style={{ color: linkColor }}>{(r as any).startedByUser?.name ?? '—'}</Text>
      ),
    },
  ];

  if (!onboardingDef && !isLoading) {
    return (
      <EmptyState
        description={
          <span>
            Chưa có process definition <strong>employee-onboarding-v1</strong>.{' '}
            Chạy lệnh <Text code>npx ts-node prisma/seed-bpm-v5.ts</Text> để seed.
          </span>
        }
      />
    );
  }

  if (isLoading) return <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>;
  if (!instances.length) return <EmptyState title={status === 'RUNNING' ? 'Không có nhân viên đang onboarding' : 'Chưa có onboarding hoàn tất'} />;

  return (
    <Table
      rowKey="id"
      dataSource={instances}
      columns={columns}
      pagination={paginationProps(instances.length, 'nhân sự')}
    />
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const [hireTarget, setHireTarget] = useState<Candidate | null>(null);
  const [activeTab, setActiveTab] = useState('offer');

  const { data: offerData } = useGetCandidates({ stage: 'OFFER', limit: 100 });
  const { data: onboardingDefData } = useQuery({
    queryKey: ['process-definitions', { key: 'employee-onboarding-v1' }],
    queryFn: () => processesApi.listDefinitions({ pageSize: 1, key: 'employee-onboarding-v1' } as any),
    staleTime: 5 * 60 * 1000,
  });
  const onboardingDef = onboardingDefData?.data?.[0];

  const { data: runningData } = useQuery({
    queryKey: ['process-instances', { definitionId: onboardingDef?.id, status: 'RUNNING' }],
    queryFn: () => processesApi.listInstances({ definitionId: onboardingDef!.id, status: 'RUNNING', pageSize: 100 }),
    enabled: !!onboardingDef?.id,
  });
  const { data: completedData } = useQuery({
    queryKey: ['process-instances', { definitionId: onboardingDef?.id, status: 'COMPLETED' }],
    queryFn: () => processesApi.listInstances({ definitionId: onboardingDef!.id, status: 'COMPLETED', pageSize: 100 }),
    enabled: !!onboardingDef?.id,
  });

  const offerCount    = offerData?.total ?? 0;
  const runningCount  = runningData?.meta?.total ?? 0;
  const completedCount = completedData?.meta?.total ?? 0;

  const tabItems = [
    {
      key: 'offer',
      label: (
        <Space>
          <UserAddOutlined />
          Chờ Hire
          {offerCount > 0 && <Badge count={offerCount} style={{ backgroundColor: '#8B5CF6' }} />}
        </Space>
      ),
      children: <OfferTab onHire={c => { setHireTarget(c); }} />,
    },
    {
      key: 'running',
      label: (
        <Space>
          <LoadingOutlined />
          Đang Onboarding
          {runningCount > 0 && <Badge count={runningCount} style={{ backgroundColor: '#F59E0B' }} />}
        </Space>
      ),
      children: <OnboardingInstancesTab status="RUNNING" />,
    },
    {
      key: 'completed',
      label: (
        <Space>
          <CheckCircleOutlined />
          Hoàn tất
          {completedCount > 0 && <Badge count={completedCount} style={{ backgroundColor: '#10B981' }} />}
        </Space>
      ),
      children: <OnboardingInstancesTab status="COMPLETED" />,
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Tuyển dụng & Onboarding"
        icon={<TeamOutlined />}
        iconColor="#8B5CF6"
        actions={null}
      />

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <StatCard
            label="Chờ Hire (Offer)"
            value={offerCount}
            color="#8B5CF6"
            icon={<UserAddOutlined />}
          />
        </Col>
        <Col xs={24} sm={8}>
          <StatCard
            label="Đang Onboarding"
            value={runningCount}
            color="#F59E0B"
            icon={<LoadingOutlined />}
          />
        </Col>
        <Col xs={24} sm={8}>
          <StatCard
            label="Onboarding Hoàn tất"
            value={completedCount}
            color="#10B981"
            icon={<CheckCircleOutlined />}
          />
        </Col>
      </Row>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
      />

      <HireModal
        candidate={hireTarget}
        open={!!hireTarget}
        onClose={() => setHireTarget(null)}
      />
    </div>
  );
}
