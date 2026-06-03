import { useState } from 'react';
import {
  Table, Button, Space, Typography, Select, Tag, Form, Row, Col,
  Input, InputNumber, DatePicker, message,
} from 'antd';
import { CenteredModal } from '../../components/ui/CenteredModal';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { PlusOutlined, CheckCircleOutlined, ScheduleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  useGetAllInterviews, useCreateInterview, useSetInterviewResult, useGetCandidates,
  type Interview, type InterviewType, type InterviewResult,
} from '../../api/recruit';
import { useThemePalette } from '../../hooks/useThemePalette';
import { usePagination } from '../../hooks/usePagination';

const { Text } = Typography;
const { TextArea } = Input;

const TYPE_META: Record<InterviewType, { label: string; color: string; darkBg?: string; darkBorder?: string }> = {
  PHONE:     { label: 'Phone',     color: '#3B82F6', darkBg: 'rgba(59,130,246,0.15)', darkBorder: 'rgba(59,130,246,0.35)' },
  TECHNICAL: { label: 'Technical', color: '#8B5CF6', darkBg: 'rgba(139,92,246,0.15)', darkBorder: 'rgba(139,92,246,0.35)' },
  HR:        { label: 'HR',        color: '#06B6D4', darkBg: 'rgba(6,182,212,0.15)', darkBorder: 'rgba(6,182,212,0.35)' },
  FINAL:     { label: 'Final',     color: '#F97316', darkBg: 'rgba(249,115,22,0.15)', darkBorder: 'rgba(249,115,22,0.35)' },
};

const RESULT_META: Record<InterviewResult, { label: string; color: string; darkBg?: string; darkBorder?: string }> = {
  PASS:    { label: 'Pass',    color: '#10B981', darkBg: 'rgba(16,185,129,0.15)', darkBorder: 'rgba(16,185,129,0.35)' },
  FAIL:    { label: 'Fail',    color: '#EF4444', darkBg: 'rgba(239,68,68,0.15)', darkBorder: 'rgba(239,68,68,0.35)' },
  PENDING: { label: 'Chờ kết quả', color: '#64748B', darkBg: 'rgba(100,116,139,0.15)', darkBorder: 'rgba(100,116,139,0.35)' },
};

const TYPE_OPTIONS    = Object.entries(TYPE_META).map(([k, v])   => ({ value: k as InterviewType,   label: v.label }));
const RESULT_OPTIONS  = Object.entries(RESULT_META).map(([k, v]) => ({ value: k as InterviewResult, label: v.label }));

