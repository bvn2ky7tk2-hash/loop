# Story 13.5: Web UI — Bug Create & Detail Form

Status: ready

## Story

As any authenticated user,
I want to create bugs and view/edit bug details in a drawer without leaving my current page,
So that logging and managing bugs is seamless within the existing workflow.

## Acceptance Criteria

1. `BugCreateDrawer` (560px wide) có đủ 7 fields: Dự án, Task(s), Tiêu đề, Severity, Mô tả, Người xử lý, Đính kèm ảnh.
2. Task(s) multi-select load theo project đã chọn; chỉ render sau khi project được chọn.
3. Severity Radio.Group hiển thị đúng màu UX-DR11: Critical=`#FF4D4F`, High=`#FA8C16`, Medium=`#FADB14`, Low=`#52C41A`.
4. Upload ảnh validate client-side: chỉ nhận `image/*`, tối đa 5 file, mỗi file ≤ 10MB; preview thumbnail inline.
5. Submit thành công: drawer đóng, toast "Bug đã được tạo", TanStack Query invalidate `['bugs']`.
6. `BugDetailDrawer` header hiển thị title + severity badge + status Tag.
7. Action buttons trong detail drawer thay đổi theo role và status (xem Dev Notes).
8. Gallery ảnh đính kèm: click thumbnail → mở presigned URL trong tab mới.
9. Dirty-form warning khi đóng drawer với unsaved changes (UX-DR10 pattern).
10. `BugSeverityBadge` và `BugStatusTag` là shared components tái sử dụng ở cả List và Detail.

## Tasks / Subtasks

- [ ] Task 1: Tạo atomic components (AC: 3, 10)
  - [ ] `apps/web/src/components/bugs/BugSeverityBadge.tsx` — severity badge với màu UX-DR11
  - [ ] `apps/web/src/components/bugs/BugStatusTag.tsx` — status Tag với màu phù hợp

- [ ] Task 2: Tạo `BugAttachmentGallery.tsx` (AC: 8)
  - [ ] `apps/web/src/components/bugs/BugAttachmentGallery.tsx`
  - [ ] Fetch presigned URLs khi mount (`GET /bugs/:id/attachments/:attId/url` per attachment)
  - [ ] Hiển thị thumbnails trong Ant Design `Image.PreviewGroup` hoặc grid
  - [ ] Click mở URL trong tab mới

- [ ] Task 3: Tạo `bugs.api.ts` (AC: 5)
  - [ ] `apps/web/src/api/bugs.api.ts`
  - [ ] `useGetBugs(filters)`, `useGetMyBugs()`, `useCreateBug()`, `useUpdateBug()`
  - [ ] `useTransitionBug()`, `useAssignBug()`, `useUploadBugAttachment()`, `useGetAttachmentUrl()`
  - [ ] `useGetBugStats(filters)` (dùng cho Story 13.8)

- [ ] Task 4: Tạo `BugCreateDrawer.tsx` (AC: 1-5, 9)
  - [ ] Ant Design `Drawer` width=560, placement="right"
  - [ ] Form với 7 fields theo spec
  - [ ] Task selector: disabled + show placeholder nếu chưa chọn project; reload khi project thay đổi
  - [ ] Upload dragger với Ant Design `Upload` component, client-side validation
  - [ ] onFinish: gọi `useCreateBug()`, invalidate query, đóng drawer
  - [ ] Dirty form check: `Form.useFormInstance()` + `onClose` warning

- [ ] Task 5: Tạo `BugDetailDrawer.tsx` (AC: 6-9)
  - [ ] Ant Design `Drawer` width=560
  - [ ] Header: title + `BugSeverityBadge` + `BugStatusTag` + action buttons
  - [ ] Body: mô tả, linked tasks (chips), `BugAttachmentGallery`
  - [ ] Sidebar: reporter info, assignee info, metadata
  - [ ] Conditional action buttons theo role + status (Dev Notes)
  - [ ] Edit mode: click "Chỉnh sửa" → form fields editable

## Dev Notes

### BugSeverityBadge.tsx

```tsx
// apps/web/src/components/bugs/BugSeverityBadge.tsx
const SEVERITY_CONFIG = {
  CRITICAL: { color: '#FF4D4F', label: 'Critical', icon: '🔴' },
  HIGH:     { color: '#FA8C16', label: 'High',     icon: '🟠' },
  MEDIUM:   { color: '#FADB14', label: 'Medium',   icon: '🟡' },
  LOW:      { color: '#52C41A', label: 'Low',      icon: '🟢' },
};

export const BugSeverityBadge: React.FC<{ severity: BugSeverity }> = ({ severity }) => {
  const config = SEVERITY_CONFIG[severity];
  return (
    <Tag color={config.color} style={{ color: severity === 'MEDIUM' ? '#000' : '#fff' }}>
      {config.icon} {config.label}
    </Tag>
  );
};
```

