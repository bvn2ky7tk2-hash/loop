import { Button, Space, Popconfirm, Tooltip, Typography } from 'antd';
import {
  EditOutlined, DeleteOutlined,
  BankOutlined, ApartmentOutlined, TeamOutlined, UserOutlined,
  PlusCircleOutlined, CrownOutlined,
} from '@ant-design/icons';
import type { OrgUnitTree } from '../../../api/org-units';
import type { Employee } from '../../../api/employees';
import { useThemePalette } from '../../../hooks/useThemePalette';
import { getLevelHue } from '../orgChartHelpers';
import { Avatar } from './Avatar';

const { Text } = Typography;

// ── OrgNode ───────────────────────────────────────────────────────────────────
interface OrgNodeProps {
  node: OrgUnitTree;
  employees: Employee[];
  levelDirections: Record<number, 'horizontal' | 'vertical'>;
  isDark: boolean;
  linkColor: string;
  textMuted: string;
  canManageOrg: boolean;
  onAddChild: (parentId: string) => void;
  onEdit: (node: OrgUnitTree) => void;
  onDelete: (id: string) => void;
  onAssignLeader: (node: OrgUnitTree) => void;
}

export function OrgNode({
  node, employees, levelDirections, isDark, linkColor, textMuted,
  canManageOrg, onAddChild, onEdit, onDelete, onAssignLeader,
}: OrgNodeProps) {
  const hue = getLevelHue(node.level ?? 0);
  const LevelIcon = [BankOutlined, ApartmentOutlined, TeamOutlined, UserOutlined][Math.min(node.level ?? 0, 3)];
  const unitEmps = employees.filter((e) => e.orgUnitId === node.id);
  const hasChildren = (node.children ?? []).length > 0;
  const childDirection = levelDirections[(node.level ?? 0) + 1] ?? 'horizontal';

  const nodeBg    = isDark ? `${hue}18` : `${hue}0A`;
  const borderTop = hue;
  const { textPrimary: textMain, textSecondary: textSub } = useThemePalette();
  const connColor = isDark ? '#334155' : '#CBD5E1';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
      {/* Card */}
      <div style={{
        background: nodeBg,
        border: `1px solid ${borderTop}40`,
        borderTop: `3px solid ${borderTop}`,
        borderRadius: 10,
        padding: '10px 14px',
        minWidth: 160,
        maxWidth: 200,
        boxShadow: isDark
          ? '0 2px 8px rgba(0,0,0,0.35)'
          : '0 2px 8px rgba(0,0,0,0.08)',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: isDark ? `${hue}25` : `${hue}18`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <LevelIcon style={{ color: hue, fontSize: 15 }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: textMain, lineHeight: 1.35, wordBreak: 'break-word' }}>
              {node.name}
            </div>
            <span style={{
              fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
              background: isDark ? `${hue}28` : `${hue}15`, color: hue,
              letterSpacing: '0.4px', display: 'inline-block', marginTop: 2,
            }}>
              {node.code}
            </span>
          </div>
        </div>

        {/* Avatars */}
        {unitEmps.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
            {unitEmps.slice(0, 5).map((e) => (
              <Avatar key={e.id} name={e.fullName} size={26} />
            ))}
            {unitEmps.length > 5 && (
              <div style={{
                width: 26, height: 26, borderRadius: '50%', fontSize: 10, fontWeight: 700,
                background: isDark ? '#334155' : '#E2E8F0',
                color: textSub,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                +{unitEmps.length - 5}
              </div>
            )}
          </div>
        )}

        {/* Leader badge */}
        {node.leaderInfo ? (
          <div style={{
            fontSize: 10, marginBottom: 6,
            display: 'flex', alignItems: 'center', gap: 4,
            background: isDark ? 'rgba(147,197,253,0.12)' : 'rgba(99,102,241,0.08)',
            border: `1px solid ${isDark ? 'rgba(147,197,253,0.25)' : 'rgba(99,102,241,0.25)'}`,
            borderRadius: 5, padding: '3px 6px',
          }}>
            <CrownOutlined style={{ color: linkColor, fontSize: 10 }} />
            <Text style={{ color: linkColor, fontWeight: 600, fontSize: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {node.leaderInfo.fullName}
            </Text>
          </div>
        ) : (
          <div style={{ fontSize: 10, color: textMuted, fontStyle: 'italic', marginBottom: 4 }}>
            Chưa có lãnh đạo
          </div>
        )}

        {/* Head row */}
        {node.head ? (
          <div style={{
            fontSize: 10, marginBottom: 6,
            display: 'flex', alignItems: 'center', gap: 4,
            background: isDark ? 'rgba(251,191,36,0.12)' : 'rgba(251,191,36,0.15)',
            border: `1px solid ${isDark ? 'rgba(251,191,36,0.25)' : 'rgba(251,191,36,0.4)'}`,
            borderRadius: 5, padding: '3px 6px',
          }}>
            <span style={{ fontSize: 10 }}>👑</span>
            <span style={{ color: isDark ? '#FCD34D' : '#92400E', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {node.head.fullName}
            </span>
            <span style={{ color: textSub, fontSize: 9, flexShrink: 0 }}>· {node.head.jobTitleName}</span>
          </div>
        ) : node.headJobTitle ? (
          <div style={{
            fontSize: 10, marginBottom: 6,
            display: 'flex', alignItems: 'center', gap: 4,
            background: isDark ? 'rgba(148,163,184,0.1)' : 'rgba(148,163,184,0.12)',
            borderRadius: 5, padding: '3px 6px',
          }}>
            <span style={{ fontSize: 9 }}>👑</span>
            <span style={{ color: textSub, fontStyle: 'italic' }}>Chưa có {node.headJobTitle.name}</span>
          </div>
        ) : null}

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: textSub, display: 'flex', alignItems: 'center', gap: 3 }}>
            <UserOutlined style={{ fontSize: 10 }} />
            {unitEmps.length} nhân sự
          </span>
          <Space size={2}>
            {canManageOrg && (
              <Tooltip title="Gán lãnh đạo">
                <Button type="text" size="small" icon={<CrownOutlined />}
                  style={{ color: linkColor, height: 22, width: 22, padding: 0, fontSize: 12 }}
                  onClick={() => onAssignLeader(node)} />
              </Tooltip>
            )}
            <Tooltip title="Thêm đơn vị con">
              <Button type="text" size="small" icon={<PlusCircleOutlined />}
                style={{ color: hue, height: 22, width: 22, padding: 0, fontSize: 13 }}
                onClick={() => onAddChild(node.id)} />
            </Tooltip>
            <Tooltip title="Sửa">
              <Button type="text" size="small" icon={<EditOutlined />}
                style={{ color: textSub, height: 22, width: 22, padding: 0, fontSize: 12 }}
                onClick={() => onEdit(node)} />
            </Tooltip>
            <Popconfirm
              title="Xoá đơn vị này?"
              description="Đơn vị con và nhân sự liên kết sẽ bị ảnh hưởng."
              onConfirm={() => onDelete(node.id)}
              okText="Xoá" cancelText="Huỷ" okButtonProps={{ danger: true }}
            >
              <Tooltip title="Xoá">
                <Button type="text" size="small" danger icon={<DeleteOutlined />}
                  style={{ height: 22, width: 22, padding: 0, fontSize: 12 }} />
              </Tooltip>
            </Popconfirm>
          </Space>
        </div>
      </div>

      {/* Connector line down to children */}
      {hasChildren && (
        <div style={{ width: 2, height: 20, background: connColor, flexShrink: 0 }} />
      )}

      {/* Children container */}
      {hasChildren && (
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {childDirection === 'horizontal' ? (
            <>
              {/* Horizontal bar spanning children */}
              <div style={{ position: 'relative', display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 0 }}>
                {(node.children ?? []).map((child, idx, arr) => (
                  <div key={child.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                    {/* Horizontal connector */}
                    <div style={{
                      height: 2, background: connColor,
                      position: 'absolute', top: 0,
                      left: idx === 0 ? '50%' : 0,
                      right: idx === arr.length - 1 ? '50%' : 0,
                      width: arr.length === 1 ? 0
                        : (idx === 0 || idx === arr.length - 1) ? 'calc(50% + 1px)' : '100%',
                    }} />
                    {/* Vertical drop */}
                    <div style={{ width: 2, height: 20, background: connColor, marginTop: 0 }} />
                    {/* Padding between siblings */}
                    <div style={{ paddingLeft: 12, paddingRight: 12 }}>
                      <OrgNode
                        node={child}
                        employees={employees}
                        levelDirections={levelDirections}
                        isDark={isDark}
                        linkColor={linkColor}
                        textMuted={textMuted}
                        canManageOrg={canManageOrg}
                        onAddChild={onAddChild}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onAssignLeader={onAssignLeader}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            /* Vertical: children stacked */
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
              {(node.children ?? []).map((child) => (
                <div key={child.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <OrgNode
                    node={child}
                    employees={employees}
                    levelDirections={levelDirections}
                    isDark={isDark}
                    linkColor={linkColor}
                    textMuted={textMuted}
                    canManageOrg={canManageOrg}
                    onAddChild={onAddChild}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onAssignLeader={onAssignLeader}
                  />
                  {/* connector between vertical siblings handled by child's own top connector */}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
