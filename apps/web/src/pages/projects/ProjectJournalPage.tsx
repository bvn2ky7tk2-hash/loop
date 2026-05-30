import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Button, Card, Col, Form, Input, Modal, Row, Space, Tabs, Tag, Timeline,
  Typography, App, Spin,
} from 'antd';
import {
  BookOutlined, PlusOutlined, CheckCircleOutlined,
  ClockCircleOutlined, FileTextOutlined, CheckOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useThemePalette } from '../../hooks/useThemePalette';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { CenteredModal } from '../../components/ui/CenteredModal';
import {
  projectJournalApi,
  type ProjectJournal,
  type JournalItem,
} from '../../api/projects';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

// Tạo id ngẫu nhiên cho item
function newItemId() {
  return Math.random().toString(36).slice(2, 10);
}

interface ItemListProps {
  items: JournalItem[];
  isDark: boolean;
  textPrimary: string;
  textMuted: string;
  linkColor: string;
  onConvert?: (item: JournalItem) => void;
  onIgnore?: (item: JournalItem) => void;
  readOnly?: boolean;
}

function ItemList({ items, isDark, textPrimary, textMuted, linkColor, onConvert, onIgnore, readOnly }: ItemListProps) {
  if (!items.length) {
    return <Text style={{ color: textMuted }}>Không có mục nào.</Text>;
  }
  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      {items.map((item) => (
        <div
          key={item.id}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            padding: '8px 10px',
            borderRadius: 8,
            background: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC',
          }}
        >
          <div style={{ flex: 1 }}>
            <Text style={{ color: item.status === 'CONVERTED' ? textMuted : textPrimary }}>
              {item.text}
            </Text>
            {item.status === 'CONVERTED' && (
              <Tag
                style={
                  isDark
                    ? { background: 'rgba(52,211,153,0.15)', color: '#6EE7B7', borderColor: 'rgba(52,211,153,0.3)' }
                    : {}
                }
                color={isDark ? undefined : 'green'}
              >
                Đã tạo Task
              </Tag>
            )}
            {item.status === 'IGNORED' && (
              <Tag color="default">Bỏ qua</Tag>
            )}
          </div>
          {!readOnly && !item.status && (
            <Space size={6}>
              {onConvert && (
                <Button
                  size="small"
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={() => onConvert(item)}
                  style={{ fontSize: 12 }}
                >
                  Tạo Task
                </Button>
              )}
              {onIgnore && (
                <Button
                  size="small"
                  onClick={() => onIgnore(item)}
                  style={{ fontSize: 12, color: textMuted }}
                >
                  Bỏ qua
                </Button>
              )}
            </Space>
          )}
        </div>
      ))}
    </Space>
  );
}

interface JournalCardProps {
  journal: ProjectJournal;
  isDark: boolean;
  textPrimary: string;
  textMuted: string;
  textSecondary: string;
  bgCard: string;
  borderColor: string;
  linkColor: string;
  onSelect: (j: ProjectJournal) => void;
}

