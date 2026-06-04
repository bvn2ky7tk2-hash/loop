import React, { useEffect, useState } from 'react';
import {
  Steps, Button, Input, Select, Upload, Space, Typography, Row, Col,
  Card, Checkbox, Tag, Table, Switch, message, Form, Divider, Tree, Image,
} from 'antd';
import {
  BuildOutlined, TeamOutlined, UploadOutlined, ApartmentOutlined,
  UserAddOutlined, CheckCircleFilled, SettingOutlined, RocketOutlined,
  DeleteOutlined, PlusOutlined, CheckOutlined, SaveOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { moduleConfigApi } from '../../api/module-config';
import { tenantApi } from '../../api/tenant';
import { usersApi } from '../../api/users';
import { orgUnitsApi } from '../../api/org-units';
import { apiClient } from '../../api/client';
import { useThemePalette } from '../../hooks/useThemePalette';
import { PageHeader } from '../../components/ui/PageHeader';
import { SectionCard } from '../../components/ui/SectionCard';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface Department { key: string; name: string; headcount: number }
interface WorkflowTemplate { id: string; label: string; description: string; available: boolean; approver: string }
interface ImportRow { [key: string]: string | number | undefined }
interface PreviewResult { template: string; valid: ImportRow[]; errors: { row: number; message: string }[] }

const INITIAL_WORKFLOWS: WorkflowTemplate[] = [
  { id: 'leave',      label: 'Duyệt nghỉ phép',   description: 'Luồng xin nghỉ phép qua BPM engine có sẵn',  available: true,  approver: '' },
  { id: 'expense',    label: 'Duyệt chi phí',      description: 'Luồng phê duyệt chi phí qua BPM engine có sẵn', available: true,  approver: '' },
  { id: 'performance',label: 'Đánh giá hiệu suất', description: 'Chu kỳ đánh giá KPI định kỳ (thêm sau)',       available: false, approver: '' },
];

// Sinh code đơn vị từ tên (bỏ dấu → IN HOA → [^A-Z0-9]→_ → cắt 2..20)
function genOrgCode(name: string): string {
  const base = name
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '')
    .slice(0, 20);
  return base.length >= 2 ? base : (base + 'XX').slice(0, 20);
}

