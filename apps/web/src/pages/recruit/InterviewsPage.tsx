import { useState } from 'react';
import {
  Table, Button, Space, Typography, Select, Tag, Form,
  Input, InputNumber, DatePicker, Modal, message,
} from 'antd';
import { CenteredModal } from '../../components/ui/CenteredModal';
import { PlusOutlined, CheckCircleOutlined, ScheduleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  useGetAllInterviews, useCreateInterview, useSetInterviewResult, useGetCandidates,
  type Interview, type InterviewType, type InterviewResult,
} from '../../api/recruit';
import { useThemePalette } from '../../hooks/useThemePalette';

const { Title, Text } = Typography;
const { TextArea } = Input;

const TYPE_META: Record<InterviewType, { label: string; color: string }> = {
  PHONE:     { label: 'Phone',     color: 'blue' },
  TECHNICAL: { label: 'Technical', color: 'purple' },
  HR:        { label: 'HR',        color: 'cyan' },
  FINAL:     { label: 'Final',     color: 'orange' },
};

const RESULT_META: Record<InterviewResult, { label: string; color: string }> = {
  PASS:    { label: 'Pass',    color: 'green' },
  FAIL:    { label: 'Fail',    color: 'red' },
  PENDING: { label: 'Chờ kết quả', color: 'default' },
};

const TYPE_OPTIONS    = Object.entries(TYPE_META).map(([k, v])   => ({ value: k as InterviewType,   label: v.label }));
const RESULT_OPTIONS  = Object.entries(RESULT_META).map(([k, v]) => ({ value: k as InterviewResult, label: v.label }));

export default function InterviewsPage() {
  const { isDark, bgContainer, bgCard, borderColor, textPrimary, textMuted, linkColor, preset } = useThemePalette();

  const [page, setPage]                 = useState(1);
  const [limit, setLimit]               = useState(20);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [resultOpen, setResultOpen]     = useState(false);
  const [selected, setSelected]         = useState<Interview | null>(null);
  const [scheduleForm] = Form.useForm();
  const [resultForm]   = Form.useForm();

  const { data, isLoading }       = useGetAllInterviews({ page, limit });
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
    { title: 'Loại',    dataIndex: 'type',   width: 110, render: (v: InterviewType)   => <Tag color={TYPE_META[v].color}>{TYPE_META[v].label}</Tag> },
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
    { title: 'Kết quả', dataIndex: 'result', width: 130, render: (v: InterviewResult) => <Tag color={RESULT_META[v].color}>{RESULT_META[v].label}</Tag> },
    {
      title: '', key: 'actions', width: 80, align: 'right',
      render: (_: unknown, row: Interview) => (
        <Button size="small" icon={<CheckCircleOutlined />} onClick={() => openResult(row)}>
          Kết quả
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ScheduleOutlined style={{ color: '#0EA5E9', fontSize: 20 }} />
          <Title level={4} style={{ margin: 0, color: textPrimary }}>Phỏng vấn</Title>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openSchedule}
          style={{ background: preset.primary, borderColor: preset.primary }}>
          Lên lịch
        </Button>
      </div>

      <div style={{ background: bgContainer, borderRadius: 8, border: `1px solid ${borderColor}` }}>
        <Table<Interview>
          rowKey="id" columns={columns} dataSource={data?.data ?? []} loading={isLoading}
          pagination={{ current: page, pageSize: limit, total: data?.total ?? 0, showSizeChanger: true,
            onChange: (p, l) => { setPage(p); setLimit(l); } }}
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
