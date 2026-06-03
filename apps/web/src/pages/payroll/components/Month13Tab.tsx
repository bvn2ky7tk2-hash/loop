import { useState } from 'react';
import {
  Table, Button, Modal, Form, Input, DatePicker, Space, Tag, Typography,
  App, Popconfirm, Row, Col,
} from 'antd';
import { StatCard } from '../../../components/ui/StatCard';
import { EmptyState } from '../../../components/ui/EmptyState';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined, ThunderboltOutlined, DollarOutlined,
  TeamOutlined, FileDoneOutlined, GiftOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { payrollApi, type PayrollPeriod, type PayrollRecord } from '../../../api/payroll';
import { useThemePalette } from '../../../hooks/useThemePalette';
import { formatCurrency } from '../../../utils/format';
import { EmployeeInfoCell } from '../../../components/ui/EmployeeInfoCell';
import { STATUS_LABEL, STATUS_COLOR } from './payrollConstants';

const { Text } = Typography;

export function Month13Tab() {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm();
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriod | null>(null);
  const { textPrimary, textMuted, bgContainer, borderColor, linkColor } = useThemePalette();

  const { data, isLoading } = useQuery({
    queryKey: ['payroll-periods-month13'],
    queryFn: () => payrollApi.listPeriods(1, 200),
    select: (res) => ({ ...res, data: res.data.filter(p => p.type === 'MONTH_13') }),
  });

  const createMut = useMutation({
    mutationFn: payrollApi.createMonth13Period,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll-periods-month13'] });
      message.success('Đã tạo kỳ lương tháng 13');
      setCreateOpen(false);
      form.resetFields();
    },
    onError: (e: Error) => message.error(e.message ?? 'Lỗi tạo kỳ lương tháng 13'),
  });

  const calcMut = useMutation({
    mutationFn: (periodId: string) => payrollApi.calculate13thMonth(periodId),
    onSuccess: (res, periodId) => {
      qc.invalidateQueries({ queryKey: ['payroll-periods-month13'] });
      qc.invalidateQueries({ queryKey: ['payroll-records-13th', periodId] });
      message.success(`Đã tính lương tháng 13 cho ${res.generated} nhân viên`);
    },
    onError: (e: Error) => message.error(e.message ?? 'Lỗi tính lương tháng 13'),
  });

  const { data: recordsData, isLoading: recordsLoading } = useQuery({
    queryKey: ['payroll-records-13th', selectedPeriod?.id],
    queryFn: () => payrollApi.getPeriodRecords(selectedPeriod!.id, 1, 100),
    enabled: !!selectedPeriod,
  });

  const records = recordsData?.data ?? [];
  const total13th = records.reduce((s, r) => s + Number(r.baseSalary), 0);
  const totalNet13th = records.reduce((s, r) => s + Number(r.netSalary), 0);

  const cols: ColumnsType<PayrollRecord> = [
    {
      title: 'Nhân viên',
      render: (_, r) => (
        <EmployeeInfoCell
          employee={{
            fullName: r.employee?.user?.name ?? '—',
            code: r.employee?.code,
            orgUnit: r.employee?.orgUnit,
            position: r.employee?.position,
          }}
        />
      ),
    },
    {
      title: 'Số tháng BQ',
      width: 110,
      align: 'center',
      render: (_, r) => {
        const note = r.note ?? '';
        const match = note.match(/BQ (\d+) tháng/);
        const months = match ? match[1] : '—';
        return <Text style={{ color: textPrimary, fontWeight: 600 }}>{months}</Text>;
      },
    },
    {
      title: 'BQ tháng (base)',
      dataIndex: 'baseSalary',
      width: 150,
      align: 'right',
      render: (v: number) => (
        <Text style={{ color: textPrimary, fontSize: 13 }}>{formatCurrency(Number(v))}</Text>
      ),
    },
    {
      title: 'Lương tháng 13',
      dataIndex: 'grossSalary',
      width: 150,
      align: 'right',
      render: (v: number) => (
        <Text strong style={{ color: linkColor, fontSize: 14 }}>{formatCurrency(Number(v))}</Text>
      ),
    },
    {
      title: 'Thuế TNCN 10%',
      dataIndex: 'pitAmount',
      width: 130,
      align: 'right',
      render: (v: number) =>
        Number(v) > 0
          ? <Text style={{ color: '#EF4444', fontSize: 13 }}>-{formatCurrency(Number(v))}</Text>
          : <Text style={{ color: textMuted }}>—</Text>,
    },
    {
      title: 'Thực nhận',
      dataIndex: 'netSalary',
      width: 140,
      align: 'right',
      render: (v: number) => (
        <Text strong style={{ color: '#10B981', fontSize: 14 }}>{formatCurrency(Number(v))}</Text>
      ),
    },
    {
      title: 'Ghi chú',
      dataIndex: 'note',
      render: (v?: string) =>
        v ? <Text style={{ color: textMuted, fontSize: 12 }}>{v}</Text>
          : <Text style={{ color: textMuted }}>—</Text>,
    },
  ];

  const periods = data?.data ?? [];
  const canCalc = (p: PayrollPeriod) => p.status === 'DRAFT' || p.status === 'PROCESSING';

  return (
    <div>
      {/* StatCards tổng quan kỳ đang chọn */}
      {selectedPeriod && records.length > 0 && (
        <Row gutter={16} style={{ marginBottom: 20 }}>
          <Col xs={12} sm={6}>
            <StatCard label="Nhân viên" value={records.length} color="#8B5CF6" icon={<TeamOutlined />} />
          </Col>
          <Col xs={12} sm={6}>
            <StatCard label="Tổng lương T13" value={formatCurrency(total13th)} color="#6366F1" icon={<GiftOutlined />} />
          </Col>
          <Col xs={12} sm={6}>
            <StatCard
              label="Thuế TNCN"
              value={formatCurrency(records.reduce((s, r) => s + Number(r.pitAmount), 0))}
              color="#EF4444"
              icon={<FileDoneOutlined />}
            />
          </Col>
          <Col xs={12} sm={6}>
            <StatCard label="Tổng chi trả" value={formatCurrency(totalNet13th)} color="#10B981" icon={<DollarOutlined />} />
          </Col>
        </Row>
      )}

      {/* Chọn kỳ */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <Space wrap>
          {periods.map(p => (
            <Button
              key={p.id}
              type={selectedPeriod?.id === p.id ? 'primary' : 'default'}
              icon={<GiftOutlined />}
              onClick={() => setSelectedPeriod(p)}
              style={selectedPeriod?.id === p.id ? {} : { borderColor: borderColor, color: textPrimary }}
            >
              {p.name}
              <Tag style={{ marginLeft: 6 }} color={STATUS_COLOR[p.status]}>{STATUS_LABEL[p.status]}</Tag>
            </Button>
          ))}
          {periods.length === 0 && !isLoading && (
            <Text style={{ color: textMuted }}>Chưa có kỳ lương tháng 13 nào</Text>
          )}
        </Space>
        <Space>
          {selectedPeriod && canCalc(selectedPeriod) && (
            <Popconfirm
              title="Tính lương tháng 13?"
              description="Hệ thống sẽ tổng hợp các kỳ REGULAR APPROVED trong năm và tính BQ."
              onConfirm={() => calcMut.mutate(selectedPeriod.id)}
              okText="Tính" cancelText="Huỷ"
            >
              <Button
                type="primary"
                icon={<ThunderboltOutlined />}
                loading={calcMut.isPending}
                disabled={calcMut.isPending}
              >
                Tính lương T13
              </Button>
            </Popconfirm>
          )}
          <Button icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            Tạo kỳ T13
          </Button>
        </Space>
      </div>

      {selectedPeriod ? (
        <Table
          loading={recordsLoading}
          dataSource={records}
          rowKey="id"
          columns={cols}
          size="small"
          scroll={{ x: 900 }}
          style={{ border: `1px solid ${borderColor}`, borderRadius: 8, background: bgContainer }}
          pagination={false}
          locale={{ emptyText: <EmptyState compact title="Nhấn 'Tính lương T13' để tính." /> }}
        />
      ) : (
        <EmptyState title="Chọn một kỳ lương tháng 13 để xem kết quả" />
      )}

      {/* Modal tạo kỳ T13 */}
      <Modal
        open={createOpen}
        title="Tạo kỳ lương tháng 13"
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
            extra="Ví dụ: Lương tháng 13 / 2026">
            <Input placeholder="Lương tháng 13 / 2026" />
          </Form.Item>
          <Form.Item name="dateRange" label="Khoảng thời gian"
            rules={[{ required: true, message: 'Chọn thời gian' }]}
            extra="Thường là tháng 12 hoặc tháng 1 năm sau">
            <DatePicker.RangePicker style={{ width: '100%' }} format="DD/MM/YYYY"
              placeholder={['Ngày bắt đầu', 'Ngày kết thúc']} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