export default function OnboardingWizardPage() {
  const { textPrimary, textMuted, bgCard, borderColor, isDark, preset, linkColor } = useThemePalette();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [current, setCurrent] = useState(0);

  // Step 1 — Công ty
  const [companyName, setCompanyName] = useState('');
  const [timezone, setTimezone] = useState('Asia/Ho_Chi_Minh');
  const [currency, setCurrency] = useState('VND');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [companySaved, setCompanySaved] = useState(false);

  // Step 2 — Tổ chức
  const [departments, setDepartments] = useState<Department[]>([
    { key: '1', name: 'Engineering', headcount: 10 },
    { key: '2', name: 'Design',      headcount: 4 },
  ]);
  const [deptInput, setDeptInput] = useState('');
  const [createdDepts, setCreatedDepts] = useState<Record<string, string>>({}); // deptKey → orgUnitId

  // Step 3 — Import nhân viên (thật)
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<PreviewResult | null>(null);
  const [importCommitted, setImportCommitted] = useState<{ imported: number; skipped: number } | null>(null);

  // Step 4 — Workflow (UI)
  const [workflows, setWorkflows] = useState<WorkflowTemplate[]>(INITIAL_WORKFLOWS);
  const [selectedWorkflows, setSelectedWorkflows] = useState<string[]>(['leave', 'expense']);

  // Step 6 — Mời người dùng (thật)
  const [inviteEmails, setInviteEmails] = useState('');
  const [inviteRole, setInviteRole] = useState<'MEMBER' | 'PM' | 'LEADERSHIP'>('MEMBER');
  const [inviteResult, setInviteResult] = useState<{ invited: number; skipped: string[]; failed: { email: string; reason: string }[] } | null>(null);

  // Prefill thông tin công ty
  const { data: cfg } = useQuery({ queryKey: ['tenant-config'], queryFn: () => tenantApi.getConfig() });
  useEffect(() => {
    if (!cfg) return;
    setCompanyName(cfg.name ?? '');
    setTimezone(cfg.timezone ?? 'Asia/Ho_Chi_Minh');
    setCurrency(cfg.currency ?? 'VND');
    setLogoUrl(cfg.logoUrl ?? null);
  }, [cfg]);

  // Module config (Step 5)
  const { data: modules = [] } = useQuery({ queryKey: ['module-config'], queryFn: moduleConfigApi.listModules });
  const toggleMut = useMutation({
    mutationFn: ({ moduleId, isEnabled }: { moduleId: string; isEnabled: boolean }) =>
      moduleConfigApi.toggleModule(moduleId, isEnabled),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['module-config'] }),
    onError: (err: any) => message.error(err?.response?.data?.message ?? 'Không thể cập nhật module'),
  });

  // ─── Mutations B1/B2/B3/B6 ──────────────────────────────────────────────────
  const saveCompanyMut = useMutation({
    mutationFn: () => tenantApi.update({ name: companyName, timezone, currency }),
    onSuccess: () => { setCompanySaved(true); qc.invalidateQueries({ queryKey: ['tenant-config'] }); message.success('Đã lưu thông tin công ty'); },
    onError: () => message.error('Lưu thông tin công ty thất bại'),
  });

  const uploadLogoMut = useMutation({
    mutationFn: (file: File) => tenantApi.uploadLogo(file),
    onSuccess: (res) => { setLogoUrl(res.logoUrl); message.success('Đã tải logo'); },
    onError: () => message.error('Tải logo thất bại'),
  });

  const saveDeptsMut = useMutation({
    mutationFn: async () => {
      const created: Record<string, string> = { ...createdDepts };
      for (const d of departments) {
        if (created[d.key]) continue;
        let code = genOrgCode(d.name);
        try {
          const res = await orgUnitsApi.create({ name: d.name, code });
          created[d.key] = (res as any)?.id ?? 'created';
        } catch {
          // Trùng code → thêm hậu tố rồi thử lại 1 lần
          code = genOrgCode(d.name).slice(0, 17) + '_' + Math.floor(Math.random() * 99);
          const res = await orgUnitsApi.create({ name: d.name, code });
          created[d.key] = (res as any)?.id ?? 'created';
        }
      }
      return created;
    },
    onSuccess: (created) => { setCreatedDepts(created); message.success('Đã lưu cơ cấu tổ chức'); },
    onError: () => message.error('Lưu phòng ban thất bại'),
  });

  const previewMut = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      return apiClient.post<PreviewResult>('/import/preview?template=employees', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then((r) => r.data);
    },
    onSuccess: setImportPreview,
    onError: () => message.error('Đọc file thất bại'),
  });

  const commitMut = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('file', importFile as File);
      return apiClient.post<{ imported: number; skipped: number }>('/import/commit?template=employees', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then((r) => r.data);
    },
    onSuccess: (res) => { setImportCommitted(res); message.success(`Đã import ${res.imported} nhân viên`); },
    onError: () => message.error('Import thất bại'),
  });

  const inviteMut = useMutation({
    mutationFn: () => usersApi.invite({ emails: validEmails, role: inviteRole }),
    onSuccess: (res) => {
      setInviteResult(res);
      message.success(`Đã mời ${res.invited} người${res.skipped.length ? `, bỏ qua ${res.skipped.length} (đã tồn tại)` : ''}`);
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? 'Gửi lời mời thất bại'),
  });

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const addDepartment = () => {
    if (!deptInput.trim()) return;
    setDepartments((prev) => [...prev, { key: Date.now().toString(), name: deptInput.trim(), headcount: 1 }]);
    setDeptInput('');
  };
  const removeDepartment = (key: string) => setDepartments((prev) => prev.filter((d) => d.key !== key));

  const validEmails = inviteEmails.split('\n').map((e) => e.trim()).filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

  const cardStyle = { background: bgCard, border: `1px solid ${borderColor}`, borderRadius: 12, marginBottom: 16 };

  // ─── Step content ─────────────────────────────────────────────────────────
  const stepContent: React.ReactNode[] = [
    // Step 1 — Công ty
    <div key="step1">
      <Form layout="vertical" style={{ maxWidth: 520 }}>
        <Form.Item label={<Text style={{ color: textPrimary }}>Tên công ty</Text>} required>
          <Input value={companyName} onChange={(e) => { setCompanyName(e.target.value); setCompanySaved(false); }} placeholder="Ví dụ: Công ty TNHH ABC" size="large" />
        </Form.Item>
        <Form.Item label={<Text style={{ color: textPrimary }}>Logo công ty</Text>}>
          {logoUrl && <Image src={logoUrl} alt="logo" height={64} style={{ marginBottom: 12, objectFit: 'contain' }} />}
          <Upload
            accept="image/*"
            maxCount={1}
            showUploadList={false}
            beforeUpload={(file) => { uploadLogoMut.mutate(file as unknown as File); return false; }}
          >
            <Button icon={<UploadOutlined />} loading={uploadLogoMut.isPending}>Chọn logo (PNG/JPG/SVG ≤ 2MB)</Button>
          </Upload>
        </Form.Item>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label={<Text style={{ color: textPrimary }}>Múi giờ</Text>}>
              <Select value={timezone} onChange={(v) => { setTimezone(v); setCompanySaved(false); }} size="large" style={{ width: '100%' }}>
                <Option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh (GMT+7)</Option>
                <Option value="Asia/Bangkok">Asia/Bangkok (GMT+7)</Option>
                <Option value="Asia/Singapore">Asia/Singapore (GMT+8)</Option>
                <Option value="UTC">UTC (GMT+0)</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label={<Text style={{ color: textPrimary }}>Đơn vị tiền tệ</Text>}>
              <Select value={currency} onChange={(v) => { setCurrency(v); setCompanySaved(false); }} size="large" style={{ width: '100%' }}>
                <Option value="VND">VND — Đồng Việt Nam</Option>
                <Option value="USD">USD — US Dollar</Option>
                <Option value="EUR">EUR — Euro</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
        <Button type="primary" icon={<SaveOutlined />} loading={saveCompanyMut.isPending} disabled={!companyName.trim()} onClick={() => saveCompanyMut.mutate()}>
          Lưu thông tin công ty
        </Button>
        {companySaved && <Tag color="green" style={{ marginLeft: 12 }}>Đã lưu</Tag>}
      </Form>
    </div>,

    // Step 2 — Tổ chức
    <div key="step2">
      <Row gutter={24}>
        <Col xs={24} md={12}>
          <Text style={{ color: textPrimary, fontWeight: 600, display: 'block', marginBottom: 12 }}>Thêm phòng ban</Text>
          <Space.Compact style={{ width: '100%', marginBottom: 16 }}>
            <Input value={deptInput} onChange={(e) => setDeptInput(e.target.value)} placeholder="Tên phòng ban..." onPressEnter={addDepartment} />
            <Button type="primary" icon={<PlusOutlined />} onClick={addDepartment}>Thêm</Button>
          </Space.Compact>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {departments.map((dept) => (
              <div key={dept.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: bgCard, border: `1px solid ${borderColor}`, borderRadius: 8 }}>
                <Text style={{ color: textPrimary, flex: 1 }}>{dept.name}</Text>
                {createdDepts[dept.key]
                  ? <Tag color="green" style={{ fontSize: 11 }}>Đã tạo</Tag>
                  : <Text style={{ color: textMuted, fontSize: 11 }}>{genOrgCode(dept.name)}</Text>}
                <Button type="text" danger size="small" icon={<DeleteOutlined />} disabled={!!createdDepts[dept.key]} onClick={() => removeDepartment(dept.key)} />
              </div>
            ))}
          </div>
          <Button type="primary" icon={<SaveOutlined />} style={{ marginTop: 16 }} loading={saveDeptsMut.isPending}
            disabled={departments.every((d) => createdDepts[d.key])} onClick={() => saveDeptsMut.mutate()}>
            Lưu phòng ban
          </Button>
        </Col>
        <Col xs={24} md={12}>
          <Text style={{ color: textPrimary, fontWeight: 600, display: 'block', marginBottom: 12 }}>Sơ đồ tổ chức</Text>
          <SectionCard nested style={{ marginBottom: 16 }}>
            <Tree
              treeData={[{
                title: <Text style={{ color: textPrimary, fontWeight: 600 }}>{companyName || 'Công ty'}</Text>,
                key: 'root',
                children: departments.map((d) => ({
                  title: <Space><Text style={{ color: textPrimary }}>{d.name}</Text><Text style={{ color: textMuted, fontSize: 12 }}>({d.headcount} người)</Text></Space>,
                  key: d.key,
                })),
              }]}
              defaultExpandAll
            />
          </SectionCard>
        </Col>
      </Row>
    </div>,

    // Step 3 — Import nhân viên (thật)
    <div key="step3">
      <Paragraph style={{ color: textMuted }}>
        File cần các cột: <strong>Họ tên (*), Email (*), Phòng ban, Ngày vào làm</strong>. Dòng đầu là tiêu đề.
      </Paragraph>
      <Upload.Dragger
        accept=".csv,.xlsx,.xls"
        maxCount={1}
        showUploadList={false}
        beforeUpload={(file) => { setImportFile(file as unknown as File); setImportCommitted(null); previewMut.mutate(file as unknown as File); return false; }}
        style={{ background: isDark ? 'rgba(255,255,255,0.04)' : undefined, marginBottom: 20 }}
      >
        <p className="ant-upload-drag-icon"><UploadOutlined style={{ color: linkColor, fontSize: 32 }} /></p>
        <p style={{ color: textPrimary, fontWeight: 500 }}>Kéo thả file CSV/Excel hoặc nhấn để chọn</p>
        <p style={{ color: textMuted, fontSize: 13 }}>Hỗ trợ: .csv, .xlsx, .xls — tối đa 5MB</p>
      </Upload.Dragger>

      {importPreview && (
        <>
          <Space style={{ marginBottom: 12 }}>
            <Tag color="green">{importPreview.valid.length} hàng hợp lệ</Tag>
            <Tag color="red">{importPreview.errors.length} hàng lỗi</Tag>
          </Space>
          {importPreview.valid.length > 0 && (
            <Table
              size="small" rowKey={(_, i) => String(i)} dataSource={importPreview.valid.slice(0, 100)} pagination={false} scroll={{ y: 240 }}
              columns={[
                { title: 'Họ tên', dataIndex: 'fullName', render: (v) => <Text style={{ color: textPrimary }}>{String(v ?? '')}</Text> },
                { title: 'Email', dataIndex: 'email', render: (v) => <Text style={{ color: textPrimary }}>{String(v ?? '')}</Text> },
                { title: 'Phòng ban', dataIndex: 'orgUnit', render: (v) => <Text style={{ color: textMuted }}>{String(v ?? '—')}</Text> },
                { title: 'Ngày vào', dataIndex: 'startDate', render: (v) => <Text style={{ color: textMuted }}>{String(v ?? '—')}</Text> },
              ]}
              style={{ marginBottom: 12 }}
            />
          )}
          {importPreview.errors.length > 0 && (
            <Table
              size="small" rowKey={(_, i) => String(i)} dataSource={importPreview.errors.slice(0, 100)} pagination={false} scroll={{ y: 160 }}
              columns={[
                { title: 'Dòng', dataIndex: 'row', width: 70, render: (v) => <Text style={{ color: textPrimary }}>#{v}</Text> },
                { title: 'Lỗi', dataIndex: 'message', render: (v) => <Text style={{ color: '#EF4444' }}>{v}</Text> },
              ]}
              style={{ marginBottom: 12 }}
            />
          )}
          <Button type="primary" loading={commitMut.isPending} disabled={importPreview.valid.length === 0 || !!importCommitted} onClick={() => commitMut.mutate()}>
            {importCommitted ? `Đã import ${importCommitted.imported}` : `Xác nhận import ${importPreview.valid.length} nhân viên`}
          </Button>
        </>
      )}
    </div>,

    // Step 4 — Workflow (UI)
    <div key="step4">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {workflows.map((wf) => {
          const checked = selectedWorkflows.includes(wf.id);
          return (
            <Card key={wf.id} style={{ ...cardStyle, marginBottom: 0, border: `2px solid ${checked && wf.available ? preset.primary + '55' : borderColor}`, opacity: wf.available ? 1 : 0.55 }} bodyStyle={{ padding: '14px 18px' }}>
              <Row align="middle" gutter={16}>
                <Col flex="none">
                  <Checkbox checked={checked} disabled={!wf.available} onChange={(e) => setSelectedWorkflows((prev) => e.target.checked ? [...prev, wf.id] : prev.filter((id) => id !== wf.id))} />
                </Col>
                <Col flex={1}>
                  <Space size={6}>
                    <Text style={{ color: textPrimary, fontWeight: 600 }}>{wf.label}</Text>
                    {!wf.available && <Tag color="default" style={{ fontSize: 11 }}>Sắp ra mắt</Tag>}
                  </Space>
                  <Text style={{ color: textMuted, fontSize: 13, display: 'block' }}>{wf.description}</Text>
                </Col>
                <Col flex="none" style={{ minWidth: 200 }}>
                  <Input placeholder="Người duyệt mặc định..." value={wf.approver} disabled={!checked || !wf.available}
                    onChange={(e) => setWorkflows((prev) => prev.map((w) => w.id === wf.id ? { ...w, approver: e.target.value } : w))}
                    size="small" prefix={<Text style={{ color: textMuted, fontSize: 12 }}>Duyệt:</Text>} />
                </Col>
              </Row>
            </Card>
          );
        })}
      </div>
    </div>,

    // Step 5 — Modules
    <div key="step5">
      <Text style={{ color: textMuted, display: 'block', marginBottom: 16 }}>
        Bật hoặc tắt các module cho phù hợp với nhu cầu. Module core không thể tắt.
      </Text>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {modules.map((mod) => (
          <div key={mod.moduleId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: bgCard, border: `1px solid ${borderColor}`, borderRadius: 8 }}>
            <Space>
              <Text style={{ color: textPrimary, fontWeight: 500 }}>{mod.displayName}</Text>
              {mod.isCore && <Tag style={{ fontSize: 11 }}>Core</Tag>}
              {mod.description && <Text style={{ color: textMuted, fontSize: 12 }}>{mod.description}</Text>}
            </Space>
            <Switch checked={mod.isEnabled} disabled={mod.isCore} size="small"
              loading={toggleMut.isPending && toggleMut.variables?.moduleId === mod.moduleId}
              onChange={(v) => toggleMut.mutate({ moduleId: mod.moduleId, isEnabled: v })} />
          </div>
        ))}
      </div>
    </div>,

    // Step 6 — Mời người dùng (thật)
    <div key="step6">
      <Row gutter={24}>
        <Col xs={24} md={14}>
          <Text style={{ color: textPrimary, fontWeight: 600, display: 'block', marginBottom: 8 }}>Danh sách email (1 email/dòng)</Text>
          <TextArea rows={8} value={inviteEmails} onChange={(e) => setInviteEmails(e.target.value)} placeholder={`nguyen.van.a@company.vn\ntran.thi.b@company.vn\n...`} style={{ fontFamily: 'monospace', fontSize: 13 }} />
          <Space style={{ marginTop: 12 }}>
            <Text style={{ color: textMuted }}>Vai trò:</Text>
            <Select value={inviteRole} onChange={setInviteRole} style={{ width: 160 }}>
              <Option value="MEMBER">Member</Option>
              <Option value="PM">PM</Option>
              <Option value="LEADERSHIP">Leadership</Option>
            </Select>
            <Button type="primary" icon={<UserAddOutlined />} loading={inviteMut.isPending} disabled={validEmails.length === 0} onClick={() => inviteMut.mutate()}>
              Gửi lời mời
            </Button>
          </Space>
          {inviteResult && (
            <Paragraph style={{ color: textMuted, marginTop: 12 }}>
              Đã mời <strong style={{ color: '#10B981' }}>{inviteResult.invited}</strong>
              {inviteResult.skipped.length > 0 && <> · bỏ qua {inviteResult.skipped.length} (đã tồn tại)</>}
              {inviteResult.failed.length > 0 && <> · lỗi {inviteResult.failed.length}</>}
            </Paragraph>
          )}
        </Col>
        <Col xs={24} md={10}>
          <Text style={{ color: textPrimary, fontWeight: 600, display: 'block', marginBottom: 8 }}>Preview ({validEmails.length} email hợp lệ)</Text>
          <SectionCard nested style={{ marginBottom: 16 }} bodyStyle={{ padding: 12, maxHeight: 280, overflowY: 'auto' }}>
            {validEmails.length > 0 ? validEmails.map((email, i) => (
              <div key={i} style={{ padding: '4px 0', borderBottom: i < validEmails.length - 1 ? `1px solid ${borderColor}` : 'none' }}>
                <Text style={{ color: textPrimary, fontSize: 13 }}>{email}</Text>
                <Tag style={{ marginLeft: 6, fontSize: 11 }}>{inviteRole}</Tag>
              </div>
            )) : <Text style={{ color: textMuted, fontSize: 13 }}>Chưa có email nào hợp lệ</Text>}
          </SectionCard>
        </Col>
      </Row>
    </div>,

    // Step 7 — Hoàn tất
    <div key="step7" style={{ maxWidth: 560 }}>
      <Title level={4} style={{ color: textPrimary, marginBottom: 24 }}>Tóm tắt thiết lập</Title>
      {[
        { label: 'Thông tin công ty', done: companySaved || !!cfg?.name, detail: companyName || 'Chưa điền' },
        { label: 'Cơ cấu tổ chức', done: Object.keys(createdDepts).length > 0, detail: `${Object.keys(createdDepts).length}/${departments.length} phòng ban đã tạo` },
        { label: 'Nhân viên', done: !!importCommitted, detail: importCommitted ? `${importCommitted.imported} người đã import` : 'Chưa import' },
        { label: 'Workflow templates', done: selectedWorkflows.length > 0, detail: `${selectedWorkflows.length} đã chọn` },
        { label: 'Cấu hình modules', done: modules.length > 0, detail: `${modules.filter((m) => m.isEnabled).length}/${modules.length} module bật` },
        { label: 'Lời mời người dùng', done: !!inviteResult, detail: inviteResult ? `${inviteResult.invited} email đã mời` : 'Chưa gửi' },
      ].map((item) => (
        <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', marginBottom: 8, background: bgCard, border: `1px solid ${item.done ? '#10B98133' : borderColor}`, borderRadius: 8 }}>
          {item.done ? <CheckCircleFilled style={{ color: '#10B981', fontSize: 18 }} /> : <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${borderColor}` }} />}
          <Text style={{ color: textPrimary, fontWeight: 500, flex: 1 }}>{item.label}</Text>
          <Text style={{ color: item.done ? '#10B981' : textMuted, fontSize: 13 }}>{item.detail}</Text>
        </div>
      ))}
      <Button type="primary" size="large" icon={<RocketOutlined />} style={{ marginTop: 24, width: '100%', height: 48, fontSize: 16, background: '#10B981', border: 'none' }}
        onClick={() => { message.success('Thiết lập hoàn tất! Chào mừng đến với Loop.vn'); navigate('/'); }}>
        Hoàn tất &amp; Bắt đầu
      </Button>
    </div>,
  ];

  const STEPS = [
    { title: 'Công ty',   icon: <BuildOutlined /> },
    { title: 'Tổ chức',  icon: <ApartmentOutlined /> },
    { title: 'Nhân viên', icon: <TeamOutlined /> },
    { title: 'Workflow', icon: <SettingOutlined /> },
    { title: 'Modules',  icon: <SettingOutlined /> },
    { title: 'Mời',      icon: <UserAddOutlined /> },
    { title: 'Hoàn tất', icon: <CheckOutlined /> },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Thiết lập hệ thống"
        icon={<RocketOutlined />}
        iconColor="#10B981"
        subtitle={<Text style={{ color: textMuted, fontSize: 13 }}>Onboarding Wizard — hoàn thành 7 bước để bắt đầu sử dụng Loop.vn</Text>}
      />
      <SectionCard style={{ marginBottom: 24 }}>
        <Steps current={current} items={STEPS} responsive style={{ padding: '8px 0' }} />
      </SectionCard>
      <SectionCard style={{ minHeight: 400 }} bodyStyle={{ padding: 28 }}>
        {stepContent[current]}
        <Divider style={{ borderColor }} />
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button size="large" onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0}>Quay lại</Button>
          {current < STEPS.length - 1 && (
            <Button type="primary" size="large" onClick={() => setCurrent((c) => Math.min(STEPS.length - 1, c + 1))}>Tiếp theo</Button>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
