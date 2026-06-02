import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Avatar,
  Tabs,
  Descriptions,
  Timeline,
  Table,
  Tag,
  Button,
  Form,
  Input,
  Select,
  DatePicker,
  Space,
  Typography,
  Spin,
  Row,
  Col,
  Badge,
  InputNumber,
  Switch,
  Popconfirm,
  Empty,
  Tooltip,
} from 'antd';
import {
  FileProtectOutlined,
  FileTextOutlined,
  SafetyOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  StopOutlined,
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
import { CenteredModal } from '../../components/ui/CenteredModal';
import { ProvinceWardSelect, CategorySelect } from '../../components/selects';
import { hrProfileApi, type EducationRecord, type WorkExperience, type FamilyMember } from '../../api/hr-profile';
import { formatCurrency } from '../../utils/format';

const { Text, Title } = Typography;

// ─── Constants ───────────────────────────────────────────────────────────────

const EVENT_ICON: Record<string, React.ReactNode> = {
  HR_DECISION: <FileProtectOutlined style={{ color: '#6366F1' }} />,
  CONTRACT_SIGNED: <FileTextOutlined style={{ color: '#10B981' }} />,
  INSURANCE_ENROLLED: <SafetyOutlined style={{ color: '#3B82F6' }} />,
  PROBATION_STARTED: <ClockCircleOutlined style={{ color: '#F59E0B' }} />,
  PROBATION_ENDED: <CheckCircleOutlined style={{ color: '#10B981' }} />,
  TERMINATION: <StopOutlined style={{ color: '#EF4444' }} />,
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Đang làm việc', color: 'green' },
  PROBATION: { label: 'Thử việc', color: 'blue' },
  TERMINATED: { label: 'Đã nghỉ', color: 'default' },
  ON_LEAVE: { label: 'Nghỉ phép', color: 'orange' },
};

const CONTRACT_TYPE_LABEL: Record<string, string> = {
  INDEFINITE: 'Không xác định thời hạn',
  FIXED_TERM_12: '12 tháng',
  FIXED_TERM_24: '24 tháng',
  SEASONAL: 'Thời vụ',
  PROBATION: 'Thử việc',
};

const DEGREE_LEVEL_LABEL: Record<string, string> = {
  PRIMARY: 'Tiểu học',
  SECONDARY: 'THPT/THCS',
  VOCATIONAL: 'Trung cấp',
  COLLEGE: 'Cao đẳng',
  BACHELOR: 'Đại học',
  MASTER: 'Thạc sĩ',
  DOCTORATE: 'Tiến sĩ',
  OTHER: 'Khác',
};

const GENDER_LABEL: Record<string, string> = {
  MALE: 'Nam',
  FEMALE: 'Nữ',
  OTHER: 'Khác',
};

const MARITAL_LABEL: Record<string, string> = {
  SINGLE: 'Độc thân',
  MARRIED: 'Đã kết hôn',
  DIVORCED: 'Đã ly hôn',
  WIDOWED: 'Góa',
};

const RELATIONSHIP_LABEL: Record<string, string> = {
  SPOUSE: 'Vợ/Chồng',
  PARENT: 'Cha/Mẹ',
  CHILD: 'Con',
  SIBLING: 'Anh/Chị/Em',
  GRANDPARENT: 'Ông/Bà',
  OTHER: 'Khác',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).slice(-2).map((w) => w[0].toUpperCase()).join('');
}

