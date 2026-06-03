import { useMemo, useState } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Card, ProgressBar, Chip, useTheme, ActivityIndicator, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

// ── Types ───────────────────────────────────────────────────────────────────

type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'PENDING_APPROVAL' | 'RETURNED' | 'CANCELLED';

interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  progress: number;
  estimateHours: number;
  actualHours: number;
  projectId: string;
  project?: { id: string; code: string; name: string };
}

interface ProjectGroup {
  id: string;
  code: string;
  name: string;
  tasks: Task[];
  totalEstimate: number;
  totalActual: number;
  taskCount: number;
  doneCount: number;
}

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string }> = {
  TODO:             { label: 'To Do',      color: '#94A3B8' },
  IN_PROGRESS:      { label: 'Đang làm',   color: '#4F46E5' },
  DONE:             { label: 'Hoàn thành', color: '#10B981' },
  PENDING_APPROVAL: { label: 'Chờ duyệt', color: '#F59E0B' },
  RETURNED:         { label: 'Trả lại',    color: '#EF4444' },
  CANCELLED:        { label: 'Đã huỷ',     color: '#CBD5E1' },
};

// ── Component ───────────────────────────────────────────────────────────────

export function ProjectEffortView() {
  const theme = useTheme();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const { data: tasks = [], isLoading, refetch } = useQuery<Task[]>({
    queryKey: ['my-tasks'],
    queryFn: () => api.get<Task[]>('/tasks/mine'),
    staleTime: 60_000,
  });

  // ── Group tasks by project ─────────────────────────────────────────────────

  const projects: ProjectGroup[] = useMemo(() => {
    const map = new Map<string, ProjectGroup>();

    for (const t of tasks) {
      if (!t.project) continue;
      const key = t.project.id;
      if (!map.has(key)) {
        map.set(key, {
          id: t.project.id,
          code: t.project.code,
          name: t.project.name,
          tasks: [],
          totalEstimate: 0,
          totalActual: 0,
          taskCount: 0,
          doneCount: 0,
        });
      }
      const g = map.get(key)!;
      g.tasks.push(t);
      g.totalEstimate += Number(t.estimateHours);
      g.totalActual += Number(t.actualHours);
      g.taskCount += 1;
      if (t.status === 'DONE') g.doneCount += 1;
    }

    return Array.from(map.values()).sort((a, b) => b.totalActual - a.totalActual);
  }, [tasks]);

  // ── Totals ─────────────────────────────────────────────────────────────────

  const grandEstimate = projects.reduce((s, p) => s + p.totalEstimate, 0);
  const grandActual   = projects.reduce((s, p) => s + p.totalActual, 0);
  const grandTasks    = tasks.length;
  const grandDone     = tasks.filter((t) => t.status === 'DONE').length;
  const overallPct    = grandEstimate > 0 ? Math.min(grandActual / grandEstimate, 1) : 0;

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  if (isLoading) {
    return <ActivityIndicator style={{ marginTop: 60 }} />;
  }

  if (projects.length === 0) {
    return (
      <View style={styles.empty}>
        <MaterialCommunityIcons
          name="briefcase-outline"
          size={56}
          color={theme.colors.onSurfaceVariant}
          style={{ opacity: 0.35 }}
        />
        <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
          Chưa có task nào được giao
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={projects}
      keyExtractor={(p) => p.id}
      contentContainerStyle={styles.list}
      onRefresh={refetch}
      refreshing={isLoading}
      ListHeaderComponent={
        // ── Grand total summary card ─────────────────────────────────────
        <Card style={[styles.summaryCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
              Tổng quan công việc
            </Text>

            {/* Hours bar */}
            <View style={styles.hoursRow}>
              <View style={styles.hourBox}>
                <Text style={[styles.hourNum, { color: theme.colors.primary }]}>
                  {grandEstimate.toFixed(1)}h
                </Text>
                <Text style={[styles.hourLabel, { color: theme.colors.onSurfaceVariant }]}>
                  Ước tính
                </Text>
              </View>
              <View style={[styles.hourDivider, { backgroundColor: theme.colors.surfaceVariant }]} />
              <View style={styles.hourBox}>
                <Text style={[styles.hourNum, { color: '#10B981' }]}>
                  {grandActual.toFixed(1)}h
                </Text>
                <Text style={[styles.hourLabel, { color: theme.colors.onSurfaceVariant }]}>
                  Thực tế
                </Text>
              </View>
              <View style={[styles.hourDivider, { backgroundColor: theme.colors.surfaceVariant }]} />
              <View style={styles.hourBox}>
                <Text style={[styles.hourNum, { color: '#4F46E5' }]}>
                  {grandTasks > 0 ? Math.round((grandDone / grandTasks) * 100) : 0}%
                </Text>
                <Text style={[styles.hourLabel, { color: theme.colors.onSurfaceVariant }]}>
                  Hoàn thành
                </Text>
              </View>
            </View>

            <ProgressBar
              progress={overallPct}
              color={overallPct >= 1 ? '#10B981' : theme.colors.primary}
              style={styles.grandBar}
            />

            <View style={styles.chipRow}>
              <Chip compact icon="briefcase-outline" style={styles.chip}>
                {projects.length} dự án
              </Chip>
              <Chip compact icon="checkbox-multiple-outline" style={styles.chip}>
                {grandTasks} task
              </Chip>
              <Chip compact icon="check-circle-outline" style={styles.chip}>
                {grandDone} xong
              </Chip>
            </View>
          </Card.Content>
        </Card>
      }
      renderItem={({ item: proj }) => {
        const isExpanded = expandedIds.has(proj.id);
        const pct = proj.totalEstimate > 0
          ? Math.min(proj.totalActual / proj.totalEstimate, 1)
          : 0;
        const completion = proj.taskCount > 0
          ? Math.round((proj.doneCount / proj.taskCount) * 100)
          : 0;
        const barColor = pct >= 1 ? '#EF4444' : pct >= 0.8 ? '#F59E0B' : '#10B981';

        return (
          <Card style={[styles.projectCard, { backgroundColor: theme.colors.surface }]}>
            {/* ── Project header (pressable to expand) ── */}
            <TouchableOpacity onPress={() => toggleExpand(proj.id)} activeOpacity={0.75}>
              <View style={styles.projectHeader}>
                {/* Code badge */}
                <View style={[styles.codeBadge, { backgroundColor: theme.colors.primaryContainer }]}>
                  <Text style={[styles.codeText, { color: theme.colors.onPrimaryContainer }]}>
                    {proj.code}
                  </Text>
                </View>

                {/* Name + meta */}
                <View style={styles.projectMeta}>
                  <Text
                    variant="titleSmall"
                    numberOfLines={1}
                    style={{ color: theme.colors.onSurface, fontWeight: '600' }}
                  >
                    {proj.name}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {proj.taskCount} task · {proj.doneCount} xong · {completion}% hoàn thành
                  </Text>
                </View>

                {/* Expand icon */}
                <MaterialCommunityIcons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={theme.colors.onSurfaceVariant}
                />
              </View>

              {/* Hours summary row */}
              <View style={styles.hoursSummary}>
                <Text variant="bodySmall" style={{ color: '#10B981' }}>
                  ⏱ Thực tế: <Text style={{ fontWeight: '700' }}>{proj.totalActual.toFixed(1)}h</Text>
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  /  Ước tính: {proj.totalEstimate.toFixed(1)}h
                </Text>
              </View>

              {/* Effort progress bar */}
              <View style={styles.barWrap}>
                <ProgressBar
                  progress={pct}
                  color={barColor}
                  style={styles.projectBar}
                />
                <Text variant="bodySmall" style={[styles.barPct, { color: barColor }]}>
                  {Math.round(pct * 100)}%
                </Text>
              </View>
            </TouchableOpacity>

            {/* ── Expanded task list ── */}
            {isExpanded && (
              <>
                <Divider style={{ marginTop: 4 }} />
                {proj.tasks.map((task, idx) => {
                  const cfg = STATUS_CONFIG[task.status];
                  const taskPct = task.estimateHours > 0
                    ? Math.min(Number(task.actualHours) / Number(task.estimateHours), 1)
                    : 0;

                  return (
                    <View key={task.id}>
                      {idx > 0 && <Divider style={{ marginLeft: 16 }} />}
                      <View style={styles.taskRow}>
                        {/* Status dot */}
                        <View
                          style={[styles.statusDot, { backgroundColor: cfg.color }]}
                        />

                        {/* Task info */}
                        <View style={styles.taskInfo}>
                          <Text
                            variant="bodySmall"
                            numberOfLines={2}
                            style={{ color: theme.colors.onSurface, fontWeight: '500' }}
                          >
                            {task.title}
                          </Text>

                          {/* Hours row */}
                          <View style={styles.taskHoursRow}>
                            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                              {Number(task.actualHours).toFixed(1)}h
                              {' / '}
                              {Number(task.estimateHours).toFixed(1)}h est
                            </Text>
                            <View
                              style={[
                                styles.taskStatusBadge,
                                { backgroundColor: cfg.color + '20' },
                              ]}
                            >
                              <Text style={[styles.taskStatusText, { color: cfg.color }]}>
                                {cfg.label}
                              </Text>
                            </View>
                          </View>

                          {/* Thin progress bar per task */}
                          {task.estimateHours > 0 && (
                            <ProgressBar
                              progress={taskPct}
                              color={cfg.color}
                              style={styles.taskBar}
                            />
                          )}
                        </View>
                      </View>
                    </View>
                  );
                })}
              </>
            )}
          </Card>
        );
      }}
    />
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  list: { padding: 12, paddingBottom: 100 },

  summaryCard: { borderRadius: 14, marginBottom: 16 },
  hoursRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  hourBox: { flex: 1, alignItems: 'center' },
  hourDivider: { width: 1, height: 36, marginHorizontal: 4 },
  hourNum: { fontSize: 22, fontWeight: '800' },
  hourLabel: { fontSize: 11, marginTop: 2 },
  grandBar: { height: 6, borderRadius: 3, marginBottom: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { height: 26 },

  projectCard: { borderRadius: 12, marginBottom: 12, overflow: 'hidden' },
  projectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    paddingBottom: 8,
    gap: 10,
  },
  codeBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexShrink: 0,
  },
  codeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  projectMeta: { flex: 1 },
  hoursSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  barWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 12,
    gap: 8,
  },
  projectBar: { flex: 1, height: 6, borderRadius: 3 },
  barPct: { fontSize: 11, fontWeight: '700', width: 32, textAlign: 'right' },

  taskRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  statusDot: {
    width: 8, height: 8,
    borderRadius: 4,
    marginTop: 5,
    flexShrink: 0,
  },
  taskInfo: { flex: 1 },
  taskHoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 3,
    marginBottom: 4,
  },
  taskStatusBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  taskStatusText: { fontSize: 10, fontWeight: '600' },
  taskBar: { height: 3, borderRadius: 2 },

  empty: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText: { fontSize: 14 },
});
