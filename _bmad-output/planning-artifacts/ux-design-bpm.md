---
type: amendment
parentSpec: ux-design-specification.md
scope: 'Epic 12 — BPM Module'
date: '2026-05-26'
author: 'Tuan Anh'
status: complete
---

# UX Design Specification — BPM Module (Epic 12 Addendum)

> **Amendment cho `ux-design-specification.md`** — Giữ nguyên toàn bộ design language, tokens, và conventions đã thiết lập. Document này chỉ mô tả các screens và components mới cho Epic 12.

---

## Tổng quan UX

### Người dùng mục tiêu

| Vai trò | Nhu cầu chính | Flow |
|---|---|---|
| **Admin** | Thiết kế quy trình bằng BPMN modeler, publish definition | Modeler → Publish |
| **PM** | Khởi động process instance, theo dõi tiến độ bằng token overlay | List → Start → Monitor |
| **Member / PM** | Nhận và xử lý user tasks trong inbox | Inbox → Claim → Complete |

### Mental model

BPM trong Loop = **"Quy trình chuẩn hoá"** — không phải task management bình thường, mà là template quy trình có thể tái sử dụng. Admin vẽ một lần, PM khởi động nhiều lần, Members thực hiện từng bước.

Metaphor truyền thông: **Sơ đồ chạy trên đường ray** — BPMN diagram là đường ray cố định, instance là con tàu đang chạy, token overlay là vị trí con tàu trên đường ray đó.

---

## Design Tokens (kế thừa + bổ sung BPM)

### Tokens kế thừa (không thay đổi)

```
Primary:     #4F46E5  (Indigo 600)
Success:     #10B981
Warning:     #F59E0B
Error:       #EF4444
Sidebar bg:  #0F172A
Border:      #E2E8F0
BG Layout:   #F8FAFC
BG Container:#FFFFFF
Border radius: 8px / 12px
Font:        Inter
```

### Tokens bổ sung cho BPM

```
/* BPMN Canvas */
--bpmn-canvas-bg:        #1E293B   /* Slate 800 — dark canvas cho modeler */
--bpmn-canvas-grid:      #334155   /* Slate 700 — grid dots */
--bpmn-toolbar-bg:       #0F172A   /* Same as sidebar */
--bpmn-panel-bg:         #F8FAFC   /* Properties panel — light */

/* Process Status — DefinitionStatus */
--status-draft-bg:       #F1F5F9   /* Slate 100 */
--status-draft-text:     #475569   /* Slate 600 */
--status-active-bg:      #ECFDF5   /* Emerald 50 */
--status-active-text:    #065F46   /* Emerald 900 */
--status-deprecated-bg:  #FEF2F2   /* Red 50 */
--status-deprecated-text:#991B1B   /* Red 800 */

/* Instance Status — InstanceStatus */
--instance-running-bg:   #EEF2FF   /* Indigo 50 */
--instance-running-text: #4338CA   /* Indigo 700 */
--instance-suspended-bg: #FFFBEB   /* Amber 50 */
--instance-suspended-text:#92400E  /* Amber 900 */
--instance-completed-bg: #ECFDF5
--instance-completed-text:#065F46
--instance-error-bg:     #FEF2F2
--instance-error-text:   #991B1B

/* Token Overlay (BPMN diagram) */
--token-active-fill:     rgba(79,70,229,0.25)   /* Indigo 600, 25% opacity */
--token-active-border:   #4F46E5
--token-completed-fill:  rgba(16,185,129,0.20)  /* Emerald 500, 20% */
--token-completed-border:#10B981
--token-pulse-ring:      rgba(79,70,229,0.4)    /* Animated ring */

/* User Task Status */
--task-pending-bg:       #F1F5F9
--task-pending-text:     #475569
--task-inprogress-bg:    #EEF2FF
--task-inprogress-text:  #4338CA
--task-completed-bg:     #ECFDF5
--task-completed-text:   #065F46
```

---

## Sidebar Navigation

Thêm mục **"Quy trình"** vào sidebar navigation, sau mục "Cảnh báo":

```
sidebar navigation order:
  Dashboard
  Dự án
  Task
  Nhân sự
  Chi phí
  Cảnh báo
  ──────────  ← divider
  Quy trình   ← MỚI — icon: GitBranchIcon / FlowIcon
  ──────────
  Cài đặt
```

