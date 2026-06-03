import type { Task } from '../../api/tasks';

export type TaskWithDepth = Task & { _depth: number; children?: TaskWithDepth[] };

export function flatForSelector(tasks: Task[]): Task[] {
  return tasks.flatMap((t) => [t, ...flatForSelector(t.children ?? [])]);
}

export function addDepth(tasks: Task[], depth = 0): TaskWithDepth[] {
  return tasks.map((t) => ({
    ...t,
    _depth: depth,
    children: t.children?.length ? addDepth(t.children, depth + 1) : undefined,
  }));
}

export function filterTree(
  tasks: TaskWithDepth[],
  predicate: (t: TaskWithDepth) => boolean,
): TaskWithDepth[] {
  return tasks.reduce<TaskWithDepth[]>((acc, task) => {
    const filteredChildren = task.children ? filterTree(task.children, predicate) : undefined;
    if (predicate(task) || (filteredChildren && filteredChildren.length > 0)) {
      acc.push({ ...task, children: filteredChildren?.length ? filteredChildren : undefined });
    }
    return acc;
  }, []);
}

export const TASK_STATUS_OPTIONS = [
  { value: 'TODO',             label: 'Chưa bắt đầu' },
  { value: 'IN_PROGRESS',      label: 'Đang thực hiện' },
  { value: 'PENDING_APPROVAL', label: 'Chờ duyệt' },
  { value: 'RETURNED',         label: 'Trả lại' },
  { value: 'DONE',             label: 'Hoàn thành' },
  { value: 'CANCELLED',        label: 'Đã hủy' },
];

export const COL_DEFS = [
  { key: 'title',    label: 'Tên task' },
  { key: 'status',   label: 'Trạng thái' },
  { key: 'progress', label: 'Tiến độ' },
  { key: 'dueDate',  label: 'Hạn' },
  { key: 'assignee', label: 'Người thực hiện' },
  { key: 'hours',    label: 'Giờ (est/act)' },
];
