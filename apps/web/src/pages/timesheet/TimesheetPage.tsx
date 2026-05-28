import { useState, useMemo } from 'react';
import {
  Card, Row, Col, Table, Button, DatePicker, Select,
  Typography, Alert, Space, Popconfirm, Tooltip, Badge,
} from 'antd';
import {
  CalendarOutlined, ClockCircleOutlined, CheckCircleOutlined,
  SyncOutlined, SendOutlined, CloseCircleOutlined,
} from '@ant-design/icons';
import { useColumnVisibility } from '../../hooks/useColumnVisibility';
import { ColumnToggle } from '../../components/ColumnToggle';
import { StatCard } from '../../components/ui/StatCard';
import { useThemeStore } from '../../store/theme.store';

const TIMESHEET_COL_DEFS = [
  { key: 'date',          label: 'Ngày' },
  { key: 'checkIn',       label: 'Giờ vào' },
  { key: 'checkOut',      label: 'Giờ ra' },
  { key: 'workHours',     label: 'Giờ làm' },
  { key: 'overtimeHours', label: 'OT' },
  { key: 'status',        label: 'Trạng thái' },
];
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { timesheetApi, type TimesheetRecord, type TimeEntryDay } from '../../api/timesheet';
import dayjs, { type Dayjs } from 'dayjs';

const { Text } = Typography;

const STATUS_TAG: Record<TimesheetRecord['status'], { label: string; bg: string; color: string; darkBg: string; darkColor: string; icon: React.ReactNode }> = {
  DRAFT:     { label: 'Bản nháp',   bg: '#F1F5F9', color: '#475569', darkBg: '#1E293B', darkColor: '#94A3B8', icon: <ClockCircleOutlined /> },
  SUBMITTED: { label: 'Chờ duyệt',  bg: '#EEF2FF', color: '#4338CA', darkBg: '#1e1b4b', darkColor: '#a5b4fc', icon: <SyncOutlined spin /> },
  APPROVED:  { label: 'Đã duyệt',   bg: '#ECFDF5', color: '#065F46', darkBg: '#052e16', darkColor: '#6ee7b7', icon: <CheckCircleOutlined /> },
  REJECTED:  { label: 'Bị từ chối', bg: '#FEF2F2', color: '#DC2626', darkBg: '#450a0a', darkColor: '#fca5a5', icon: <CloseCircleOutlined /> },
};

