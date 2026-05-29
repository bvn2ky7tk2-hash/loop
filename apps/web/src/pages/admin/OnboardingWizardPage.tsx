import React, { useState } from 'react';
import {
  Steps, Button, Input, Select, Upload, Space, Typography, Row, Col,
  Card, Checkbox, Tag, Table, Switch, message, Form, Divider, Tree,
} from 'antd';
import {
  BuildOutlined, TeamOutlined, UploadOutlined, ApartmentOutlined,
  UserAddOutlined, CheckCircleFilled, SettingOutlined, RocketOutlined,
  DeleteOutlined, PlusOutlined, CheckOutlined,
} from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { moduleConfigApi } from '../../api/module-config';
import type { ModuleConfig } from '../../api/module-config';
import { useThemePalette } from '../../hooks/useThemePalette';
import { PageHeader } from '../../components/ui/PageHeader';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

// ─── Kiểu dữ liệu cục bộ ────────────────────────────────────────────────────

interface Department {
  key: string;
  name: string;
  headcount: number;
}

interface EmployeeRow {
  key: string;
  name: string;
  email: string;
  department: string;
  role: string;
  joinDate: string;
  valid: boolean;
}

interface WorkflowTemplate {
  id: string;
  label: string;
  description: string;
  available: boolean;
  approver: string;
}

// ─── State ban đầu ──────────────────────────────────────────────────────────

const INITIAL_WORKFLOWS: WorkflowTemplate[] = [
  { id: 'leave',      label: 'Duyệt nghỉ phép',       description: 'Luồng xin nghỉ phép qua BPM engine có sẵn', available: true,  approver: '' },
  { id: 'expense',    label: 'Duyệt chi phí',          description: 'Luồng phê duyệt chi phí qua BPM engine có sẵn', available: true,  approver: '' },
  { id: 'performance',label: 'Đánh giá hiệu suất',     description: 'Chu kỳ đánh giá KPI định kỳ (thêm sau)',       available: false, approver: '' },
];

const DEMO_EMPLOYEES: EmployeeRow[] = [
  { key: '1', name: 'Nguyễn Văn An',   email: 'an.nguyen@company.vn',   department: 'Engineering', role: 'Developer',   joinDate: '01/06/2026', valid: true },
  { key: '2', name: 'Trần Thị Bình',   email: 'binh.tran@company.vn',   department: 'Design',      role: 'Designer',    joinDate: '01/06/2026', valid: true },
  { key: '3', name: 'Lê Văn Cường',    email: 'invalid-email',           department: 'HR',          role: 'HR Manager',  joinDate: '01/06/2026', valid: false },
  { key: '4', name: 'Phạm Thị Dung',   email: 'dung.pham@company.vn',   department: 'Finance',     role: 'Accountant',  joinDate: '01/06/2026', valid: true },
  { key: '5', name: 'Hoàng Văn Em',    email: 'em.hoang@company.vn',    department: 'Engineering', role: 'QA',          joinDate: '01/06/2026', valid: true },
];

// ─── Component chính ─────────────────────────────────────────────────────────

