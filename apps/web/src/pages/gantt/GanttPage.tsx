import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  Select, DatePicker, Segmented, Tooltip, Spin,
  Empty, theme, Badge, Button, Space,
} from 'antd';
import {
  CaretRightFilled, CaretDownFilled,
  PlusSquareOutlined, MinusSquareOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import dayjs, { type Dayjs } from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { tasksApi, type Task } from '../../api/tasks';
import { projectsApi } from '../../api/projects';
import { TaskStatusPill } from '../../components/ui/TaskStatusPill';
import type { TaskStatus } from '../../components/ui/TaskStatusPill';

dayjs.extend(isoWeek);


type ViewMode    = 'day' | 'week' | 'month';
type TrackStatus = 'upcoming' | 'on_track' | 'behind' | 'overdue' | 'done';

// ── Column definitions ────────────────────────────────────────────────────────

const LEFT_COLS_FULL = [
  { key: 'num',    label: '#',             width: 72  },
  { key: 'title',  label: 'Tên công việc', width: 195 },
  { key: 'status', label: 'Trạng thái',    width: 88  },
  { key: 'start',  label: 'Bắt đầu',       width: 70  },
  { key: 'end',    label: 'Kết thúc',      width: 70  },
  { key: 'pct',    label: '% Xong',        width: 52  },
  { key: 'track',  label: 'Tình trạng',    width: 88  },
] as const;

// Compact: chỉ 3 cột thiết yếu khi màn hình nhỏ
const LEFT_COLS_COMPACT = [
  { key: 'num',    label: '#',             width: 44  },
  { key: 'title',  label: 'Tên công việc', width: 160 },
  { key: 'status', label: 'Trạng thái',    width: 82  },
] as const;

const PX_PER_DAY: Record<ViewMode, number> = { day: 32, week: 14, month: 5 };

const ROW_H = 38;
const COL_H = 26;

// ── Lookup maps ───────────────────────────────────────────────────────────────

const TRACK_COLOR_BASE = { upcoming: '#94A3B8', behind: '#F59E0B', overdue: '#EF4444', done: '#10B981' };

const TRACK_LABEL: Record<TrackStatus, string> = {
  upcoming: 'Chưa bắt đầu', on_track: 'Đúng tiến độ',
  behind:   'Chậm tiến độ', overdue:  'Quá hạn',        done: 'Hoàn thành',
};

const TRACK_BADGE: Record<TrackStatus, 'default' | 'success' | 'warning' | 'error' | 'processing'> = {
  upcoming: 'default', on_track: 'processing',
  behind:   'warning', overdue:  'error',     done: 'success',
};

const MONTH_VI = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4',  'Tháng 5',  'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface TimeUnit   { key: string; label: string; dayStart: Dayjs; days: number }
interface HeaderGroup { label: string; width: number }

type FlatTask = Task & {
  _depth:       number;
  _num:         string;   // "1"  "1.2"  "1.2.3"
  _parentIds:   string[]; // all ancestor IDs (for collapse logic)
  _hasChildren: boolean;
};

// ── Pure helpers ──────────────────────────────────────────────────────────────

/**
 * Flatten the task tree into a flat array with hierarchical numbering.
 * Numbering: root → "1", "2"; children → "1.1", "1.2"; grandchildren → "1.1.1", …
 */
function flattenTasks(tasks: Task[]): FlatTask[] {
  const result: FlatTask[] = [];

  function walk(list: Task[], depth: number, nums: number[], parentIds: string[]) {
    list.forEach((t, i) => {
      const curNums    = [...nums, i + 1];
      const numStr     = curNums.join('.');
      const hasChildren = !!(t.children?.length);
      result.push({ ...t, _depth: depth, _num: numStr, _parentIds: parentIds, _hasChildren: hasChildren });
      if (hasChildren) walk(t.children!, depth + 1, curNums, [...parentIds, t.id]);
    });
  }

  walk(tasks, 0, [], []);
  return result;
}

function buildGroups(
  units: TimeUnit[],
  getKey:   (u: TimeUnit) => string,
  getLabel: (key: string, firstUnit: TimeUnit) => string,
  pxPerDay: number,
): HeaderGroup[] {
  const out: HeaderGroup[] = [];
  let cur = '', w = 0, lbl = '';
  for (const u of units) {
    const k = getKey(u); const uw = u.days * pxPerDay;
    if (k !== cur) { if (cur) out.push({ label: lbl, width: w }); cur = k; w = uw; lbl = getLabel(k, u); }
    else { w += uw; }
  }
  if (cur) out.push({ label: lbl, width: w });
  return out;
}

function generateTimeline(start: Dayjs, end: Dayjs, mode: ViewMode) {
  const pxPerDay = PX_PER_DAY[mode];
  const units: TimeUnit[] = [];

  if (mode === 'day') {
    let d = start.startOf('day');
    while (!d.isAfter(end)) {
      units.push({ key: d.format('YYYY-MM-DD'), label: d.format('D'), dayStart: d, days: 1 });
      d = d.add(1, 'day');
    }
    return { units, pxPerDay, groups: buildGroups(units,
      u => u.dayStart.format('YYYY-MM'),
      (_, u) => `${MONTH_VI[u.dayStart.month()]} ${u.dayStart.year()}`, pxPerDay) };
  }

  if (mode === 'week') {
    let d = start.startOf('isoWeek');
    while (d.isBefore(end)) {
      units.push({ key: `${d.isoWeekYear()}-W${String(d.isoWeek()).padStart(2,'0')}`, label: `W${d.isoWeek()}`, dayStart: d, days: 7 });
      d = d.add(1, 'week');
    }
    // Week's month = Thursday's month (ISO 8601)
    return { units, pxPerDay, groups: buildGroups(units,
      u => u.dayStart.add(3,'day').format('YYYY-MM'),
      (_, u) => { const t = u.dayStart.add(3,'day'); return `${MONTH_VI[t.month()]} ${t.year()}`; }, pxPerDay) };
  }

  let d = start.startOf('month');
  while (!d.isAfter(end)) {
    units.push({ key: d.format('YYYY-MM'), label: MONTH_VI[d.month()], dayStart: d, days: d.daysInMonth() });
    d = d.add(1, 'month');
  }
  return { units, pxPerDay, groups: buildGroups(units,
    u => String(u.dayStart.year()), key => `Năm ${key}`, pxPerDay) };
}

/** Bar pixel geometry */
function calcBar(task: FlatTask, viewStart: Dayjs, pxPerDay: number) {
  if (!task.startDate && !task.dueDate) return null;
  const s     = dayjs(task.startDate ?? task.dueDate!).startOf('day');
  const e     = dayjs(task.dueDate   ?? task.startDate!).startOf('day');
  const left  = s.diff(viewStart, 'day') * pxPerDay;
  const width = Math.max((e.diff(s, 'day') + 1) * pxPerDay, pxPerDay);
  return { left, width };
}

/**
 * Expected % complete based on calendar time only.
 * 0 = task not started, 100 = at/past end date.
 */
function getExpectedPct(task: FlatTask): number | null {
  if (!task.startDate || !task.dueDate) return null;
  const s     = dayjs(task.startDate).startOf('day');
  const e     = dayjs(task.dueDate).startOf('day');
  const today = dayjs().startOf('day');
  if (today.isBefore(s)) return 0;
  const total   = e.diff(s, 'day') + 1;
  const elapsed = today.diff(s, 'day') + 1;
  return Math.min(100, Math.max(0, (elapsed / total) * 100));
}

/**
 * Track status:
 *  - done     → status=DONE or progress≥100
 *  - upcoming → hasn't started yet (today < startDate or no startDate)
 *  - overdue  → today past dueDate and not done
 *  - on_track → actual% ≥ expected% − 8% tolerance
 *  - behind   → actual% < expected% − 8%
 */
function getTrackStatus(task: FlatTask): TrackStatus {
  const progress = Number(task.progress ?? 0);
  if (task.status === 'DONE' || task.status === 'CANCELLED' || progress >= 100) return 'done';

  const today = dayjs().startOf('day');
  const start = task.startDate ? dayjs(task.startDate).startOf('day') : null;
  const end   = task.dueDate   ? dayjs(task.dueDate).startOf('day')   : null;

  if (!start || today.isBefore(start)) return 'upcoming';
  if (end && today.isAfter(end))       return 'overdue';

  const expected = getExpectedPct(task) ?? 0;
  return progress >= expected - 8 ? 'on_track' : 'behind';
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function GanttPage() {
  const [projectId,    setProjectId]    = useState<string | null>(null);
  const [viewMode,     setViewMode]     = useState<ViewMode>('week');
  const [range,        setRange]        = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(1,'month').startOf('month'),
    dayjs().add(3,'month').endOf('month'),
  ]);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [displayLevel, setDisplayLevel] = useState<string>('all');
  const [isCompact,    setIsCompact]    = useState(window.innerWidth < 1100);

  useEffect(() => {
    const handler = () => setIsCompact(window.innerWidth < 1100);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const leftCols = isCompact ? LEFT_COLS_COMPACT : LEFT_COLS_FULL;
  const leftW    = leftCols.reduce((s, c) => s + c.width, 0);

  const { token } = theme.useToken();
  const TRACK_COLOR: Record<TrackStatus, string> = { ...TRACK_COLOR_BASE, on_track: token.colorPrimary };

  const { data: projects = [] } = useQuery({ queryKey: ['projects'],    queryFn: projectsApi.list });
  const { data: taskTree = [], isLoading } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn:  () => tasksApi.tree(projectId!),
    enabled:  !!projectId,
  });

  const flat = useMemo(() => flattenTasks(taskTree as Task[]), [taskTree]);

  // Auto-fit date range to cover all task dates when a new project is selected.
  // fittedProjectRef prevents overriding the user's manual range changes.
  const fittedProjectRef = useRef<string | null>(null);
  useEffect(() => {
    if (!projectId || !flat.length) return;
    if (fittedProjectRef.current === projectId) return;
    const dates = flat
      .flatMap(t => [t.startDate, t.dueDate])
      .filter((d): d is string => Boolean(d));
    if (!dates.length) return;
    const minDate = dates.reduce((a, b) => (a < b ? a : b));
    const maxDate = dates.reduce((a, b) => (a > b ? a : b));
    setRange([
      dayjs(minDate).subtract(1, 'week').startOf('month'),
      dayjs(maxDate).add(1, 'week').endOf('month'),
    ]);
    fittedProjectRef.current = projectId;
  }, [flat, projectId]);

  // Visible = tasks whose ancestors are NOT in collapsedIds.
  // collapsedIds is the single source of truth — the level dropdown
  // and expand/collapse buttons all write to it.
  const visible = useMemo(() =>
    flat.filter(task => !task._parentIds.some(id => collapsedIds.has(id))),
  [flat, collapsedIds]);

  const toggleCollapse = useCallback((id: string) => {
    setDisplayLevel('all'); // manual toggle → detach from level preset
    setCollapsedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setCollapsedIds(new Set());
    setDisplayLevel('all');
  }, []);

  const collapseAll = useCallback(() => {
    setCollapsedIds(new Set(flat.filter(t => t._hasChildren).map(t => t.id)));
    setDisplayLevel('1');
  }, [flat]);

  /**
   * Level dropdown: sets collapsed state to match the selected depth.
   *   'all'  → expand everything
   *   '1'    → collapse all (show only root tasks, depth 0)
   *   '2'    → collapse tasks at depth ≥ 1 that have children
   *   '3'    → collapse tasks at depth ≥ 2 that have children
   */
  const handleLevelChange = useCallback((v: string) => {
    setDisplayLevel(v);
    if (v === 'all') {
      setCollapsedIds(new Set());
    } else {
      const depth = parseInt(v, 10);
      // Collapse every parent whose depth >= (depth - 1), so its children
      // (which would be at depth >= depth) are hidden.
      setCollapsedIds(new Set(
        flat.filter(t => t._hasChildren && t._depth >= depth - 1).map(t => t.id),
      ));
    }
  }, [flat]);

  const { units, groups, pxPerDay } = useMemo(
    () => generateTimeline(range[0], range[1], viewMode), [range, viewMode]);

  const viewStart     = units[0]?.dayStart ?? range[0];
  const chartW        = useMemo(() => units.reduce((s, u) => s + u.days * pxPerDay, 0), [units, pxPerDay]);
  const todayOffsetPx = useMemo(
    () => dayjs().startOf('day').diff(viewStart.startOf('day'), 'day') * pxPerDay,
    [viewStart, pxPerDay]);

  const border = `1px solid ${token.colorBorderSecondary}`;
  const bg     = token.colorBgContainer;
  const hBg    = token.colorFillAlter;
  // Nền header phải ĐỤC hoàn toàn: phủ colorFillAlter (bán trong suốt) lên nền container
  // → vùng cuộn bên phải không xuyên chữ qua cột trái/dòng header khi kéo ngang
  const hBgSolid = `linear-gradient(${hBg}, ${hBg}), ${bg}`;
  const altBg  = token.colorFillQuaternary;

  // Unit grid lines (day & week modes)
  const gridBg = useMemo(() => {
    const c = token.colorBorderSecondary;
    if (viewMode === 'day') {
      const w = PX_PER_DAY.day;
      return { backgroundImage: `repeating-linear-gradient(to right,transparent,transparent ${w-1}px,${c} ${w-1}px,${c} ${w}px)` };
    }
    if (viewMode === 'week') {
      const w = 7 * PX_PER_DAY.week;
      return { backgroundImage: `repeating-linear-gradient(to right,transparent,transparent ${w-1}px,${c} ${w-1}px,${c} ${w}px)` };
    }
    return {} as Record<string, string>;
  }, [viewMode, token.colorBorderSecondary]);

  const cellBase = {
    display: 'flex' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
    boxSizing: 'border-box' as const, overflow: 'hidden' as const, borderRight: border,
  };

  const showTodayLine = todayOffsetPx >= 0 && todayOffsetPx <= chartW;

  return (
    <div style={{ padding: 16, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', gap: 8 }}>

      {/* ── Controls row 1: Title / Project / View / Date ── */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <h1 className="page-title" style={{ flexShrink: 0, fontSize: 18 }}>Timeline</h1>
        <Select
          style={{ flex: 1, minWidth: 160, maxWidth: 320 }} placeholder="Chọn dự án"
          value={projectId} onChange={setProjectId} allowClear
          showSearch={{ optionFilterProp: 'label' }}
          options={projects.map(p => ({ value: p.id, label: `${p.code} — ${p.name}` }))}
        />
        <Segmented
          value={viewMode}
          onChange={(v) => setViewMode(v as ViewMode)}
          options={[
            { label: 'Ngày', value: 'day' },
            { label: 'Tuần', value: 'week' },
            { label: 'Tháng', value: 'month' },
          ]}
        />
        <DatePicker.RangePicker
          value={range}
          onChange={(v) => { if (v?.[0] && v?.[1]) setRange([v[0], v[1]]); }}
          format="DD/MM/YYYY" allowClear={false}
        />
      </div>

      {/* ── Controls row 2: Collapse / Level / Legend ── */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <Space size={4}>
          <Button size="small" icon={<PlusSquareOutlined />} onClick={expandAll}>
            Mở rộng tất cả
          </Button>
          <Button size="small" icon={<MinusSquareOutlined />} onClick={collapseAll}>
            Thu gọn tất cả
          </Button>
        </Space>

        <Select
          size="small"
          value={displayLevel}
          onChange={handleLevelChange}
          style={{ width: 140 }}
          options={[
            { value: '1',   label: 'Hiện Level 1' },
            { value: '2',   label: 'Hiện Level 2' },
            { value: '3',   label: 'Hiện Level 3' },
            { value: 'all', label: 'Tất cả levels' },
          ]}
        />

        {/* Legend */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginLeft: 4 }}>
          {(Object.keys(TRACK_COLOR) as TrackStatus[]).map(s => (
            <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: token.colorTextSecondary }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: TRACK_COLOR[s], display: 'inline-block', flexShrink: 0 }} />
              {TRACK_LABEL[s]}
            </span>
          ))}
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: token.colorTextSecondary }}>
            <span style={{ width: 2, height: 12, background: '#EF4444', display: 'inline-block' }} />
            Hôm nay
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: token.colorTextSecondary }}>
            <span style={{ width: 8, height: 8, border: '2px solid #595959', transform: 'rotate(45deg)', display: 'inline-block' }} />
            Kế hoạch hôm nay
          </span>
        </div>
      </div>

      {/* ── Chart ── */}
      {!projectId ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Empty description="Chọn dự án để xem timeline" />
        </div>
      ) : isLoading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Spin size="large" />
        </div>
      ) : (
        <div style={{ flex: 1, overflow: 'auto', border: `1px solid ${token.colorBorder}`, borderRadius: 6 }}>

          {/* ── Header row 1: Year/Month groups ── */}
          <div style={{
            position: 'sticky', top: 0, zIndex: 30,
            display: 'flex', height: COL_H, borderBottom: border, background: hBgSolid,
          }}>
            <div style={{
              ...cellBase, position: 'sticky', left: 0, zIndex: 31,
              width: leftW, minWidth: leftW, height: COL_H,
              background: hBgSolid, fontWeight: 700, fontSize: 12,
              borderRight: `2px solid ${token.colorBorder}`,
            }}>
              Công việc
            </div>
            <div style={{ position: 'relative', display: 'flex' }}>
              {groups.map((g, i) => (
                <div key={i} style={{ ...cellBase, width: g.width, minWidth: g.width, height: COL_H, fontWeight: 600, fontSize: 12 }}>
                  {g.label}
                </div>
              ))}
              {showTodayLine && (
                <div style={{ position: 'absolute', left: todayOffsetPx, top: 0, bottom: 0, width: 2, background: '#EF4444', opacity: 0.9, zIndex: 5, pointerEvents: 'none' }}>
                  <div style={{ position: 'absolute', top: 3, left: '50%', transform: 'translateX(-50%)', background: '#EF4444', color: '#fff', fontSize: 9, padding: '1px 4px', borderRadius: 2, whiteSpace: 'nowrap', lineHeight: '14px' }}>
                    Hôm nay
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Header row 2: Column labels + unit cells ── */}
          <div style={{
            position: 'sticky', top: COL_H, zIndex: 30,
            display: 'flex', height: COL_H,
            borderBottom: `2px solid ${token.colorBorder}`, background: hBgSolid,
          }}>
            <div style={{ position: 'sticky', left: 0, zIndex: 31, display: 'flex', background: hBgSolid, borderRight: `2px solid ${token.colorBorder}` }}>
              {leftCols.map((col, ci) => (
                <div key={col.key} style={{
                  ...cellBase,
                  width: col.width, minWidth: col.width, height: COL_H,
                  fontSize: 11, fontWeight: 600, color: token.colorTextSecondary,
                  ...(col.key === 'title' ? { justifyContent: 'flex-start', paddingLeft: 8 } : {}),
                  ...(ci === leftCols.length - 1 ? { borderRight: 'none' } : {}),
                }}>
                  {col.label}
                </div>
              ))}
            </div>
            <div style={{ position: 'relative', display: 'flex' }}>
              {units.map(u => {
                const w = u.days * pxPerDay;
                const isTodayCell = viewMode === 'day' && u.dayStart.isSame(dayjs(), 'day');
                return (
                  <div key={u.key} style={{
                    ...cellBase, width: w, minWidth: w, height: COL_H, fontSize: 11,
                    background: isTodayCell ? `${token.colorPrimary}22` : undefined,
                    color: isTodayCell ? token.colorPrimary : token.colorTextSecondary,
                    fontWeight: isTodayCell ? 700 : 400,
                  }}>
                    {w >= 16 ? u.label : ''}
                  </div>
                );
              })}
              {showTodayLine && (
                <div style={{ position: 'absolute', left: todayOffsetPx, top: 0, bottom: 0, width: 2, background: '#EF4444', opacity: 0.9, zIndex: 5, pointerEvents: 'none' }} />
              )}
            </div>
          </div>

          {/* ── Task rows ── */}
          {flat.length === 0 ? (
            <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
              <Empty description="Chưa có công việc trong dự án này" />
            </div>
          ) : visible.map((task, idx) => {
            const bar         = calcBar(task, viewStart, pxPerDay);
            const trackStatus = getTrackStatus(task);
            const trackColor  = TRACK_COLOR[trackStatus];
            const expectedPct = getExpectedPct(task);
            const progress    = Math.min(100, Math.max(0, Number(task.progress ?? 0)));
            const isRoot      = task._depth === 0;
            const rowBg       = idx % 2 === 0 ? bg : altBg;
            const isCollapsed = collapsedIds.has(task.id);
            const overdue     = !!task.dueDate
              && dayjs(task.dueDate).isBefore(dayjs(), 'day')
              && task.status !== 'DONE' && task.status !== 'CANCELLED';

            // Diamond = expected-today position on the bar (px in chart area)
            const diamondPx = bar && expectedPct !== null && expectedPct > 0 && expectedPct <= 100
              ? bar.left + bar.width * (expectedPct / 100)
              : null;

            return (
              <div key={task.id} style={{ display: 'flex', height: ROW_H, borderBottom: border, background: rowBg }}>

                {/* ─ Left sticky panel ─ */}
                <div style={{
                  position: 'sticky', left: 0, zIndex: 10,
                  display: 'flex', alignItems: 'stretch',
                  background: rowBg, flexShrink: 0,
                  borderRight: `2px solid ${token.colorBorder}`,
                }}>

                  {/* # — hierarchical number */}
                  <Tooltip title={task._num}>
                    <div style={{
                      ...cellBase, width: leftCols[0].width, height: ROW_H,
                      fontSize: 11, fontWeight: isRoot ? 700 : 400,
                      color: isRoot ? token.colorText : token.colorTextSecondary,
                      paddingInline: 4,
                    }}>
                      {task._num}
                    </div>
                  </Tooltip>

                  {/* Title — with indent + collapse toggle */}
                  <div style={{ ...cellBase, width: leftCols[1].width, height: ROW_H, justifyContent: 'flex-start', paddingInline: 4 }}>
                    {task._depth > 0 && <div style={{ width: task._depth * 12, flexShrink: 0 }} />}
                    <div
                      style={{
                        width: 16, height: ROW_H, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: task._hasChildren ? 'pointer' : 'default',
                      }}
                      onClick={() => task._hasChildren && toggleCollapse(task.id)}
                    >
                      {task._hasChildren && (
                        isCollapsed
                          ? <CaretRightFilled  style={{ fontSize: 9, color: token.colorTextSecondary }} />
                          : <CaretDownFilled   style={{ fontSize: 9, color: token.colorTextSecondary }} />
                      )}
                    </div>
                    <Tooltip title={task.title}>
                      <span style={{
                        fontSize: 12, fontWeight: isRoot ? 600 : 400,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        flex: 1, minWidth: 0,
                      }}>
                        {task.title}
                      </span>
                    </Tooltip>
                  </div>

                  {/* Status */}
                  <div style={{ ...cellBase, width: leftCols[2].width, height: ROW_H, ...(isCompact ? { borderRight: 'none' } : {}) }}>
                    <TaskStatusPill status={task.status as TaskStatus} size="sm" />
                  </div>

                  {/* Start — ẩn khi compact */}
                  {!isCompact && (
                    <div style={{ ...cellBase, width: LEFT_COLS_FULL[3].width, height: ROW_H, fontSize: 11, color: token.colorTextSecondary }}>
                      {task.startDate ? dayjs(task.startDate).format('DD/MM/YY') : '—'}
                    </div>
                  )}

                  {/* End — ẩn khi compact */}
                  {!isCompact && (
                    <div style={{ ...cellBase, width: LEFT_COLS_FULL[4].width, height: ROW_H, fontSize: 11, color: overdue ? token.colorError : token.colorTextSecondary, fontWeight: overdue ? 600 : 400 }}>
                      {task.dueDate ? dayjs(task.dueDate).format('DD/MM/YY') : '—'}
                    </div>
                  )}

                  {/* % done — ẩn khi compact */}
                  {!isCompact && (
                    <div style={{ ...cellBase, width: LEFT_COLS_FULL[5].width, height: ROW_H, fontSize: 11, color: progress >= 100 ? token.colorSuccess : token.colorText, fontWeight: progress >= 100 ? 600 : 400 }}>
                      {Math.round(progress)}%
                    </div>
                  )}

                  {/* Track status — ẩn khi compact */}
                  {!isCompact && (
                    <div style={{ ...cellBase, width: LEFT_COLS_FULL[6].width, height: ROW_H, gap: 4, borderRight: 'none' }}>
                      <Badge status={TRACK_BADGE[trackStatus]} />
                      <span style={{ fontSize: 10, color: trackColor, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {TRACK_LABEL[trackStatus]}
                      </span>
                    </div>
                  )}

                </div>{/* end left panel */}

                {/* ─ Gantt bar area ─ */}
                <div style={{ position: 'relative', width: chartW, minWidth: chartW, height: ROW_H, flexShrink: 0, ...gridBg }}>

                  {/* Today vertical line */}
                  {showTodayLine && (
                    <div style={{ position: 'absolute', left: todayOffsetPx, top: 0, bottom: 0, width: 2, background: '#EF4444', opacity: 0.5, zIndex: 4, pointerEvents: 'none' }} />
                  )}

                  {/* Bar */}
                  {bar && (
                    <Tooltip
                      overlayInnerStyle={{ minWidth: 210 }}
                      title={
                        <div style={{ fontSize: 12 }}>
                          <div style={{ fontWeight: 600, marginBottom: 4 }}>{task.title}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                            <span style={{ width: 8, height: 8, borderRadius: 2, background: trackColor, flexShrink: 0 }} />
                            <span>{TRACK_LABEL[trackStatus]}</span>
                          </div>
                          <div>Tiến độ thực tế: <b>{Math.round(progress)}%</b></div>
                          {expectedPct !== null && (
                            <div>Kế hoạch hôm nay: <b>{Math.round(expectedPct)}%</b></div>
                          )}
                          {task.startDate && <div>Bắt đầu: {dayjs(task.startDate).format('DD/MM/YYYY')}</div>}
                          {task.dueDate   && <div>Kết thúc: {dayjs(task.dueDate).format('DD/MM/YYYY')}</div>}
                        </div>
                      }
                    >
                      {/* Planned bar */}
                      <div style={{
                        position: 'absolute',
                        left: bar.left, width: bar.width,
                        top: 7, bottom: 7,
                        borderRadius: 4, overflow: 'hidden', zIndex: 1, cursor: 'default',
                        background: `${trackColor}1a`,
                        border: `1.5px solid ${trackColor}80`,
                      }}>
                        {/* Actual progress fill */}
                        <div style={{
                          position: 'absolute', left: 0, top: 0, bottom: 0,
                          width: `${progress}%`, background: trackColor, opacity: 0.78,
                          borderRadius: progress >= 99 ? 3 : '3px 0 0 3px',
                          transition: 'width 0.35s ease',
                        }} />
                        {/* Label */}
                        {bar.width > 72 && (
                          <span style={{
                            position: 'absolute', left: 5, right: 4, top: '50%',
                            transform: 'translateY(-50%)',
                            fontSize: 10, color: '#fff', textShadow: '0 0 4px rgba(0,0,0,0.7)',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', zIndex: 2,
                          }}>
                            {task.title}
                          </span>
                        )}
                      </div>
                    </Tooltip>
                  )}

                  {/* Expected-today diamond — outside bar so it's not clipped */}
                  {bar && diamondPx !== null && (
                    <Tooltip title={`Kế hoạch hôm nay: ${Math.round(expectedPct!)}%`}>
                      <div style={{
                        position: 'absolute', left: diamondPx, top: '50%',
                        transform: 'translate(-50%, -50%) rotate(45deg)',
                        width: 9, height: 9, zIndex: 5, cursor: 'pointer',
                        background: token.colorBgContainer,
                        border: `2px solid ${trackColor}`,
                        boxShadow: `0 0 0 1px ${token.colorBgContainer}`,
                      }} />
                    </Tooltip>
                  )}

                </div>
              </div>
            );
          })}

        </div>
      )}
    </div>
  );
}
