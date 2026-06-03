import { Button, Space, Tooltip, type GlobalToken } from 'antd';
import { EditOutlined, IdcardOutlined, PlayCircleOutlined } from '@ant-design/icons';
import type { FormInstance } from 'antd';
import dayjs from 'dayjs';
import { EmployeeInfoCell } from '../../../components/ui/EmployeeInfoCell';
import { LEVEL_HUE } from '../personnelConstants';
import { ProjectsCell } from './ProjectsCell';
import type { Employee } from '../../../api/employees';

interface OptionItem { value: string; label: string }

interface Deps {
  token: GlobalToken;
  orgOptions: OptionItem[];
  editForm: FormInstance;
  navigate: (path: string) => void;
  setDetailId: (id: string) => void;
  setEditEmployee: (e: Employee) => void;
  getOnboardingTooltip: (employee: Employee) => string;
  isOnboardingDisabled: () => boolean;
  onboardingLoading: string | null;
  startOnboarding: (employee: Employee) => void;
}

export function buildEmployeeColumns({
  token, orgOptions, editForm, navigate, setDetailId, setEditEmployee,
  getOnboardingTooltip, isOnboardingDisabled, onboardingLoading, startOnboarding,
}: Deps) {
  return [
    { key: 'code', title: 'Mã', dataIndex: 'code', width: 90 },
    {
      key: 'fullName', title: 'Họ tên', dataIndex: 'fullName',
      render: (_: string, r: Employee) => (
        <div onClick={() => setDetailId(r.id)} style={{ cursor: 'pointer' }}>
          <EmployeeInfoCell employee={r} />
        </div>
      ),
    },
    {
      key: 'orgUnit', title: 'Phòng ban',
      render: (_: unknown, r: Employee) => {
        const name = orgOptions.find((o) => o.value === r.orgUnitId)?.label?.trim();
        return name
          ? <span style={{ fontSize: 12, color: token.colorTextSecondary }}>{name}</span>
          : <span style={{ fontSize: 12, color: token.colorTextTertiary }}>—</span>;
      },
    },
    {
      key: 'jobTitle', title: 'Chức danh', width: 150,
      render: (_: unknown, r: Employee) => {
        const name = r.jobTitle?.name ?? r.position?.jobTitle?.name;
        return name
          ? <span style={{ fontSize: 12, color: token.colorTextSecondary }}>{name}</span>
          : <span style={{ fontSize: 12, color: token.colorTextTertiary }}>—</span>;
      },
    },
    {
      key: 'position', title: 'Vị trí', width: 120,
      render: (_: unknown, r: Employee) => r.position?.code
        ? (
          <span style={{
            fontSize: 11, fontWeight: 600, borderRadius: 4, padding: '1px 6px',
            background: token.colorFillSecondary, color: token.colorTextSecondary,
          }}>{r.position.code}</span>
        )
        : <span style={{ fontSize: 12, color: token.colorTextTertiary }}>—</span>,
    },
    {
      key: 'level', title: 'Cấp độ', dataIndex: 'level', width: 90,
      render: (v: string) => {
        const hue = LEVEL_HUE[v] ?? token.colorTextSecondary;
        return (
          <span style={{ fontSize: 11, fontWeight: 500, borderRadius: 4, padding: '2px 6px', color: hue, background: `${hue}1e` }}>
            {v}
          </span>
        );
      },
    },
    {
      key: 'techStack', title: 'Tech Stack', dataIndex: 'techStack',
      render: (v: string[]) => (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {v?.slice(0, 3).map((t) => (
            <span key={t} style={{
              fontSize: 10, borderRadius: 4, padding: '1px 5px',
              background: token.colorFillTertiary,
              color: token.colorTextSecondary,
              border: `1px solid ${token.colorBorderSecondary}`,
            }}>{t}</span>
          ))}
          {v?.length > 3 && <span style={{ fontSize: 10, color: token.colorTextTertiary }}>+{v.length - 3}</span>}
        </div>
      ),
    },
    {
      key: 'startDate', title: 'Ngày vào làm', dataIndex: 'startDate', width: 110,
      render: (v: string) => v
        ? <span style={{ fontSize: 12, color: token.colorTextSecondary }}>{dayjs(v).format('DD/MM/YYYY')}</span>
        : <span style={{ fontSize: 12, color: token.colorTextTertiary }}>—</span>,
    },
    {
      key: 'projects', title: 'Dự án', width: 100,
      render: (_: unknown, r: Employee) => <ProjectsCell employee={r} />,
    },
    {
      key: 'actions', title: '', width: 110,
      render: (_: unknown, r: Employee) => (
        <Space size={2}>
          <Tooltip title="Xem hồ sơ đầy đủ">
            <Button
              type="text" size="small" icon={<IdcardOutlined />}
              style={{ color: '#6366F1' }}
              onClick={() => navigate(`/hr/employees/${r.id}`)}
            />
          </Tooltip>
          <Tooltip title="Sửa">
            <Button
              type="text" size="small" icon={<EditOutlined />}
              onClick={() => {
                setEditEmployee(r);
                editForm.setFieldsValue({
                  code:          r.code,
                  fullName:      r.fullName,
                  level:         r.level,
                  orgUnitId:     r.orgUnitId,
                  jobTitleId:    r.jobTitleId ?? undefined,
                  positionId:    r.positionId ?? null,
                  startDate:     r.startDate     ? dayjs(r.startDate)     : null,
                  birthdate:     r.birthdate     ? dayjs(r.birthdate)     : null,
                  techStack:     r.techStack,
                  email:         r.email,
                  gender:        r.gender,
                  maritalStatus: r.maritalStatus,
                  phoneNumber:   r.phoneNumber,
                  hometown:      r.hometown,
                  cccd:          r.cccd,
                  cccdIssueDate: r.cccdIssueDate ? dayjs(r.cccdIssueDate) : null,
                  cccdIssuePlace: r.cccdIssuePlace,
                });
              }}
            />
          </Tooltip>
          <Tooltip title={getOnboardingTooltip(r)}>
            <Button
              type="text" size="small"
              icon={<PlayCircleOutlined />}
              disabled={isOnboardingDisabled()}
              loading={onboardingLoading === r.id}
              style={{ color: isOnboardingDisabled() ? undefined : '#10B981' }}
              onClick={() => void startOnboarding(r)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];
}