export default function OnboardingWizardPage() {
  const { textPrimary, textMuted, bgCard, bgContainer, borderColor, isDark, preset } = useThemePalette();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [current, setCurrent] = useState(0);

  // Step 1 — Thông tin công ty
  const [companyName, setCompanyName] = useState('');
  const [timezone, setTimezone] = useState('Asia/Ho_Chi_Minh');
  const [currency, setCurrency] = useState('VND');

  // Step 2 — Cơ cấu tổ chức
  const [departments, setDepartments] = useState<Department[]>([
    { key: '1', name: 'Engineering', headcount: 10 },
    { key: '2', name: 'Design',      headcount: 4 },
  ]);
  const [deptInput, setDeptInput] = useState('');

  // Step 3 — Import nhân viên (UI only)
  const [showPreview, setShowPreview] = useState(false);

  // Step 4 — Workflow templates
  const [workflows, setWorkflows] = useState<WorkflowTemplate[]>(INITIAL_WORKFLOWS);
  const [selectedWorkflows, setSelectedWorkflows] = useState<string[]>(['leave', 'expense']);

  // Step 6 — Mời người dùng
  const [inviteEmails, setInviteEmails] = useState('');
  const [inviteRole, setInviteRole] = useState<'MEMBER' | 'PM' | 'LEADERSHIP'>('MEMBER');
  const [inviteSent, setInviteSent] = useState(false);

  // Module config (Step 5)
  const { data: modules = [] } = useQuery({
    queryKey: ['module-config'],
    queryFn: moduleConfigApi.listModules,
  });
  const toggleMut = useMutation({
    mutationFn: ({ moduleId, isEnabled }: { moduleId: string; isEnabled: boolean }) =>
      moduleConfigApi.toggleModule(moduleId, isEnabled),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['module-config'] }),
    onError: (err: any) => message.error(err?.response?.data?.message ?? 'Không thể cập nhật module'),
  });

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const addDepartment = () => {
    if (!deptInput.trim()) return;
    setDepartments((prev) => [...prev, { key: Date.now().toString(), name: deptInput.trim(), headcount: 1 }]);
    setDeptInput('');
  };

  const removeDepartment = (key: string) => setDepartments((prev) => prev.filter((d) => d.key !== key));

  const validEmails = inviteEmails
    .split('\n')
    .map((e) => e.trim())
    .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

  const handleSendInvite = () => {
    if (validEmails.length === 0) { message.warning('Chưa có email hợp lệ'); return; }
    setInviteSent(true);
    message.success(`Đã gửi lời mời cho ${validEmails.length} người`);
  };

  const cardStyle = {
    background: bgCard,
    border: `1px solid ${borderColor}`,
    borderRadius: 12,
    marginBottom: 16,
  };

  // ─── Step content ─────────────────────────────────────────────────────────

  const stepContent: React.ReactNode[] = [
    // Step 1 — Thông tin công ty
    <div key="step1">
      <Form layout="vertical" style={{ maxWidth: 520 }}>
        <Form.Item label={<Text style={{ color: textPrimary }}>Tên công ty</Text>} required>
          <Input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Ví dụ: Công ty TNHH ABC"
            size="large"
          />
        </Form.Item>
        <Form.Item label={<Text style={{ color: textPrimary }}>Logo công ty</Text>}>
          <Upload.Dragger
            accept="image/*"
            beforeUpload={() => false}
            style={{ background: isDark ? 'rgba(255,255,255,0.04)' : undefined }}
          >
            <p className="ant-upload-drag-icon">
              <UploadOutlined style={{ color: preset.primary }} />
            </p>
            <p style={{ color: textMuted }}>Kéo thả file ảnh hoặc nhấn để chọn</p>
            <p style={{ color: textMuted, fontSize: 12 }}>PNG, JPG, SVG — tối đa 2MB</p>
          </Upload.Dragger>
        </Form.Item>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label={<Text style={{ color: textPrimary }}>Múi giờ</Text>}>
              <Select value={timezone} onChange={setTimezone} size="large" style={{ width: '100%' }}>
                <Option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh (GMT+7)</Option>
                <Option value="Asia/Bangkok">Asia/Bangkok (GMT+7)</Option>
                <Option value="Asia/Singapore">Asia/Singapore (GMT+8)</Option>
                <Option value="UTC">UTC (GMT+0)</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label={<Text style={{ color: textPrimary }}>Đơn vị tiền tệ</Text>}>
              <Select value={currency} onChange={setCurrency} size="large" style={{ width: '100%' }}>
                <Option value="VND">VND — Đồng Việt Nam</Option>
                <Option value="USD">USD — US Dollar</Option>
                <Option value="EUR">EUR — Euro</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </div>,

    // Step 2 — Cơ cấu tổ chức
    <div key="step2">
      <Row gutter={24}>
        <Col xs={24} md={12}>
          <Text style={{ color: textPrimary, fontWeight: 600, display: 'block', marginBottom: 12 }}>
            Thêm phòng ban
          </Text>
          <Space.Compact style={{ width: '100%', marginBottom: 16 }}>
            <Input
              value={deptInput}
              onChange={(e) => setDeptInput(e.target.value)}
              placeholder="Tên phòng ban..."
              onPressEnter={addDepartment}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={addDepartment}>Thêm</Button>
          </Space.Compact>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {departments.map((dept) => (
              <div key={dept.key} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 12px', background: bgCard, border: `1px solid ${borderColor}`, borderRadius: 8,
              }}>
                <Text style={{ color: textPrimary, flex: 1 }}>{dept.name}</Text>
                <Input
                  type="number"
                  value={dept.headcount}
                  onChange={(e) => setDepartments((prev) =>
                    prev.map((d) => d.key === dept.key ? { ...d, headcount: parseInt(e.target.value) || 0 } : d)
                  )}
                  style={{ width: 80 }}
                  suffix={<Text style={{ color: textMuted, fontSize: 11 }}>người</Text>}
                  min={0}
                />
                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={() => removeDepartment(dept.key)}
                />
              </div>
            ))}
          </div>
        </Col>

        <Col xs={24} md={12}>
          <Text style={{ color: textPrimary, fontWeight: 600, display: 'block', marginBottom: 12 }}>
            Sơ đồ tổ chức
          </Text>
          <Card style={cardStyle} bodyStyle={{ padding: 16 }}>
            <Tree
              treeData={[
                {
                  title: <Text style={{ color: textPrimary, fontWeight: 600 }}>{companyName || 'Công ty'}</Text>,
                  key: 'root',
                  children: departments.map((d) => ({
                    title: (
                      <Space>
                        <Text style={{ color: textPrimary }}>{d.name}</Text>
                        <Text style={{ color: textMuted, fontSize: 12 }}>({d.headcount} người)</Text>
                      </Space>
                    ),
                    key: d.key,
                  })),
                },
              ]}
              defaultExpandAll
            />
          </Card>
        </Col>
      </Row>
    </div>,

    // Step 3 — Import nhân viên
    <div key="step3">
      <Upload.Dragger
        accept=".csv,.xlsx,.xls"
        beforeUpload={() => { setShowPreview(true); return false; }}
        style={{ background: isDark ? 'rgba(255,255,255,0.04)' : undefined, marginBottom: 20 }}
      >
        <p className="ant-upload-drag-icon">
          <UploadOutlined style={{ color: preset.primary, fontSize: 32 }} />
        </p>
        <p style={{ color: textPrimary, fontWeight: 500 }}>Kéo thả file CSV/Excel hoặc nhấn để chọn</p>
        <p style={{ color: textMuted, fontSize: 13 }}>Hỗ trợ: .csv, .xlsx, .xls — tối đa 5MB</p>
      </Upload.Dragger>

      {showPreview && (
        <>
          <Space style={{ marginBottom: 12 }}>
            <Tag color="green">{DEMO_EMPLOYEES.filter((e) => e.valid).length} hàng hợp lệ</Tag>
            <Tag color="red">{DEMO_EMPLOYEES.filter((e) => !e.valid).length} hàng lỗi</Tag>
          </Space>
          <Table
            size="small"
            rowKey="key"
            dataSource={DEMO_EMPLOYEES}
            pagination={false}
            rowClassName={(row) => row.valid ? '' : 'ant-table-row-selected'}
            columns={[
              { title: 'Họ tên',    dataIndex: 'name',       render: (v) => <Text style={{ color: textPrimary }}>{v}</Text> },
              { title: 'Email',     dataIndex: 'email',      render: (v, row) => (
                <Text style={{ color: row.valid ? textPrimary : '#EF4444' }}>{v}</Text>
              )},
              { title: 'Phòng ban', dataIndex: 'department', render: (v) => <Text style={{ color: textMuted }}>{v}</Text> },
              { title: 'Chức vụ',   dataIndex: 'role',       render: (v) => <Text style={{ color: textMuted }}>{v}</Text> },
              { title: 'Ngày vào',  dataIndex: 'joinDate',   render: (v) => <Text style={{ color: textMuted }}>{v}</Text> },
              { title: '', dataIndex: 'valid', width: 60, render: (v) => v
                ? <CheckCircleFilled style={{ color: '#10B981' }} />
                : <Tag color="red" style={{ fontSize: 11 }}>Lỗi</Tag>
              },
            ]}
          />
        </>
      )}
      {!showPreview && (
        <Paragraph style={{ color: textMuted, textAlign: 'center', marginTop: 8 }}>
          Tải file lên để xem preview danh sách nhân viên
        </Paragraph>
      )}
    </div>,

    // Step 4 — Workflow Templates
    <div key="step4">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {workflows.map((wf) => {
          const checked = selectedWorkflows.includes(wf.id);
          return (
            <Card
              key={wf.id}
              style={{
                ...cardStyle,
                marginBottom: 0,
                border: `2px solid ${checked && wf.available ? preset.primary + '55' : borderColor}`,
                opacity: wf.available ? 1 : 0.55,
              }}
              bodyStyle={{ padding: '14px 18px' }}
            >
              <Row align="middle" gutter={16}>
                <Col flex="none">
                  <Checkbox
                    checked={checked}
                    disabled={!wf.available}
                    onChange={(e) => {
                      setSelectedWorkflows((prev) =>
                        e.target.checked ? [...prev, wf.id] : prev.filter((id) => id !== wf.id)
                      );
                    }}
                  />
                </Col>
                <Col flex={1}>
                  <Space size={6}>
                    <Text style={{ color: textPrimary, fontWeight: 600 }}>{wf.label}</Text>
                    {!wf.available && <Tag color="default" style={{ fontSize: 11 }}>Sắp ra mắt</Tag>}
                  </Space>
                  <Text style={{ color: textMuted, fontSize: 13, display: 'block' }}>{wf.description}</Text>
                </Col>
                <Col flex="none" style={{ minWidth: 200 }}>
                  <Input
                    placeholder="Người duyệt mặc định..."
                    value={wf.approver}
                    disabled={!checked || !wf.available}
                    onChange={(e) => setWorkflows((prev) =>
                      prev.map((w) => w.id === wf.id ? { ...w, approver: e.target.value } : w)
                    )}
                    size="small"
                    prefix={<Text style={{ color: textMuted, fontSize: 12 }}>Duyệt:</Text>}
                  />
                </Col>
              </Row>
            </Card>
          );
        })}
      </div>
    </div>,

    // Step 5 — Cấu hình Module
    <div key="step5">
      <Text style={{ color: textMuted, display: 'block', marginBottom: 16 }}>
        Bật hoặc tắt các module cho phù hợp với nhu cầu doanh nghiệp.
        Module core (Công việc, Của tôi, Quản trị) không thể tắt.
      </Text>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {modules.map((mod) => (
          <div key={mod.moduleId} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 14px', background: bgCard, border: `1px solid ${borderColor}`, borderRadius: 8,
          }}>
            <Space>
              <Text style={{ color: textPrimary, fontWeight: 500 }}>{mod.displayName}</Text>
              {mod.isCore && <Tag style={{ fontSize: 11 }}>Core</Tag>}
              {mod.description && (
                <Text style={{ color: textMuted, fontSize: 12 }}>{mod.description}</Text>
              )}
            </Space>
            <Switch
              checked={mod.isEnabled}
              disabled={mod.isCore}
              size="small"
              loading={toggleMut.isPending && toggleMut.variables?.moduleId === mod.moduleId}
              onChange={(v) => toggleMut.mutate({ moduleId: mod.moduleId, isEnabled: v })}
            />
          </div>
        ))}
      </div>
    </div>,

    // Step 6 — Mời người dùng
    <div key="step6">
      <Row gutter={24}>
        <Col xs={24} md={14}>
          <Text style={{ color: textPrimary, fontWeight: 600, display: 'block', marginBottom: 8 }}>
            Danh sách email (1 email/dòng)
          </Text>
          <TextArea
            rows={8}
            value={inviteEmails}
            onChange={(e) => setInviteEmails(e.target.value)}
            placeholder={`nguyen.van.a@company.vn\ntran.thi.b@company.vn\n...`}
            style={{ fontFamily: 'monospace', fontSize: 13 }}
          />
          <Space style={{ marginTop: 12 }}>
            <Text style={{ color: textMuted }}>Vai trò:</Text>
            <Select value={inviteRole} onChange={setInviteRole} style={{ width: 160 }}>
              <Option value="MEMBER">Member</Option>
              <Option value="PM">PM</Option>
              <Option value="LEADERSHIP">Leadership</Option>
            </Select>
            <Button
              type="primary"
              icon={<UserAddOutlined />}
              onClick={handleSendInvite}
              disabled={inviteSent}
            >
              {inviteSent ? 'Đã gửi' : 'Gửi lời mời'}
            </Button>
          </Space>
        </Col>

        <Col xs={24} md={10}>
          <Text style={{ color: textPrimary, fontWeight: 600, display: 'block', marginBottom: 8 }}>
            Preview ({validEmails.length} email hợp lệ)
          </Text>
          <Card style={cardStyle} bodyStyle={{ padding: 12, maxHeight: 280, overflowY: 'auto' }}>
            {validEmails.length > 0 ? (
              validEmails.map((email, i) => (
                <div key={i} style={{ padding: '4px 0', borderBottom: i < validEmails.length - 1 ? `1px solid ${borderColor}` : 'none' }}>
                  <Text style={{ color: textPrimary, fontSize: 13 }}>{email}</Text>
                  <Tag style={{ marginLeft: 6, fontSize: 11 }}>{inviteRole}</Tag>
                </div>
              ))
            ) : (
              <Text style={{ color: textMuted, fontSize: 13 }}>Chưa có email nào hợp lệ</Text>
            )}
          </Card>
        </Col>
      </Row>
    </div>,

    // Step 7 — Hoàn tất
    <div key="step7" style={{ maxWidth: 560 }}>
      <Title level={4} style={{ color: textPrimary, marginBottom: 24 }}>
        Tóm tắt thiết lập
      </Title>

      {[
        {
          label: 'Thông tin công ty',
          done: !!companyName,
          detail: companyName || 'Chưa điền',
        },
        {
          label: 'Cơ cấu tổ chức',
          done: departments.length > 0,
          detail: `${departments.length} phòng ban`,
        },
        {
          label: 'Nhân viên',
          done: showPreview,
          detail: showPreview ? `${DEMO_EMPLOYEES.filter((e) => e.valid).length} người hợp lệ` : 'Chưa import',
        },
        {
          label: 'Workflow templates',
          done: selectedWorkflows.length > 0,
          detail: `${selectedWorkflows.length} đã chọn`,
        },
        {
          label: 'Cấu hình modules',
          done: modules.length > 0,
          detail: `${modules.filter((m) => m.isEnabled).length}/${modules.length} module bật`,
        },
        {
          label: 'Lời mời người dùng',
          done: inviteSent,
          detail: inviteSent ? `${validEmails.length} email đã gửi` : 'Chưa gửi',
        },
      ].map((item) => (
        <div key={item.label} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 16px',
          marginBottom: 8,
          background: bgCard,
          border: `1px solid ${item.done ? '#10B98133' : borderColor}`,
          borderRadius: 8,
        }}>
          {item.done
            ? <CheckCircleFilled style={{ color: '#10B981', fontSize: 18 }} />
            : <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${borderColor}` }} />
          }
          <Text style={{ color: textPrimary, fontWeight: 500, flex: 1 }}>{item.label}</Text>
          <Text style={{ color: item.done ? '#10B981' : textMuted, fontSize: 13 }}>{item.detail}</Text>
        </div>
      ))}

      <Button
        type="primary"
        size="large"
        icon={<RocketOutlined />}
        style={{ marginTop: 24, width: '100%', height: 48, fontSize: 16, background: '#10B981', border: 'none' }}
        onClick={() => { message.success('Thiết lập hoàn tất! Chào mừng đến với Loop.vn'); navigate('/'); }}
      >
        Hoàn tất &amp; Bắt đầu
      </Button>
    </div>,
  ];

  const STEPS = [
    { title: 'Công ty',    icon: <BuildOutlined /> },
    { title: 'Tổ chức',   icon: <ApartmentOutlined /> },
    { title: 'Nhân viên', icon: <TeamOutlined /> },
    { title: 'Workflow',  icon: <SettingOutlined /> },
    { title: 'Modules',   icon: <SettingOutlined /> },
    { title: 'Mời',       icon: <UserAddOutlined /> },
    { title: 'Hoàn tất',  icon: <CheckOutlined /> },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Thiết lập hệ thống"
        icon={<RocketOutlined />}
        iconColor="#10B981"
        subtitle={<Text style={{ color: textMuted, fontSize: 13 }}>Onboarding Wizard — hoàn thành 7 bước để bắt đầu sử dụng Loop.vn</Text>}
      />

      {/* Steps navigation */}
      <Card style={{ background: bgContainer, border: `1px solid ${borderColor}`, borderRadius: 12, marginBottom: 24 }}>
        <Steps
          current={current}
          items={STEPS}
          responsive
          style={{ padding: '8px 0' }}
        />
      </Card>

      {/* Step content */}
      <Card style={{ background: bgContainer, border: `1px solid ${borderColor}`, borderRadius: 12, minHeight: 400 }}
        bodyStyle={{ padding: 28 }}>
        {stepContent[current]}

        <Divider style={{ borderColor }} />

        {/* Navigation buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button
            size="large"
            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            disabled={current === 0}
          >
            Quay lại
          </Button>
          {current < STEPS.length - 1 && (
            <Button
              type="primary"
              size="large"
              onClick={() => setCurrent((c) => Math.min(STEPS.length - 1, c + 1))}
            >
              Tiếp theo
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
