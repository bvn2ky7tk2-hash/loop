import { useState, useMemo } from 'react';
import {
  Table, Button, Modal, Form, Input, DatePicker, Space, Tag, Typography,
  App, Popconfirm, Row, Col, Tabs, Select,
} from 'antd';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { FilterBar } from '../../components/FilterBar';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined, ThunderboltOutlined, CheckOutlined, DollarOutlined,
  CalendarOutlined, EyeOutlined,
  SettingOutlined, FileExcelOutlined, GiftOutlined, SearchOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { payrollApi, type PayrollPeriod } from '../../api/payroll';
import { useThemePalette } from '../../hooks/useThemePalette';
import { usePagination } from '../../hooks/usePagination';
import { STATUS_LABEL, STATUS_COLOR } from './components/payrollConstants';
import { PeriodDetailModal } from './components/PeriodDetailModal';
import { Month13Tab } from './components/Month13Tab';

const { Text } = Typography;

export default function PayrollPage() {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriod | null>(null);
  const [form] = Form.useForm();
  const [exportingTax, setExportingTax] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterSearch, setFilterSearch] = useState<string>('');
  const { textPrimary, textMuted, bgContainer, borderColor } = useThemePalette();
  const { page, pageSize, resetPage, paginationProps } = usePagination(50);

  const handleExportTax = async () => {
    setExportingTax(true);
    try {
      await payrollApi.downloadPitAnnual(new Date().getFullYear());
      message.success('Đã xuất báo cáo 05-QTT-TNCN');
    } catch {
      message.error('Lỗi xuất báo cáo');
    } finally {
      setExportingTax(false);
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ['payroll-periods', page, pageSize],
    queryFn: () => payrollApi.listPeriods(page, pageSize),
  });

  const createMut = useMutation({
    mutationFn: payrollApi.createPeriod,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll-periods'] });
      message.success('Đã tạo kỳ lương');
      setCreateOpen(false);
      form.resetFields();
    },
    onError: (e: Error) => message.error(e.message ?? 'Lỗi tạo kỳ lương'),
  });

  const allPeriods = data?.data ?? [];
  // Lọc chỉ lấy kỳ REGULAR và ADJUSTMENT (không phải MONTH_13)
  const regularPeriods = useMemo(() =>
    allPeriods.filter(p => !p.type || p.type === 'REGULAR' || p.type === 'ADJUSTMENT'),
  [allPeriods]);

  const totalDraft      = regularPeriods.filter(p => p.status === 'DRAFT').length;
  const totalProcessing = regularPeriods.filter(p => p.status === 'PROCESSING' || p.status === 'REVIEWED').length;
  const totalApproved   = regularPeriods.filter(p => p.status === 'APPROVED').length;
  const totalPaid       = regularPeriods.filter(p => p.status === 'PAID').length;

  // Filter theo status + tìm kiếm
  const periods = useMemo(() => {
    let list = regularPeriods;
    if (filterStatus) list = list.filter(p => p.status === filterStatus);
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q));
    }
    return list;
  }, [regularPeriods, filterStatus, filterSearch]);

  const cols: ColumnsType<PayrollPeriod> = [
    {
      title: 'Kỳ lương',
      dataIndex: 'name',
      render: (name: string, r) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: textPrimary }}>{name}</div>
          <div style={{ fontSize: 12, color: textMuted }}>
            <CalendarOutlined style={{ marginRight: 4 }} />
            {dayjs(r.startDate).format('DD/MM/YYYY')} – {dayjs(r.endDate).format('DD/MM/YYYY')}
          </div>
        </div>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 130,
      render: (s: string) => <Tag color={STATUS_COLOR[s]}>{STATUS_LABEL[s]}</Tag>,
    },
    {
      title: 'Nhân viên',
      dataIndex: '_count',
      width: 90,
      align: 'center',
      render: (c: PayrollPeriod['_count']) => (
        <Text style={{ fontWeight: 700, fontSize: 15, color: textPrimary }}>{c?.records ?? 0}</Text>
      ),
    },
    {
      title: 'Người duyệt',
      dataIndex: 'processedBy',
      render: (p: PayrollPeriod['processedBy']) => p
        ? <Text style={{ fontSize: 13, color: textPrimary }}>{p.name}</Text>
        : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      title: 'Ngày duyệt',
      dataIndex: 'processedAt',
      width: 120,
      render: (d?: string) => d
        ? <Text style={{ color: textMuted }}>{dayjs(d).format('DD/MM/YYYY')}</Text>
        : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      title: 'Hành động',
      width: 150,
      align: 'center' as const,
      render: (_, r) => (
        <Space size={4}>
          {r.status === 'DRAFT' && (
            <Popconfirm
              title="Tính lương cho toàn bộ nhân viên?"
              description="Sẽ đọc HĐLĐ, chấm công và áp dụng cấu hình BH/thuế hiệu lực."
              onConfirm={() => {
                payrollApi.generatePayroll(r.id).then((res) => {
                  qc.invalidateQueries({ queryKey: ['payroll-periods'] });
                  message.success(`Đã tính lương cho ${res.generated} nhân viên`);
                }).catch((e: Error) => message.error(e.message ?? 'Lỗi tính lương'));
              }}
              okText="Tính lương" cancelText="Huỷ"
            >
              <Button size="small" type="primary" icon={<ThunderboltOutlined />}>
                Tính
              </Button>
            </Popconfirm>
          )}
          <Button size="small" icon={<EyeOutlined />} onClick={() => setSelectedPeriod(r)}>
            Chi tiết
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <PageHeader
        title="Payroll"
        icon={<DollarOutlined />}
        iconColor="#0D9488"
        actions={
          <Space>
            <Button icon={<FileExcelOutlined />} loading={exportingTax} onClick={handleExportTax}>
              Báo cáo thuế {new Date().getFullYear()}
            </Button>
            <Button icon={<SettingOutlined />} onClick={() => navigate('/payroll/settings')}>
              Cấu hình
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
              Tạo kỳ lương
            </Button>
          </Space>
        }
      />

      <Tabs
        defaultActiveKey="regular"
        items={[
          {
            key: 'regular',
            label: (
              <span>
                <CalendarOutlined style={{ marginRight: 6 }} />
                Lương tháng
              </span>
            ),
            children: (
              <>
                <Row gutter={16} style={{ marginBottom: 20 }}>
                  <Col xs={12} sm={6}><StatCard label="Bản nháp" value={totalDraft} color="#94A3B8" icon={<CalendarOutlined />} /></Col>
                  <Col xs={12} sm={6}><StatCard label="Đang xử lý" value={totalProcessing} color="#F59E0B" icon={<ThunderboltOutlined />} /></Col>
                  <Col xs={12} sm={6}><StatCard label="Đã duyệt" value={totalApproved} color="#6366F1" icon={<CheckOutlined />} /></Col>
                  <Col xs={12} sm={6}><StatCard label="Đã trả lương" value={totalPaid} color="#10B981" icon={<DollarOutlined />} /></Col>
                </Row>

                <FilterBar>
                  <Input
                    prefix={<SearchOutlined />}
                    placeholder="Tìm tên kỳ lương..."
                    style={{ width: 240 }}
                    allowClear
                    value={filterSearch}
                    onChange={e => { setFilterSearch(e.target.value); resetPage(); }}
                  />
                  <Select
                    placeholder="Tất cả trạng thái"
                    style={{ width: 180 }}
                    allowClear
                    value={filterStatus || undefined}
                    onChange={v => { setFilterStatus(v ?? ''); resetPage(); }}
                    options={[
                      { value: 'DRAFT',      label: 'Bản nháp' },
                      { value: 'PROCESSING', label: 'Đang xử lý' },
                      { value: 'REVIEWED',   label: 'Chờ duyệt' },
                      { value: 'APPROVED',   label: 'Đã duyệt' },
                      { value: 'PAID',       label: 'Đã trả lương' },
                    ]}
                  />
                </FilterBar>

                <Table
                  loading={isLoading}
                  dataSource={periods}
                  rowKey="id"
                  columns={cols}
                  size="small"
                  style={{ border: `1px solid ${borderColor}`, borderRadius: 8, background: bgContainer }}
                  pagination={paginationProps(periods.length, 'kỳ lương')}
                  onRow={r => ({ onClick: () => setSelectedPeriod(r), style: { cursor: 'pointer' } })}
                />
              </>
            ),
          },
          {
            key: 'month13',
            label: (
              <span>
                <GiftOutlined style={{ marginRight: 6 }} />
                Tháng 13
              </span>
            ),
            children: <Month13Tab />,
          },
        ]}
      />

      {/* Modal tạo kỳ lương REGULAR */}
      <Modal
        open={createOpen}
        title="Tạo kỳ lương mới"
        onCancel={() => { setCreateOpen(false); form.resetFields(); }}
        onOk={() => form.validateFields().then(values => createMut.mutate({
          name:      values.name,
          startDate: values.dateRange[0].format('YYYY-MM-DD'),
          endDate:   values.dateRange[1].format('YYYY-MM-DD'),
        }))}
        confirmLoading={createMut.isPending}
        okText="Tạo" cancelText="Huỷ"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Tên kỳ lương"
            rules={[{ required: true, message: 'Nhập tên kỳ lương' }]}
            extra="Ví dụ: Lương tháng 5/2026">
            <Input placeholder="Lương tháng 5/2026" />
          </Form.Item>
          <Form.Item name="dateRange" label="Khoảng thời gian"
            rules={[{ required: true, message: 'Chọn thời gian' }]}>
            <DatePicker.RangePicker style={{ width: '100%' }} format="DD/MM/YYYY"
              placeholder={['Ngày bắt đầu', 'Ngày kết thúc']} />
          </Form.Item>
        </Form>
      </Modal>

      <PeriodDetailModal period={selectedPeriod} onClose={() => setSelectedPeriod(null)} />
    </div>
  );
}
