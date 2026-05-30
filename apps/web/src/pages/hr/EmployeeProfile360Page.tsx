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
  DatePicker,
  Space,
  Typography,
  Spin,
  Row,
  Col,
  Badge,
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
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs, { Dayjs } from 'dayjs';
import type { ColumnsType } from 'antd/es/table';

import { useThemePalette } from '../../hooks/useThemePalette';
import { CenteredModal } from '../../components/ui/CenteredModal';
import { hrProfileApi } from '../../api/hr-profile';
import type { Profile360 } from '../../api/hr-profile';
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0].toUpperCase())
    .join('');
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
  const { textPrimary, textMuted, bgCard, borderColor, isDark } = useThemePalette();

  const [editOpen, setEditOpen] = useState(false);
  const [editForm] = Form.useForm();

  // ─── Query ────────────────────────────────────────────────────────────────

  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ['hr-profile-360', employeeId],
    queryFn: () => hrProfileApi.get360(employeeId!),
    enabled: !!employeeId,
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Profile360['personal']>) =>
      hrProfileApi.updatePersonal(employeeId!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr-profile-360', employeeId] });
      setEditOpen(false);
    },
  });

  // ─── Derived values ───────────────────────────────────────────────────────

  const personal = profile?.personal;
  const statusCfg = STATUS_CONFIG[personal?.employeeStatus ?? ''] ?? {
    label: personal?.employeeStatus ?? '—',
    color: 'default',
  };

  // ─── Loading / Error states ───────────────────────────────────────────────

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div style={{ padding: 24 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>
          Quay lại
        </Button>
        <Text style={{ color: textMuted }}>Không tìm thấy hồ sơ nhân viên.</Text>
      </div>
    );
  }

  // ─── Table columns ────────────────────────────────────────────────────────

  const salaryColumns: ColumnsType<Profile360['salaryHistory'][0]> = [
    {
      title: 'Mức lương cơ bản',
      dataIndex: 'basicSalary',
      render: (v: number) => (
        <Text style={{ color: textPrimary, fontWeight: 600 }}>{formatCurrency(v)}</Text>
      ),
    },
    {
      title: 'Ngày hiệu lực',
      dataIndex: 'effectiveDate',
      render: (v: string) => (
        <Text style={{ color: textMuted }}>{dayjs(v).format('DD/MM/YYYY')}</Text>
      ),
    },
    {
      title: 'Nguồn',
      dataIndex: 'source',
      render: (v?: string) =>
        v ? (
          <Text style={{ color: textMuted }}>{v}</Text>
        ) : (
          <Text style={{ color: textMuted }}>—</Text>
        ),
    },
  ];

  const contractColumns: ColumnsType<Profile360['contracts'][0]> = [
    {
      title: 'Loại hợp đồng',
      dataIndex: 'type',
      render: (v: string) => (
        <Text style={{ color: textPrimary }}>{CONTRACT_TYPE_LABEL[v] ?? v}</Text>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: 'Ngày ký',
      dataIndex: 'startDate',
      render: (v: string) => (
        <Text style={{ color: textMuted }}>{dayjs(v).format('DD/MM/YYYY')}</Text>
      ),
    },
    {
      title: 'Lương hợp đồng',
      dataIndex: 'salaryMonthly',
      render: (v: number) => (
        <Text style={{ color: textPrimary }}>{formatCurrency(v)}</Text>
      ),
    },
  ];

  const trainingColumns: ColumnsType<Profile360['training'][0]> = [
    {
      title: 'Chương trình đào tạo',
      dataIndex: ['program', 'title'],
      render: (v?: string) =>
        v ? (
          <Text style={{ color: textPrimary }}>{v}</Text>
        ) : (
          <Text style={{ color: textMuted }}>—</Text>
        ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: 'Ngày bắt đầu',
      dataIndex: 'startDate',
      render: (v: string) => (
        <Text style={{ color: textMuted }}>{dayjs(v).format('DD/MM/YYYY')}</Text>
      ),
    },
  ];

  const performanceColumns: ColumnsType<Profile360['performance'][0]> = [
    {
      title: 'Kỳ đánh giá',
      dataIndex: 'period',
      render: (v: string) => <Text style={{ color: textPrimary }}>{v}</Text>,
    },
    {
      title: 'Điểm',
      dataIndex: 'score',
      render: (v?: number) =>
        v != null ? (
          <Text style={{ color: textPrimary, fontWeight: 700 }}>{v}</Text>
        ) : (
          <Text style={{ color: textMuted }}>—</Text>
        ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      render: (v: string) => <Tag>{v}</Tag>,
    },
  ];

  const decisionColumns: ColumnsType<Profile360['decisions'][0]> = [
    {
      title: 'Số quyết định',
      dataIndex: 'decisionNumber',
      render: (v?: string) =>
        v ? <Text style={{ color: textPrimary }}>{v}</Text> : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      title: 'Loại',
      dataIndex: 'type',
      render: (v: string) => <Text style={{ color: textPrimary }}>{v}</Text>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: 'Ngày hiệu lực',
      dataIndex: 'effectiveDate',
      render: (v: string) => (
        <Text style={{ color: textMuted }}>{dayjs(v).format('DD/MM/YYYY')}</Text>
      ),
    },
  ];

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleOpenEdit = () => {
    if (!personal) return;
    editForm.setFieldsValue({
      ...personal,
      birthdate: personal.birthdate ? dayjs(personal.birthdate) : undefined,
    });
    setEditOpen(true);
  };

  const handleEditSubmit = () => {
    editForm.validateFields().then((vals) => {
      updateMutation.mutate({
        ...vals,
        birthdate: (vals.birthdate as Dayjs | undefined)?.format('YYYY-MM-DD'),
      });
    });
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: 24 }}>
      {/* Back button */}
      <Button
        icon={<ArrowLeftOutlined />}
        type="text"
        onClick={() => navigate(-1)}
        style={{ marginBottom: 16, color: textMuted }}
      >
        Quay lại
      </Button>

      {/* Header area */}
      <div
        style={{
          background: bgCard,
          border: `1px solid ${borderColor}`,
          borderRadius: 14,
          padding: '20px 24px',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          flexWrap: 'wrap',
        }}
      >
        <Avatar
          size={72}
          style={{
            background: avatarColor(personal?.fullName ?? 'NV'),
            fontSize: 24,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {getInitials(personal?.fullName ?? 'NV')}
        </Avatar>

        <div style={{ flex: 1, minWidth: 200 }}>
          <Title level={4} style={{ margin: 0, color: textPrimary }}>
            {personal?.fullName}
          </Title>
          <Text style={{ color: textMuted, display: 'block', marginTop: 2 }}>
            {personal?.position?.jobTitle?.name ?? personal?.position?.code ?? '—'} &nbsp;·&nbsp;{' '}
            {personal?.orgUnit?.name ?? '—'}
          </Text>
          <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <Tag color={isDark ? undefined : statusCfg.color}
              style={
                isDark
                  ? personal?.employeeStatus === 'ACTIVE'
                    ? { background: 'rgba(52,211,153,0.15)', color: '#6EE7B7', borderColor: 'rgba(52,211,153,0.3)' }
                    : personal?.employeeStatus === 'PROBATION'
                    ? { background: 'rgba(96,165,250,0.15)', color: '#93C5FD', borderColor: 'rgba(96,165,250,0.3)' }
                    : {}
                  : {}
              }
            >
              {statusCfg.label}
            </Tag>
            <Text style={{ color: textMuted, fontSize: 12 }}>
              Mã NV: <Text style={{ color: textPrimary, fontWeight: 600 }}>{personal?.code}</Text>
            </Text>
            {personal?.startDate && (
              <Text style={{ color: textMuted, fontSize: 12 }}>
                Ngày vào: {dayjs(personal.startDate).format('DD/MM/YYYY')}
              </Text>
            )}
          </div>
        </div>

        <Space>
          <Button icon={<EditOutlined />} onClick={handleOpenEdit}>
            Chỉnh sửa thông tin
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate(`/hr/decisions?employeeId=${employeeId}`)}
          >
            Tạo quyết định
          </Button>
        </Space>
      </div>

      {/* Tabs */}
      <Tabs
        defaultActiveKey="overview"
        items={[
          {
            key: 'overview',
            label: (
              <span>
                <UserOutlined /> Tổng quan
              </span>
            ),
            children: (
              <Row gutter={[24, 24]}>
                <Col xs={24} md={12}>
                  <div
                    style={{
                      background: bgCard,
                      border: `1px solid ${borderColor}`,
                      borderRadius: 10,
                      padding: 20,
                    }}
                  >
                    <Text strong style={{ color: textPrimary, display: 'block', marginBottom: 14, fontSize: 14 }}>
                      Thông tin cá nhân
                    </Text>
                    <Descriptions column={1} size="small">
                      <Descriptions.Item label={<Text style={{ color: textMuted }}>Ngày sinh</Text>}>
                        <Text style={{ color: textPrimary }}>
                          {personal?.birthdate ? dayjs(personal.birthdate).format('DD/MM/YYYY') : '—'}
                        </Text>
                      </Descriptions.Item>
                      <Descriptions.Item label={<Text style={{ color: textMuted }}>Email</Text>}>
                        {personal?.email ? (
                          <a href={`mailto:${personal.email}`} style={{ color: '#93C5FD' }}>
                            {personal.email}
                          </a>
                        ) : (
                          <Text style={{ color: textMuted }}>—</Text>
                        )}
                      </Descriptions.Item>
                      <Descriptions.Item label={<Text style={{ color: textMuted }}>Quốc tịch</Text>}>
                        <Text style={{ color: textPrimary }}>{personal?.nationality ?? '—'}</Text>
                      </Descriptions.Item>
                      <Descriptions.Item label={<Text style={{ color: textMuted }}>Loại giấy tờ</Text>}>
                        <Text style={{ color: textPrimary }}>{personal?.idType ?? '—'}</Text>
                      </Descriptions.Item>
                      <Descriptions.Item label={<Text style={{ color: textMuted }}>Số CMND/CCCD</Text>}>
                        <Text style={{ color: textPrimary }}>{personal?.idNumber ?? '—'}</Text>
                      </Descriptions.Item>
                    </Descriptions>
                  </div>
                </Col>
                <Col xs={24} md={12}>
                  <div
                    style={{
                      background: bgCard,
                      border: `1px solid ${borderColor}`,
                      borderRadius: 10,
                      padding: 20,
                    }}
                  >
                    <Text strong style={{ color: textPrimary, display: 'block', marginBottom: 14, fontSize: 14 }}>
                      Địa chỉ & Tài khoản ngân hàng
                    </Text>
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
          {
            key: 'workHistory',
            label: (
              <span>
                <ClockCircleOutlined /> Công tác
              </span>
            ),
            children:
              profile.workHistory.length === 0 ? (
                <Text style={{ color: textMuted }}>Chưa có lịch sử công tác</Text>
              ) : (
                <Timeline
                  items={profile.workHistory.map((ev) => ({
                    dot: EVENT_ICON[ev.eventType] ?? <ClockCircleOutlined />,
                    children: (
                      <div>
                        <Text strong style={{ color: textPrimary }}>
                          {ev.title}
                        </Text>
                        <Text style={{ color: textMuted, marginLeft: 8, fontSize: 12 }}>
                          {dayjs(ev.eventDate).format('DD/MM/YYYY')}
                        </Text>
                        {ev.description && (
                          <div>
                            <Text style={{ color: textMuted, fontSize: 13 }}>{ev.description}</Text>
                          </div>
                        )}
                      </div>
                    ),
                  }))}
                />
              ),
          },
          {
            key: 'salary',
            label: (
              <span>
                <FileTextOutlined /> Lương
              </span>
            ),
            children: (
              <Table
                rowKey="id"
                columns={salaryColumns}
                dataSource={profile.salaryHistory}
                pagination={false}
                size="middle"
              />
            ),
          },
          {
            key: 'insurance',
            label: (
              <span>
                <SafetyOutlined /> BHXH
              </span>
            ),
            children: profile.insurance ? (
              <div>
                <div
                  style={{
                    background: bgCard,
                    border: `1px solid ${borderColor}`,
                    borderRadius: 10,
                    padding: 20,
                    marginBottom: 20,
                    maxWidth: 480,
                  }}
                >
                  <Text strong style={{ color: textPrimary, display: 'block', marginBottom: 14, fontSize: 14 }}>
                    Thông tin BHXH hiện tại
                  </Text>
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label={<Text style={{ color: textMuted }}>Trạng thái</Text>}>
                      <Badge
                        status={profile.insurance.status === 'ACTIVE' ? 'success' : 'default'}
                        text={
                          <Text style={{ color: textPrimary }}>
                            {profile.insurance.status === 'ACTIVE' ? 'Đang đóng' : profile.insurance.status}
                          </Text>
                        }
                      />
                    </Descriptions.Item>
                    <Descriptions.Item label={<Text style={{ color: textMuted }}>Mức đóng</Text>}>
                      <Text style={{ color: textPrimary, fontWeight: 600 }}>
                        {formatCurrency(profile.insurance.insuranceSalary)}
                      </Text>
                    </Descriptions.Item>
                    <Descriptions.Item label={<Text style={{ color: textMuted }}>Ngày bắt đầu</Text>}>
                      <Text style={{ color: textMuted }}>
                        {dayjs(profile.insurance.startDate).format('DD/MM/YYYY')}
                      </Text>
                    </Descriptions.Item>
                    <Descriptions.Item label={<Text style={{ color: textMuted }}>Số sổ BHXH</Text>}>
                      <Text style={{ color: textPrimary }}>{profile.insurance.bhxhBookNumber ?? '—'}</Text>
                    </Descriptions.Item>
                  </Descriptions>
                </div>
              </div>
            ) : (
              <Text style={{ color: textMuted }}>Chưa có thông tin BHXH</Text>
            ),
          },
          {
            key: 'contracts',
            label: (
              <span>
                <FileProtectOutlined /> Hợp đồng
              </span>
            ),
            children: (
              <Table
                rowKey="id"
                columns={contractColumns}
                dataSource={profile.contracts}
                pagination={false}
                size="middle"
              />
            ),
          },
          {
            key: 'decisions',
            label: 'Quyết định',
            children: (
              <Table
                rowKey="id"
                columns={decisionColumns}
                dataSource={profile.decisions}
                pagination={false}
                size="middle"
              />
            ),
          },
          {
            key: 'training',
            label: 'Đào tạo',
            children: (
              <Table
                rowKey="id"
                columns={trainingColumns}
                dataSource={profile.training}
                pagination={false}
                size="middle"
              />
            ),
          },
          {
            key: 'performance',
            label: 'Đánh giá',
            children: (
              <Table
                rowKey="id"
                columns={performanceColumns}
                dataSource={profile.performance}
                pagination={false}
                size="middle"
              />
            ),
          },
        ]}
      />

      {/* Modal chỉnh sửa thông tin cá nhân */}
      <CenteredModal
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          editForm.resetFields();
        }}
        title="Chỉnh sửa thông tin cá nhân"
        width={600}
        footer={
          <Space>
            <Button onClick={() => { setEditOpen(false); editForm.resetFields(); }}>Hủy</Button>
            <Button type="primary" onClick={handleEditSubmit} loading={updateMutation.isPending} disabled={updateMutation.isPending}>
              Lưu thay đổi
            </Button>
          </Space>
        }
      >
        <Form form={editForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="fullName" label="Họ và tên">
                <Input placeholder="Nhập họ và tên" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="email" label="Email">
                <Input type="email" placeholder="Nhập email" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="birthdate" label="Ngày sinh">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="nationality" label="Quốc tịch">
                <Input placeholder="VD: Việt Nam" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="idType" label="Loại giấy tờ">
                <Input placeholder="VD: CCCD, Hộ chiếu" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="idNumber" label="Số CMND/CCCD">
                <Input placeholder="Nhập số giấy tờ" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="permanentAddress" label="Địa chỉ thường trú">
            <Input.TextArea rows={2} placeholder="Nhập địa chỉ thường trú" />
          </Form.Item>
          <Form.Item name="currentAddress" label="Địa chỉ hiện tại">
            <Input.TextArea rows={2} placeholder="Nhập địa chỉ hiện tại" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="bankName" label="Ngân hàng">
                <Input placeholder="VD: Vietcombank" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="bankAccount" label="Số tài khoản">
                <Input placeholder="Nhập số tài khoản" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </CenteredModal>
    </div>
  );
}