export default function TimesheetPage() {
  const qc = useQueryClient();
  const { mode, preset } = useThemeStore();
  const isDark = mode === 'dark';
  const linkColor = isDark ? '#93C5FD' : preset.primary;
  const [month, setMonth]             = useState<Dayjs>(dayjs().startOf('month'));
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const { isVisible, toggle, reset: resetCols } = useColumnVisibility('timesheet', TIMESHEET_COL_DEFS);

  const periodStart = month.format('YYYY-MM-DD');
  const periodEnd   = month.endOf('month').format('YYYY-MM-DD');

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['timesheet-period', periodStart],
    queryFn: () => timesheetApi.periodDetail(periodStart, periodEnd),
  });

  const { mutate: generate, isPending: isGenerating } = useMutation({
    mutationFn: () => timesheetApi.generatePeriod(periodStart, periodEnd),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['timesheet-period', periodStart] }),
  });

  const { mutate: submit, isPending: isSubmitting } = useMutation({
    mutationFn: () => timesheetApi.submit(data!.record!.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['timesheet-period', periodStart] }),
  });

  const record = data?.record;
  const rawDays = data?.days ?? [];
  const statusCfg = record ? STATUS_TAG[record.status] : null;

  const days = useMemo(() => {
    if (filterStatus === 'all') return rawDays;
    return rawDays.filter((d) => d.status === filterStatus);
  }, [rawDays, filterStatus]);

  const allDayColumns = [
    {
      key: 'date',
      title: 'Ngày', dataIndex: 'date', width: 130,
      render: (v: string) => dayjs(v).format('ddd DD/MM'),
    },
    {
      key: 'checkIn',
      title: 'Giờ vào', dataIndex: 'checkIn', width: 100,
      render: (v: string | null) => v ? dayjs(v).format('HH:mm') : <Text type="secondary">—</Text>,
    },
    {
      key: 'checkOut',
      title: 'Giờ ra', dataIndex: 'checkOut', width: 100,
      render: (v: string | null) => v ? dayjs(v).format('HH:mm') : <Text type="secondary">—</Text>,
    },
    {
      key: 'workHours',
      title: 'Giờ làm', dataIndex: 'workHours', width: 90, align: 'right' as const,
      render: (v: number | null) => {
        if (v == null) return <Text type="secondary">—</Text>;
        if (v < 8) return <Text style={{ color: isDark ? '#fb923c' : '#D97706', fontWeight: 600 }}>{v}h</Text>;
        return <span>{v}h</span>;
      },
    },
    {
      key: 'overtimeHours',
      title: 'OT', dataIndex: 'overtimeHours', width: 80, align: 'right' as const,
      render: (v: number) =>
        v > 0 ? <Text type="warning">{v}h</Text> : <Text type="secondary">—</Text>,
    },
    {
      key: 'status',
      title: 'Trạng thái', dataIndex: 'status', width: 120,
      render: (v: string, row: TimeEntryDay) => (
        <Space size={4}>
          {v === 'present' ? (
            <Badge status="success" text="Có mặt" />
          ) : (
            <Badge status="default" text="Vắng" />
          )}
          {row.isManualCorrection && (
            <Tooltip title="Chỉnh sửa thủ công">
              <span style={{ fontSize: 10, fontWeight: 600, borderRadius: 4, padding: '0 4px', lineHeight: '16px', background: isDark ? '#431407' : '#FFF7ED', color: isDark ? '#fb923c' : '#C2410C', display: 'inline-block' }}>
                TC
              </span>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  const dayColumns = allDayColumns.filter((c) => isVisible(c.key));

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">
          <CalendarOutlined style={{ marginRight: 8, fontSize: 18 }} />
          Bảng công
        </h1>

        <Space>
          <DatePicker
            picker="month"
            value={month}
            onChange={(d) => d && setMonth(d.startOf('month'))}
            format="MM/YYYY"
            allowClear={false}
          />
          <Select
            value={filterStatus}
            onChange={setFilterStatus}
            style={{ width: 130 }}
            options={[
              { value: 'all',     label: 'Tất cả ngày' },
              { value: 'present', label: 'Có mặt' },
              { value: 'absent',  label: 'Vắng mặt' },
            ]}
          />
          <Button
            icon={<SyncOutlined />}
            onClick={() => generate()}
            loading={isGenerating}
          >
            Tính lại
          </Button>
          <ColumnToggle columns={TIMESHEET_COL_DEFS} isVisible={isVisible} toggle={toggle} reset={resetCols} />
        </Space>
      </div>

      {/* Summary Cards */}
      {record ? (
        <>
          <Row gutter={16} style={{ marginBottom: 20 }}>
            <Col span={5}>
              <StatCard
                label="Ngày làm việc"
                value={`${Number(record.workingDays)} / ${Number(record.standardDays)}`}
                color="#6366F1"
                icon={<CalendarOutlined />}
              />
            </Col>
            <Col span={5}>
              <StatCard
                label="Làm thêm giờ"
                value={`${Number(record.overtimeHours)}h`}
                color={Number(record.overtimeHours) > 0 ? '#F59E0B' : '#94A3B8'}
                icon={<ClockCircleOutlined />}
              />
            </Col>
            <Col span={5}>
              <StatCard
                label="Ngày nghỉ phép"
                value={`${Number(record.leaveDays)} ngày`}
                color="#8B5CF6"
                icon={<CheckCircleOutlined />}
              />
            </Col>
            <Col span={5}>
              <StatCard
                label="Tỷ lệ chuyên cần"
                value={`${record.standardDays > 0 ? Math.round((Number(record.workingDays) / Number(record.standardDays)) * 100) : 0}%`}
                color={(Number(record.workingDays) / Number(record.standardDays)) >= 0.9 ? '#10B981' : '#EF4444'}
              />
            </Col>
            <Col span={4}>
              <Card size="small" style={{ height: '100%' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Trạng thái</Text>
                  {statusCfg && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, borderRadius: 9999, padding: '3px 10px', background: isDark ? statusCfg.darkBg : statusCfg.bg, color: isDark ? statusCfg.darkColor : statusCfg.color, width: 'fit-content' }}>
                      {statusCfg.icon} {statusCfg.label}
                    </span>
                  )}
                </div>
              </Card>
            </Col>
          </Row>

          {/* Rejection reason */}
          {record.status === 'REJECTED' && record.rejectionReason && (
            <Alert
              type="error"
              message="Bảng công bị từ chối"
              description={record.rejectionReason}
              style={{ marginBottom: 16 }}
              showIcon
            />
          )}

          {/* Submit action */}
          {(record.status === 'DRAFT' || record.status === 'REJECTED') && (
            <div style={{ marginBottom: 16 }}>
              <Popconfirm
                title="Nộp bảng công"
                description="Bạn chắc chắn muốn nộp bảng công kỳ này để quản lý duyệt?"
                onConfirm={() => submit()}
                okText="Nộp"
                cancelText="Huỷ"
              >
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  loading={isSubmitting}
                  disabled={Number(record.workingDays) === 0}
                >
                  Nộp bảng công
                </Button>
              </Popconfirm>
            </div>
          )}

          {record.status === 'SUBMITTED' && record.submittedAt && (
            <Alert
              type="info"
              message={`Đã nộp lúc ${dayjs(record.submittedAt).format('HH:mm DD/MM/YYYY')} — đang chờ quản lý duyệt.`}
              style={{ marginBottom: 16 }}
              showIcon
            />
          )}

          {record.status === 'APPROVED' && record.approvedAt && (
            <Alert
              type="success"
              message={`Đã được duyệt lúc ${dayjs(record.approvedAt).format('HH:mm DD/MM/YYYY')}.`}
              style={{ marginBottom: 16 }}
              showIcon
            />
          )}
        </>
      ) : (
        !isLoading && !isFetching && (
          <Alert
            type="info"
            message="Chưa có bảng công kỳ này"
            description='Nhấn "Tính lại" để tạo bảng công từ dữ liệu chấm công của bạn.'
            style={{ marginBottom: 16 }}
            showIcon
          />
        )
      )}

      {/* Daily table */}
      <Card title="Chi tiết ngày công" size="small">
        <Table
          dataSource={days}
          columns={dayColumns}
          rowKey="date"
          size="small"
          loading={isLoading || isFetching}
          pagination={false}
          rowClassName={(row) => {
            if (row.status === 'absent') return 'ts-row-absent';
            if (row.workHours != null && row.workHours > 0 && row.workHours < 8) return 'ts-row-short';
            return '';
          }}
          locale={{ emptyText: 'Chọn "Tính lại" để tải dữ liệu chấm công' }}
        />
      </Card>
    </div>
  );
}