function JournalCard({ journal, isDark, textPrimary, textMuted, textSecondary, bgCard, borderColor, linkColor, onSelect }: JournalCardProps) {
  const unresolvedOpen = ((journal.unresolvedItems ?? []) as JournalItem[]).filter(
    (i) => !i.status || i.status === 'OPEN',
  ).length;

  return (
    <Card
      hoverable
      onClick={() => onSelect(journal)}
      style={{
        background: bgCard,
        border: `1px solid ${borderColor}`,
        borderRadius: 10,
        cursor: 'pointer',
        marginBottom: 8,
      }}
      bodyStyle={{ padding: '12px 16px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Text strong style={{ color: textPrimary, fontSize: 14 }}>
            {journal.title}
          </Text>
          <div style={{ marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {journal.location && (
              <Text style={{ color: textMuted, fontSize: 12 }}>📍 {journal.location}</Text>
            )}
            {journal.startTime && (
              <Text style={{ color: textMuted, fontSize: 12 }}>
                ⏰ {journal.startTime}{journal.endTime ? ` – ${journal.endTime}` : ''}
              </Text>
            )}
            <Text style={{ color: textMuted, fontSize: 12 }}>
              👤 {journal.createdBy?.name ?? 'N/A'}
            </Text>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {(journal.resolvedItems?.length ?? 0) > 0 && (
            <Tag
              icon={<CheckCircleOutlined />}
              style={
                isDark
                  ? { background: 'rgba(52,211,153,0.15)', color: '#6EE7B7', borderColor: 'rgba(52,211,153,0.3)' }
                  : {}
              }
              color={isDark ? undefined : 'green'}
            >
              {journal.resolvedItems.length} chốt
            </Tag>
          )}
          {unresolvedOpen > 0 && (
            <Tag
              icon={<ClockCircleOutlined />}
              style={
                isDark
                  ? { background: 'rgba(248,113,113,0.15)', color: '#FCA5A5', borderColor: 'rgba(248,113,113,0.3)' }
                  : {}
              }
              color={isDark ? undefined : 'red'}
            >
              {unresolvedOpen} chưa chốt
            </Tag>
          )}
        </div>
      </div>
    </Card>
  );
}

// ─── Trang chính ─────────────────────────────────────────────────────────────

export default function ProjectJournalPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const { message } = App.useApp();
  const qc = useQueryClient();

  const {
    isDark, textPrimary, textMuted, textSecondary,
    bgContainer, bgCard, borderColor, linkColor,
  } = useThemePalette();

  const [createOpen, setCreateOpen]       = useState(false);
  const [selectedJournal, setSelected]    = useState<ProjectJournal | null>(null);
  const [convertItem, setConvertItem]     = useState<{ journal: ProjectJournal; item: JournalItem } | null>(null);
  const [convertForm] = Form.useForm();
  const [createForm]  = Form.useForm();

  // Temp unresolved items trong form tạo mới
  const [formUnresolved, setFormUnresolved] = useState<string[]>(['']);
  const [formResolved,   setFormResolved]   = useState<string[]>(['']);

  // Queries
  const { data: listData, isLoading } = useQuery({
    queryKey: ['project-journals', projectId],
    queryFn:  () => projectJournalApi.list(projectId!, 1, 100),
    enabled:  !!projectId,
  });

  const { data: summary } = useQuery({
    queryKey: ['project-journals-summary', projectId],
    queryFn:  () => projectJournalApi.unresolvedSummary(projectId!),
    enabled:  !!projectId,
  });

  const journals = listData?.data ?? [];
  const total    = listData?.total ?? 0;

  // Group by date for timeline
  const groupedByDate = journals.reduce<Record<string, ProjectJournal[]>>((acc, j) => {
    const d = dayjs(j.date).format('YYYY-MM-DD');
    if (!acc[d]) acc[d] = [];
    acc[d].push(j);
    return acc;
  }, {});
  const dates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  // Mutations
  const createMut = useMutation({
    mutationFn: (data: Parameters<typeof projectJournalApi.create>[1]) =>
      projectJournalApi.create(projectId!, data),
    onSuccess: () => {
      message.success('Đã ghi nhật ký');
      qc.invalidateQueries({ queryKey: ['project-journals', projectId] });
      qc.invalidateQueries({ queryKey: ['project-journals-summary', projectId] });
      setCreateOpen(false);
      createForm.resetFields();
      setFormUnresolved(['']);
      setFormResolved(['']);
    },
    onError: () => message.error('Không thể ghi nhật ký'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof projectJournalApi.update>[1] }) =>
      projectJournalApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-journals', projectId] });
      qc.invalidateQueries({ queryKey: ['project-journals-summary', projectId] });
    },
  });

  const convertMut = useMutation({
    mutationFn: ({ journalId, itemId, data }: { journalId: string; itemId: string; data: { taskTitle: string; assigneeId?: string } }) =>
      projectJournalApi.convertToTask(journalId, itemId, data),
    onSuccess: () => {
      message.success('Đã tạo Task từ mục chưa chốt');
      qc.invalidateQueries({ queryKey: ['project-journals', projectId] });
      qc.invalidateQueries({ queryKey: ['project-journals-summary', projectId] });
      // Cập nhật selectedJournal trong memory
      if (selectedJournal) {
        const updated = journals.find((j) => j.id === selectedJournal.id);
        if (updated) setSelected(updated);
      }
      setConvertItem(null);
      convertForm.resetFields();
    },
    onError: () => message.error('Không thể tạo Task'),
  });

  // Handlers
  function handleCreate(values: any) {
    const resolvedItems = formResolved
      .filter((t) => t.trim())
      .map((text) => ({ id: newItemId(), text, status: 'OPEN' as const }));
    const unresolvedItems = formUnresolved
      .filter((t) => t.trim())
      .map((text) => ({ id: newItemId(), text, status: 'OPEN' as const }));

    createMut.mutate({
      date:           dayjs(values.date).format('YYYY-MM-DD'),
      title:          values.title,
      startTime:      values.startTime,
      endTime:        values.endTime,
      location:       values.location,
      participants:   values.participants ? values.participants.split(',').map((s: string) => s.trim()) : [],
      content:        values.content,
      resolvedItems,
      unresolvedItems,
    });
  }

  function handleIgnore(journal: ProjectJournal, item: JournalItem) {
    const updated = (journal.unresolvedItems as JournalItem[]).map((i) =>
      i.id === item.id ? { ...i, status: 'IGNORED' as const } : i,
    );
    updateMut.mutate({
      id: journal.id,
      data: { unresolvedItems: updated },
    });
    if (selectedJournal?.id === journal.id) {
      setSelected({ ...selectedJournal, unresolvedItems: updated });
    }
  }

  function handleConvertSubmit(values: any) {
    if (!convertItem) return;
    convertMut.mutate({
      journalId: convertItem.journal.id,
      itemId:    convertItem.item.id,
      data:      { taskTitle: values.taskTitle },
    });
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Nhật ký Dự án"
        icon={<BookOutlined />}
        iconColor="#6366F1"
        actions={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateOpen(true)}
          >
            Ghi nhật ký
          </Button>
        }
      />

      {/* KPI cards */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={8}>
          <StatCard
            label="Tổng nhật ký"
            value={total}
            color="#6366F1"
            icon={<BookOutlined />}
          />
        </Col>
        <Col xs={12} sm={8}>
          <StatCard
            label="Vấn đề chưa chốt"
            value={summary?.open ?? 0}
            color={summary?.open ? '#EF4444' : '#10B981'}
            icon={<ClockCircleOutlined />}
          />
        </Col>
        <Col xs={12} sm={8}>
          <StatCard
            label="Đã xử lý"
            value={summary?.resolved ?? 0}
            color="#10B981"
            icon={<CheckCircleOutlined />}
          />
        </Col>
      </Row>

      {/* Timeline view */}
      {isLoading ? (
        <Spin style={{ display: 'block', margin: '40px auto' }} />
      ) : dates.length === 0 ? (
        <Card style={{ background: bgCard, border: `1px solid ${borderColor}`, textAlign: 'center', padding: 40 }}>
          <BookOutlined style={{ fontSize: 48, color: textMuted, marginBottom: 12 }} />
          <br />
          <Text style={{ color: textMuted }}>Chưa có nhật ký nào. Nhấn "Ghi nhật ký" để bắt đầu.</Text>
        </Card>
      ) : (
        <Timeline
          mode="left"
          items={dates.map((date) => ({
            label: (
              <Text strong style={{ color: linkColor, fontSize: 13 }}>
                {dayjs(date).format('DD/MM/YYYY')}
              </Text>
            ),
            dot: <BookOutlined style={{ color: '#6366F1', fontSize: 14 }} />,
            children: (
              <div style={{ paddingBottom: 8 }}>
                {groupedByDate[date].map((j) => (
                  <JournalCard
                    key={j.id}
                    journal={j}
                    isDark={isDark}
                    textPrimary={textPrimary}
                    textMuted={textMuted}
                    textSecondary={textSecondary}
                    bgCard={bgCard}
                    borderColor={borderColor}
                    linkColor={linkColor}
                    onSelect={setSelected}
                  />
                ))}
              </div>
            ),
          }))}
        />
      )}

      {/* Modal chi tiết */}
      <CenteredModal
        open={!!selectedJournal}
        onClose={() => setSelected(null)}
        title={
          <Space>
            <BookOutlined style={{ color: '#6366F1' }} />
            <span style={{ color: textPrimary }}>{selectedJournal?.title}</span>
            <Text style={{ color: textMuted, fontSize: 12 }}>
              {selectedJournal ? dayjs(selectedJournal.date).format('DD/MM/YYYY') : ''}
            </Text>
          </Space>
        }
        width={700}
        footer={null}
      >
        {selectedJournal && (
          <Tabs
            defaultActiveKey="content"
            items={[
              {
                key: 'content',
                label: (
                  <span style={{ color: textPrimary }}>
                    <FileTextOutlined /> Nội dung
                  </span>
                ),
                children: (
                  <div style={{ padding: '8px 0' }}>
                    {selectedJournal.location && (
                      <div style={{ marginBottom: 8 }}>
                        <Text style={{ color: textMuted }}>📍 Địa điểm: </Text>
                        <Text style={{ color: textPrimary }}>{selectedJournal.location}</Text>
                      </div>
                    )}
                    {selectedJournal.startTime && (
                      <div style={{ marginBottom: 8 }}>
                        <Text style={{ color: textMuted }}>⏰ Thời gian: </Text>
                        <Text style={{ color: textPrimary }}>
                          {selectedJournal.startTime}
                          {selectedJournal.endTime ? ` – ${selectedJournal.endTime}` : ''}
                        </Text>
                      </div>
                    )}
                    {selectedJournal.participants?.length > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        <Text style={{ color: textMuted }}>👥 Người tham dự: </Text>
                        <Text style={{ color: textPrimary }}>{selectedJournal.participants.join(', ')}</Text>
                      </div>
                    )}
                    <div style={{ marginTop: 12 }}>
                      <Paragraph style={{ color: textPrimary, whiteSpace: 'pre-wrap', margin: 0 }}>
                        {selectedJournal.content}
                      </Paragraph>
                    </div>
                  </div>
                ),
              },
              {
                key: 'resolved',
                label: (
                  <span style={{ color: textPrimary }}>
                    <CheckCircleOutlined /> Đã chốt ({(selectedJournal.resolvedItems ?? []).length})
                  </span>
                ),
                children: (
                  <ItemList
                    items={selectedJournal.resolvedItems ?? []}
                    isDark={isDark}
                    textPrimary={textPrimary}
                    textMuted={textMuted}
                    linkColor={linkColor}
                    readOnly
                  />
                ),
              },
              {
                key: 'unresolved',
                label: (
                  <span style={{ color: textPrimary }}>
                    <ClockCircleOutlined /> Chưa chốt (
                    {
                      ((selectedJournal.unresolvedItems ?? []) as JournalItem[]).filter(
                        (i) => !i.status || i.status === 'OPEN',
                      ).length
                    }
                    )
                  </span>
                ),
                children: (
                  <ItemList
                    items={selectedJournal.unresolvedItems ?? []}
                    isDark={isDark}
                    textPrimary={textPrimary}
                    textMuted={textMuted}
                    linkColor={linkColor}
                    onConvert={(item) => {
                      setConvertItem({ journal: selectedJournal, item });
                      convertForm.setFieldsValue({ taskTitle: item.text });
                    }}
                    onIgnore={(item) => handleIgnore(selectedJournal, item)}
                  />
                ),
              },
            ]}
          />
        )}
      </CenteredModal>

      {/* Modal tạo nhật ký */}
      <CenteredModal
        open={createOpen}
        onClose={() => { setCreateOpen(false); createForm.resetFields(); }}
        title={
          <Space>
            <BookOutlined style={{ color: '#6366F1' }} />
            <span style={{ color: textPrimary }}>Ghi nhật ký mới</span>
          </Space>
        }
        width={700}
        footer={
          <Space>
            <Button onClick={() => setCreateOpen(false)}>Hủy</Button>
            <Button
              type="primary"
              loading={createMut.isPending}
              onClick={() => createForm.submit()}
            >
              Lưu nhật ký
            </Button>
          </Space>
        }
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreate}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="date" label={<Text style={{ color: textPrimary }}>Ngày</Text>} rules={[{ required: true }]}>
                <Input type="date" style={{ color: textPrimary }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="startTime" label={<Text style={{ color: textPrimary }}>Bắt đầu</Text>}>
                <Input placeholder="09:00" style={{ color: textPrimary }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="endTime" label={<Text style={{ color: textPrimary }}>Kết thúc</Text>}>
                <Input placeholder="11:00" style={{ color: textPrimary }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="title" label={<Text style={{ color: textPrimary }}>Tiêu đề</Text>} rules={[{ required: true }]}>
            <Input placeholder="Họp sprint review / Ghi nhật ký..." style={{ color: textPrimary }} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="location" label={<Text style={{ color: textPrimary }}>Địa điểm</Text>}>
                <Input placeholder="Phòng họp A / Google Meet" style={{ color: textPrimary }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="participants" label={<Text style={{ color: textPrimary }}>Người tham dự (cách nhau bằng dấu phẩy)</Text>}>
                <Input placeholder="Nguyễn A, Trần B..." style={{ color: textPrimary }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="content" label={<Text style={{ color: textPrimary }}>Nội dung</Text>} rules={[{ required: true }]}>
            <TextArea rows={5} placeholder="Ghi nội dung cuộc họp / công việc ngày hôm nay..." style={{ color: textPrimary }} />
          </Form.Item>

          {/* Vấn đề đã chốt */}
          <Form.Item label={<Text style={{ color: textPrimary }}>Vấn đề đã chốt</Text>}>
            {formResolved.map((val, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                <CheckCircleOutlined style={{ color: '#10B981', marginTop: 6 }} />
                <Input
                  value={val}
                  onChange={(e) => {
                    const next = [...formResolved];
                    next[idx] = e.target.value;
                    setFormResolved(next);
                  }}
                  placeholder={`Vấn đề đã chốt ${idx + 1}`}
                  style={{ color: textPrimary, flex: 1 }}
                />
                <Button
                  size="small"
                  type="text"
                  danger
                  onClick={() => setFormResolved(formResolved.filter((_, i) => i !== idx))}
                  disabled={formResolved.length === 1}
                >
                  ✕
                </Button>
              </div>
            ))}
            <Button
              type="dashed"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => setFormResolved([...formResolved, ''])}
              style={{ marginTop: 4 }}
            >
              Thêm
            </Button>
          </Form.Item>

          {/* Vấn đề chưa chốt */}
          <Form.Item label={<Text style={{ color: textPrimary }}>Vấn đề chưa chốt</Text>}>
            {formUnresolved.map((val, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                <ClockCircleOutlined style={{ color: '#F59E0B', marginTop: 6 }} />
                <Input
                  value={val}
                  onChange={(e) => {
                    const next = [...formUnresolved];
                    next[idx] = e.target.value;
                    setFormUnresolved(next);
                  }}
                  placeholder={`Vấn đề chưa chốt ${idx + 1}`}
                  style={{ color: textPrimary, flex: 1 }}
                />
                <Button
                  size="small"
                  type="text"
                  danger
                  onClick={() => setFormUnresolved(formUnresolved.filter((_, i) => i !== idx))}
                  disabled={formUnresolved.length === 1}
                >
                  ✕
                </Button>
              </div>
            ))}
            <Button
              type="dashed"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => setFormUnresolved([...formUnresolved, ''])}
              style={{ marginTop: 4 }}
            >
              Thêm
            </Button>
          </Form.Item>
        </Form>
      </CenteredModal>

      {/* Modal tạo Task từ unresolved item */}
      <Modal
        open={!!convertItem}
        title={
          <span style={{ color: textPrimary }}>
            Tạo Task từ mục chưa chốt
          </span>
        }
        onCancel={() => { setConvertItem(null); convertForm.resetFields(); }}
        onOk={() => convertForm.submit()}
        okText="Tạo Task"
        cancelText="Hủy"
        confirmLoading={convertMut.isPending}
      >
        {convertItem && (
          <div>
            <div
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                background: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC',
                marginBottom: 16,
              }}
            >
              <Text style={{ color: textMuted, fontSize: 12 }}>Mục:</Text>
              <br />
              <Text style={{ color: textPrimary }}>{convertItem.item.text}</Text>
            </div>
            <Form form={convertForm} layout="vertical" onFinish={handleConvertSubmit}>
              <Form.Item
                name="taskTitle"
                label={<Text style={{ color: textPrimary }}>Tiêu đề Task</Text>}
                rules={[{ required: true, message: 'Nhập tiêu đề task' }]}
              >
                <Input style={{ color: textPrimary }} />
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>
    </div>
  );
}