function avatarColor(name: string): string {
  const colors = ['#6366F1', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6', '#EF4444', '#F97316'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function EmployeeProfile360Page() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { textPrimary, textMuted, bgCard, borderColor, isDark, linkColor } = useThemePalette();

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
              <Tag
                color={isDark ? undefined : 'green'}
                style={isDark ? { background: 'rgba(52,211,153,0.15)', color: '#6EE7B7', borderColor: 'rgba(52,211,153,0.3)', cursor: 'pointer' } : { cursor: 'pointer' }}
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
                ✓ Đã đăng ký
              </Tag>
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

  const cardStyle = { background: bgCard, border: `1px solid ${borderColor}`, borderRadius: 10, padding: 20 };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: 24 }}>
      {/* Back */}
      <Button icon={<ArrowLeftOutlined />} type="text" onClick={() => navigate(-1)} style={{ marginBottom: 16, color: textMuted }}>
        Quay lại
      </Button>

      {/* Header */}
      <div style={{ ...cardStyle, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <Avatar size={72} style={{ background: avatarColor(personal?.fullName ?? 'NV'), fontSize: 24, fontWeight: 700, flexShrink: 0 }}>
          {getInitials(personal?.fullName ?? 'NV')}
        </Avatar>
        <div style={{ flex: 1, minWidth: 200 }}>
          <Title level={4} style={{ margin: 0, color: textPrimary }}>{personal?.fullName}</Title>
          <Text style={{ color: textMuted, display: 'block', marginTop: 2 }}>
            {personal?.position?.jobTitle?.name ?? personal?.position?.code ?? '—'} &nbsp;·&nbsp; {personal?.orgUnit?.name ?? '—'}
          </Text>
          <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <Tag
              color={isDark ? undefined : statusCfg.color}
              style={isDark && personal?.employeeStatus === 'ACTIVE' ? { background: 'rgba(52,211,153,0.15)', color: '#6EE7B7', borderColor: 'rgba(52,211,153,0.3)' }
                : isDark && personal?.employeeStatus === 'PROBATION' ? { background: 'rgba(96,165,250,0.15)', color: '#93C5FD', borderColor: 'rgba(96,165,250,0.3)' } : {}}
            >
              {statusCfg.label}
            </Tag>
            <Text style={{ color: textMuted, fontSize: 12 }}>Mã NV: <Text style={{ color: textPrimary, fontWeight: 600 }}>{personal?.code}</Text></Text>
            {personal?.startDate && <Text style={{ color: textMuted, fontSize: 12 }}>Ngày vào: {dayjs(personal.startDate).format('DD/MM/YYYY')}</Text>}
            {personal?.tenure?.formatted && <Text style={{ color: textMuted, fontSize: 12 }}>Thâm niên: <Text style={{ color: textPrimary, fontWeight: 600 }}>{personal.tenure.formatted}</Text></Text>}
            {personal?.phoneNumber && <Text style={{ color: textMuted, fontSize: 12 }}>SĐT: <a href={`tel:${personal.phoneNumber}`} style={{ color: linkColor }}>{personal.phoneNumber}</a></Text>}
          </div>
        </div>
        <Space>
          <Button icon={<EditOutlined />} onClick={handleOpenEdit}>Chỉnh sửa</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate(`/hr/decisions?employeeId=${employeeId}`)}>Tạo quyết định</Button>
        </Space>
      </div>

      {/* Tabs */}
      <Tabs defaultActiveKey="overview" items={[
        {
          key: 'overview',
          label: <span><UserOutlined /> Tổng quan</span>,
          children: (
            <Row gutter={[16, 16]}>
              {/* Thông tin cá nhân */}
              <Col xs={24} md={12}>
                <div style={cardStyle}>
                  <Text strong style={{ color: textPrimary, display: 'block', marginBottom: 14, fontSize: 14 }}>Thông tin cá nhân</Text>
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label={<Text style={{ color: textMuted }}>Ngày sinh</Text>}>
                      <Text style={{ color: textPrimary }}>{personal?.birthdate ? dayjs(personal.birthdate).format('DD/MM/YYYY') : '—'}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label={<Text style={{ color: textMuted }}>Thâm niên công tác</Text>}>
                      <Text style={{ color: textPrimary, fontWeight: 600 }}>
                        {personal?.tenure?.formatted ?? '—'}
                        {personal?.startDate ? <Text style={{ color: textMuted, fontWeight: 400 }}> (từ {dayjs(personal.startDate).format('DD/MM/YYYY')})</Text> : null}
                      </Text>
                    </Descriptions.Item>
                    <Descriptions.Item label={<Text style={{ color: textMuted }}>Giới tính</Text>}>
                      <Text style={{ color: textPrimary }}>{personal?.gender ? GENDER_LABEL[personal.gender] ?? personal.gender : '—'}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label={<Text style={{ color: textMuted }}>Tình trạng hôn nhân</Text>}>
                      <Text style={{ color: textPrimary }}>{personal?.maritalStatus ? MARITAL_LABEL[personal.maritalStatus] ?? personal.maritalStatus : '—'}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label={<Text style={{ color: textMuted }}>Quê quán</Text>}>
                      <Text style={{ color: textPrimary }}>{personal?.hometown ?? '—'}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label={<Text style={{ color: textMuted }}>Nơi sinh</Text>}>
                      <Text style={{ color: textPrimary }}>{personal?.placeOfBirth ?? '—'}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label={<Text style={{ color: textMuted }}>Dân tộc</Text>}>
                      <Text style={{ color: textPrimary }}>{personal?.ethnicity ?? '—'}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label={<Text style={{ color: textMuted }}>Tôn giáo</Text>}>
                      <Text style={{ color: textPrimary }}>{personal?.religion ?? '—'}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label={<Text style={{ color: textMuted }}>Quốc tịch</Text>}>
                      <Text style={{ color: textPrimary }}>{personal?.nationality ?? '—'}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label={<Text style={{ color: textMuted }}>Email</Text>}>
                      {personal?.email
                        ? <a href={`mailto:${personal.email}`} style={{ color: linkColor }}>{personal.email}</a>
                        : <Text style={{ color: textMuted }}>—</Text>}
                    </Descriptions.Item>
                    <Descriptions.Item label={<Text style={{ color: textMuted }}>Điện thoại</Text>}>
                      {personal?.phoneNumber
                        ? <a href={`tel:${personal.phoneNumber}`} style={{ color: linkColor }}>{personal.phoneNumber}</a>
                        : <Text style={{ color: textMuted }}>—</Text>}
                    </Descriptions.Item>
                  </Descriptions>
                </div>
              </Col>

              {/* Giấy tờ tùy thân */}
              <Col xs={24} md={12}>
                <div style={cardStyle}>
                  <Text strong style={{ color: textPrimary, display: 'block', marginBottom: 14, fontSize: 14 }}>Giấy tờ tùy thân</Text>
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label={<Text style={{ color: textMuted }}>Loại giấy tờ</Text>}>
                      <Text style={{ color: textPrimary }}>{personal?.idType ?? '—'}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label={<Text style={{ color: textMuted }}>Số CMND/CCCD</Text>}>
                      <Text style={{ color: textPrimary }}>{personal?.idNumber ?? '—'}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label={<Text style={{ color: textMuted }}>Ngày cấp</Text>}>
                      <Text style={{ color: textMuted }}>{personal?.idIssueDate ? dayjs(personal.idIssueDate).format('DD/MM/YYYY') : '—'}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label={<Text style={{ color: textMuted }}>Nơi cấp</Text>}>
                      <Text style={{ color: textPrimary }}>{personal?.idIssuePlace ?? '—'}</Text>
                    </Descriptions.Item>
                  </Descriptions>
                </div>

                <div style={{ ...cardStyle, marginTop: 16 }}>
                  <Text strong style={{ color: textPrimary, display: 'block', marginBottom: 14, fontSize: 14 }}>Địa chỉ & Tài khoản ngân hàng</Text>
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label={<Text style={{ color: textMuted }}>Địa chỉ thường trú</Text>}>
                      <Text style={{ color: textPrimary }}>{personal?.permanentAddress ?? '—'}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label={<Text style={{ color: textMuted }}>Địa chỉ hiện tại</Text>}>
                      <Text style={{ color: textPrimary }}>{personal?.currentAddress ?? '—'}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label={<Text style={{ color: textMuted }}>Ngân hàng</Text>}>
                      <Text style={{ color: textPrimary }}>{personal?.bankName ?? '—'}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label={<Text style={{ color: textMuted }}>Số tài khoản</Text>}>
                      <Text style={{ color: textPrimary }}>{personal?.bankAccount ?? '—'}</Text>
                    </Descriptions.Item>
                  </Descriptions>
                </div>
              </Col>
            </Row>
          ),
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
                ? <Empty description={<Text style={{ color: textMuted }}>Chưa có thông tin học vấn</Text>} />
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
                ? <Empty description={<Text style={{ color: textMuted }}>Chưa có kinh nghiệm trước đây</Text>} />
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
                ? <Empty description={<Text style={{ color: textMuted }}>Chưa có thông tin thân nhân</Text>} />
                : <Table rowKey="id" columns={familyColumns} dataSource={familyMembers} pagination={false} size="middle" />}
            </div>
          ),
        },

        // ── Công tác ───────────────────────────────────────────────────────
        {
          key: 'workHistory',
          label: <span><ClockCircleOutlined /> Công tác</span>,
          children: profile.workHistory.length === 0
            ? <Text style={{ color: textMuted }}>Chưa có lịch sử công tác</Text>
            : <Timeline items={profile.workHistory.map((ev) => ({
                dot: EVENT_ICON[ev.eventType] ?? <ClockCircleOutlined />,
                children: (
                  <div>
                    <Text strong style={{ color: textPrimary }}>{ev.title}</Text>
                    <Text style={{ color: textMuted, marginLeft: 8, fontSize: 12 }}>{dayjs(ev.eventDate).format('DD/MM/YYYY')}</Text>
                    {ev.description && <div><Text style={{ color: textMuted, fontSize: 13 }}>{ev.description}</Text></div>}
                  </div>
                ),
              }))} />,
        },

        { key: 'salary', label: <span><FileTextOutlined /> Lương</span>, children: <Table rowKey="id" columns={salaryColumns} dataSource={profile.salaryHistory} pagination={false} size="middle" /> },

        {
          key: 'insurance',
          label: <span><SafetyOutlined /> BHXH</span>,
          children: profile.insurance ? (
            <div style={{ ...cardStyle, maxWidth: 480 }}>
              <Text strong style={{ color: textPrimary, display: 'block', marginBottom: 14, fontSize: 14 }}>Thông tin BHXH</Text>
              <Descriptions column={1} size="small">
                <Descriptions.Item label={<Text style={{ color: textMuted }}>Trạng thái</Text>}>
                  <Badge status={profile.insurance.status === 'ACTIVE' ? 'success' : 'default'} text={<Text style={{ color: textPrimary }}>{profile.insurance.status === 'ACTIVE' ? 'Đang đóng' : profile.insurance.status}</Text>} />
                </Descriptions.Item>
                <Descriptions.Item label={<Text style={{ color: textMuted }}>Mức đóng</Text>}>
                  <Text style={{ color: textPrimary, fontWeight: 600 }}>{formatCurrency(profile.insurance.insuranceSalary)}</Text>
                </Descriptions.Item>
                <Descriptions.Item label={<Text style={{ color: textMuted }}>Ngày bắt đầu</Text>}>
                  <Text style={{ color: textMuted }}>{dayjs(profile.insurance.startDate).format('DD/MM/YYYY')}</Text>
                </Descriptions.Item>
                <Descriptions.Item label={<Text style={{ color: textMuted }}>Số sổ BHXH</Text>}>
                  <Text style={{ color: textPrimary }}>{profile.insurance.bhxhBookNumber ?? '—'}</Text>
                </Descriptions.Item>
              </Descriptions>
            </div>
          ) : <Text style={{ color: textMuted }}>Chưa có thông tin BHXH</Text>,
        },

        { key: 'contracts', label: <span><FileProtectOutlined /> Hợp đồng</span>, children: <Table rowKey="id" columns={contractColumns} dataSource={profile.contracts} pagination={false} size="middle" /> },
        { key: 'decisions', label: 'Quyết định', children: <Table rowKey="id" columns={decisionColumns} dataSource={profile.decisions} pagination={false} size="middle" /> },
        { key: 'training', label: 'Đào tạo', children: <Table rowKey="id" columns={trainingColumns} dataSource={profile.training} pagination={false} size="middle" /> },
        { key: 'performance', label: 'Đánh giá', children: <Table rowKey="id" columns={performanceColumns} dataSource={profile.performance} pagination={false} size="middle" /> },
      ]} />

      {/* ── Modal sửa thông tin cá nhân ────────────────────────────────────── */}
      <CenteredModal open={editOpen} onClose={() => { setEditOpen(false); editForm.resetFields(); }}
        title="Chỉnh sửa thông tin cá nhân" width={700}
        footer={
          <Space>
            <Button onClick={() => { setEditOpen(false); editForm.resetFields(); }}>Hủy</Button>
            <Button type="primary" onClick={handleEditSubmit} loading={updateMutation.isPending}>Lưu thay đổi</Button>
          </Space>
        }
      >
        <Form form={editForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}><Form.Item name="fullName" label="Họ và tên"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="email" label="Email"><Input type="email" /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}><Form.Item name="birthdate" label="Ngày sinh"><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item></Col>
            <Col span={8}>
              <Form.Item name="gender" label="Giới tính">
                <Select allowClear placeholder="Chọn giới tính">
                  <Select.Option value="MALE">Nam</Select.Option>
                  <Select.Option value="FEMALE">Nữ</Select.Option>
                  <Select.Option value="OTHER">Khác</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="maritalStatus" label="Tình trạng hôn nhân">
                <Select allowClear placeholder="Chọn tình trạng">
                  <Select.Option value="SINGLE">Độc thân</Select.Option>
                  <Select.Option value="MARRIED">Đã kết hôn</Select.Option>
                  <Select.Option value="DIVORCED">Đã ly hôn</Select.Option>
                  <Select.Option value="WIDOWED">Góa</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="phoneNumber" label="Số điện thoại"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="nationality" label="Quốc tịch"><Input placeholder="VD: Việt Nam" /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="hometown" label="Quê quán"><ProvinceWardSelect /></Form.Item></Col>
            <Col span={12}><Form.Item name="placeOfBirth" label="Nơi sinh"><Input placeholder="VD: Hà Nội" /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="ethnicity" label="Dân tộc"><CategorySelect type="ethnicity" placeholder="Chọn dân tộc" /></Form.Item></Col>
            <Col span={12}><Form.Item name="religion" label="Tôn giáo"><CategorySelect type="religion" placeholder="Chọn tôn giáo" /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="idType" label="Loại giấy tờ">
                <Select allowClear>
                  <Select.Option value="CCCD">CCCD</Select.Option>
                  <Select.Option value="CMND">CMND</Select.Option>
                  <Select.Option value="PASSPORT">Hộ chiếu</Select.Option>
                  <Select.Option value="OTHER">Khác</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}><Form.Item name="idNumber" label="Số giấy tờ"><Input /></Form.Item></Col>
            <Col span={8}><Form.Item name="idIssueDate" label="Ngày cấp"><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={24}><Form.Item name="idIssuePlace" label="Nơi cấp"><Input /></Form.Item></Col>
          </Row>
          <Form.Item name="permanentAddress" label="Địa chỉ thường trú (Tỉnh/Phường)"><ProvinceWardSelect /></Form.Item>
          <Form.Item name="currentAddress" label="Địa chỉ tạm trú (Tỉnh/Phường)"><ProvinceWardSelect /></Form.Item>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="bankName" label="Ngân hàng"><Input placeholder="VD: Vietcombank" /></Form.Item></Col>
            <Col span={12}><Form.Item name="bankAccount" label="Số tài khoản"><Input /></Form.Item></Col>
          </Row>
        </Form>
      </CenteredModal>

      {/* ── Modal thêm/sửa học vấn ─────────────────────────────────────────── */}
      <CenteredModal open={eduOpen} onClose={() => { setEduOpen(false); setEditingEdu(null); eduForm.resetFields(); }}
        title={editingEdu ? 'Sửa bằng cấp / học vấn' : 'Thêm bằng cấp / học vấn'} width={560}
        footer={
          <Space>
            <Button onClick={() => { setEduOpen(false); setEditingEdu(null); eduForm.resetFields(); }}>Hủy</Button>
            <Button type="primary" onClick={handleEduSubmit} loading={createEduMutation.isPending || updateEduMutation.isPending}>
              {editingEdu ? 'Lưu thay đổi' : 'Thêm mới'}
            </Button>
          </Space>
        }
      >
        <Form form={eduForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="degreeLevel" label="Trình độ học vấn" rules={[{ required: true }]}>
                <Select placeholder="Chọn trình độ">
                  {Object.entries(DEGREE_LEVEL_LABEL).map(([k, v]) => <Select.Option key={k} value={k}>{v}</Select.Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="isMainDegree" label="Bằng chính" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="schoolName" label="Tên trường" rules={[{ required: true }]}><Input placeholder="VD: Đại học Bách Khoa Hà Nội" /></Form.Item>
          <Form.Item name="major" label="Chuyên ngành"><Input placeholder="VD: Công nghệ thông tin" /></Form.Item>
          <Row gutter={16}>
            <Col span={8}><Form.Item name="startYear" label="Năm bắt đầu"><InputNumber style={{ width: '100%' }} min={1950} max={2100} /></Form.Item></Col>
            <Col span={8}><Form.Item name="endYear" label="Năm kết thúc"><InputNumber style={{ width: '100%' }} min={1950} max={2100} /></Form.Item></Col>
            <Col span={8}><Form.Item name="graduationYear" label="Năm tốt nghiệp"><InputNumber style={{ width: '100%' }} min={1950} max={2100} /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="result" label="Kết quả / Xếp loại"><Input placeholder="VD: Giỏi, 3.5/4.0" /></Form.Item></Col>
            <Col span={12}><Form.Item name="certificateNumber" label="Số bằng / chứng chỉ"><Input /></Form.Item></Col>
          </Row>
          <Form.Item name="description" label="Ghi chú"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </CenteredModal>

      {/* ── Modal thêm/sửa kinh nghiệm ────────────────────────────────────── */}
      <CenteredModal open={expOpen} onClose={() => { setExpOpen(false); setEditingExp(null); expForm.resetFields(); }}
        title={editingExp ? 'Sửa kinh nghiệm làm việc' : 'Thêm kinh nghiệm làm việc'} width={520}
        footer={
          <Space>
            <Button onClick={() => { setExpOpen(false); setEditingExp(null); expForm.resetFields(); }}>Hủy</Button>
            <Button type="primary" onClick={handleExpSubmit} loading={createExpMutation.isPending || updateExpMutation.isPending}>
              {editingExp ? 'Lưu thay đổi' : 'Thêm mới'}
            </Button>
          </Space>
        }
      >
        <Form form={expForm} layout="vertical">
          <Form.Item name="companyName" label="Tên công ty" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="position" label="Chức danh / Vị trí"><Input /></Form.Item>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="startDate" label="Từ tháng"><DatePicker picker="month" style={{ width: '100%' }} format="MM/YYYY" /></Form.Item></Col>
            <Col span={12}><Form.Item name="endDate" label="Đến tháng"><DatePicker picker="month" style={{ width: '100%' }} format="MM/YYYY" placeholder="Để trống nếu vẫn đang làm" /></Form.Item></Col>
          </Row>
          <Form.Item name="description" label="Mô tả công việc"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </CenteredModal>

      {/* ── Modal đăng ký Người phụ thuộc ────────────────────────────────── */}
      <CenteredModal
        open={dependentOpen}
        onClose={() => { setDependentOpen(false); setDependentTarget(null); dependentForm.resetFields(); }}
        title={dependentTarget?.dependent ? 'Cập nhật đăng ký người phụ thuộc' : `Đăng ký người phụ thuộc — ${dependentTarget?.fullName ?? ''}`}
        width={480}
        footer={
          <Space>
            <Button onClick={() => { setDependentOpen(false); setDependentTarget(null); dependentForm.resetFields(); }}>Hủy</Button>
            {dependentTarget?.dependent && (
              <Button
                danger
                loading={registerDependentMutation.isPending}
                onClick={() => dependentTarget && registerDependentMutation.mutate({ memberId: dependentTarget.id, isDependent: false })}
              >
                Hủy đăng ký
              </Button>
            )}
            <Button
              type="primary"
              loading={registerDependentMutation.isPending}
              onClick={() => {
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
              }}
            >
              {dependentTarget?.dependent ? 'Lưu thay đổi' : 'Đăng ký'}
            </Button>
          </Space>
        }
      >
        <Form form={dependentForm} layout="vertical">
          <Form.Item name="taxId" label="Mã số thuế / Số CCCD người phụ thuộc">
            <Input placeholder="Nhập MST hoặc số CCCD" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="registeredFrom" label="Ngày bắt đầu tính giảm trừ" rules={[{ required: true, message: 'Chọn ngày' }]}>
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="registeredTo" label="Ngày kết thúc (để trống nếu vô thời hạn)">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>
          {dependentTarget && (
            <div style={{ padding: '10px 12px', background: isDark ? 'rgba(99,102,241,0.1)' : '#EEF2FF', borderRadius: 8, fontSize: 13 }}>
              <Text style={{ color: textMuted }}>Thông tin từ hồ sơ: </Text>
              <Text style={{ color: textPrimary }}>{dependentTarget.fullName}</Text>
              <Text style={{ color: textMuted }}> · {RELATIONSHIP_LABEL[dependentTarget.relationship] ?? dependentTarget.relationship}</Text>
              {dependentTarget.birthdate && <Text style={{ color: textMuted }}> · {dayjs(dependentTarget.birthdate).format('DD/MM/YYYY')}</Text>}
            </div>
          )}
        </Form>
      </CenteredModal>

      {/* ── Modal thêm/sửa gia đình ───────────────────────────────────────── */}
      <CenteredModal open={familyOpen} onClose={() => { setFamilyOpen(false); setEditingFamily(null); familyForm.resetFields(); }}
        title={editingFamily ? 'Sửa thông tin thân nhân' : 'Thêm thân nhân'} width={520}
        footer={
          <Space>
            <Button onClick={() => { setFamilyOpen(false); setEditingFamily(null); familyForm.resetFields(); }}>Hủy</Button>
            <Button type="primary" onClick={handleFamilySubmit} loading={createFamilyMutation.isPending || updateFamilyMutation.isPending}>
              {editingFamily ? 'Lưu thay đổi' : 'Thêm mới'}
            </Button>
          </Space>
        }
      >
        <Form form={familyForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="relationship" label="Quan hệ" rules={[{ required: true }]}>
                <Select placeholder="Chọn quan hệ">
                  {Object.entries(RELATIONSHIP_LABEL).map(([k, v]) => <Select.Option key={k} value={k}>{v}</Select.Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}><Form.Item name="fullName" label="Họ và tên" rules={[{ required: true }]}><Input /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="birthdate" label="Ngày sinh"><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item></Col>
            <Col span={12}><Form.Item name="idNumber" label="Số CCCD / MST"><Input placeholder="CCCD hoặc MST cá nhân" /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="occupation" label="Nghề nghiệp"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="phoneNumber" label="Số điện thoại"><Input /></Form.Item></Col>
          </Row>
          <Form.Item name="address" label="Địa chỉ"><Input /></Form.Item>
          <Form.Item name="note" label="Ghi chú"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </CenteredModal>
    </div>
  );
}