**Icon trạng thái trong sidebar:**
- Có instance đang RUNNING → hiển thị dot xanh (indigo `#4F46E5`) bên cạnh "Quy trình"
- Có user task được assign cho tôi (PENDING) → badge count đỏ

---

## Screen 1: Process List Page (`/processes`)

### Layout

```
┌─────────────────────────────────────────────────────┐
│  Quy trình                          [+ Tạo quy trình]│
├──────────────┬──────────────────────────────────────┤
│  [Definitions]  [Instances]  [Task của tôi]          │
├──────────────────────────────────────────────────────┤
│  Search...   [Status ▾]  [Org Unit ▾]                │
├──────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────┐  │
│  │ 📋 Quy trình Onboarding Nhân sự     v3  ACTIVE │  │
│  │    3 instances đang chạy · Cập nhật 2h trước   │  │
│  │                         [▶ Khởi động] [✏ Sửa] │  │
│  ├────────────────────────────────────────────────┤  │
│  │ 📋 Bàn giao Dự án                  v1  DRAFT   │  │
│  │    Chưa có instance · Tạo 26/05/2026            │  │
│  │                         [▶ Khởi động] [✏ Sửa] │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

### Chi tiết design

**Tab bar:**
- 3 tabs: "Định nghĩa" | "Instances" | "Task của tôi"
- "Task của tôi" hiển thị badge count nếu có task pending
- Tab active: indigo underline 2px, text `#4F46E5`

**Definition card:**
- Background: `#FFFFFF`, border `#E2E8F0`, radius 8px
- Hover: `box-shadow: 0 2px 8px rgba(0,0,0,0.08)` + border `#4F46E5`
- Status pill (top-right): `DefinitionStatus` badge
- Version badge: `v3` — pill shape, `#F1F5F9` bg, Slate text, monospace font
- Instance count: text nhỏ màu `#94A3B8` (Slate 400)
- Actions: ghost button "Khởi động" (indigo icon) + "Sửa" (edit icon) — hiện khi hover row

**Empty state (không có definition):**
```
        🗂
  Chưa có quy trình nào
  Tạo quy trình đầu tiên để chuẩn hoá
  nghiệp vụ của tổ chức bạn.

     [+ Tạo quy trình]
```

**"Khởi động" → Modal:**
```
┌─────────────────────────────────────┐
│  Khởi động: Onboarding Nhân sự  [×] │
├─────────────────────────────────────┤
│  Gắn với dự án (tuỳ chọn)           │
│  [──── Chọn dự án ────────────── ▾] │
│                                     │
│  Biến khởi động (JSON, tuỳ chọn)    │
│  ┌─────────────────────────────┐    │
│  │ {                           │    │
│  │   "employeeName": ""        │    │
│  │ }                           │    │
│  └─────────────────────────────┘    │
│                                     │
│              [Huỷ]  [▶ Khởi động]   │
└─────────────────────────────────────┘
```

---

## Screen 2: BPMN Modeler (`/processes/modeler/:id`)

### Layout tổng thể

```
┌──────────────────────────────────────────────────────────┐
│ ← Quy trình  │  Onboarding Nhân sự  v2 DRAFT  │ [Lưu] [Xuất bản] │
├─────┬────────────────────────────────┬───────────────────┤
│     │                                │                   │
│Palette│     BPMN Canvas (dark)       │  Properties Panel │
│     │                                │  (light)          │
│ ○ Start│                             │                   │
│ ⬜ Task│    [drag-drop area]         │  Element: Task    │
│ ◇ Gate│                             │  Name: ___        │
│ ● End│                              │  Assignee: ___    │
│     │                                │  Candidate: ___   │
│     │                                │  Due: ___         │
└─────┴────────────────────────────────┴───────────────────┘
```

### BPMN Canvas styling

**Canvas background:** `#1E293B` (Slate 800) — tạo cảm giác professional, không chói
**Grid:** dots màu `#334155` (Slate 700), 20px spacing
**Toolbar (top của canvas):**
```
[Undo] [Redo]  |  [Hand] [Select] [Connect]  |  [Zoom+] [Zoom-] [Fit]  |  [Export SVG]
```
- Background: `#0F172A`, icon màu `#94A3B8`, hover: `#4F46E5`

