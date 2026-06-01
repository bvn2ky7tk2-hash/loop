import { useState } from 'react';
import {
  Row, Col, Card, Typography, Tag, Button, Input, Select, Space, Divider, App,
} from 'antd';
import {
  FileTextOutlined, DownloadOutlined, SearchOutlined, TeamOutlined,
  BankOutlined, ProjectOutlined, ShopOutlined, BarChartOutlined,
  CalendarOutlined, EyeOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useThemePalette } from '../../hooks/useThemePalette';
import { PageHeader } from '../../components/ui/PageHeader';

const { Text, Title } = Typography;
const { Option } = Select;

// ── Danh mục báo cáo định sẵn ─────────────────────────────────────────────────

interface ReportTemplate {
  id: string;
  title: string;
  description: string;
  category: 'hr' | 'finance' | 'project' | 'crm' | 'attendance';
  tags: string[];
  apiPath?: string;
  builderRoute?: string;
}

const TEMPLATES: ReportTemplate[] = [
  // Nhân sự
  {
    id: 'hr-headcount',
    title: 'Biến động nhân sự',
    description: 'Tuyển mới, nghỉ việc, headcount theo tháng và phòng ban',
    category: 'hr',
    tags: ['Nhân sự', 'Headcount'],
    builderRoute: '/analytics/builder',
  },
  {
    id: 'hr-performance',
    title: 'Đánh giá hiệu suất',
    description: 'Kết quả performance review, xếp hạng nhân viên, tỉ lệ đạt KPI',
    category: 'hr',
    tags: ['Nhân sự', 'KPI'],
    builderRoute: '/analytics/builder',
  },
  {
    id: 'hr-attrition',
    title: 'Attrition Report',
    description: 'Tỉ lệ nghỉ việc, lý do thôi việc, thâm niên trung bình',
    category: 'hr',
    tags: ['Nhân sự', 'Phân tích'],
    builderRoute: '/analytics/builder',
  },
  {
    id: 'hr-training',
    title: 'Đào tạo & Phát triển',
    description: 'Khóa học hoàn thành, ngân sách đào tạo, hiệu quả học tập',
    category: 'hr',
    tags: ['Nhân sự', 'Đào tạo'],
    builderRoute: '/hr/training',
  },
  // Tài chính
  {
    id: 'finance-pl',
    title: 'Báo cáo P&L',
    description: 'Doanh thu, chi phí, lợi nhuận gộp theo tháng/quý',
    category: 'finance',
    tags: ['Tài chính', 'P&L'],
    builderRoute: '/accounting/financial-reports',
  },
  {
    id: 'finance-balance',
    title: 'Bảng cân đối kế toán',
    description: 'Tài sản, nợ phải trả, vốn chủ sở hữu tại thời điểm',
    category: 'finance',
    tags: ['Tài chính', 'Kế toán'],
    builderRoute: '/accounting/financial-reports',
  },
  {
    id: 'finance-ar',
    title: 'Phải thu khách hàng (AR)',
    description: 'Hóa đơn chưa thu, tuổi nợ, khách hàng có AR cao',
    category: 'finance',
    tags: ['Tài chính', 'Công nợ'],
    builderRoute: '/analytics/builder',
  },
  {
    id: 'finance-budget',
    title: 'Utilization Ngân sách',
    description: 'Thực hiện so kế hoạch, các hạng mục vượt ngưỡng, dự báo năm',
    category: 'finance',
    tags: ['Tài chính', 'Ngân sách'],
    builderRoute: '/budget',
  },
  // Dự án
  {
    id: 'proj-progress',
    title: 'Tiến độ dự án',
    description: 'Milestone hoàn thành, dự án trễ, task completion rate',
    category: 'project',
    tags: ['Dự án', 'Tiến độ'],
    builderRoute: '/projects/analytics',
  },
  {
    id: 'proj-utilization',
    title: 'Utilization nhân lực',
    description: 'Tỉ lệ sử dụng nhân lực theo dự án và phòng ban',
    category: 'project',
    tags: ['Dự án', 'Utilization'],
    builderRoute: '/reports/utilization',
  },
  {
    id: 'proj-cost',
    title: 'Chi phí dự án',
    description: 'Chi phí thực tế vs. ngân sách, cost per project',
    category: 'project',
    tags: ['Dự án', 'Tài chính'],
    builderRoute: '/analytics/builder',
  },
  // CRM
  {
    id: 'crm-pipeline',
    title: 'Pipeline Deals',
    description: 'Cơ hội theo giai đoạn, win rate, deal velocity',
    category: 'crm',
    tags: ['CRM', 'Doanh số'],
    builderRoute: '/crm/analytics',
  },
  {
    id: 'crm-revenue',
    title: 'Doanh thu theo khách hàng',
    description: 'Top khách hàng, doanh thu recurring, customer lifetime value',
    category: 'crm',
    tags: ['CRM', 'Doanh thu'],
    builderRoute: '/crm/analytics',
  },
  {
    id: 'crm-forecast',
    title: 'Sales Forecast',
    description: 'Dự báo doanh thu Q/Year dựa trên pipeline',
    category: 'crm',
    tags: ['CRM', 'Dự báo'],
    builderRoute: '/crm/forecast',
  },
  // Chấm công
  {
    id: 'att-summary',
    title: 'Tổng hợp chấm công',
    description: 'Ngày đi làm, đi muộn, làm thêm giờ theo nhân viên và phòng ban',
    category: 'attendance',
    tags: ['Chấm công', 'Tổng hợp'],
    builderRoute: '/payroll/analytics',
  },
  {
    id: 'att-payroll',
    title: 'Bảng lương tổng hợp',
    description: 'Gross salary, thuế TNCN, BHXH, net pay theo tháng',
    category: 'attendance',
    tags: ['Lương', 'Payroll'],
    builderRoute: '/payroll',
  },
];

