import React, { useState } from 'react';
import { Alert, Space, Button } from 'antd';
import { CloseOutlined, InfoCircleOutlined, WarningOutlined, AlertOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { announcementsApi, type SystemAnnouncement } from '../api/announcements';

const STORAGE_KEY = 'loop_dismissed_announcements';

function getDismissed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}

function addDismissed(id: string) {
  const current = getDismissed();
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...current, id]));
}

function getAlertConfig(type: string): { alertType: 'info' | 'warning' | 'error'; icon: React.ReactNode; bg: string } {
  switch (type) {
    case 'WARNING':
      return { alertType: 'warning', icon: <WarningOutlined />, bg: '#FFFBEB' };
    case 'CRITICAL':
      return { alertType: 'error', icon: <AlertOutlined />, bg: '#FEF2F2' };
    default:
      return { alertType: 'info', icon: <InfoCircleOutlined />, bg: '#EFF6FF' };
  }
}

export function AnnouncementBanner() {
  const [dismissed, setDismissed] = useState<string[]>(() => getDismissed());

  const { data: announcements = [] } = useQuery({
    queryKey: ['announcements-active'],
    queryFn: announcementsApi.getActive,
    staleTime: 5 * 60 * 1000, // 5 phút
    retry: false,
  });

  const visible = announcements.filter((a) => !dismissed.includes(a.id));

  const handleDismiss = (id: string) => {
    addDismissed(id);
    setDismissed((prev) => [...prev, id]);
  };

  if (visible.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {visible.map((a: SystemAnnouncement) => {
        const { alertType, icon } = getAlertConfig(a.type);
        return (
          <Alert
            key={a.id}
            type={alertType}
            icon={icon}
            showIcon
            banner
            message={
              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: a.type === 'CRITICAL' ? 600 : 400 }}>{a.message}</span>
                <Button
                  type="text"
                  size="small"
                  icon={<CloseOutlined />}
                  onClick={() => handleDismiss(a.id)}
                  style={{ marginLeft: 8, opacity: 0.6, flexShrink: 0 }}
                />
              </Space>
            }
            style={{ borderRadius: 0, border: 'none' }}
          />
        );
      })}
    </div>
  );
}
