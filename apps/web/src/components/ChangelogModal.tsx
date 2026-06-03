import { useEffect, useState } from 'react';
import { Modal, Typography, Space, Tag, List, Button } from 'antd';
import {
  RocketOutlined, BugOutlined, StarOutlined, CheckCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useThemePalette } from '../hooks/useThemePalette';
import { useLatestChangelog, type ChangelogEntry } from '../api/changelog';

const { Text, Title } = Typography;

const STORAGE_KEY = 'lastSeenChangelog';

function getVersionIcon(version: string) {
  const parts = version.split('.');
  const patch = parseInt(parts[2] ?? '0', 10);
  if (patch === 0) return <RocketOutlined style={{ color: '#6366F1' }} />;
  if (patch <= 2) return <StarOutlined style={{ color: '#F59E0B' }} />;
  return <BugOutlined style={{ color: '#10B981' }} />;
}

interface ChangelogModalProps {
  /** Hiển thị tường minh (dùng cho admin xem lại) */
  open?: boolean;
  onClose?: () => void;
}

export function ChangelogModal({ open: externalOpen, onClose }: ChangelogModalProps = {}) {
  const { textPrimary, textMuted, bgCard, borderColor, isDark } = useThemePalette();
  const [autoOpen, setAutoOpen] = useState(false);

  const { data: entries = [] } = useLatestChangelog();

  // Auto-show nếu có changelog mới hơn lần xem cuối
  useEffect(() => {
    if (entries.length === 0) return;
    const lastSeen = localStorage.getItem(STORAGE_KEY);
    const latest   = entries[0]?.publishedAt;
    if (!latest) return;
    if (!lastSeen || new Date(latest) > new Date(lastSeen)) {
      setAutoOpen(true);
    }
  }, [entries]);

  const isOpen = externalOpen !== undefined ? externalOpen : autoOpen;

  const handleClose = () => {
    if (entries.length > 0) {
      localStorage.setItem(STORAGE_KEY, entries[0].publishedAt);
    }
    setAutoOpen(false);
    onClose?.();
  };

  if (!isOpen || entries.length === 0) return null;

  return (
    <Modal
      open={isOpen}
      onCancel={handleClose}
      footer={
        <div style={{ textAlign: 'center' }}>
          <Button type="primary" onClick={handleClose} size="large">
            <CheckCircleOutlined /> Đã hiểu
          </Button>
        </div>
      }
      title={
        <Space>
          <RocketOutlined style={{ color: '#6366F1', fontSize: 18 }} />
          <Title level={4} style={{ margin: 0, color: textPrimary }}>
            Có gì mới trong Loop.vn?
          </Title>
        </Space>
      }
      width={560}
      centered
      styles={{
        container: { background: isDark ? '#1E293B' : '#ffffff' },
        header:  { background: isDark ? '#1E293B' : '#ffffff', borderBottom: `1px solid ${borderColor}` },
        footer:  { background: isDark ? '#1E293B' : '#ffffff', borderTop: `1px solid ${borderColor}` },
      }}
    >
      <div style={{ maxHeight: 420, overflowY: 'auto', paddingRight: 4 }}>
        {entries.map((entry: ChangelogEntry) => (
          <div
            key={entry.id}
            style={{
              marginBottom: 20,
              padding: 14,
              background: bgCard,
              borderRadius: 8,
              border: `1px solid ${borderColor}`,
            }}
          >
            <Space style={{ marginBottom: 8 }}>
              {getVersionIcon(entry.version)}
              <Tag
                style={isDark
                  ? { background: 'rgba(99,102,241,0.15)', color: '#A5B4FC', borderColor: 'rgba(99,102,241,0.3)' }
                  : {}}
                color={isDark ? undefined : 'purple'}
              >
                v{entry.version}
              </Tag>
              <Text strong style={{ color: textPrimary }}>{entry.title}</Text>
              <Text style={{ fontSize: 11, color: textMuted }}>
                {dayjs(entry.publishedAt).format('DD/MM/YYYY')}
              </Text>
            </Space>
            <List
              size="small"
              dataSource={entry.items as string[]}
              renderItem={(item) => (
                <List.Item style={{ padding: '3px 0', border: 'none' }}>
                  <Space align="start" size={6}>
                    <CheckCircleOutlined style={{ color: '#10B981', fontSize: 12, marginTop: 2 }} />
                    <Text style={{ color: textPrimary, fontSize: 13 }}>{item}</Text>
                  </Space>
                </List.Item>
              )}
            />
          </div>
        ))}
      </div>
    </Modal>
  );
}
