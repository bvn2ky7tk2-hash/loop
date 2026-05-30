import { useState } from 'react';
import {
  Steps, Button, Upload, Typography, Space, Table, Tag, Alert,
  Row, Col, Card, Result, App,
} from 'antd';
import type { UploadFile, UploadProps } from 'antd';
import {
  UploadOutlined, TeamOutlined, LaptopOutlined, SolutionOutlined,
  CheckCircleOutlined, CloseCircleOutlined, ArrowRightOutlined,
  CalendarOutlined, ShopOutlined, FunnelPlotOutlined,
} from '@ant-design/icons';
import { PageHeader } from '../../components/ui/PageHeader';
import { useThemePalette } from '../../hooks/useThemePalette';
import { apiClient } from '../../api/client';

const { Text, Title } = Typography;

// ─── Types ────────────────────────────────────────────────────────────────────

type TemplateKey = 'employees' | 'assets' | 'jobs' | 'leave_balances' | 'customers' | 'leads';

interface ImportRow {
  [key: string]: string | number | undefined;
}

interface ImportError {
  row: number;
  message: string;
}

interface PreviewResult {
  template: TemplateKey;
  valid: ImportRow[];
  errors: ImportError[];
}

// ─── Template definitions ─────────────────────────────────────────────────────

const TEMPLATES: {
  key: TemplateKey;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  fields: string[];
}[] = [
  {
    key: 'employees',
    label: 'Nhân viên',
    description: 'Import danh sách nhân viên mới',
    icon: <TeamOutlined />,
    color: '#6366F1',
    fields: ['Họ tên (*)', 'Email (*)', 'Phòng ban', 'Ngày vào làm'],
  },
  {
    key: 'assets',
    label: 'Tài sản',
    description: 'Import danh sách tài sản công ty',
    icon: <LaptopOutlined />,
    color: '#F97316',
    fields: ['Tên tài sản (*)', 'Mã tài sản (*)', 'Danh mục (*)', 'Số serial', 'Ngày mua'],
  },
  {
    key: 'jobs',
    label: 'Vị trí tuyển dụng',
    description: 'Import danh sách vị trí cần tuyển',
    icon: <SolutionOutlined />,
    color: '#0EA5E9',
    fields: ['Vị trí (*)', 'Phòng ban (*)', 'Cấp độ (*)', 'Số lượng'],
  },
  {
    key: 'leave_balances',
    label: 'Số ngày phép',
    description: 'Import số ngày phép theo email nhân viên',
    icon: <CalendarOutlined />,
    color: '#8B5CF6',
    fields: ['Email (*)', 'Loại nghỉ (*)', 'Năm (*)', 'Số ngày (*)'],
  },
  {
    key: 'customers',
    label: 'Khách hàng',
    description: 'Import danh sách khách hàng CRM',
    icon: <ShopOutlined />,
    color: '#10B981',
    fields: ['Tên khách hàng (*)', 'Mã (*)', 'Ngành', 'Website', 'Mã số thuế'],
  },
  {
    key: 'leads',
    label: 'Leads CRM',
    description: 'Import danh sách leads/tiềm năng',
    icon: <FunnelPlotOutlined />,
    color: '#F97316',
    fields: ['Tên lead (*)', 'Nguồn (*)', 'Giá trị ước tính', 'Ghi chú'],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function ImportPage() {
  const { message } = App.useApp();
  const { textPrimary, textMuted, bgCard, bgContainer, borderColor, isDark, preset } = useThemePalette();

  const [currentStep, setCurrentStep] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateKey | null>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<{ imported: number; skipped: number } | null>(null);

  const selectedTpl = TEMPLATES.find((t) => t.key === selectedTemplate);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  function handleSelectTemplate(key: TemplateKey) {
    setSelectedTemplate(key);
    setFileList([]);
    setPreviewResult(null);
    setCommitResult(null);
    setCurrentStep(1);
  }

  const uploadProps: UploadProps = {
    accept: '.xlsx,.xls,.csv',
    maxCount: 1,
    fileList,
    beforeUpload: (file) => {
      setFileList([file]);
      return false; // ngăn auto upload
    },
    onRemove: () => {
      setFileList([]);
      setPreviewResult(null);
    },
  };

  async function handlePreview() {
    if (!fileList[0] || !selectedTemplate) return;
    setIsPreviewing(true);
    try {
      const fd = new FormData();
      fd.append('file', fileList[0] as unknown as Blob);
      const res = await apiClient.post<PreviewResult>(
        `/import/preview?template=${selectedTemplate}`,
        fd,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      setPreviewResult(res.data);
      setCurrentStep(2);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      message.error(msg ?? 'Preview thất bại');
    } finally {
      setIsPreviewing(false);
    }
  }

  async function handleCommit() {
    if (!fileList[0] || !selectedTemplate) return;
    setIsCommitting(true);
    try {
      const fd = new FormData();
      fd.append('file', fileList[0] as unknown as Blob);
      const res = await apiClient.post<{ imported: number; skipped: number }>(
        `/import/commit?template=${selectedTemplate}`,
        fd,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      setCommitResult(res.data);
      setCurrentStep(3);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      message.error(msg ?? 'Import thất bại');
    } finally {
      setIsCommitting(false);
    }
  }

  function handleReset() {
    setCurrentStep(0);
    setSelectedTemplate(null);
    setFileList([]);
    setPreviewResult(null);
    setCommitResult(null);
  }

  // ─── Preview columns ───────────────────────────────────────────────────────

  function buildValidColumns(rows: ImportRow[]) {
    if (!rows.length) return [];
    return Object.keys(rows[0]).map((key) => ({
      title: <Text style={{ color: textPrimary }}>{key}</Text>,
      dataIndex: key,
      key,
      ellipsis: true,
      render: (v: string | number | undefined) => (
        <Text style={{ color: v !== undefined && v !== '' ? textPrimary : textMuted }}>
          {v !== undefined && v !== '' ? String(v) : '—'}
        </Text>
      ),
    }));
  }

  const errorColumns = [
    {
      title: <Text style={{ color: textPrimary }}>Dòng</Text>,
      dataIndex: 'row',
      key: 'row',
      width: 70,
      render: (v: number) => <Text style={{ color: textPrimary, fontWeight: 600 }}>#{v}</Text>,
    },
    {
      title: <Text style={{ color: textPrimary }}>Lỗi</Text>,
      dataIndex: 'message',
      key: 'message',
      render: (v: string) => <Text style={{ color: '#EF4444' }}>{v}</Text>,
    },
  ];

  // ─── Step renders ──────────────────────────────────────────────────────────

  const step0 = (
    <div>
      <Text style={{ color: textMuted, display: 'block', marginBottom: 20 }}>
        Chọn loại dữ liệu bạn muốn import:
      </Text>
      <Row gutter={16}>
        {TEMPLATES.map((tpl) => (
          <Col key={tpl.key} xs={24} sm={8}>
            <Card
              hoverable
              onClick={() => handleSelectTemplate(tpl.key)}
              style={{
                border: selectedTemplate === tpl.key
                  ? `2px solid ${tpl.color}`
                  : `1px solid ${borderColor}`,
                background: bgCard,
                cursor: 'pointer',
                borderRadius: 12,
                transition: 'all 0.2s',
              }}
              bodyStyle={{ padding: 20 }}
            >
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                  background: `${tpl.color}20`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, color: tpl.color,
                }}>
                  {tpl.icon}
                </div>
                <div>
                  <Title level={5} style={{ margin: 0, color: textPrimary }}>{tpl.label}</Title>
                  <Text style={{ color: textMuted, fontSize: 12 }}>{tpl.description}</Text>
                  <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {tpl.fields.map((f) => (
                      <Tag key={f} style={{
                        fontSize: 11, borderRadius: 4,
                        background: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
                        border: `1px solid ${borderColor}`,
                        color: textMuted,
                      }}>
                        {f}
                      </Tag>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );

  const step1 = (
    <div style={{ maxWidth: 540 }}>
      {selectedTpl && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 20, borderRadius: 8 }}
          message={`Template: ${selectedTpl.label}`}
          description={
            <span>
              File phải có các cột: <strong>{selectedTpl.fields.join(', ')}</strong>.
              Dấu (*) là bắt buộc. Dòng đầu tiên là tiêu đề cột.
            </span>
          }
        />
      )}

      <Upload.Dragger {...uploadProps} style={{ borderRadius: 12, borderColor }}>
        <p className="ant-upload-drag-icon">
          <UploadOutlined style={{ fontSize: 32, color: preset.primary }} />
        </p>
        <p className="ant-upload-text" style={{ color: textPrimary }}>
          Click hoặc kéo file vào đây để upload
        </p>
        <p className="ant-upload-hint" style={{ color: textMuted }}>
          Hỗ trợ: .xlsx, .xls, .csv — tối đa 5MB
        </p>
      </Upload.Dragger>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
        <Button onClick={() => setCurrentStep(0)}>Quay lại</Button>
        <Button
          type="primary"
          icon={<ArrowRightOutlined />}
          disabled={fileList.length === 0}
          loading={isPreviewing}
          onClick={handlePreview}
        >
          Preview dữ liệu
        </Button>
      </div>
    </div>
  );

  const step2 = previewResult && (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Tag
          style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981', borderColor: 'rgba(16,185,129,0.3)', fontSize: 13 }}
          icon={<CheckCircleOutlined />}
        >
          {previewResult.valid.length} dòng hợp lệ
        </Tag>
        <Tag
          style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444', borderColor: 'rgba(239,68,68,0.3)', fontSize: 13 }}
          icon={<CloseCircleOutlined />}
        >
          {previewResult.errors.length} dòng lỗi
        </Tag>
      </Space>

      {previewResult.valid.length > 0 && (
        <>
          <Text style={{ color: textPrimary, fontWeight: 600, display: 'block', marginBottom: 8 }}>
            Dòng hợp lệ sẽ được import:
          </Text>
          <Table
            dataSource={previewResult.valid.map((r, i) => ({ ...r, _key: i }))}
            columns={buildValidColumns(previewResult.valid)}
            rowKey="_key"
            size="small"
            pagination={{ pageSize: 10, showSizeChanger: false }}
            style={{ marginBottom: 20, background: bgContainer }}
            scroll={{ x: 'max-content' }}
          />
        </>
      )}

      {previewResult.errors.length > 0 && (
        <>
          <Text style={{ color: '#EF4444', fontWeight: 600, display: 'block', marginBottom: 8 }}>
            Dòng có lỗi (sẽ bị bỏ qua):
          </Text>
          <Table
            dataSource={previewResult.errors.map((e, i) => ({ ...e, _key: i }))}
            columns={errorColumns}
            rowKey="_key"
            size="small"
            pagination={false}
            style={{ marginBottom: 20, background: bgContainer }}
          />
        </>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={() => setCurrentStep(1)}>Quay lại</Button>
        <Button
          type="primary"
          disabled={previewResult.valid.length === 0}
          loading={isCommitting}
          onClick={handleCommit}
        >
          Xác nhận Import {previewResult.valid.length} dòng
        </Button>
      </div>
    </div>
  );

  const step3 = commitResult && (
    <Result
      status="success"
      title="Import hoàn tất!"
      subTitle={
        <Space direction="vertical">
          <Text style={{ color: textPrimary }}>
            Đã import thành công <strong>{commitResult.imported}</strong> dòng.
            {commitResult.skipped > 0 && <> Bỏ qua <strong>{commitResult.skipped}</strong> dòng lỗi hoặc trùng lặp.</>}
          </Text>
        </Space>
      }
      extra={[
        <Button key="again" type="primary" onClick={handleReset}>
          Import thêm
        </Button>,
      ]}
    />
  );

  // ─── Render ────────────────────────────────────────────────────────────────

  const stepContents = [step0, step1, step2, step3];

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Import Data"
        icon={<UploadOutlined />}
        iconColor="#6366F1"
      />

      <div style={{
        background: bgCard,
        border: `1px solid ${borderColor}`,
        borderRadius: 12,
        padding: '24px 28px',
        marginTop: 20,
      }}>
        <Steps
          current={currentStep}
          style={{ marginBottom: 32 }}
          items={[
            { title: <Text style={{ color: textPrimary }}>Chọn template</Text> },
            { title: <Text style={{ color: textPrimary }}>Upload file</Text> },
            { title: <Text style={{ color: textPrimary }}>Preview</Text> },
            { title: <Text style={{ color: textPrimary }}>Hoàn tất</Text> },
          ]}
        />

        <div style={{ minHeight: 300 }}>
          {stepContents[currentStep]}
        </div>
      </div>
    </div>
  );
}
