import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Row, Col, Card, Typography, Tag, Button, Form, Input, Select,
  Timeline, Progress, Alert, Spin, Result, Space, Divider,
} from 'antd';
import {
  FileTextOutlined, MessageOutlined, CheckCircleOutlined,
  ClockCircleOutlined, ExclamationCircleOutlined, SendOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { portalPublicApi, type TicketPriority, type TicketStatus } from '../../api/portal';

const { Text, Title, Paragraph } = Typography;

const STATUS_COLOR: Record<string, string>  = { DRAFT:'default', ACTIVE:'processing', COMPLETED:'success', CANCELLED:'error', SIGNED:'success' };
const TICKET_STATUS_LABEL: Record<TicketStatus, string> = { OPEN:'Mới', IN_PROGRESS:'Đang xử lý', RESOLVED:'Giải quyết', CLOSED:'Đóng' };
const TICKET_STATUS_COLOR: Record<TicketStatus, string> = { OPEN:'processing', IN_PROGRESS:'warning', RESOLVED:'success', CLOSED:'default' };
const MILESTONE_COLOR: Record<string, string> = { PENDING:'default', IN_PROGRESS:'processing', COMPLETED:'success', DELAYED:'error' };

function ProgressRing({ percent, label }: { percent: number; label: string }) {
  const color = percent >= 100 ? '#10B981' : percent >= 60 ? '#3B82F6' : '#F59E0B';
  return (
    <div style={{ textAlign: 'center' }}>
      <Progress type="circle" percent={Math.min(100, Math.round(percent))} strokeColor={color} size={80} />
      <Text style={{ display: 'block', marginTop: 8, fontSize: 13, color: '#94A3B8' }}>{label}</Text>
    </div>
  );
}

export default function CustomerPortalPage() {
  const { token } = useParams<{ token: string }>();
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form] = Form.useForm();
  const qc = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['portal', token],
    queryFn: () => portalPublicApi.getData(token!),
    enabled: !!token,
    retry: false,
  });

  const mutateTicket = useMutation({
    mutationFn: (vals: any) => portalPublicApi.submitTicket(token!, {
      title:       vals.title,
      description: vals.description,
      priority:    vals.priority ?? 'MEDIUM',
      submittedBy: vals.submittedBy,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal', token] });
      form.resetFields();
      setSubmitOpen(false);
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 5000);
    },
  });

  if (isLoading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F1F5F9' }}>
      <Spin size="large" />
    </div>
  );

  if (isError || !data) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F1F5F9' }}>
      <Result status="404" title="Portal không tồn tại" subTitle="Link này không hợp lệ hoặc đã hết hạn. Vui lòng liên hệ đội ngũ để được hỗ trợ." />
    </div>
  );

  const { portal, contracts, deals, tickets } = data;
  const openTickets = tickets.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS');

  // Tính overall progress từ milestones
  const allMilestones = contracts.flatMap((c: any) => c.milestones ?? []);
  const completedMs = allMilestones.filter((m: any) => m.status === 'COMPLETED').length;
  const progressPct = allMilestones.length > 0 ? (completedMs / allMilestones.length) * 100 : 0;

  return (
    <div style={{ minHeight: '100vh', background: '#F1F5F9' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1d2b3a 0%, #0d1526 100%)', padding: '32px 40px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, display: 'block' }}>
                Loop360 · Customer Portal
              </Text>
              <Title level={2} style={{ color: '#fff', margin: '4px 0 0' }}>{portal.name}</Title>
              <Text style={{ color: 'rgba(255,255,255,0.7)' }}>{portal.customer.name}</Text>
            </div>
            <Button
              type="primary"
              icon={<MessageOutlined />}
              size="large"
              onClick={() => setSubmitOpen(true)}
              style={{ background: '#6366F1', borderColor: '#6366F1' }}
            >
              Gửi yêu cầu hỗ trợ
            </Button>
          </div>

          {portal.welcomeMessage && (
            <div style={{ marginTop: 20, background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '12px 16px', borderLeft: '3px solid #6366F1' }}>
              <Text style={{ color: 'rgba(255,255,255,0.85)' }}>{portal.welcomeMessage}</Text>
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
        {submitted && <Alert type="success" message="Yêu cầu của bạn đã được gửi thành công!" style={{ marginBottom: 24 }} showIcon closable />}

        {/* KPI Strip */}
        <Row gutter={16} style={{ marginBottom: 32 }}>
          <Col xs={24} sm={8}>
            <Card style={{ borderRadius: 12, textAlign: 'center' }}>
              <ProgressRing percent={progressPct} label="Tiến độ tổng thể" />
            </Card>
          </Col>
          <Col xs={12} sm={8}>
            <Card style={{ borderRadius: 12, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <Title level={2} style={{ color: '#10B981', margin: 0 }}>{completedMs}/{allMilestones.length}</Title>
                <Text style={{ color: '#94A3B8' }}>Milestones hoàn thành</Text>
              </div>
            </Card>
          </Col>
          <Col xs={12} sm={8}>
            <Card style={{ borderRadius: 12, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <Title level={2} style={{ color: openTickets.length > 0 ? '#EF4444' : '#10B981', margin: 0 }}>
                  {openTickets.length}
                </Title>
                <Text style={{ color: '#94A3B8' }}>Yêu cầu đang xử lý</Text>
              </div>
            </Card>
          </Col>
        </Row>

        <Row gutter={[24, 24]}>
          {/* Contracts & Milestones */}
          <Col xs={24} lg={14}>
            <Card title="Hợp đồng & Milestones" style={{ borderRadius: 12 }}>
              {contracts.length === 0 ? (
                <Text style={{ color: '#94A3B8' }}>Chưa có hợp đồng nào.</Text>
              ) : contracts.map((c: any) => (
                <div key={c.id} style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <Text style={{ fontWeight: 600, fontSize: 15 }}>{c.title}</Text>
                      <br />
                      <Text style={{ color: '#94A3B8', fontSize: 12 }}>{c.contractNo}</Text>
                    </div>
                    <Tag color={STATUS_COLOR[c.status] ?? 'default'}>{c.status}</Tag>
                  </div>
                  {(c.milestones ?? []).length > 0 && (
                    <Timeline
                      items={(c.milestones as any[]).map((m: any) => ({
                        color: m.status === 'COMPLETED' ? 'green' : m.status === 'DELAYED' ? 'red' : m.status === 'IN_PROGRESS' ? 'blue' : 'gray',
                        dot: m.status === 'COMPLETED' ? <CheckCircleOutlined style={{ color: '#10B981' }} /> : undefined,
                        children: (
                          <div>
                            <Text style={{ fontWeight: 500 }}>{m.title}</Text>
                            <br />
                            <Space size={8}>
                              <Tag color={MILESTONE_COLOR[m.status] ?? 'default'} style={{ fontSize: 11 }}>{m.status}</Tag>
                              {m.dueDate && <Text style={{ color: '#94A3B8', fontSize: 12 }}>Deadline: {new Date(m.dueDate).toLocaleDateString('vi-VN')}</Text>}
                            </Space>
                          </div>
                        ),
                      }))}
                    />
                  )}
                  <Divider />
                </div>
              ))}
            </Card>
          </Col>

          {/* Tickets */}
          <Col xs={24} lg={10}>
            <Card
              title="Yêu cầu hỗ trợ"
              extra={<Button size="small" icon={<MessageOutlined />} onClick={() => setSubmitOpen(true)}>Gửi mới</Button>}
              style={{ borderRadius: 12 }}
            >
              {tickets.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: '#94A3B8' }}>
                  <MessageOutlined style={{ fontSize: 32, marginBottom: 8 }} />
                  <br />
                  Chưa có yêu cầu hỗ trợ nào
                </div>
              ) : tickets.map(t => (
                <div key={t.id} style={{ padding: '12px 0', borderBottom: '1px solid #F1F5F9' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontWeight: 500, flex: 1 }}>{t.title}</Text>
                    <Tag color={TICKET_STATUS_COLOR[t.status]} style={{ marginLeft: 8 }}>
                      {TICKET_STATUS_LABEL[t.status]}
                    </Tag>
                  </div>
                  <Text style={{ color: '#94A3B8', fontSize: 12 }}>
                    {new Date(t.createdAt).toLocaleDateString('vi-VN')} · {t.submittedBy || 'Ẩn danh'}
                  </Text>
                  {t.response && (
                    <div style={{ marginTop: 8, background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 6, padding: '8px 12px' }}>
                      <Text style={{ color: '#166534', fontSize: 13 }}><b>Phản hồi:</b> {t.response}</Text>
                    </div>
                  )}
                </div>
              ))}
            </Card>
          </Col>
        </Row>
      </div>

      {/* Submit Ticket Modal */}
      {submitOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setSubmitOpen(false)}>
          <div
            style={{ background: '#fff', borderRadius: 12, padding: 32, width: 520, maxWidth: '90vw' }}
            onClick={e => e.stopPropagation()}
          >
            <Title level={4} style={{ marginTop: 0 }}>Gửi yêu cầu hỗ trợ</Title>
            <Form form={form} layout="vertical" onFinish={mutateTicket.mutate}>
              <Form.Item name="submittedBy" label="Họ tên">
                <Input placeholder="Tên của bạn" />
              </Form.Item>
              <Form.Item name="title" label="Tiêu đề" rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}>
                <Input placeholder="Mô tả ngắn vấn đề..." />
              </Form.Item>
              <Form.Item name="priority" label="Mức độ ưu tiên" initialValue="MEDIUM">
                <Select options={[
                  { value: 'LOW', label: 'Thấp — Không ảnh hưởng công việc' },
                  { value: 'MEDIUM', label: 'Trung bình — Cần xử lý trong 1-2 ngày' },
                  { value: 'HIGH', label: 'Cao — Ảnh hưởng đến tiến độ' },
                  { value: 'URGENT', label: 'Khẩn cấp — Hệ thống bị gián đoạn' },
                ]} />
              </Form.Item>
              <Form.Item name="description" label="Mô tả chi tiết" rules={[{ required: true, message: 'Vui lòng mô tả vấn đề' }]}>
                <Input.TextArea rows={5} placeholder="Mô tả vấn đề, các bước để tái hiện, kết quả mong đợi..." />
              </Form.Item>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <Button onClick={() => setSubmitOpen(false)}>Hủy</Button>
                <Button type="primary" htmlType="submit" loading={mutateTicket.isPending} disabled={mutateTicket.isPending} icon={<SendOutlined />} style={{ background: '#6366F1', borderColor: '#6366F1' }}>
                  Gửi yêu cầu
                </Button>
              </div>
            </Form>
          </div>
        </div>
      )}
    </div>
  );
}