**BPMN elements (styling override bpmn-js defaults):**

| Element | Fill | Stroke | Text |
|---|---|---|---|
| Start Event | `#ECFDF5` | `#10B981` | `#065F46` |
| End Event | `#FEF2F2` | `#EF4444` | `#991B1B` |
| User Task | `#EEF2FF` | `#4F46E5` | `#3730A3` |
| Service Task | `#F0FDF4` | `#22C55E` | `#15803D` |
| XOR Gateway | `#FFFBEB` | `#F59E0B` | `#92400E` |
| AND Gateway | `#F0F9FF` | `#0EA5E9` | `#0369A1` |
| Sequence Flow | — | `#94A3B8` | `#64748B` |

**Properties Panel (right side, 280px):**
- Background: `#F8FAFC`
- Border-left: `1px solid #E2E8F0`
- Input fields: Ant Design style với token override
- "Assignee" field: User selector (dropdown từ employee list)
- "Candidate Roles" field: multi-select (ADMIN / PM / MEMBER / LEADERSHIP)
- "Timer Duration" field: ISO 8601 input (e.g. `PT48H`) khi element là Timer event

**Toolbar actions (header):**
- **Lưu bản nháp:** ghost button, icon save — gọi auto-save sau mỗi 30s
- **Xuất bản:** primary button indigo — chỉ enable khi definition là DRAFT

**Publish confirmation modal:**
```
┌───────────────────────────────────────────┐
│  ⚠️  Xuất bản quy trình?                  │
├───────────────────────────────────────────┤
│  Sau khi xuất bản, bạn không thể chỉnh    │
│  sửa trực tiếp định nghĩa này. Mọi thay  │
│  đổi sau đó sẽ tạo phiên bản mới.         │
│                                           │
│  Định nghĩa: Onboarding Nhân sự           │
│  Phiên bản:  v2                           │
│                                           │
│               [Huỷ]  [Xuất bản]           │
└───────────────────────────────────────────┘
```

**Read-only banner (khi ACTIVE hoặc DEPRECATED):**
```
┌─────────────────────────────────────────────────────────┐
│  ℹ️  Định nghĩa này đang ACTIVE — chỉ xem, không sửa.  │
│  [Tạo phiên bản mới để chỉnh sửa →]                     │
└─────────────────────────────────────────────────────────┘
```
Banner: `#EEF2FF` background, `#4F46E5` text, border-left 3px indigo

---

## Screen 3: Process Instances Page (`/processes/instances`)

### Layout

```
┌──────────────────────────────────────────────────────────┐
│  Instances đang chạy                 [Lọc: Status ▾]     │
├──────────────────────────────────────────────────────────┤
│  Tên quy trình    │  Phiên bản │  Status    │  Bắt đầu  │  Dự án  │  Người khởi  │
├──────────────────────────────────────────────────────────┤
│  Onboarding NS    │  v3        │ ● RUNNING  │  26/05    │  —      │  Tuan Anh    │
│  Bàn giao DA 01   │  v1        │ ✓ COMPLETED│  25/05    │  Loop   │  An PM       │
│  Bàn giao DA 02   │  v1        │ ⚠ ERROR    │  24/05    │  Loop   │  An PM       │
└──────────────────────────────────────────────────────────┘
```

**Row status styling:**
- RUNNING: dot xanh (`#4F46E5`) animate pulse, text đậm
- COMPLETED: checkmark xanh (`#10B981`), row opacity 0.7
- ERROR: warning icon đỏ (`#EF4444`), row background `#FFF5F5`
- SUSPENDED: pause icon amber (`#F59E0B`)

**Row click:** Navigate đến `/processes/instances/:id`

---

## Screen 4: Process Monitor Page (`/processes/instances/:id`)

### Layout (quan trọng nhất)

