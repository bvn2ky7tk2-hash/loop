import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Tabs,
  Table,
  Tag,
  Button,
  Form,
  Space,
  Typography,
  Spin,
  Tooltip,
  Popconfirm,
} from 'antd';
import {
  FileProtectOutlined,
  FileTextOutlined,
  SafetyOutlined,
  ClockCircleOutlined,
  EditOutlined,
  PlusOutlined,
  UserOutlined,
  ArrowLeftOutlined,
  BookOutlined,
  BankOutlined,
  TeamOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs, { Dayjs } from 'dayjs';
import type { ColumnsType } from 'antd/es/table';

import { useThemePalette } from '../../hooks/useThemePalette';
import { EmptyState } from '../../components/ui/EmptyState';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { hrProfileApi, type EducationRecord, type WorkExperience, type FamilyMember } from '../../api/hr-profile';
import { formatCurrency } from '../../utils/format';

import {
  STATUS_CONFIG,
  CONTRACT_TYPE_LABEL,
  DEGREE_LEVEL_LABEL,
  RELATIONSHIP_LABEL,
} from './employee-profile-360/constants';
import { ProfileHeader } from './employee-profile-360/components/ProfileHeader';
import { OverviewTab } from './employee-profile-360/components/OverviewTab';
import { WorkHistoryTab } from './employee-profile-360/components/WorkHistoryTab';
import { InsuranceTab } from './employee-profile-360/components/InsuranceTab';
import { EditPersonalModal } from './employee-profile-360/components/EditPersonalModal';
import { EducationModal } from './employee-profile-360/components/EducationModal';
import { WorkExperienceModal } from './employee-profile-360/components/WorkExperienceModal';
import { FamilyModal } from './employee-profile-360/components/FamilyModal';
import { DependentModal } from './employee-profile-360/components/DependentModal';

const { Text } = Typography;

// ─── Component ───────────────────────────────────────────────────────────────

export default function EmployeeProfile360Page() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { textPrimary, textMuted, bgCard, borderColor, isDark, linkColor } = useThemePalette();
  const palette = { textPrimary, textMuted, bgCard, borderColor, isDark, linkColor };

  const [editOpen, setEditOpen] = useState(false);
  const [editForm] = Form.useForm();

  // Education modal
  const [eduOpen, setEduOpen] = useState(false);
  const [editingEdu, setEditingEdu] = useState<EducationRecord | null>(null);
  const [eduForm] = Form.useForm();

  // Work experience modal
  const [expOpen, setExpOpen] = useState(false);
  const [editingExp, setEditingExp] = useState<WorkExperience | null>(null);
  const [expForm] = Form.useForm();

  // Family modal
  const [familyOpen, setFamilyOpen] = useState(false);
  const [editingFamily, setEditingFamily] = useState<FamilyMember | null>(null);
  const [familyForm] = Form.useForm();

  // Dependent modal
  const [dependentOpen, setDependentOpen] = useState(false);
  const [dependentTarget, setDependentTarget] = useState<FamilyMember | null>(null);
  const [dependentForm] = Form.useForm();

  // ─── Queries ──────────────────────────────────────────────────────────────

  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ['hr-profile-360', employeeId],
    queryFn: () => hrProfileApi.get360(employeeId!),
    enabled: !!employeeId,
  });

  const { data: education = [] } = useQuery({
    queryKey: ['employee-education', employeeId],
    queryFn: () => hrProfileApi.getEducation(employeeId!),
    enabled: !!employeeId,
  });

  const { data: workExp = [] } = useQuery({
    queryKey: ['employee-work-exp', employeeId],
    queryFn: () => hrProfileApi.getWorkExperience(employeeId!),
    enabled: !!employeeId,
  });

  const { data: familyMembers = [] } = useQuery({
    queryKey: ['employee-family', employeeId],
    queryFn: () => hrProfileApi.getFamilyMembers(employeeId!),
    enabled: !!employeeId,
  });

  // ─── Mutations ────────────────────────────────────────────────────────────

  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof hrProfileApi.updatePersonal>[1]) =>
      hrProfileApi.updatePersonal(employeeId!, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hr-profile-360', employeeId] }); setEditOpen(false); },
  });

  const createEduMutation = useMutation({
    mutationFn: (data: Omit<EducationRecord, 'id'>) => hrProfileApi.createEducation(employeeId!, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employee-education', employeeId] }); setEduOpen(false); eduForm.resetFields(); },
  });

  const updateEduMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<EducationRecord> }) =>
      hrProfileApi.updateEducation(employeeId!, id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employee-education', employeeId] }); setEduOpen(false); setEditingEdu(null); },
  });

  const deleteEduMutation = useMutation({
    mutationFn: (id: string) => hrProfileApi.deleteEducation(employeeId!, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employee-education', employeeId] }),
  });

  const createExpMutation = useMutation({
    mutationFn: (data: Omit<WorkExperience, 'id'>) => hrProfileApi.createWorkExperience(employeeId!, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employee-work-exp', employeeId] }); setExpOpen(false); expForm.resetFields(); },
  });

  const updateExpMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<WorkExperience> }) =>
      hrProfileApi.updateWorkExperience(employeeId!, id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employee-work-exp', employeeId] }); setExpOpen(false); setEditingExp(null); },
  });

  const deleteExpMutation = useMutation({
    mutationFn: (id: string) => hrProfileApi.deleteWorkExperience(employeeId!, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employee-work-exp', employeeId] }),
  });

  const createFamilyMutation = useMutation({
    mutationFn: (data: Omit<FamilyMember, 'id'>) => hrProfileApi.createFamilyMember(employeeId!, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employee-family', employeeId] }); setFamilyOpen(false); familyForm.resetFields(); },
  });

  const updateFamilyMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FamilyMember> }) =>
      hrProfileApi.updateFamilyMember(employeeId!, id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employee-family', employeeId] }); setFamilyOpen(false); setEditingFamily(null); },
  });

  const deleteFamilyMutation = useMutation({
    mutationFn: (id: string) => hrProfileApi.deleteFamilyMember(employeeId!, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employee-family', employeeId] }),
  });

  const registerDependentMutation = useMutation({
    mutationFn: (data: { memberId: string; isDependent: boolean; taxId?: string; registeredFrom?: string; registeredTo?: string }) =>
      hrProfileApi.registerDependent(employeeId!, data.memberId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee-family', employeeId] });
      setDependentOpen(false);
      setDependentTarget(null);
      dependentForm.resetFields();
    },
  });

  // ─── Derived ──────────────────────────────────────────────────────────────

  const personal = profile?.personal;
  const statusCfg = STATUS_CONFIG[personal?.employeeStatus ?? ''] ?? { label: personal?.employeeStatus ?? '—', color: 'default' };

  // ─── Loading / Error ──────────────────────────────────────────────────────

  if (isLoading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
      <Spin size="large" />
    </div>
  );

  if (isError || !profile) return (
    <div style={{ padding: 24 }}>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>Quay lại</Button>
      <Text style={{ color: textMuted }}>Không tìm thấy hồ sơ nhân viên.</Text>
    </div>
  );

  // ─── Table columns ────────────────────────────────────────────────────────

  const salaryColumns: ColumnsType<NonNullable<typeof profile>['salaryHistory'][0]> = [
    { title: 'Mức lương cơ bản', dataIndex: 'basicSalary', render: (v: number) => <Text style={{ color: textPrimary, fontWeight: 600 }}>{formatCurrency(v)}</Text> },
    { title: 'Ngày hiệu lực', dataIndex: 'effectiveDate', render: (v: string) => <Text style={{ color: textMuted }}>{dayjs(v).format('DD/MM/YYYY')}</Text> },
    { title: 'Nguồn', dataIndex: 'source', render: (v?: string) => <Text style={{ color: textMuted }}>{v ?? '—'}</Text> },
  ];

  const contractColumns: ColumnsType<NonNullable<typeof profile>['contracts'][0]> = [
    { title: 'Loại hợp đồng', dataIndex: 'type', render: (v: string) => <Text style={{ color: textPrimary }}>{CONTRACT_TYPE_LABEL[v] ?? v}</Text> },
    { title: 'Trạng thái', dataIndex: 'status', render: (v: string) => <Tag>{v}</Tag> },
    { title: 'Ngày ký', dataIndex: 'startDate', render: (v: string) => <Text style={{ color: textMuted }}>{dayjs(v).format('DD/MM/YYYY')}</Text> },
    { title: 'Lương hợp đồng', dataIndex: 'salaryMonthly', render: (v: number) => <Text style={{ color: textPrimary }}>{formatCurrency(v)}</Text> },
  ];

  const trainingColumns: ColumnsType<NonNullable<typeof profile>['training'][0]> = [
    { title: 'Chương trình', dataIndex: ['program', 'title'], render: (v?: string) => <Text style={{ color: textPrimary }}>{v ?? '—'}</Text> },
    { title: 'Trạng thái', dataIndex: 'status', render: (v: string) => <Tag>{v}</Tag> },
    { title: 'Ngày bắt đầu', dataIndex: 'startDate', render: (v: string) => <Text style={{ color: textMuted }}>{dayjs(v).format('DD/MM/YYYY')}</Text> },
  ];

  const performanceColumns: ColumnsType<NonNullable<typeof profile>['performance'][0]> = [
    { title: 'Kỳ đánh giá', dataIndex: 'period', render: (v: string) => <Text style={{ color: textPrimary }}>{v}</Text> },
    { title: 'Điểm', dataIndex: 'score', render: (v?: number) => <Text style={{ color: textPrimary, fontWeight: 700 }}>{v ?? '—'}</Text> },
    { title: 'Trạng thái', dataIndex: 'status', render: (v: string) => <Tag>{v}</Tag> },
  ];

  const decisionColumns: ColumnsType<NonNullable<typeof profile>['decisions'][0]> = [
    { title: 'Số quyết định', dataIndex: 'decisionNumber', render: (v?: string) => <Text style={{ color: textPrimary }}>{v ?? '—'}</Text> },
    { title: 'Loại', dataIndex: 'type', render: (v: string) => <Text style={{ color: textPrimary }}>{v}</Text> },
    { title: 'Trạng thái', dataIndex: 'status', render: (v: string) => <Tag>{v}</Tag> },
    { title: 'Ngày hiệu lực', dataIndex: 'effectiveDate', render: (v: string) => <Text style={{ color: textMuted }}>{dayjs(v).format('DD/MM/YYYY')}</Text> },
  ];

  const educationColumns: ColumnsType<EducationRecord> = [
    {
      title: 'Trình độ',
      dataIndex: 'degreeLevel',
      render: (v: string, r) => (
        <Space>
          <Text style={{ color: textPrimary }}>{DEGREE_LEVEL_LABEL[v] ?? v}</Text>
          {r.isMainDegree && <Tag color={isDark ? undefined : 'blue'} style={isDark ? { background: 'rgba(96,165,250,0.15)', color: '#93C5FD', borderColor: 'rgba(96,165,250,0.3)' } : {}}>Bằng chính</Tag>}
        </Space>
      ),
    },
    { title: 'Trường', dataIndex: 'schoolName', render: (v: string) => <Text style={{ color: textPrimary }}>{v}</Text> },
    { title: 'Chuyên ngành', dataIndex: 'major', render: (v?: string) => <Text style={{ color: textMuted }}>{v ?? '—'}</Text> },
    {
      title: 'Năm TN',
      dataIndex: 'graduationYear',
      render: (v?: number) => <Text style={{ color: textMuted }}>{v ?? '—'}</Text>,
      width: 90,
    },
    { title: 'Kết quả', dataIndex: 'result', render: (v?: string) => <Text style={{ color: textMuted }}>{v ?? '—'}</Text> },
    {
      title: '',
      key: 'actions',
      width: 80,
      render: (_: unknown, record: EducationRecord) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} type="text" onClick={() => {
            setEditingEdu(record);
            eduForm.setFieldsValue(record);
            setEduOpen(true);
          }} />
          <Popconfirm title="Xóa bản ghi học vấn này?" onConfirm={() => deleteEduMutation.mutate(record.id)} okText="Xóa" cancelText="Hủy">
            <Button size="small" icon={<DeleteOutlined />} type="text" danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const workExpColumns: ColumnsType<WorkExperience> = [
    { title: 'Công ty', dataIndex: 'companyName', render: (v: string) => <Text style={{ color: textPrimary }}>{v}</Text> },
    { title: 'Chức danh', dataIndex: 'position', render: (v?: string) => <Text style={{ color: textMuted }}>{v ?? '—'}</Text> },
    {
      title: 'Thời gian',
      key: 'period',
      render: (_: unknown, r: WorkExperience) => (
        <Text style={{ color: textMuted }}>
          {r.startDate ? dayjs(r.startDate).format('MM/YYYY') : '?'} — {r.endDate ? dayjs(r.endDate).format('MM/YYYY') : 'Nay'}
        </Text>
      ),
    },
    { title: 'Mô tả', dataIndex: 'description', render: (v?: string) => <Text style={{ color: textMuted }}>{v ?? '—'}</Text> },
    {
      title: '',
      key: 'actions',
      width: 80,
      render: (_: unknown, record: WorkExperience) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} type="text" onClick={() => {
            setEditingExp(record);
            expForm.setFieldsValue({
              ...record,
              startDate: record.startDate ? dayjs(record.startDate) : undefined,
              endDate: record.endDate ? dayjs(record.endDate) : undefined,
            });
            setExpOpen(true);
          }} />
          <Popconfirm title="Xóa kinh nghiệm này?" onConfirm={() => deleteExpMutation.mutate(record.id)} okText="Xóa" cancelText="Hủy">
            <Button size="small" icon={<DeleteOutlined />} type="text" danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const familyColumns: ColumnsType<FamilyMember> = [
    { title: 'Quan hệ', dataIndex: 'relationship', render: (v: string) => <Text style={{ color: textPrimary }}>{RELATIONSHIP_LABEL[v] ?? v}</Text> },
    { title: 'Họ tên', dataIndex: 'fullName', render: (v: string) => <Text style={{ color: textPrimary }}>{v}</Text> },
    { title: 'Ngày sinh', dataIndex: 'birthdate', render: (v?: string) => <Text style={{ color: textMuted }}>{v ? dayjs(v).format('DD/MM/YYYY') : '—'}</Text> },
    { title: 'Nghề nghiệp', dataIndex: 'occupation', render: (v?: string) => <Text style={{ color: textMuted }}>{v ?? '—'}</Text> },
    { title: 'Điện thoại', dataIndex: 'phoneNumber', render: (v?: string) => v ? <a href={`tel:${v}`} style={{ color: linkColor }}>{v}</a> : <Text style={{ color: textMuted }}>—</Text> },
    {
      title: 'Người phụ thuộc',
      key: 'dependent',
      width: 140,
      render: (_: unknown, record: FamilyMember) => {
        const dep = record.dependent;
        if (dep) {
          return (
            <Tooltip title={`Từ ${dayjs(dep.registeredFrom).format('DD/MM/YYYY')}${dep.registeredTo ? ` → ${dayjs(dep.registeredTo).format('DD/MM/YYYY')}` : ''}`}>
              <span
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  setDependentTarget(record);
                  dependentForm.setFieldsValue({
                    taxId: dep.taxId,
                    registeredFrom: dep.registeredFrom ? dayjs(dep.registeredFrom) : undefined,
                    registeredTo: dep.registeredTo ? dayjs(dep.registeredTo) : undefined,
                  });
                  setDependentOpen(true);
                }}
              >
                <StatusBadge label="✓ Đã đăng ký" tone="success" style={{ cursor: 'pointer' }} />
              </span>
            </Tooltip>
          );
        }
        return (
          <Button
            size="small"
            type="dashed"
            onClick={() => {
              setDependentTarget(record);
              dependentForm.setFieldsValue({
                taxId: record.idNumber,
                registeredFrom: dayjs(),
                registeredTo: undefined,
              });
              setDependentOpen(true);
            }}
          >
            + Đăng ký
          </Button>
        );
      },
    },
    {
      title: '',
      key: 'actions',
      width: 70,
      render: (_: unknown, record: FamilyMember) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} type="text" onClick={() => {
            setEditingFamily(record);
            familyForm.setFieldsValue({ ...record, birthdate: record.birthdate ? dayjs(record.birthdate) : undefined });
            setFamilyOpen(true);
          }} />
          <Popconfirm title="Xóa thành viên này?" onConfirm={() => deleteFamilyMutation.mutate(record.id)} okText="Xóa" cancelText="Hủy">
            <Button size="small" icon={<DeleteOutlined />} type="text" danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleOpenEdit = () => {
    if (!personal) return;
    editForm.setFieldsValue({
      ...personal,
      birthdate: personal.birthdate ? dayjs(personal.birthdate) : undefined,
      idIssueDate: personal.idIssueDate ? dayjs(personal.idIssueDate) : undefined,
    });
    setEditOpen(true);
  };

  const handleEditSubmit = () => {
    editForm.validateFields().then((vals) => {
      updateMutation.mutate({
        ...vals,
        birthdate: (vals.birthdate as Dayjs | undefined)?.format('YYYY-MM-DD'),
        idIssueDate: (vals.idIssueDate as Dayjs | undefined)?.format('YYYY-MM-DD'),
      });
    });
  };

  const handleEduSubmit = () => {
    eduForm.validateFields().then((vals) => {
      if (editingEdu) {
        updateEduMutation.mutate({ id: editingEdu.id, data: vals });
      } else {
        createEduMutation.mutate(vals);
      }
    });
  };

  const handleExpSubmit = () => {
    expForm.validateFields().then((vals) => {
      const data = {
        ...vals,
        startDate: (vals.startDate as Dayjs | undefined)?.format('YYYY-MM-DD'),
        endDate: (vals.endDate as Dayjs | undefined)?.format('YYYY-MM-DD'),
      };
      if (editingExp) {
        updateExpMutation.mutate({ id: editingExp.id, data });
      } else {
        createExpMutation.mutate(data);
      }
    });
  };

  const handleFamilySubmit = () => {
    familyForm.validateFields().then((vals) => {
      const { birthdate, ...rest } = vals;
      const data = { ...rest, birthdate: (birthdate as Dayjs | undefined)?.format('YYYY-MM-DD') };
      if (editingFamily) {
        updateFamilyMutation.mutate({ id: editingFamily.id, data });
      } else {
        createFamilyMutation.mutate(data);
      }
    });
  };

  const handleDependentSubmit = () => {
    dependentForm.validateFields().then((vals) => {
      if (!dependentTarget) return;
      registerDependentMutation.mutate({
        memberId: dependentTarget.id,
        isDependent: true,
        taxId: vals.taxId,
        registeredFrom: (vals.registeredFrom as ReturnType<typeof dayjs>)?.format('YYYY-MM-DD'),
        registeredTo: (vals.registeredTo as ReturnType<typeof dayjs> | undefined)?.format('YYYY-MM-DD'),
      });
    });
  };

  const cardStyle = { background: bgCard, border: `1px solid ${borderColor}`, borderRadius: 10, padding: 20 };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: 24 }}>
      {/* Back */}
      <Button icon={<ArrowLeftOutlined />} type="text" onClick={() => navigate(-1)} style={{ marginBottom: 16, color: textMuted }}>
        Quay lại
      </Button>

      {/* Header */}
      <ProfileHeader
        personal={personal}
        statusCfg={statusCfg}
        cardStyle={cardStyle}
        palette={palette}
        onEdit={handleOpenEdit}
        onCreateDecision={() => navigate(`/hr/decisions?employeeId=${employeeId}`)}
      />

      {/* Tabs */}
      <Tabs defaultActiveKey="overview" items={[
        {
          key: 'overview',
          label: <span><UserOutlined /> Tổng quan</span>,
          children: <OverviewTab personal={personal} cardStyle={cardStyle} palette={palette} />,
        },

        // ── Học vấn ────────────────────────────────────────────────────────
        {
          key: 'education',
          label: <span><BookOutlined /> Học vấn</span>,
          children: (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text strong style={{ color: textPrimary, fontSize: 14 }}>Quá trình học tập & Bằng cấp</Text>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingEdu(null); eduForm.resetFields(); setEduOpen(true); }}>
                  Thêm bằng cấp
                </Button>
              </div>
              {education.length === 0
                ? <EmptyState title="Chưa có thông tin học vấn" />
                : <Table rowKey="id" columns={educationColumns} dataSource={education} pagination={false} size="middle" />}
            </div>
          ),
        },

        // ── Kinh nghiệm trước ──────────────────────────────────────────────
        {
          key: 'experience',
          label: <span><BankOutlined /> Kinh nghiệm</span>,
          children: (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text strong style={{ color: textPrimary, fontSize: 14 }}>Kinh nghiệm làm việc trước đây</Text>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingExp(null); expForm.resetFields(); setExpOpen(true); }}>
                  Thêm kinh nghiệm
                </Button>
              </div>
              {workExp.length === 0
                ? <EmptyState title="Chưa có kinh nghiệm trước đây" />
                : <Table rowKey="id" columns={workExpColumns} dataSource={workExp} pagination={false} size="middle" />}
            </div>
          ),
        },

        // ── Gia đình / Thân nhân ───────────────────────────────────────────
        {
          key: 'family',
          label: <span><TeamOutlined /> Gia đình</span>,
          children: (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text strong style={{ color: textPrimary, fontSize: 14 }}>Thành viên gia đình / Thân nhân</Text>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingFamily(null); familyForm.resetFields(); setFamilyOpen(true); }}>
                  Thêm thân nhân
                </Button>
              </div>
              {familyMembers.length === 0
                ? <EmptyState title="Chưa có thông tin thân nhân" />
                : <Table rowKey="id" columns={familyColumns} dataSource={familyMembers} pagination={false} size="middle" />}
            </div>
          ),
        },

        // ── Công tác ───────────────────────────────────────────────────────
        {
          key: 'workHistory',
          label: <span><ClockCircleOutlined /> Công tác</span>,
          children: <WorkHistoryTab workHistory={profile.workHistory} palette={palette} />,
        },

        { key: 'salary', label: <span><FileTextOutlined /> Lương</span>, children: <Table rowKey="id" columns={salaryColumns} dataSource={profile.salaryHistory} pagination={false} size="middle" /> },

        {
          key: 'insurance',
          label: <span><SafetyOutlined /> BHXH</span>,
          children: <InsuranceTab insurance={profile.insurance} cardStyle={cardStyle} palette={palette} />,
        },

        { key: 'contracts', label: <span><FileProtectOutlined /> Hợp đồng</span>, children: <Table rowKey="id" columns={contractColumns} dataSource={profile.contracts} pagination={false} size="middle" /> },
        { key: 'decisions', label: 'Quyết định', children: <Table rowKey="id" columns={decisionColumns} dataSource={profile.decisions} pagination={false} size="middle" /> },
        { key: 'training', label: 'Đào tạo', children: <Table rowKey="id" columns={trainingColumns} dataSource={profile.training} pagination={false} size="middle" /> },
        { key: 'performance', label: 'Đánh giá', children: <Table rowKey="id" columns={performanceColumns} dataSource={profile.performance} pagination={false} size="middle" /> },
      ]} />

      {/* ── Modal sửa thông tin cá nhân ────────────────────────────────────── */}
      <EditPersonalModal
        open={editOpen}
        form={editForm}
        loading={updateMutation.isPending}
        onClose={() => { setEditOpen(false); editForm.resetFields(); }}
        onSubmit={handleEditSubmit}
      />

      {/* ── Modal thêm/sửa học vấn ─────────────────────────────────────────── */}
      <EducationModal
        open={eduOpen}
        form={eduForm}
        editing={editingEdu}
        loading={createEduMutation.isPending || updateEduMutation.isPending}
        onClose={() => { setEduOpen(false); setEditingEdu(null); eduForm.resetFields(); }}
        onSubmit={handleEduSubmit}
      />

      {/* ── Modal thêm/sửa kinh nghiệm ────────────────────────────────────── */}
      <WorkExperienceModal
        open={expOpen}
        form={expForm}
        editing={editingExp}
        loading={createExpMutation.isPending || updateExpMutation.isPending}
        onClose={() => { setExpOpen(false); setEditingExp(null); expForm.resetFields(); }}
        onSubmit={handleExpSubmit}
      />

      {/* ── Modal đăng ký Người phụ thuộc ────────────────────────────────── */}
      <DependentModal
        open={dependentOpen}
        form={dependentForm}
        target={dependentTarget}
        loading={registerDependentMutation.isPending}
        palette={palette}
        onClose={() => { setDependentOpen(false); setDependentTarget(null); dependentForm.resetFields(); }}
        onSubmit={handleDependentSubmit}
        onUnregister={() => dependentTarget && registerDependentMutation.mutate({ memberId: dependentTarget.id, isDependent: false })}
      />

      {/* ── Modal thêm/sửa gia đình ───────────────────────────────────────── */}
      <FamilyModal
        open={familyOpen}
        form={familyForm}
        editing={editingFamily}
        loading={createFamilyMutation.isPending || updateFamilyMutation.isPending}
        onClose={() => { setFamilyOpen(false); setEditingFamily(null); familyForm.resetFields(); }}
        onSubmit={handleFamilySubmit}
      />
    </div>
  );
}