export default function InterviewsPage() {
  const { isDark, bgContainer, borderColor, textPrimary, textMuted, linkColor, preset } = useThemePalette();

  const { page, pageSize, paginationProps } = usePagination(20);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [resultOpen, setResultOpen]     = useState(false);
  const [selected, setSelected]         = useState<Interview | null>(null);
  const [scheduleForm] = Form.useForm();
  const [resultForm]   = Form.useForm();

  const { data, isLoading }       = useGetAllInterviews({ page, limit: pageSize });
  const { data: candidatesData }  = useGetCandidates({ limit: 200 });
  const candidates = candidatesData?.data ?? [];

  const createMutation = useCreateInterview();
  const resultMutation = useSetInterviewResult();

  const openSchedule = () => {
    scheduleForm.resetFields();
    setScheduleOpen(true);
  };

  const openResult = (iv: Interview) => {
    setSelected(iv);
    resultForm.setFieldsValue({ result: iv.result, score: iv.score, notes: iv.notes });
    setResultOpen(true);
  };

  const handleSchedule = async () => {
    const values = await scheduleForm.validateFields();
    await createMutation.mutateAsync({
      ...values,
      scheduledAt: values.scheduledAt.toISOString(),
    });
    message.success('Đã lên lịch phỏng vấn');
    setScheduleOpen(false);
  };

  const handleResult = async () => {
    if (!selected) return;
    const values = await resultForm.validateFields();
    await resultMutation.mutateAsync({ id: selected.id, data: values });
    message.success('Đã cập nhật kết quả');
    setResultOpen(false);
  };

  const columns: ColumnsType<Interview> = [
    {
      title: 'Ứng viên', key: 'candidate',
      render: (_: unknown, row: Interview) => (
        <Space direction="vertical" size={0}>
          <Text style={{ color: textPrimary, fontWeight: 500 }}>{row.candidate?.name ?? '—'}</Text>
          {row.candidate?.jobOpening && (
            <Text style={{ fontSize: 12, color: textMuted }}>{row.candidate.jobOpening.title}</Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Loại', dataIndex: 'type', width: 110,
      render: (v: InterviewType) => {
        const meta = TYPE_META[v];
        return (
          <Tag
            style={isDark ? { background: meta.darkBg, color: meta.color, borderColor: meta.darkBorder } : {}}
            color={isDark ? undefined : (v === 'PHONE' ? 'blue' : v === 'TECHNICAL' ? 'purple' : v === 'HR' ? 'cyan' : 'orange')}
          >
            {meta.label}
          </Tag>
        );
      },
    },
    {
      title: 'Lịch hẹn', dataIndex: 'scheduledAt', width: 160,
      render: (v: string) => (
        <Space direction="vertical" size={0}>
          <Text style={{ color: textPrimary }}>{dayjs(v).format('DD/MM/YYYY')}</Text>
          <Text style={{ fontSize: 12, color: textMuted }}>{dayjs(v).format('HH:mm')}</Text>
        </Space>
      ),
    },
    { title: 'Địa điểm', dataIndex: 'location', width: 160, render: (v?: string) => v ? <Text style={{ color: textPrimary }}>{v}</Text> : <Text style={{ color: textMuted }}>—</Text> },
    {
      title: 'Điểm', dataIndex: 'score', width: 70, align: 'center',
      render: (v?: number) => v != null ? <Text style={{ color: linkColor, fontWeight: 600 }}>{v}</Text> : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      title: 'Kết quả', dataIndex: 'result', width: 130,
      render: (v: InterviewResult) => {
        const meta = RESULT_META[v];
        return (
          <Tag
            style={isDark ? { background: meta.darkBg, color: meta.color, borderColor: meta.darkBorder } : {}}
            color={isDark ? undefined : (v === 'PASS' ? 'green' : v === 'FAIL' ? 'red' : 'default')}
          >
            {meta.label}
          </Tag>
        );
      },
    },
    {
      title: '', key: 'actions', width: 80, align: 'right',
      render: (_: unknown, row: Interview) => (
        <Button size="small" icon={<CheckCircleOutlined />} onClick={() => openResult(row)}>
          Kết quả
        </Button>
      ),
    },
  ];

  const totalInterviews = data?.total ?? 0;
  const passedCount = data?.data?.filter(i => i.result === 'PASS').length ?? 0;
  const failedCount = data?.data?.filter(i => i.result === 'FAIL').length ?? 0;
  const pendingCount = data?.data?.filter(i => i.result === 'PENDING').length ?? 0;

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Phỏng vấn"
        icon={<ScheduleOutlined />}
        iconColor="#3B82F6"
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={openSchedule}
            style={{ background: preset.primary, borderColor: preset.primary }}>
            Lên lịch
          </Button>
        }
      />

      {/* Stat Cards */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}><StatCard label="Tổng phỏng vấn" value={totalInterviews} color="#6366F1" icon={<ScheduleOutlined />} /></Col>
        <Col xs={12} sm={6}><StatCard label="Đã đậu" value={passedCount} color="#10B981" icon={<CheckCircleOutlined />} /></Col>
        <Col xs={12} sm={6}><StatCard label="Chưa đậu" value={failedCount} color="#EF4444" icon={<CheckCircleOutlined />} /></Col>
        <Col xs={12} sm={6}><StatCard label="Chờ kết quả" value={pendingCount} color="#F59E0B" icon={<ScheduleOutlined />} /></Col>
      </Row>

      {/* Table */}
      <div style={{ background: bgContainer, borderRadius: 8, border: `1px solid ${borderColor}` }}>
        <Table<Interview>
          rowKey="id" columns={columns} dataSource={data?.data ?? []} loading={isLoading}
          pagination={paginationProps(data?.total, 'lịch phỏng vấn')}
        />
      </div>

      {/* Schedule CenteredModal */}
      <CenteredModal title="Lên lịch phỏng vấn" open={scheduleOpen} width={440}
        onClose={() => setScheduleOpen(false)}
        extra={<Button type="primary" loading={createMutation.isPending} disabled={createMutation.isPending} onClick={handleSchedule}
          style={{ background: preset.primary, borderColor: preset.primary }}>Lưu</Button>}>
        <Form form={scheduleForm} layout="vertical">
          <Form.Item name="candidateId" label="Ứng viên" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label"
              options={candidates.map(c => ({ value: c.id, label: `${c.name} — ${c.jobOpening?.title ?? ''}` }))} />
          </Form.Item>
          <Form.Item name="type" label="Loại phỏng vấn" rules={[{ required: true }]}>
            <Select options={TYPE_OPTIONS} />
          </Form.Item>
          <Form.Item name="scheduledAt" label="Thời gian" rules={[{ required: true }]}>
            <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="location" label="Địa điểm"><Input /></Form.Item>
          <Form.Item name="meetingUrl" label="Meeting URL"><Input placeholder="https://meet.google.com/..." /></Form.Item>
        </Form>
      </CenteredModal>

      {/* Result CenteredModal */}
      <CenteredModal title={`Kết quả: ${selected?.candidate?.name ?? ''}`} open={resultOpen} width={400}
        onClose={() => setResultOpen(false)}
        extra={<Button type="primary" loading={resultMutation.isPending} disabled={resultMutation.isPending} onClick={handleResult}
          style={{ background: preset.primary, borderColor: preset.primary }}>Lưu</Button>}>
        <Form form={resultForm} layout="vertical">
          <Form.Item name="result" label="Kết quả" rules={[{ required: true }]}>
            <Select options={RESULT_OPTIONS} />
          </Form.Item>
          <Form.Item name="score" label="Điểm (0–100)">
            <InputNumber min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="notes" label="Nhận xét">
            <TextArea rows={3} />
          </Form.Item>
        </Form>
      </CenteredModal>
    </div>
  );
}