```
┌──────────────────────────────────────────────────────────┐
│  ← Instances  │  Onboarding NS / Instance #abc123        │
│               │  ● RUNNING · Bắt đầu 26/05 · An PM       │
├───────────────┴──────────────────────────────────────────┤
│                                                          │
│  [Sơ đồ]  [User Tasks (2)]  [Lịch sử]                  │
│                                                          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│           BPMN Viewer + Token Overlay                    │
│           (dark canvas, read-only)                       │
│                                                          │
│    ○ → [📋 Bước 1 ✓] → [📋 Bước 2 ●] → ◇ → [📋 Bước 3] → ●   │
│                              ↑                           │
│                         Đang ở đây                       │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Token Overlay design

**Active token (hiện tại):**
```css
/* Element đang có token — hiển thị overlay lên element BPMN */
fill: rgba(79, 70, 229, 0.25)   /* indigo, transparent */
stroke: #4F46E5
stroke-width: 2px
/* Pulse animation */
animation: tokenPulse 2s ease-in-out infinite;

@keyframes tokenPulse {
  0%, 100% { opacity: 0.25; }
  50% { opacity: 0.5; }
}
```

**Completed token (đã qua):**
```css
fill: rgba(16, 185, 129, 0.15)   /* emerald, light */
stroke: #10B981
stroke-width: 1px
/* Checkmark overlay label */
```

**Token position label:**
- Tooltip khi hover element đang active: `"Đang chờ: [Tên user task] · Assignee: [Tên người]"`
- Tooltip khi hover completed element: `"Hoàn thành: [timestamp] · Thực hiện: [Tên]"`

### Tab: User Tasks

```
┌──────────────────────────────────────────────────────┐
│  User Tasks trong instance này                       │
├──────────────────────────────────────────────────────┤
│  📌 Xét duyệt hồ sơ                                 │
│     ● Đang chờ · Giao cho: An PM                    │
│     Hạn: 28/05/2026                    [Xem chi tiết]│
├──────────────────────────────────────────────────────┤
│  📌 Phê duyệt lương                                  │
│     ○ Chưa bắt đầu · Có thể nhận: PM               │
│                                        [Xem chi tiết]│
└──────────────────────────────────────────────────────┘
```

### Tab: Lịch sử (Activity Log)

```
Timeline dạng vertical — mỗi entry:

  ✅  Start Event hoàn thành           26/05 09:00
  📋  "Xét duyệt hồ sơ" bắt đầu        26/05 09:00  → An PM
  ✅  "Xét duyệt hồ sơ" hoàn thành     26/05 10:30  → An PM
  ◇   XOR Gateway: nhánh "Đã duyệt"    26/05 10:30
  📋  "Phê duyệt lương" đang chờ       26/05 10:30  → (PM)
```

**Timeline styling:**
- Icon: tròn 24px, màu tương ứng trạng thái
- Line: `1px solid #E2E8F0` kết nối các entries
- Timestamp: `#94A3B8`, font-size 12px, right-align
- Người thực hiện: avatar 20px + tên

---

## Screen 5: User Task Inbox

### Vị trí trong navigation

User Task Inbox xuất hiện ở **2 nơi:**
1. Tab "Task của tôi" trong `/processes` (Screen 1)
2. Notification Bell dropdown — section "Quy trình" khi có task mới

### Layout Inbox

```
┌──────────────────────────────────────────────────────┐
│  Task quy trình của tôi                              │
├──────────────────────────────────────────────────────┤
│  [Được giao cho tôi (3)]  [Có thể nhận (2)]          │
├──────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────┐  │
│  │ 📋 Xét duyệt hồ sơ — Onboarding NS #3          │  │
│  │    ● In Progress · Hạn: 28/05 · 2 ngày còn lại│  │
│  │    Dự án: —                                     │  │
│  │                    [Hoàn thành]  [Trả lại]      │  │
│  ├────────────────────────────────────────────────┤  │
│  │ 📋 Kiểm tra checklist — Bàn giao DA             │  │
│  │    ○ Pending · Hạn: 30/05                       │  │
│  │                    [Bắt đầu]  [Hoàn thành]      │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

**Tab "Có thể nhận":**
```
│  ┌────────────────────────────────────────────────┐  │
│  │ 📋 Phê duyệt lương — Onboarding NS #5          │  │
│  │    ○ Chưa có người nhận · Role: PM             │  │
│  │    Quy trình: Onboarding Nhân sự v3            │  │
│  │                               [Nhận task]       │  │
│  └────────────────────────────────────────────────┘  │
```

### Complete Task modal

```
┌────────────────────────────────────────────┐
│  Hoàn thành: Xét duyệt hồ sơ          [×] │
├────────────────────────────────────────────┤
│  Kết quả xét duyệt                         │
│  ○ Đã duyệt   ○ Từ chối                    │
│                                            │
│  Ghi chú (tuỳ chọn)                        │
│  ┌──────────────────────────────────────┐  │
│  │                                      │  │
│  └──────────────────────────────────────┘  │
│                                            │
│                   [Huỷ]  [✅ Hoàn thành]   │
└────────────────────────────────────────────┘
```

Form data = biến quy trình → truyền vào process variables để XOR gateway có thể route đúng nhánh.

---

## Components

### `ProcessStatusBadge`

```tsx
// DefinitionStatus
DRAFT      → pill  #F1F5F9  text:#475569  label:"Bản nháp"
ACTIVE     → pill  #ECFDF5  text:#065F46  label:"Đang dùng"
DEPRECATED → pill  #FEF2F2  text:#991B1B  label:"Lỗi thời"