### BugStatusTag.tsx

```tsx
const STATUS_CONFIG = {
  OPEN:        { color: '#1677FF', label: 'Open' },
  IN_PROGRESS: { color: '#FA8C16', label: 'Đang xử lý' },
  RESOLVED:    { color: '#52C41A', label: 'Resolved' },
  CLOSED:      { color: '#8C8C8C', label: 'Closed' },
  CANCELLED:   { color: '#D9D9D9', label: 'Đã huỷ' },
};
```

### BugCreateDrawer — Task selector

Task list phải reload khi project thay đổi:

```tsx
const [selectedProject, setSelectedProject] = useState<string | null>(null);
const { data: tasks } = useGetProjectTasks(selectedProject, { enabled: !!selectedProject });

// Form field:
<Form.Item name="projectId" label="Dự án" rules={[{ required: true }]}>
  <Select
    showSearch
    onChange={(val) => { setSelectedProject(val); form.setFieldValue('taskIds', []); }}
    options={projects?.data.map(p => ({ value: p.id, label: p.name }))}
  />
</Form.Item>
<Form.Item name="taskIds" label="Task(s)" rules={[{ required: true, type: 'array', min: 1 }]}>
  <Select
    mode="multiple"
    disabled={!selectedProject}
    placeholder={selectedProject ? 'Chọn task...' : 'Chọn dự án trước'}
    options={tasks?.data.map(t => ({ value: t.id, label: t.title }))}
  />
</Form.Item>
```

### BugCreateDrawer — Upload với client-side validation

```tsx
<Form.Item name="attachments" label="Đính kèm ảnh">
  <Upload
    listType="picture-card"
    accept="image/*"
    maxCount={5}
    beforeUpload={(file) => {
      if (!file.type.startsWith('image/')) {
        message.error('Chỉ chấp nhận file ảnh');
        return Upload.LIST_IGNORE;
      }
      if (file.size > 10 * 1024 * 1024) {
        message.error('File không được vượt quá 10MB');
        return Upload.LIST_IGNORE;
      }
      return false; // Không auto-upload — upload sau khi form submit
    }}
  >
    <div>
      <PlusOutlined /> Thêm ảnh
    </div>
  </Upload>
</Form.Item>
```

Upload flow: form submit → `POST /bugs` → lấy bugId → loop upload từng file qua `POST /bugs/:id/attachments`.

### BugDetailDrawer — Conditional action buttons

```tsx
const getActions = (bug: Bug, currentUser: User) => {
  const isAssignee = bug.assigneeId === currentUser.id;
  const isReporter = bug.reporterId === currentUser.id;
  const isPM = ['PM', 'ADMIN'].includes(currentUser.role);

  const actions = [];

  if (bug.status === 'OPEN' && !bug.assigneeId) {
    actions.push(<Button onClick={() => assignToSelf(bug.id)}>Nhận xử lý</Button>);
  }
  if (['IN_PROGRESS'].includes(bug.status) && (isAssignee || isPM)) {
    actions.push(<Button type="primary" onClick={() => transition('RESOLVED')}>Đánh dấu Resolved</Button>);
  }
  if (bug.status === 'RESOLVED' && (isReporter || isPM)) {
    actions.push(<Button type="primary" onClick={() => transition('CLOSED')}>Đóng bug</Button>);
    actions.push(<Button onClick={() => transition('OPEN')}>Mở lại</Button>);
  }
  if (isPM && !['CLOSED', 'CANCELLED'].includes(bug.status)) {
    actions.push(<Button danger onClick={() => transition('CANCELLED')}>Huỷ</Button>);
  }
  return actions;
};
```

### Dirty form warning (UX-DR10)

```tsx
const [isDirty, setIsDirty] = useState(false);

const handleClose = () => {
  if (isDirty) {
    Modal.confirm({
      title: 'Bạn có thay đổi chưa lưu. Đóng không?',
      onOk: onClose,
    });
  } else {
    onClose();
  }
};

// Set isDirty khi form values thay đổi:
<Form onValuesChange={() => setIsDirty(true)} ...>
```

### bugs.api.ts — TanStack Query keys

```typescript
export const bugKeys = {
  all: ['bugs'] as const,
  list: (filters: BugFilterDto) => [...bugKeys.all, 'list', filters] as const,
  mine: () => [...bugKeys.all, 'mine'] as const,
  detail: (id: string) => [...bugKeys.all, id] as const,
  stats: (filters: BugStatsFilterDto) => [...bugKeys.all, 'stats', filters] as const,
};
```

### References

- Ant Design Drawer: `width={560}`, `placement="right"`
- Pattern tham khảo: `apps/web/src/pages/tasks/` — TaskDetailDrawer pattern
- `apps/web/src/api/projects.api.ts` — tham khảo useGetProjectTasks hook
- UX-DR11 màu severity: trong `architecture.md` Amendment 2026-05-26
