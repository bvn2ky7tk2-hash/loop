import { useState } from 'react';
import { Button, Typography, List, Avatar, Popover } from 'antd';
import { TeamOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { workShiftsApi, type WorkScheduleEnrollment } from '../../../../api/work-shifts';

const { Text } = Typography;

// ── EnrollmentPopover — hiển thị danh sách nhân viên trong lịch ──────────────

export function EnrollmentPopover({
  scheduleId,
  count,
  onRemove,
  isDark,
  textPrimary,
  textMuted,
  borderColor,
}: {
  scheduleId: string;
  count: number;
  onRemove: (id: string) => void;
  isDark: boolean;
  textPrimary: string;
  textMuted: string;
  borderColor: string;
}) {
  const [open, setOpen] = useState(false);
  const { data: enrollments = [], isLoading } = useQuery({
    queryKey: ['enrollments', scheduleId],
    queryFn: () => workShiftsApi.listEnrollments(scheduleId),
    enabled: open,
  });

  const content = (
    <div style={{ width: 280, maxHeight: 320, overflowY: 'auto' }}>
      {isLoading ? (
        <Text style={{ color: textMuted }}>Đang tải...</Text>
      ) : enrollments.length === 0 ? (
        <Text style={{ color: textMuted }}>Chưa có nhân viên nào trong lịch này</Text>
      ) : (
        <List
          size="small"
          dataSource={enrollments}
          renderItem={(e: WorkScheduleEnrollment) => (
            <List.Item
              style={{ borderColor }}
              actions={[
                <Button
                  key="del"
                  type="text" size="small" danger icon={<DeleteOutlined />}
                  onClick={() => onRemove(e.id)}
                />,
              ]}
            >
              <List.Item.Meta
                avatar={
                  <Avatar size={28} style={{ background: isDark ? '#3B82F6' : '#6366F1', fontSize: 12 }}>
                    {e.employee?.fullName?.[0] ?? '?'}
                  </Avatar>
                }
                title={<Text style={{ color: textPrimary, fontSize: 13 }}>{e.employee?.fullName ?? 'Phòng ban'}</Text>}
                description={
                  <Text style={{ color: textMuted, fontSize: 11 }}>
                    Từ {dayjs(e.effectiveFrom).format('DD/MM/YYYY')}
                    {e.effectiveTo ? ` → ${dayjs(e.effectiveTo).format('DD/MM/YYYY')}` : ' (vô thời hạn)'}
                  </Text>
                }
              />
            </List.Item>
          )}
        />
      )}
    </div>
  );

  return (
    <Popover
      content={content}
      title={<Text style={{ color: textPrimary }}>Nhân viên trong lịch ({count})</Text>}
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="bottomLeft"
    >
      <Button type="link" size="small" style={{ padding: 0, color: isDark ? '#93C5FD' : '#6366F1' }}>
        <TeamOutlined /> {count} nhân sự
      </Button>
    </Popover>
  );
}