// InstanceStatus
RUNNING    → dot + #EEF2FF  text:#4338CA  label:"Đang chạy"   [pulse animation]
SUSPENDED  → #FFFBEB  text:#92400E  label:"Tạm dừng"
COMPLETED  → #ECFDF5  text:#065F46  label:"Hoàn thành"
CANCELLED  → #F9FAFB  text:#374151  label:"Đã huỷ"
ERROR      → #FEF2F2  text:#991B1B  label:"Lỗi"

// UserTaskStatus
PENDING    → #F1F5F9  text:#475569  label:"Chờ nhận"
IN_PROGRESS→ #EEF2FF  text:#4338CA  label:"Đang làm"
COMPLETED  → #ECFDF5  text:#065F46  label:"Xong"
SKIPPED    → #F9FAFB  text:#374151  label:"Bỏ qua"
```

### `BpmnModeler.tsx` — Integration notes

**Initialization:**
```tsx
useEffect(() => {
  const modeler = new BpmnJsModeler({
    container: containerRef.current,
    additionalModules: [BpmnPropertiesPanelModule, BpmnPropertiesProviderModule],
    propertiesPanel: { parent: propertiesPanelRef.current },
  });

  // Apply Loop theme
  applyLoopBpmnTheme(modeler); // override default colors

  return () => modeler.destroy();
}, []);
```

**Auto-save indicator:**
```
Đã lưu · 14:32   ← top-right của canvas, text #94A3B8 font-size 12px
Đang lưu...       ← khi đang gọi API
! Chưa lưu        ← sau 5s chưa save — text #F59E0B
```

### `BpmnViewer.tsx` — Token overlay

**Overlay rendering:**
```tsx
// Sau mỗi refetch (10s), cập nhật overlays
useEffect(() => {
  const overlays = viewer.get('overlays');
  overlays.clear(); // xóa overlays cũ

  activeActivityIds.forEach(activityId => {
    overlays.add(activityId, 'token-overlay', {
      position: { top: 0, left: 0 },
      html: '<div class="token-overlay-active" />',
    });
  });

  completedActivityIds.forEach(activityId => {
    overlays.add(activityId, 'token-overlay', {
      position: { top: 0, left: 0 },
      html: '<div class="token-overlay-completed" />',
    });
  });
}, [activeActivityIds, completedActivityIds]);
```

**CSS (injected globally):**
```css
.token-overlay-active {
  position: absolute;
  inset: 0;
  background: rgba(79, 70, 229, 0.25);
  border: 2px solid #4F46E5;
  border-radius: 4px;
  animation: tokenPulse 2s ease-in-out infinite;
  pointer-events: none;
}

.token-overlay-completed {
  position: absolute;
  inset: 0;
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid #10B981;
  border-radius: 4px;
  pointer-events: none;
}

@keyframes tokenPulse {
  0%, 100% { opacity: 0.6; }
  50%       { opacity: 1; }
}
```

---

## User Flows

### Flow 1: Admin tạo và publish quy trình

```
/processes
  → click "+ Tạo quy trình"
  → Modal: nhập tên + mô tả
  → redirect /processes/modeler/new
    → Vẽ BPMN diagram (drag-drop)
    → Auto-save mỗi 30s (toast nhỏ)
    → Click "Xuất bản"
    → Confirm modal
    → Toast "✅ Quy trình đã được xuất bản"
    → Redirect về /processes
