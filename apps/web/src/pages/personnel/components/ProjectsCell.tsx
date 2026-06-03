import { useState } from 'react';
import { Popover, Spin, theme } from 'antd';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { employeesApi, type Employee } from '../../../api/employees';

export function ProjectsCell({ employee }: { employee: Employee }) {
  const [open, setOpen] = useState(false);
  const { token } = theme.useToken();
  const today = dayjs().format('YYYY-MM-DD');

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['employee-projects-popover', employee.id],
    queryFn: () => employeesApi.getProjectHistory(employee.id),
    enabled: open,
    staleTime: 60_000,
  });

  const activeProjects = history.filter(
    (h: { endDate?: string | null }) => !h.endDate || h.endDate >= today,
  );

  const n = employee.activeProjectCount ?? 0;
  if (n === 0) return <span style={{ fontSize: 12, color: token.colorTextTertiary }}>—</span>;

  const color = n >= 3 ? '#EF4444' : n >= 2 ? '#F59E0B' : '#10B981';

  const content = isLoading ? (
    <div style={{ padding: '4px 8px' }}><Spin size="small" /></div>
  ) : (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxWidth: 240 }}>
      {activeProjects.map((h: { id: string; project: { code: string; name: string } }) => (
        <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontSize: 10, fontWeight: 600, borderRadius: 4, padding: '1px 5px',
            background: token.colorFillSecondary, color: token.colorTextSecondary,
          }}>{h.project.code}</span>
          <span style={{ fontSize: 12, color: token.colorText }}>{h.project.name}</span>
        </div>
      ))}
    </div>
  );

  return (
    <Popover
      open={open} onOpenChange={setOpen}
      content={content} title="Dự án đang tham gia"
      trigger="hover" placement="left"
    >
      <span style={{ fontSize: 12, fontWeight: 600, color, cursor: 'default' }}>
        {n} dự án
      </span>
    </Popover>
  );
}
