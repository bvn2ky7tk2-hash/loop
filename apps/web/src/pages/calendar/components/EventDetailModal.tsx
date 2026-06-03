import dayjs from 'dayjs';
import { Modal, Button, Typography, Space, Tag } from 'antd';
import {
  EnvironmentOutlined,
  UserOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import type { CalendarEvent, NormalisedBooking } from '../../../api/calendar';
import { getEventColor } from '../constants';
import { EventTypeTag } from './EventTypeTag';

const { Text, Title } = Typography;

interface EventDetailModalProps {
  open: boolean;
  selectedEvent: CalendarEvent | NormalisedBooking | null;
  isDark: boolean;
  textPrimary: string;
  textMuted: string;
  bgContainer: string;
  onClose: () => void;
  openEdit: (event: CalendarEvent) => void;
  handleDelete: (event: CalendarEvent) => void;
}

export function EventDetailModal({
  open,
  selectedEvent,
  isDark,
  textPrimary,
  textMuted,
  bgContainer,
  onClose,
  openEdit,
  handleDelete,
}: EventDetailModalProps) {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title={
        <Text style={{ color: textPrimary, fontWeight: 700 }}>
          Chi tiết sự kiện
        </Text>
      }
      styles={{ body: { background: bgContainer }, header: { background: bgContainer } }}
    >
      {selectedEvent && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                width: '100%',
                height: 4,
                background: getEventColor(selectedEvent),
                borderRadius: 2,
                marginBottom: 12,
              }}
            />
            <Title level={4} style={{ color: textPrimary, marginBottom: 8 }}>
              {selectedEvent.title}
            </Title>
            <EventTypeTag type={selectedEvent.eventType} isDark={isDark} />
          </div>

          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <div>
              <Text style={{ color: textMuted, fontSize: 12 }}>Thời gian</Text>
              <br />
              <Text style={{ color: textPrimary }}>
                {selectedEvent.isAllDay
                  ? `${dayjs(selectedEvent.startTime).format('DD/MM/YYYY')} (Cả ngày)`
                  : `${dayjs(selectedEvent.startTime).format('DD/MM/YYYY HH:mm')} – ${dayjs(selectedEvent.endTime).format('HH:mm')}`}
              </Text>
            </div>

            {selectedEvent.location && (
              <div>
                <Text style={{ color: textMuted, fontSize: 12 }}>Địa điểm</Text>
                <br />
                <Text style={{ color: textPrimary }}>
                  <EnvironmentOutlined style={{ marginRight: 4 }} />
                  {selectedEvent.location}
                </Text>
              </div>
            )}

            {selectedEvent.description && (
              <div>
                <Text style={{ color: textMuted, fontSize: 12 }}>Mô tả</Text>
                <br />
                <Text style={{ color: textPrimary }}>{selectedEvent.description}</Text>
              </div>
            )}

            {selectedEvent.attendees?.length > 0 && (
              <div>
                <Text style={{ color: textMuted, fontSize: 12 }}>Người tham dự ({selectedEvent.attendees.length})</Text>
                <br />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                  {selectedEvent.attendees.map((a, i) => (
                    <Tag key={i} style={isDark ? { background: 'rgba(59,130,246,0.15)', color: '#93C5FD', borderColor: 'rgba(59,130,246,0.3)' } : {}} color={isDark ? undefined : 'blue'}>
                      <UserOutlined style={{ marginRight: 4 }} />
                      {a}
                    </Tag>
                  ))}
                </div>
              </div>
            )}

            {'createdBy' in selectedEvent && selectedEvent.createdBy && (
              <div>
                <Text style={{ color: textMuted, fontSize: 12 }}>Tạo bởi</Text>
                <br />
                <Text style={{ color: textPrimary }}>{selectedEvent.createdBy.name}</Text>
              </div>
            )}
          </Space>

          {/* Actions — only for CalendarEvent (not room bookings) */}
          {'createdById' in selectedEvent && !('bookingId' in selectedEvent) && (
            <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button
                icon={<EditOutlined />}
                onClick={() => {
                  onClose();
                  openEdit(selectedEvent as CalendarEvent);
                }}
              >
                Sửa
              </Button>
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDelete(selectedEvent as CalendarEvent)}
              >
                Xóa
              </Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
