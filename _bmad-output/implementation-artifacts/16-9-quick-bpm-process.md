# Story 16.9: Quick Create BPM Process

Status: ready

## Story

As a user,
I want to quickly start a new workflow process from the topbar Create button,
So that I can kick off a business process (approval, onboarding, etc.) without having to navigate to the Workflow module first.

## Acceptance Criteria

1. Dropdown "Create" trong topbar có thêm item thứ 3: icon `ApartmentOutlined`, label `'New Process'`.
2. Click "New Process" → mở `QuickProcessModal`.
3. `QuickProcessModal` có form 2 field:
   - **Quy trình:** Select — load danh sách `ProcessDefinition` có `status = 'ACTIVE'`, hiển thị tên quy trình.
   - **Dự án (tuỳ chọn):** Select — load danh sách projects, có thể bỏ trống.
4. Khi submit → gọi `processesApi.startInstance({ definitionId, projectId? })`.
5. Submit thành công → đóng modal + toast `'Đã khởi động quy trình thành công'` + invalidate query `['process-instances']`.
6. Submit lỗi → toast `'Không thể khởi động quy trình'`, không đóng modal.
7. Form validation: "Quy trình" là required — không submit được nếu chưa chọn.
8. Nếu không có `ProcessDefinition` nào active → hiển thị empty state trong select: `'Chưa có quy trình nào được kích hoạt'`.
9. Modal title: `'Khởi động quy trình mới'`, OK button: `'Bắt đầu'`, Cancel: `'Hủy'`.
10. TypeScript compile không lỗi.

## Tasks / Subtasks

- [ ] Task 1: Tạo `QuickProcessModal` component trong `AppTopbar.tsx` (AC: 2–9)
  - [ ] Thêm function component `QuickProcessModal({ open, onClose })` cùng file với `QuickTaskModal`
  - [ ] Load `processesApi.listDefinitions({ pageSize: 100 })` khi modal mở — filter status ACTIVE
  - [ ] Load `projectsApi.list()` khi modal mở — cho field Dự án
  - [ ] Form submit → `startInstance` mutation
  - [ ] Handle success / error theo AC

- [ ] Task 2: Cập nhật `createMenuItems` trong `AppTopbar.tsx` (AC: 1)
  - [ ] Import `ApartmentOutlined` từ `@ant-design/icons`
  - [ ] Thêm state `const [quickProcessOpen, setQuickProcessOpen] = useState(false)`
  - [ ] Thêm item `{ key: 'process', icon: <ApartmentOutlined />, label: 'New Process', onClick: () => setQuickProcessOpen(true) }` vào `createMenuItems`
  - [ ] Render `<QuickProcessModal open={quickProcessOpen} onClose={() => setQuickProcessOpen(false)} />`

- [ ] Task 3: Verify TypeScript compile (AC: 10)
  - [ ] `cd apps/web && npx tsc --noEmit`

## Dev Notes

### `QuickProcessModal` component

```tsx
function QuickProcessModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const qc = useQueryClient();

  // Load ACTIVE definitions
  const { data: defsPage } = useQuery({
    queryKey: ['process-definitions', { pageSize: 100 }],
    queryFn: () => processesApi.listDefinitions({ pageSize: 100 }),
    enabled: open,
  });
  const definitions = (defsPage?.data ?? []).filter((d) => d.status === 'ACTIVE');

  // Load projects
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.list,
    enabled: open,
  });

  const startMut = useMutation({
    mutationFn: processesApi.startInstance,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['process-instances'] });
      message.success('Đã khởi động quy trình thành công');
      form.resetFields();
      onClose();
    },
    onError: () => message.error('Không thể khởi động quy trình'),
  });

  const handleFinish = (values: { definitionId: string; projectId?: string }) => {
    startMut.mutate({ definitionId: values.definitionId, projectId: values.projectId });
  };

  const handleCancel = () => { form.resetFields(); onClose(); };

  return (
    <Modal
      open={open}
      title={<><ApartmentOutlined style={{ marginRight: 8 }} />Khởi động quy trình mới</>}
      okText="Bắt đầu"
      cancelText="Hủy"
      onCancel={handleCancel}
      onOk={() => form.submit()}
      confirmLoading={startMut.isPending}
      width={480}
    >
      <Form form={form} layout="vertical" onFinish={handleFinish} style={{ marginTop: 12 }}>
        <Form.Item
          name="definitionId"
          label="Quy trình"
          rules={[{ required: true, message: 'Chọn quy trình cần khởi động' }]}
        >
          <Select
            showSearch
            placeholder={
              definitions.length === 0
                ? 'Chưa có quy trình nào được kích hoạt'
                : 'Chọn quy trình...'
            }
            disabled={definitions.length === 0}
            filterOption={(input, opt) =>
              (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={definitions.map((d) => ({ value: d.id, label: d.name }))}
          />
        </Form.Item>
        <Form.Item name="projectId" label="Dự án (tuỳ chọn)">
          <Select
            showSearch
            allowClear
            placeholder="Chọn dự án (không bắt buộc)..."
            filterOption={(input, opt) =>
              (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={projects.map((p) => ({ value: p.id, label: p.name }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
```

### Import cần thêm vào `AppTopbar.tsx`

```tsx
import { ApartmentOutlined } from '@ant-design/icons';
import { processesApi } from '../../api/processes.api';
```

### Thứ tự `createMenuItems` sau story này

```tsx
const createMenuItems = [
  { key: 'task',    icon: <CheckSquareOutlined />, label: 'New Task',    onClick: () => setQuickTaskOpen(true) },
  { key: 'bug',     icon: <BugOutlined />,         label: 'New Bug',     onClick: () => setQuickBugOpen(true) },
  { key: 'process', icon: <ApartmentOutlined />,   label: 'New Process', onClick: () => setQuickProcessOpen(true) },
];
```

### Tại sao filter `status === 'ACTIVE'` client-side

`processesApi.listDefinitions` không có filter `status` trong params hiện tại.
Filter client-side đủ vì danh sách definitions thường nhỏ (< 50).
Nếu sau này cần backend filter: thêm `status` param vào `listDefinitions`.

### References

- `apps/web/src/components/layout/AppTopbar.tsx` — file chính
- `apps/web/src/api/processes.api.ts` — `listDefinitions`, `startInstance`
- `apps/web/src/api/projects.ts` — `projectsApi.list`
- `apps/web/src/components/bugs/BugCreateDrawer.tsx` — tham chiếu pattern drawer/modal create
