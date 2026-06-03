import { useState, useEffect } from 'react';
import {
  Row, Col, Card, Input, Select, Tag, Typography, Button,
  Form, Space, Tooltip, Popconfirm, Tabs, Empty,
} from 'antd';
import {
  BookOutlined, PlusOutlined, EditOutlined, DeleteOutlined,
  SearchOutlined, EyeOutlined, PushpinFilled,
  FileTextOutlined, FolderOpenOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useThemePalette } from '../../hooks/useThemePalette';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { CenteredModal } from '../../components/ui/CenteredModal';
import { FilterBar } from '../../components/FilterBar';
import { kbApi, type KbArticle, type KbCategory } from '../../api/kb';

const { Text } = Typography;
const { TextArea } = Input;

const STATUS_COLOR: Record<string, string> = {
  PUBLISHED: 'success',
  DRAFT:     'default',
  ARCHIVED:  'warning',
};

const STATUS_LABEL: Record<string, string> = {
  PUBLISHED: 'Đã xuất bản',
  DRAFT:     'Bản nháp',
  ARCHIVED:  'Lưu trữ',
};

const CATEGORY_COLORS = ['#6366F1', '#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316', '#0891B2'];

// ─── Article Detail Drawer ────────────────────────────────────────────────────
function ArticleDrawer({
  article, open, onClose, onEdit,
}: { article: KbArticle | null; open: boolean; onClose: () => void; onEdit: () => void }) {
  const { isDark, textPrimary, textMuted, textSecondary, bgContainer, bgSubPanel, borderColor, linkColor } = useThemePalette();
  if (!article) return null;

  return (
    <CenteredModal
      open={open}
      onClose={onClose}
      width={720}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <FileTextOutlined style={{ color: linkColor }} />
          <Text style={{ color: textPrimary, fontWeight: 600 }}>{article.title}</Text>
        </div>
      }
      extra={
        <Button icon={<EditOutlined />} onClick={onEdit}>Chỉnh sửa</Button>
      }
      styles={{ body: { background: isDark ? bgSubPanel : '#F8FAFC' } }}
    >
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <Tag color={STATUS_COLOR[article.status]}>{STATUS_LABEL[article.status]}</Tag>
        {article.isPinned && <Tag icon={<PushpinFilled />} color="gold">Ghim</Tag>}
        {article.category && (
          <Tag style={isDark ? {
            background: `${article.category.color}20`, color: article.category.color ?? linkColor,
            borderColor: `${article.category.color}40`,
          } : {}}>
            {article.category.name}
          </Tag>
        )}
        {article.tags?.map(t => (
          <Tag key={t} style={isDark ? { background: 'rgba(148,163,184,0.15)', color: '#94A3B8', borderColor: 'rgba(148,163,184,0.3)' } : {}}>
            {t}
          </Tag>
        ))}
      </div>

      {article.summary && (
        <div style={{ background: isDark ? bgSubPanel : '#EFF6FF', border: `1px solid ${borderColor}`, borderRadius: 8, padding: 12, marginBottom: 20 }}>
          <Text style={{ color: textSecondary, fontStyle: 'italic' }}>{article.summary}</Text>
        </div>
      )}

      {/* Content rendered as whitespace-pre-wrap (plain text / markdown raw) */}
      <div style={{
        background: bgContainer,
        border: `1px solid ${borderColor}`,
        borderRadius: 8,
        padding: 24,
        lineHeight: 1.8,
        whiteSpace: 'pre-wrap',
        color: textPrimary,
        fontSize: 14,
        minHeight: 300,
      }}>
        {article.content}
      </div>

      <div style={{ marginTop: 20, display: 'flex', gap: 24 }}>
        <Text style={{ color: textMuted, fontSize: 12 }}>
          Tác giả: <span style={{ color: textSecondary }}>{article.author?.name}</span>
        </Text>
        <Text style={{ color: textMuted, fontSize: 12 }}>
          Cập nhật: <span style={{ color: textSecondary }}>{new Date(article.updatedAt).toLocaleDateString('vi-VN')}</span>
        </Text>
        <Text style={{ color: textMuted, fontSize: 12 }}>
          Lượt xem: <span style={{ color: textSecondary }}>{article.viewCount}</span>
        </Text>
      </div>
    </CenteredModal>
  );
}