```

### Flow 2: PM khởi động process instance

```
/processes (tab Definitions)
  → hover card "Onboarding Nhân sự"
  → click "▶ Khởi động"
  → Modal: chọn dự án (optional) + biến khởi động
  → click "▶ Khởi động"
  → Redirect /processes/instances/:newId
    → BPMN diagram hiển thị token đang ở bước đầu (pulse)
    → Tab "User Tasks" hiện task đầu tiên
```

### Flow 3: Member/PM xử lý user task

```
Notification Bell → badge count "2 task quy trình"
  → click → dropdown show tasks
  → click task → /processes (tab "Task của tôi")
    → xem task details
    → click "Bắt đầu" → status IN_PROGRESS
    → click "Hoàn thành" → modal nhập form data
    → submit → toast "✅ Task hoàn thành — quy trình tiếp tục"
    → /processes/instances/:id auto-refresh → token moves to next step
```

### Flow 4: PM monitor và cancel instance

```
/processes/instances
  → click row RUNNING instance
  → /processes/instances/:id (tab "Sơ đồ")
    → xem token overlay (pulse trên active step)
    → chuyển tab "User Tasks" → xem ai đang xử lý
    → chuyển tab "Lịch sử" → xem timeline đầy đủ
    → click nút "Huỷ instance" (secondary danger button)
    → Confirm modal "Huỷ sẽ dừng quy trình và bỏ qua tất cả tasks đang chờ"
    → instance → CANCELLED
```

---

## Responsive & Accessibility

### Responsive rules

| Viewport | Behavior |
|---|---|
| ≥ 1280px | Full layout: Palette (160px) + Canvas + Properties Panel (280px) |
| 992–1279px | Properties panel collapse thành bottom sheet khi element selected |
| < 992px | Modeler không khả dụng — banner "Dùng màn hình lớn để thiết kế quy trình" |

Process list, instances list, và user task inbox: responsive theo cùng breakpoints của spec gốc (table ẩn secondary columns tại md).

### Accessibility

- BPMN canvas: `role="application"`, `aria-label="BPMN Process Designer"`
- Properties panel fields: `aria-label` tiếng Việt cho mọi input
- Token overlay: `aria-live="polite"` thông báo khi token di chuyển
- Status badges: không dùng màu đơn độc — luôn có text label kèm theo
- Keyboard: Tab qua canvas elements, Enter để select, Delete để xoá element

---

## Micro-interactions

| Trigger | Animation | Duration |
|---|---|---|
| Token di chuyển sang bước mới | Element cũ: fade overlay → xanh; Element mới: overlay xuất hiện với scale(1.1) → 1 | 400ms ease |
| Task được complete | Token pulse tăng tốc 2 lần rồi fade out, element chuyển xanh | 600ms |
| Instance completed | Tất cả elements chuyển xanh tuần tự từ trái sang phải | 1200ms stagger |
| Lưu bản nháp auto-save | Toast nhỏ bottom-right: "Đã lưu" fade in/out | 300ms |
| Publish success | Confetti nhẹ (5 particles) + toast "Đã xuất bản" | 800ms |

---

## Implementation Notes cho AI Agents

1. **`BpmnModeler.tsx`:** Dùng `dynamic import` để lazy-load `bpmn-js` (heavy bundle ~1.5MB). Canvas container phải có `height: 600px` minimum.

2. **`BpmnViewer.tsx`:** Sau mỗi refetch, gọi `overlays.clear()` trước khi add overlays mới. Dùng `useEffect` với dependencies là `[activeActivityIds, completedActivityIds]`.

3. **Token state parsing:** `tokenState` từ backend là JSON của `bpmn-engine`. Extract `activeActivityIds` bằng cách đọc `execution.getState()` format — cần verify với actual `bpmn-engine@25.0.1` API.

4. **Canvas dark theme:** Override bpmn-js default colors bằng `BpmnRenderer` module override hoặc CSS injection vào `.djs-container` và `.djs-shape`.

5. **Auto-save:** Debounce 3s sau `commandStack.changed` event. Hiển thị indicator state.

6. **Properties Panel:** Dùng `bpmn-js-properties-panel` với custom provider để thêm fields `assigneeId`, `candidateRoles`, `timerDuration` vào User Task và Timer event properties.
