import { useState, useEffect } from 'react';
import {
  Button, Input, Switch, Space, Select,
  Typography, Divider, Tooltip, Modal, Segmented,
} from 'antd';
import {
  ArrowUpOutlined, ArrowDownOutlined,
  EditOutlined, CheckOutlined, CloseOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useMenuStore, getDefaultModuleConfig } from '../../store/menu.store';
import type { MenuGroupCfg, MenuTopItemCfg } from '../../store/menu.store';
import { useModuleStore } from '../../store/module.store';
import { useThemePalette } from '../../hooks/useThemePalette';
import { MODULES } from '../../config/modules.config';

const { Text } = Typography;

type InlineEdit = { key: string; label: string } | null;

function cloneGroups(groups: MenuGroupCfg[]): MenuGroupCfg[] {
  return groups.map(g => ({ ...g, items: g.items.map(i => ({ ...i })) }));
}

export function MenuConfigPanel() {
  const { getModuleConfig, setModuleConfig, resetModuleConfig } = useMenuStore();
  const { activeModuleId } = useModuleStore();
  const { isDark, bgContainer: rowBg, bgSubPanel: groupHdrBg, borderColor, textMuted: mutedText } = useThemePalette();

  const [selectedModuleId, setSelectedModuleId] = useState(activeModuleId);
  const [localTop,    setLocalTop]    = useState<MenuTopItemCfg[]>([]);
  const [localGroups, setLocalGroups] = useState<MenuGroupCfg[]>([]);
  const [editing,     setEditing]     = useState<InlineEdit>(null);

  // Load config khi đổi module
  useEffect(() => {
    const cfg = getModuleConfig(selectedModuleId);
    setLocalTop(cfg.topItems.map(i => ({ ...i })));
    setLocalGroups(cloneGroups(cfg.groups));
    setEditing(null);
  }, [selectedModuleId]);

  // ── top items ────────────────────────────────────────────────────────────────
  const toggleTopVisible = (key: string) =>
    setLocalTop(prev => prev.map(i => i.key === key ? { ...i, visible: !i.visible } : i));

  // ── groups ───────────────────────────────────────────────────────────────────
  const toggleGroupVisible = (gKey: string) =>
    setLocalGroups(prev => prev.map(g => g.key === gKey ? { ...g, visible: !g.visible } : g));

  const moveGroup = (gKey: string, dir: 'up' | 'down') => {
    setLocalGroups(prev => {
      const arr = [...prev];
      const i = arr.findIndex(g => g.key === gKey);
      if (dir === 'up'   && i > 0)               [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
      if (dir === 'down' && i < arr.length - 1)  [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
      return arr;
    });
  };

  // ── items ────────────────────────────────────────────────────────────────────
  const toggleItemVisible = (gKey: string, iKey: string) =>
    setLocalGroups(prev => prev.map(g =>
      g.key !== gKey ? g : { ...g, items: g.items.map(it => it.key === iKey ? { ...it, visible: !it.visible } : it) }
    ));

  const moveItem = (gKey: string, iKey: string, dir: 'up' | 'down') =>
    setLocalGroups(prev => prev.map(g => {
      if (g.key !== gKey) return g;
      const arr = [...g.items];
      const i = arr.findIndex(it => it.key === iKey);
      if (dir === 'up'   && i > 0)               [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
      if (dir === 'down' && i < arr.length - 1)  [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
      return { ...g, items: arr };
    }));

  const moveItemToGroup = (fromGKey: string, iKey: string, toGKey: string) =>
    setLocalGroups(prev => {
      const item = prev.find(g => g.key === fromGKey)?.items.find(i => i.key === iKey);
      if (!item) return prev;
      return prev.map(g => {
        if (g.key === fromGKey) return { ...g, items: g.items.filter(i => i.key !== iKey) };
        if (g.key === toGKey)   return { ...g, items: [...g.items, { ...item }] };
        return g;
      });
    });

  // ── inline edit ──────────────────────────────────────────────────────────────
  const startEdit  = (key: string, label: string) => setEditing({ key, label });
  const cancelEdit = () => setEditing(null);
  const confirmEdit = () => {
    if (!editing?.label.trim()) return cancelEdit();
    const { key, label } = editing;
    if (localTop.some(t => t.key === key)) {
      setLocalTop(prev => prev.map(t => t.key === key ? { ...t, label } : t));
    } else if (localGroups.some(g => g.key === key)) {
      setLocalGroups(prev => prev.map(g => g.key === key ? { ...g, label } : g));
    } else {
      setLocalGroups(prev => prev.map(g => ({
        ...g, items: g.items.map(i => i.key === key ? { ...i, label } : i),
      })));
    }
    setEditing(null);
  };

  // ── save / reset ─────────────────────────────────────────────────────────────
  const handleSave = () => setModuleConfig(selectedModuleId, localTop, localGroups);

  const handleReset = () =>
    Modal.confirm({
      title: 'Đặt lại mặc định?',
      content: `Cấu hình menu của module "${MODULES.find(m => m.id === selectedModuleId)?.label}" sẽ trở về mặc định.`,
      okText: 'Đặt lại', cancelText: 'Hủy', okButtonProps: { danger: true },
      onOk: () => {
        resetModuleConfig(selectedModuleId);
        const def = getDefaultModuleConfig(selectedModuleId);
        setLocalTop(def.topItems.map(i => ({ ...i })));
        setLocalGroups(cloneGroups(def.groups));
      },
    });

  // ── style tokens ─────────────────────────────────────────────────────────────

  // ── sub-components ───────────────────────────────────────────────────────────
  function LabelCell({ itemKey, label }: { itemKey: string; label: string }) {
    if (editing?.key === itemKey) {
      return (
        <Input
          size="small"
          value={editing.label}
          onChange={e => setEditing(prev => prev ? { ...prev, label: e.target.value } : null)}
          onPressEnter={confirmEdit}
          autoFocus
          style={{ flex: 1, minWidth: 0, maxWidth: 160 }}
        />
      );
    }
    return (
      <span style={{ flex: 1, minWidth: 0, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </span>
    );
  }

  function EditBtn({ itemKey, label }: { itemKey: string; label: string }) {
    if (editing?.key === itemKey) {
      return (
        <Space size={0}>
          <Button size="small" type="link" icon={<CheckOutlined />} onClick={confirmEdit} style={{ color: '#52c41a' }} />
          <Button size="small" type="link" icon={<CloseOutlined />} onClick={cancelEdit}  style={{ color: '#ff4d4f' }} />
        </Space>
      );
    }
    return (
      <Tooltip title="Đổi tên">
        <Button
          size="small" type="text" icon={<EditOutlined />}
          onClick={() => startEdit(itemKey, label)}
          style={{ color: mutedText }}
        />
      </Tooltip>
    );
  }

  const groupSelectOptions = localGroups.map(g => ({ value: g.key, label: g.label }));

  return (
    <div style={{ maxWidth: 560 }}>

      {/* Module selector */}
      <div style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, color: mutedText, fontWeight: 600, display: 'block', marginBottom: 8 }}>
          Module
        </Text>
        <Segmented
          value={selectedModuleId}
          onChange={(v) => setSelectedModuleId(v as string)}
          options={MODULES.map(m => ({ value: m.id, label: m.label }))}
        />
      </div>

      {/* Top items */}
      {localTop.length > 0 && (
        <>
          <Text style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, color: mutedText, fontWeight: 600 }}>
            Top Level
          </Text>
          {localTop.map(item => (
            <div
              key={item.key}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 10px', marginTop: 6, borderRadius: 6,
                background: rowBg, border: `1px solid ${borderColor}`,
                opacity: item.visible ? 1 : 0.45,
              }}
            >
              <Switch size="small" checked={item.visible} onChange={() => toggleTopVisible(item.key)} />
              <LabelCell itemKey={item.key} label={item.label} />
              <EditBtn   itemKey={item.key} label={item.label} />
            </div>
          ))}
          <Divider style={{ margin: '14px 0 10px' }} />
        </>
      )}

      <Text style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, color: mutedText, fontWeight: 600 }}>
        Nhóm & Menu Items
      </Text>

      {/* Groups */}
      {localGroups.map((group, gIdx) => (
        <div
          key={group.key}
          style={{ marginTop: 10, borderRadius: 8, border: `1px solid ${borderColor}`, overflow: 'hidden' }}
        >
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
              background: groupHdrBg, opacity: group.visible ? 1 : 0.5,
            }}
          >
            <Switch size="small" checked={group.visible} onChange={() => toggleGroupVisible(group.key)} />
            <LabelCell itemKey={group.key} label={group.label} />
            <EditBtn   itemKey={group.key} label={group.label} />
            <Space size={2} style={{ marginLeft: 'auto', flexShrink: 0 }}>
              <Tooltip title="Di chuyển lên">
                <Button size="small" type="text" icon={<ArrowUpOutlined />}
                  disabled={gIdx === 0} onClick={() => moveGroup(group.key, 'up')} />
              </Tooltip>
              <Tooltip title="Di chuyển xuống">
                <Button size="small" type="text" icon={<ArrowDownOutlined />}
                  disabled={gIdx === localGroups.length - 1} onClick={() => moveGroup(group.key, 'down')} />
              </Tooltip>
            </Space>
          </div>

          {group.items.length === 0 && (
            <div style={{ padding: '8px 18px', fontSize: 12, color: mutedText }}>(Không có item)</div>
          )}

          {group.items.map((item, iIdx) => (
            <div
              key={item.key}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 10px 5px 22px',
                borderTop: `1px solid ${borderColor}`,
                opacity: item.visible ? 1 : 0.4,
              }}
            >
              <Switch size="small" checked={item.visible} onChange={() => toggleItemVisible(group.key, item.key)} />
              <LabelCell itemKey={item.key} label={item.label} />
              <EditBtn   itemKey={item.key} label={item.label} />
              <Space size={2} style={{ marginLeft: 'auto', flexShrink: 0 }}>
                <Tooltip title="Lên">
                  <Button size="small" type="text" icon={<ArrowUpOutlined />}
                    disabled={iIdx === 0} onClick={() => moveItem(group.key, item.key, 'up')} />
                </Tooltip>
                <Tooltip title="Xuống">
                  <Button size="small" type="text" icon={<ArrowDownOutlined />}
                    disabled={iIdx === group.items.length - 1} onClick={() => moveItem(group.key, item.key, 'down')} />
                </Tooltip>
                <Select
                  size="small" style={{ width: 110 }}
                  placeholder="Chuyển →" value={undefined}
                  options={groupSelectOptions.filter(o => o.value !== group.key)}
                  onChange={(val: string) => moveItemToGroup(group.key, item.key, val)}
                  popupMatchSelectWidth={false}
                />
              </Space>
            </div>
          ))}
        </div>
      ))}

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
        <Button icon={<ReloadOutlined />} danger onClick={handleReset}>
          Đặt lại mặc định
        </Button>
        <Button type="primary" onClick={handleSave}>
          Lưu thay đổi
        </Button>
      </div>
    </div>
  );
}