// ─── Article Form Modal ───────────────────────────────────────────────────────
function ArticleModal({
  open, onCancel, initial, categories, loading, onSubmit,
}: {
  open: boolean; onCancel: () => void; initial: KbArticle | null;
  categories: KbCategory[]; loading: boolean;
  onSubmit: (vals: any) => void;
}) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (!open) return;
    if (initial) {
      form.setFieldsValue({
        title:      initial.title,
        summary:    initial.summary ?? '',
        content:    initial.content,
        categoryId: initial.categoryId,
        status:     initial.status,
        tags:       initial.tags ?? [],
        isPinned:   initial.isPinned,
      });
    } else {
      form.resetFields();
    }
  }, [open, initial, form]);

  return (
    <CenteredModal
      title={initial ? 'Chỉnh sửa bài viết' : 'Thêm bài viết mới'}
      open={open}
      onClose={onCancel}
      width={800}
      footer={
        <Button type="primary" loading={loading} onClick={form.submit}>
          {initial ? 'Cập nhật' : 'Lưu'}
        </Button>
      }
    >
      <Form form={form} layout="vertical" onFinish={onSubmit}>
        <Form.Item name="title" label="Tiêu đề" rules={[{ required: true }]}>
          <Input placeholder="Tiêu đề bài viết..." />
        </Form.Item>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="categoryId" label="Danh mục" rules={[{ required: true }]}>
              <Select placeholder="Chọn danh mục" options={categories.map(c => ({ value: c.id, label: c.name }))} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="status" label="Trạng thái" initialValue="DRAFT">
              <Select options={[
                { value: 'DRAFT',     label: 'Bản nháp' },
                { value: 'PUBLISHED', label: 'Xuất bản' },
                { value: 'ARCHIVED',  label: 'Lưu trữ' },
              ]} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="isPinned" label="Ghim" valuePropName="checked" initialValue={false}>
              <Select options={[{ value: false, label: 'Không' }, { value: true, label: 'Ghim' }]} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="summary" label="Tóm tắt">
          <Input placeholder="Mô tả ngắn về bài viết..." />
        </Form.Item>
        <Form.Item name="tags" label="Tags">
          <Select mode="tags" placeholder="Nhập tag và Enter..." style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="content" label="Nội dung" rules={[{ required: true }]}>
          <TextArea rows={12} placeholder="Nội dung bài viết (hỗ trợ Markdown)..." style={{ fontFamily: 'monospace', fontSize: 13 }} />
        </Form.Item>
      </Form>
    </CenteredModal>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function KnowledgeBasePage() {
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>('PUBLISHED');
  const [page, setPage] = useState(1);

  const [drawerArticle, setDrawerArticle] = useState<KbArticle | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [articleModal, setArticleModal] = useState(false);
  const [editingArticle, setEditingArticle] = useState<KbArticle | null>(null);

  const [catModal, setCatModal] = useState(false);
  const [editingCat, setEditingCat] = useState<KbCategory | null>(null);
  const [catForm] = Form.useForm();

  const { isDark, textPrimary, textMuted, bgCard, borderColor } = useThemePalette();
  const qc = useQueryClient();

  const { data: stats } = useQuery({ queryKey: ['kb-stats'], queryFn: kbApi.stats });
  const { data: categories = [] } = useQuery({ queryKey: ['kb-categories'], queryFn: kbApi.listCategories });
  const { data: articlesData, isLoading } = useQuery({
    queryKey: ['kb-articles', catFilter, statusFilter, search, page],
    queryFn: () => kbApi.listArticles({
      categoryId: catFilter, status: statusFilter,
      search: search || undefined, page, limit: 12,
    }),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['kb-articles'] });
    qc.invalidateQueries({ queryKey: ['kb-stats'] });
  };

  const mutateSaveArticle = useMutation({
    mutationFn: (vals: any) => {
      const payload = { ...vals, tags: vals.tags ?? [] };
      return editingArticle
        ? kbApi.updateArticle(editingArticle.id, payload)
        : kbApi.createArticle(payload);
    },
    onSuccess: () => { invalidate(); setArticleModal(false); setEditingArticle(null); },
  });

  const mutateDeleteArticle = useMutation({
    mutationFn: kbApi.deleteArticle,
    onSuccess: () => { invalidate(); setDrawerOpen(false); },
  });

  const mutateSaveCat = useMutation({
    mutationFn: (vals: any) => editingCat
      ? kbApi.updateCategory(editingCat.id, vals)
      : kbApi.createCategory(vals),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kb-categories'] });
      qc.invalidateQueries({ queryKey: ['kb-stats'] });
      setCatModal(false); catForm.resetFields(); setEditingCat(null);
    },
  });

  const mutateDeleteCat = useMutation({
    mutationFn: kbApi.deleteCategory,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kb-categories'] }),
  });

  const openArticle = async (a: KbArticle) => {
    try {
      const detail = await kbApi.getArticle(a.id);
      setDrawerArticle(detail);
    } catch {
      setDrawerArticle(a);
    }
    setDrawerOpen(true);
  };

  const openEdit = (a: KbArticle) => {
    setEditingArticle(a);
    setDrawerOpen(false);
    setArticleModal(true);
  };

  const openCreateArticle = () => { setEditingArticle(null); setArticleModal(true); };

  const openEditCat = (c: KbCategory) => {
    setEditingCat(c);
    catForm.setFieldsValue({ name: c.name, description: c.description ?? '', icon: c.icon ?? '', color: c.color ?? '', sortOrder: c.sortOrder });
    setCatModal(true);
  };

  const articles = articlesData?.data ?? [];

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Knowledge Base"
        icon={<BookOutlined />}
        iconColor="#6366F1"
        actions={
          <Space>
            <Button
              icon={<FolderOpenOutlined />}
              onClick={() => { setEditingCat(null); catForm.resetFields(); setCatModal(true); }}
            >
              Thêm danh mục
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateArticle}>
              Viết bài mới
            </Button>
          </Space>
        }
      />

      {/* Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <StatCard label="Tổng bài viết" value={stats?.totalArticles ?? 0} color="#6366F1" icon={<FileTextOutlined />} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard label="Đã xuất bản" value={stats?.publishedCount ?? 0} color="#10B981" icon={<BookOutlined />} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard label="Danh mục" value={stats?.categoryCount ?? 0} color="#3B82F6" icon={<FolderOpenOutlined />} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard label="Lượt xem" value={stats?.totalViews ?? 0} color="#F59E0B" icon={<EyeOutlined />} />
        </Col>
      </Row>

      <Tabs defaultActiveKey="articles" items={[
        {
          key: 'articles',
          label: `Bài viết (${articlesData?.total ?? 0})`,
          children: (
            <>
              <FilterBar>
                <Input
                  prefix={<SearchOutlined />}
                  placeholder="Tìm kiếm bài viết..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  style={{ width: 260 }}
                  allowClear
                />
                <Select
                  placeholder="Danh mục"
                  allowClear
                  value={catFilter}
                  onChange={v => { setCatFilter(v); setPage(1); }}
                  options={categories.map(c => ({ value: c.id, label: c.name }))}
                  style={{ width: 180 }}
                />
                <Select
                  value={statusFilter}
                  onChange={v => { setStatusFilter(v); setPage(1); }}
                  options={[
                    { value: undefined, label: 'Tất cả' },
                    { value: 'PUBLISHED', label: 'Đã xuất bản' },
                    { value: 'DRAFT',     label: 'Bản nháp' },
                    { value: 'ARCHIVED',  label: 'Lưu trữ' },
                  ]}
                  style={{ width: 160 }}
                />
              </FilterBar>

              {articles.length === 0 && !isLoading ? (
                <Empty description="Không có bài viết nào" style={{ marginTop: 60 }} />
              ) : (
                <Row gutter={[16, 16]}>
                  {articles.map(article => (
                    <Col xs={24} sm={12} lg={8} key={article.id}>
                      <Card
                        hoverable
                        onClick={() => openArticle(article)}
                        style={{
                          background: bgCard,
                          border: `1px solid ${borderColor}`,
                          borderRadius: 10,
                          cursor: 'pointer',
                          height: '100%',
                        }}
                        styles={{ body: { padding: 18 } }}
                      >
                        {/* Category + Status */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                          <Tag
                            style={isDark && article.category?.color ? {
                              background: `${article.category.color}20`,
                              color: article.category.color,
                              borderColor: `${article.category.color}40`,
                            } : {}}
                            color={isDark ? undefined : 'blue'}
                          >
                            {article.category?.name ?? '—'}
                          </Tag>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {article.isPinned && <PushpinFilled style={{ color: '#F59E0B' }} />}
                            <Tag color={STATUS_COLOR[article.status]} style={{ margin: 0 }}>
                              {STATUS_LABEL[article.status]}
                            </Tag>
                          </div>
                        </div>

                        {/* Title */}
                        <Text style={{ color: textPrimary, fontWeight: 600, fontSize: 15, display: 'block', marginBottom: 8, lineHeight: 1.4 }}>
                          {article.title}
                        </Text>

                        {/* Summary */}
                        {article.summary && (
                          <Text style={{ color: textMuted, fontSize: 13, display: 'block', marginBottom: 10 }}
                            ellipsis>
                            {article.summary}
                          </Text>
                        )}

                        {/* Tags */}
                        {article.tags?.length > 0 && (
                          <div style={{ marginBottom: 10 }}>
                            {article.tags.slice(0, 3).map(t => (
                              <Tag key={t} style={{ fontSize: 11, margin: '0 4px 4px 0', ...(isDark ? { background: 'rgba(148,163,184,0.1)', color: '#94A3B8', borderColor: 'transparent' } : {}) }}>
                                {t}
                              </Tag>
                            ))}
                          </div>
                        )}

                        {/* Footer */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                          <Text style={{ color: textMuted, fontSize: 12 }}>
                            {article.author?.name} · <EyeOutlined /> {article.viewCount}
                          </Text>
                          <Space size={4} onClick={e => e.stopPropagation()}>
                            <Tooltip title="Chỉnh sửa">
                              <Button
                                type="text" size="small" icon={<EditOutlined />}
                                onClick={() => openEdit(article)}
                              />
                            </Tooltip>
                            <Tooltip title="Xóa">
                              <Popconfirm
                                title="Xóa bài viết này?"
                                onConfirm={() => mutateDeleteArticle.mutate(article.id)}
                                okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}
                              >
                                <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                              </Popconfirm>
                            </Tooltip>
                          </Space>
                        </div>
                      </Card>
                    </Col>
                  ))}
                </Row>
              )}

              {/* Pagination */}
              {(articlesData?.totalPages ?? 0) > 1 && (
                <div style={{ textAlign: 'center', marginTop: 24 }}>
                  <Button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Trước</Button>
                  <Text style={{ color: textMuted, margin: '0 16px' }}>Trang {page}/{articlesData?.totalPages}</Text>
                  <Button disabled={page >= (articlesData?.totalPages ?? 1)} onClick={() => setPage(p => p + 1)}>Sau →</Button>
                </div>
              )}
            </>
          ),
        },
        {
          key: 'categories',
          label: `Danh mục (${categories.length})`,
          children: (
            <Row gutter={[16, 16]}>
              {categories.map((cat, idx) => {
                const color = cat.color ?? CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
                return (
                  <Col xs={24} sm={12} lg={8} key={cat.id}>
                    <div style={{
                      background: bgCard,
                      border: `1px solid ${borderColor}`,
                      borderRadius: 10,
                      padding: 20,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                    }}>
                      <div style={{
                        width: 48, height: 48, borderRadius: 12,
                        background: `${color}25`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 22, color,
                        flexShrink: 0,
                      }}>
                        {cat.icon || <FolderOpenOutlined />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ color: textPrimary, fontWeight: 600, display: 'block' }}>{cat.name}</Text>
                        <Text style={{ color: textMuted, fontSize: 12 }}>
                          {cat._count?.articles ?? 0} bài viết
                        </Text>
                        {cat.description && (
                          <Text style={{ color: textMuted, fontSize: 12, display: 'block' }} ellipsis>
                            {cat.description}
                          </Text>
                        )}
                      </div>
                      <Space direction="vertical" size={4}>
                        <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEditCat(cat)} />
                        <Popconfirm
                          title="Xóa danh mục này?"
                          onConfirm={() => mutateDeleteCat.mutate(cat.id)}
                          okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}
                        >
                          <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                      </Space>
                    </div>
                  </Col>
                );
              })}
            </Row>
          ),
        },
      ]} />

      {/* Article Detail Drawer */}
      <ArticleDrawer
        article={drawerArticle}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onEdit={() => drawerArticle && openEdit(drawerArticle)}
      />

      {/* Article Modal */}
      <ArticleModal
        open={articleModal}
        onCancel={() => { setArticleModal(false); setEditingArticle(null); }}
        initial={editingArticle}
        categories={categories}
        loading={mutateSaveArticle.isPending}
        onSubmit={mutateSaveArticle.mutate}
      />

      {/* Category Modal */}
      <CenteredModal
        title={editingCat ? 'Cập nhật danh mục' : 'Thêm danh mục'}
        open={catModal}
        onClose={() => { setCatModal(false); catForm.resetFields(); setEditingCat(null); }}
        footer={
          <Button type="primary" loading={mutateSaveCat.isPending} onClick={catForm.submit}>
            {editingCat ? 'Cập nhật' : 'Lưu'}
          </Button>
        }
      >
        <Form form={catForm} layout="vertical" onFinish={mutateSaveCat.mutate}>
          <Form.Item name="name" label="Tên danh mục" rules={[{ required: true }]}>
            <Input placeholder="Quy trình nội bộ, Kỹ thuật, HR..." />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="icon" label="Icon (emoji)">
                <Input placeholder="📋 hoặc để trống" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="color" label="Màu (hex)">
                <Input placeholder="#6366F1" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="Mô tả">
            <Input placeholder="Mô tả ngắn về danh mục..." />
          </Form.Item>
          <Form.Item name="sortOrder" label="Thứ tự">
            <Input type="number" placeholder="0" />
          </Form.Item>
        </Form>
      </CenteredModal>
    </div>
  );
}