const CATEGORY_CONFIG = {
  hr:         { label: 'Nhân sự',       icon: <TeamOutlined />,    color: '#8B5CF6' },
  finance:    { label: 'Tài chính',     icon: <BankOutlined />,    color: '#10B981' },
  project:    { label: 'Dự án',         icon: <ProjectOutlined />, color: '#F97316' },
  crm:        { label: 'CRM',           icon: <ShopOutlined />,    color: '#3B82F6' },
  attendance: { label: 'Chấm công',     icon: <CalendarOutlined />, color: '#6366F1' },
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function AnalyticsReportsPage() {
  const { isDark, textPrimary, textMuted, bgCard, bgContainer, borderColor, linkColor } = useThemePalette();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');

  const filtered = TEMPLATES.filter(t => {
    const matchCat = category === 'all' || t.category === category;
    const matchStr = !search || t.title.toLowerCase().includes(search.toLowerCase())
      || t.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchStr;
  });

  const grouped = (['hr', 'finance', 'project', 'crm', 'attendance'] as const)
    .filter(cat => category === 'all' || cat === category)
    .map(cat => ({
      cat,
      items: filtered.filter(t => t.category === cat),
    }))
    .filter(g => g.items.length > 0);

  const cardStyle: React.CSSProperties = {
    background: bgCard,
    border: `1px solid ${borderColor}`,
    borderRadius: 10,
    cursor: 'pointer',
    transition: 'box-shadow 0.2s',
  };

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Thư viện Báo cáo"
        icon={<FileTextOutlined />}
        iconColor="#6366F1"
        actions={
          <Button
            type="primary"
            icon={<BarChartOutlined />}
            onClick={() => navigate('/analytics/builder')}
          >
            Tạo báo cáo mới
          </Button>
        }
      />

      {/* Filter bar */}
      <div style={{
        display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap',
        background: bgCard, border: `1px solid ${borderColor}`,
        borderRadius: 10, padding: '12px 16px',
      }}>
        <Input
          prefix={<SearchOutlined />}
          placeholder="Tìm báo cáo..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 240 }}
        />
        <Select
          value={category}
          onChange={setCategory}
          style={{ width: 180 }}
        >
          <Option value="all">Tất cả danh mục</Option>
          {(Object.entries(CATEGORY_CONFIG) as [string, typeof CATEGORY_CONFIG[keyof typeof CATEGORY_CONFIG]][]).map(([key, cfg]) => (
            <Option key={key} value={key}>{cfg.label}</Option>
          ))}
        </Select>
        <Text style={{ color: textMuted, lineHeight: '32px' }}>
          {filtered.length} báo cáo
        </Text>
      </div>

      {/* Grouped report cards */}
      {grouped.map(({ cat, items }) => {
        const cfg = CATEGORY_CONFIG[cat];
        return (
          <div key={cat} style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ color: cfg.color, fontSize: 18 }}>{cfg.icon}</span>
              <Text style={{ color: textPrimary, fontSize: 16, fontWeight: 600 }}>{cfg.label}</Text>
              <Tag color="default" style={{ marginLeft: 4 }}>{items.length}</Tag>
            </div>
            <Row gutter={[16, 16]}>
              {items.map(tpl => (
                <Col key={tpl.id} xs={24} sm={12} md={8} lg={6}>
                  <Card
                    style={cardStyle}
                    bodyStyle={{ padding: '16px 18px' }}
                    hoverable
                    onClick={() => tpl.builderRoute && navigate(tpl.builderRoute)}
                  >
                    <div style={{ marginBottom: 8 }}>
                      <FileTextOutlined style={{ color: cfg.color, fontSize: 20 }} />
                    </div>
                    <Title level={5} style={{ color: textPrimary, margin: '0 0 6px', fontSize: 14 }}>
                      {tpl.title}
                    </Title>
                    <Text style={{ color: textMuted, fontSize: 12, display: 'block', marginBottom: 12 }}>
                      {tpl.description}
                    </Text>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
                      {tpl.tags.map(tag => (
                        <Tag
                          key={tag}
                          style={isDark
                            ? { background: `${cfg.color}20`, color: cfg.color, borderColor: `${cfg.color}40`, fontSize: 11 }
                            : { fontSize: 11 }
                          }
                        >
                          {tag}
                        </Tag>
                      ))}
                    </div>
                    <Divider style={{ margin: '0 0 10px', borderColor: borderColor }} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={e => { e.stopPropagation(); tpl.builderRoute && navigate(tpl.builderRoute); }}
                      >
                        Xem
                      </Button>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <BarChartOutlined style={{ fontSize: 48, color: textMuted, marginBottom: 12, display: 'block' }} />
          <Text style={{ color: textMuted }}>Không tìm thấy báo cáo phù hợp</Text>
        </div>
      )}
    </div>
  );
}
