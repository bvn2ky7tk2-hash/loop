---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-05-25'
amendments:
  - date: '2026-05-26'
    description: 'BPM Module — Full BPMN 2.0 Engine (bpmn-engine + bpmn-js)'
  - date: '2026-05-26'
    description: 'Bug & Issue Tracking Module — MinIO object storage, bugs/ NestJS module, 9 stories'
  - date: '2026-05-27'
    description: 'Epic 15 — Authorization & Permission Management (RBAC + function permissions + org-scope, 8 stories)'
inputDocuments:
  - "prds/prd-Loop-2026-05-25/prd.md"
workflowType: 'architecture'
project_name: 'Loop'
user_name: 'Tuan Anh'
date: '2026-05-25'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

---

## Project Context Analysis

### Requirements Overview

**Functional Requirements (21 FRs — 7 nhóm):**
- Org Tree & Phân quyền (FR-001–003): Cây tổ chức cha-con, gán user/dự án vào đơn vị
- Quản lý Nhân sự (FR-101–102): Hồ sơ + rate history append-only
- Quản lý Dự án (FR-201–202): CRUD dự án + allocation validation engine
- Task & Tiến độ (FR-301–303): Task tree 5 levels, approval workflow, progress roll-up đệ quy
- Chi phí (FR-401–403): Cost calculation theo rate history, không forecast
- Cảnh báo (FR-501–505): Multi-threshold alerts, 3 kênh thông báo
- Dashboard & Báo cáo (FR-601–603): Aggregated views, parameterized reports, Excel export

**Non-Functional Requirements:**
- NFR-01: Web (browser) + Mobile (iOS + Android) — API-first required
- NFR-02: Org-tree-scoped row-level security — cross-cutting, mọi query
- NFR-03: Allocation integrity — per-day validation, bỏ T7/CN, date-range overlap detection
- NFR-04: Rate history append-only — immutable audit trail

**Scale & Complexity:**
- Primary domain: Full-stack Web + Mobile, API-first backend
- Complexity level: Medium-High
- Quy mô dữ liệu: 100+ dự án, 100+ nhân sự, 1000s tasks
- Estimated architectural components: 8–10

### Technical Constraints & Dependencies
- Không tích hợp hệ thống ngoài trong v1
- Mobile không cần offline mode
- 1 man-day = 8 man-hour; 1 man-month = 21 man-day (constants hệ thống)
- SMTP email: chưa xác định provider (OQ-09 — không chặn architecture)

### Cross-Cutting Concerns Identified
1. **Org-Scoped Authorization** — mọi data access phải filter theo org tree visibility; phải được implement ở data layer
2. **Hierarchical Data** — org tree + task tree đều cần recursive query strategy hiệu quả
3. **Notification Delivery** — alerts fired by scheduled jobs, delivered qua 3 kênh async
4. **Cost Calculation Accuracy** — time-windowed rate lookups phải chính xác theo historical rate periods
5. **Performance: Allocation Validation** — per-day overlap check trên 100+ dự án cần indexing chiến lược

---

## Starter Template Evaluation

### Primary Technology Domain

Full-stack Web + Mobile, API-first — dựa trên NFR-01 (Web + Mobile iOS/Android) và yêu cầu on-premise deployment không phụ thuộc internet.

### Constraints Driving Selection

- Non-programmer owner — AI agents (Claude Code) viết toàn bộ code
- On-premise deployment — chạy hoàn toàn local/mạng nội bộ, không cloud
- Boring technology principle — stack phổ biến, ổn định, AI biết sâu nhất

### Selected Approach: Turborepo Monorepo

**Rationale:** Monorepo cho phép AI agents quản lý backend + web + mobile trong một repo, chia sẻ types và constants, và deploy toàn bộ bằng một lệnh Docker Compose.

**Initialization Command:**

```bash
npx create-turbo@latest loop
```

### Architectural Decisions Provided by Stack

**Monorepo Structure:**
```
loop/
├── apps/
│   ├── backend/      ← NestJS + TypeScript + Prisma
│   ├── web/          ← React + Vite + TypeScript
│   └── mobile/       ← Expo SDK (React Native) + TypeScript
├── packages/
│   └── shared/       ← Shared types & constants
└── docker-compose.yml
```

**Language & Runtime:** TypeScript throughout — type safety giúp AI generate code chính xác hơn

**Backend:** NestJS 11 — structured, opinionated framework; AI (Claude) generate code NestJS rất tốt; module system rõ ràng phù hợp với 7 domain modules của Loop

**ORM & Database:** Prisma 7.8 + PostgreSQL 18
- PostgreSQL: recursive CTEs cho org tree + task tree; row-level security built-in; append-only patterns cho rate history
- Prisma: TypeScript-first ORM, AI generate schema và queries tốt nhất

**Web Frontend:** React 19 + Vite 8 — phổ biến nhất, build nhanh, phù hợp dashboard-heavy UI

**Mobile:** Expo SDK 56 (React Native) — dễ setup nhất, cùng ngôn ngữ TypeScript/React với web, không cần Xcode/Android Studio để dev

**Job Queue:** BullMQ + Redis — xử lý notification jobs async (alert checking scheduler)

**Authentication:** JWT local — không cần OAuth, hoạt động hoàn toàn offline

**Deployment:** Docker Compose 5 — một lệnh `docker-compose up` khởi động PostgreSQL + Redis + Backend + Web. Mobile build riêng qua Expo.

**Note:** Project initialization từ Turborepo monorepo phải là story đầu tiên trong Epic 1.

---

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Hierarchical data strategy (org tree + task tree)
- Row-level security pattern
- API design pattern
- Authentication mechanism
- Docker Compose infrastructure topology

**Important Decisions (Shape Architecture):**
- UI component library
- State management
- Notification job scheduling
- Logging strategy

**Deferred Decisions (Post-MVP):**
- WebSocket real-time updates (polling sufficient for v1)
- Horizontal scaling (single server for internal tool)
- Full audit trail beyond rate history

---

### Data Architecture

**Hierarchical Data — Org Tree & Task Tree:**
- Strategy: Adjacency List (`parent_id` foreign key) trên cả hai cây
- Query: PostgreSQL Recursive CTEs (`WITH RECURSIVE`) cho traversal
- Rationale: Đơn giản nhất, PostgreSQL hỗ trợ sẵn, AI generate tốt. Task tree tối đa 5 levels — không cần Closure Table.

**Rate History:**
- Append-only table: `(employee_id, effective_date, rate_per_day)`
- Query rate tại thời điểm T: `WHERE effective_date <= T ORDER BY effective_date DESC LIMIT 1`

**Caching:**
- Redis: cache progress calculation (invalidate khi task được update)
- TanStack Query: client-side cache với stale-time 60s cho dashboard

**Migration:** Prisma Migrate — version-controlled schema migrations

---

### Authentication & Security

**Authentication:**
- JWT access token (15 phút) + refresh token (7 ngày)
- Web: httpOnly cookies (bảo vệ khỏi XSS)
- Mobile: Expo SecureStore
- Password: bcrypt (cost factor 12)

**Authorization — Org-Scoped Row-Level Security:**
- Pattern: NestJS `OrgScopeGuard` + `OrgScopeInterceptor` inject `orgUnitIds[]` vào mọi request
- Tất cả Prisma queries nhận `orgUnitIds` từ request context và filter tương ứng
- Enforce ở service layer — không ai bypass được qua URL manipulation
- Sensitive data (CCCD, rate): Role-based check trên top of org scope

**API Security:**
- HTTPS via Nginx với self-signed certificate (local network)
- CORS restricted to configured frontend origins

---

### API & Communication Patterns

**Design:** REST API, prefix `/api/v1`
**Documentation:** Swagger UI tự động qua `@nestjs/swagger` — available tại `/api/docs`
**Error Format:** Chuẩn hóa toàn hệ thống:
```json
{ "statusCode": 400, "message": "Validation failed", "errors": [...] }
```
**Validation:** NestJS `class-validator` + `class-transformer` trên tất cả DTOs
**Real-time:** Polling mỗi 60 giây cho dashboard — không cần WebSocket trong v1

---

### Frontend Architecture

**Web (React + Vite):**
- UI Library: Ant Design v5 — table, form, chart components có sẵn, phù hợp dashboard-heavy
- Server State: TanStack Query v5 — auto-caching, background refetch, optimistic updates
- Client State: Zustand v5 — UI state (modals, filters, sidebar)
- Routing: React Router v7 với lazy loading per route
- Charts (Dashboard): Ant Design Charts (AntV/G2)

**Mobile (Expo React Native):**
- Navigation: Expo Router v4
- UI: React Native Paper hoặc Ant Design Mobile RN
- State: TanStack Query v5 (shared logic với web qua `packages/shared`)
- Focus: Task view, tiến độ update, cảnh báo — không cần full feature parity với web

---

### Infrastructure & Deployment

**Local Docker Compose Topology:**
```
Nginx (80/443)
  ├── /api/*   → backend:3000  (NestJS)
  └── /*       → web:5173      (React Vite)

PostgreSQL 18   (internal: 5432)
Redis 7         (internal: 6379)
```

**Notification Architecture:**
- BullMQ + Redis: job queue cho scheduled alerts
- Alert Scheduler: cron job mỗi giờ kiểm tra tất cả ngưỡng
- Delivery channels:
  - In-app: lưu vào bảng `notifications`, poll từ client
  - Email: Nodemailer + SMTP (cấu hình qua env var — OQ-09 resolved ở deploy time)
  - Push: Firebase Cloud Messaging (FCM) — server gọi FCM API khi có alert

**Logging:** Pino v9 — JSON structured logs, output to stdout (Docker captures)

**Backup:** pg_dump script chạy daily cron trong PostgreSQL container

**Environment Config:** `.env` files per app + Docker Compose `env_file` directive

### Decision Impact Analysis

**Implementation Sequence:**
1. Turborepo monorepo setup + Docker Compose infrastructure
2. PostgreSQL schema (Prisma) — Org Tree, Users, Personnel, Projects, Tasks, Rates
3. NestJS backend với OrgScopeGuard + JWT auth
4. React web shell với Ant Design + routing
5. Domain modules theo thứ tự: Org → Personnel → Projects → Tasks → Cost → Alerts → Dashboard
6. Expo mobile app (task view + alerts)

**Cross-Component Dependencies:**
- OrgScopeGuard phải hoàn thành trước khi implement bất kỳ domain module nào
- Rate history schema phải đúng trước khi implement cost calculation
- BullMQ worker phải setup trước notification delivery
- TanStack Query config (shared) phải setup trước web và mobile dùng API

---

## Implementation Patterns & Consistency Rules

### Naming Patterns

**Database (PostgreSQL + Prisma):**
- Tables: snake_case, số nhiều → `org_units`, `employee_rates`, `task_items`
- Columns: snake_case → `created_at`, `org_unit_id`, `parent_id`
- Foreign keys: `{bảng_số_ít}_id` → `org_unit_id`, `parent_task_id`
- Indexes: `idx_{bảng}_{cột}` → `idx_tasks_project_id`

**API Endpoints:**
- kebab-case, số nhiều: `/api/v1/org-units`, `/api/v1/projects/:id/members`
- Query params: camelCase → `?orgUnitId=`, `?startDate=`

**TypeScript Code:**
- Classes/Interfaces: PascalCase → `UserService`, `CreateProjectDto`
- Functions/variables: camelCase → `getAllProjects()`, `orgUnitId`
- Constants: UPPER_SNAKE_CASE → `MAX_TASK_LEVELS = 5`
- Files backend: kebab-case → `org-unit.service.ts`
- Files frontend: PascalCase → `ProjectDashboard.tsx`

---

### Structure Patterns

**Backend — mỗi domain module:**
```
src/modules/{domain}/
├── {domain}.controller.ts
├── {domain}.service.ts
├── {domain}.module.ts
├── dto/
│   ├── create-{domain}.dto.ts
│   └── update-{domain}.dto.ts
└── {domain}.controller.spec.ts
```

**8 domain modules (thứ tự implement):** `auth` → `org-units` → `personnel` → `projects` → `tasks` → `costs` → `alerts` → `reports`

**Backend common:**
```
src/common/
├── guards/        → OrgScopeGuard, RolesGuard, JwtAuthGuard
├── decorators/    → @CurrentUser(), @OrgScoped(), @Roles()
├── interceptors/  → OrgScopeInterceptor
├── filters/       → GlobalExceptionFilter
└── utils/         → date.utils.ts, cost.utils.ts
```

**Frontend Web:**
```
src/
├── pages/             → route-level components
├── components/
│   ├── common/        → shared UI wrappers
│   └── {domain}/      → domain-specific components
├── api/               → TanStack Query hooks ({domain}.api.ts)
├── stores/            → Zustand stores ({domain}.store.ts)
├── hooks/             → custom React hooks
└── utils/
```

---

### Format Patterns

**API Response wrapper (bắt buộc):**
```typescript
// Single object:  { "data": { ...object } }
// List:           { "data": [...], "meta": { "total": 100, "page": 1, "pageSize": 20 } }
// Error:          { "statusCode": 400, "message": "...", "errors": ["..."] }
```

**Date/Time:** ISO 8601 trong API (`2026-05-25T00:00:00.000Z`); format hiển thị do frontend xử lý

**JSON fields:** camelCase trong responses (`orgUnitId`, `ratePerDay`, `startDate`)

**Effort units trong API:** luôn trả về man-hour; frontend quy đổi khi hiển thị

---

### Process Patterns

**OrgScope Pattern — BẮT BUỘC mọi query trả về data:**
```typescript
// Controller: dùng @OrgScoped() decorator
// Service: luôn nhận orgUnitIds[] và filter WHERE orgUnitId IN (...)
// KHÔNG bao giờ query toàn bộ data rồi filter sau
```

**Error Handling:**
- Backend: `GlobalExceptionFilter` → format chuẩn, không expose stack trace
- Frontend: TanStack Query `onError` → `message.error()` Ant Design

**Business Logic Placement:**
- Allocation validation: backend Service layer ONLY
- Cost calculation: backend Service layer, cache Redis
- Progress calculation: backend Service layer, cache Redis với key `progress:{projectId}`; invalidate khi task update

---

### Shared Constants (packages/shared)

```typescript
export const WORK_CONSTANTS = {
  HOURS_PER_DAY: 8,
  DAYS_PER_MONTH: 21,
  WORK_DAYS: [1, 2, 3, 4, 5], // Mon–Fri
}
```

Không hardcode các giá trị này bất cứ đâu — import từ `@loop/shared`.

---

### Enforcement: Tất cả AI Agents PHẢI

- Dùng `OrgScopeGuard` cho mọi protected endpoint
- Wrap response theo format chuẩn
- Đặt business logic trong Service, không trong Controller
- Dùng Prisma transactions cho write nhiều bảng
- Validate input bằng class-validator DTOs tại Controller
- Import constants từ `@loop/shared`, không hardcode

---

## Project Structure & Boundaries

### Requirements to Structure Mapping

| FR Category | Module/Directory |
|---|---|
| FR-001–003 (Org Tree) | `apps/backend/src/modules/org-units/` |
| FR-101–102 (Nhân sự + Rate) | `apps/backend/src/modules/personnel/` |
| FR-201–202 (Dự án + Allocation) | `apps/backend/src/modules/projects/` |
| FR-301–303 (Task + Tiến độ) | `apps/backend/src/modules/tasks/` |
| FR-401–403 (Chi phí) | `apps/backend/src/modules/costs/` |
| FR-501–505 (Cảnh báo + Thông báo) | `apps/backend/src/modules/alerts/` |
| FR-601–603 (Dashboard + Báo cáo) | `apps/backend/src/modules/reports/` |
| Auth + JWT | `apps/backend/src/modules/auth/` |
| OrgScopeGuard (cross-cutting) | `apps/backend/src/common/guards/` |
| Shared constants + types | `packages/shared/src/` |
| Web Dashboard (FR-601–603) | `apps/web/src/pages/dashboard/`, `apps/web/src/pages/reports/` |
| Web Task Management (FR-301–303) | `apps/web/src/pages/tasks/` |
| Mobile Task View (FR-301, NFR-01) | `apps/mobile/app/(tabs)/tasks/` |
| Mobile Alerts (FR-505, NFR-01) | `apps/mobile/app/(tabs)/alerts/` |

---

### Complete Project Directory Structure

```
loop/
├── package.json                      ← Turborepo root
├── turbo.json
├── tsconfig.base.json
├── docker-compose.yml
├── .env.example
├── .gitignore
├── README.md
│
├── apps/
│   ├── backend/                      ← NestJS 11 + Prisma 7.8
│   │   ├── package.json
│   │   ├── nest-cli.json
│   │   ├── tsconfig.json
│   │   ├── .env
│   │   ├── .env.example
│   │   ├── Dockerfile
│   │   ├── prisma/
│   │   │   ├── schema.prisma         ← All models
│   │   │   └── migrations/
│   │   └── src/
│   │       ├── main.ts
│   │       ├── app.module.ts
│   │       ├── common/
│   │       │   ├── guards/
│   │       │   │   ├── jwt-auth.guard.ts
│   │       │   │   ├── roles.guard.ts
│   │       │   │   └── org-scope.guard.ts       ← Cross-cutting auth
│   │       │   ├── decorators/
│   │       │   │   ├── current-user.decorator.ts
│   │       │   │   ├── org-scoped.decorator.ts
│   │       │   │   └── roles.decorator.ts
│   │       │   ├── interceptors/
│   │       │   │   └── org-scope.interceptor.ts
│   │       │   ├── filters/
│   │       │   │   └── global-exception.filter.ts
│   │       │   └── utils/
│   │       │       ├── date.utils.ts
│   │       │       └── cost.utils.ts
│   │       └── modules/
│   │           ├── auth/
│   │           │   ├── auth.module.ts
│   │           │   ├── auth.controller.ts
│   │           │   ├── auth.service.ts
│   │           │   ├── strategies/
│   │           │   │   ├── jwt.strategy.ts
│   │           │   │   └── local.strategy.ts
│   │           │   └── dto/
│   │           │       ├── login.dto.ts
│   │           │       └── refresh-token.dto.ts
│   │           ├── org-units/                   ← FR-001–003
│   │           │   ├── org-units.module.ts
│   │           │   ├── org-units.controller.ts
│   │           │   ├── org-units.service.ts
│   │           │   ├── dto/
│   │           │   │   ├── create-org-unit.dto.ts
│   │           │   │   └── update-org-unit.dto.ts
│   │           │   └── org-units.controller.spec.ts
│   │           ├── personnel/                   ← FR-101–102
│   │           │   ├── personnel.module.ts
│   │           │   ├── personnel.controller.ts
│   │           │   ├── personnel.service.ts
│   │           │   ├── dto/
│   │           │   │   ├── create-employee.dto.ts
│   │           │   │   ├── update-employee.dto.ts
│   │           │   │   └── create-employee-rate.dto.ts
│   │           │   └── personnel.controller.spec.ts
│   │           ├── projects/                    ← FR-201–202
│   │           │   ├── projects.module.ts
│   │           │   ├── projects.controller.ts
│   │           │   ├── projects.service.ts
│   │           │   ├── allocation-validator.service.ts  ← NFR-03
│   │           │   ├── dto/
│   │           │   │   ├── create-project.dto.ts
│   │           │   │   ├── update-project.dto.ts
│   │           │   │   └── add-project-member.dto.ts
│   │           │   └── projects.controller.spec.ts
│   │           ├── tasks/                       ← FR-301–303
│   │           │   ├── tasks.module.ts
│   │           │   ├── tasks.controller.ts
│   │           │   ├── tasks.service.ts
│   │           │   ├── progress-calculator.service.ts  ← FR-303
│   │           │   ├── dto/
│   │           │   │   ├── create-task.dto.ts
│   │           │   │   ├── update-task.dto.ts
│   │           │   │   └── update-task-progress.dto.ts
│   │           │   └── tasks.controller.spec.ts
│   │           ├── costs/                       ← FR-401–403
│   │           │   ├── costs.module.ts
│   │           │   ├── costs.controller.ts
│   │           │   ├── costs.service.ts
│   │           │   └── costs.controller.spec.ts
│   │           ├── alerts/                      ← FR-501–505
│   │           │   ├── alerts.module.ts
│   │           │   ├── alerts.controller.ts
│   │           │   ├── alerts.service.ts
│   │           │   ├── alert-scheduler.service.ts   ← BullMQ cron job
│   │           │   ├── notification-delivery.service.ts  ← 3 channels
│   │           │   ├── dto/
│   │           │   │   └── update-alert-config.dto.ts
│   │           │   └── alerts.controller.spec.ts
│   │           └── reports/                     ← FR-601–603
│   │               ├── reports.module.ts
│   │               ├── reports.controller.ts
│   │               ├── reports.service.ts
│   │               ├── excel-export.service.ts
│   │               ├── dto/
│   │               │   └── report-params.dto.ts
│   │               └── reports.controller.spec.ts
│   │
│   ├── web/                          ← React 19 + Vite 8 + Ant Design v5
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   ├── index.html
│   │   ├── Dockerfile
│   │   └── src/
│   │       ├── main.tsx
│   │       ├── App.tsx
│   │       ├── pages/
│   │       │   ├── auth/
│   │       │   │   └── LoginPage.tsx
│   │       │   ├── org-units/
│   │       │   │   └── OrgUnitsPage.tsx         ← FR-001–003
│   │       │   ├── personnel/
│   │       │   │   ├── PersonnelListPage.tsx    ← FR-101
│   │       │   │   └── PersonnelDetailPage.tsx  ← FR-102
│   │       │   ├── projects/
│   │       │   │   ├── ProjectListPage.tsx      ← FR-201
│   │       │   │   └── ProjectDetailPage.tsx    ← FR-202
│   │       │   ├── tasks/
│   │       │   │   └── TasksPage.tsx            ← FR-301–303
│   │       │   ├── alerts/
│   │       │   │   └── AlertConfigPage.tsx      ← FR-501
│   │       │   ├── dashboard/
│   │       │   │   ├── LeadershipDashboardPage.tsx  ← FR-601
│   │       │   │   └── ProjectDashboardPage.tsx     ← FR-602
│   │       │   └── reports/
│   │       │       └── ReportsPage.tsx          ← FR-603
│   │       ├── components/
│   │       │   ├── common/
│   │       │   │   ├── OrgScopeProvider.tsx
│   │       │   │   ├── PageLayout.tsx
│   │       │   │   └── ErrorBoundary.tsx
│   │       │   ├── org-units/
│   │       │   │   └── OrgTreeView.tsx
│   │       │   ├── projects/
│   │       │   │   └── AllocationWarning.tsx    ← NFR-03 UI
│   │       │   ├── tasks/
│   │       │   │   ├── TaskTree.tsx
│   │       │   │   └── TaskApprovalActions.tsx  ← FR-302
│   │       │   └── dashboard/
│   │       │       └── MetricCards.tsx
│   │       ├── api/
│   │       │   ├── auth.api.ts
│   │       │   ├── org-units.api.ts
│   │       │   ├── personnel.api.ts
│   │       │   ├── projects.api.ts
│   │       │   ├── tasks.api.ts
│   │       │   ├── costs.api.ts
│   │       │   ├── alerts.api.ts
│   │       │   └── reports.api.ts
│   │       ├── stores/
│   │       │   ├── auth.store.ts
│   │       │   └── ui.store.ts
│   │       ├── hooks/
│   │       │   └── useOrgScope.ts
│   │       └── utils/
│   │           ├── date.utils.ts
│   │           └── format.utils.ts
│   │
│   └── mobile/                       ← Expo SDK 56 (React Native)
│       ├── package.json
│       ├── app.json
│       ├── tsconfig.json
│       └── app/
│           ├── _layout.tsx           ← Expo Router root
│           ├── (auth)/
│           │   └── login.tsx
│           └── (tabs)/
│               ├── _layout.tsx
│               ├── tasks/
│               │   ├── index.tsx     ← Task list (FR-301)
│               │   └── [id].tsx      ← Task detail + progress update (FR-303)
│               ├── alerts/
│               │   └── index.tsx     ← Notifications (FR-505)
│               └── projects/
│                   └── index.tsx     ← Project overview (FR-202)
│
├── packages/
│   └── shared/                       ← Shared types & constants
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts
│           ├── constants/
│           │   └── work.constants.ts  ← WORK_CONSTANTS
│           └── types/
│               ├── api.types.ts       ← ApiResponse<T>, PaginatedResponse<T>
│               ├── user.types.ts      ← UserRole enum
│               └── task.types.ts      ← TaskStatus, ApprovalStatus enums
│
└── nginx/
    ├── nginx.conf                     ← Reverse proxy config
    └── Dockerfile
```

---

### Prisma Schema Models (Core)

```prisma
// schema.prisma — các model chính

model OrgUnit {
  id        String    @id @default(cuid())
  code      String    @unique
  name      String
  parentId  String?
  parent    OrgUnit?  @relation("OrgTree", fields: [parentId], references: [id])
  children  OrgUnit[] @relation("OrgTree")
  users     User[]
  projects  Project[]
  createdAt DateTime  @default(now())
  @@index([parentId])          // idx_org_units_parent_id
}

model User {
  id         String   @id @default(cuid())
  email      String   @unique
  password   String
  role       Role     @default(MEMBER)
  orgUnitId  String
  orgUnit    OrgUnit  @relation(fields: [orgUnitId], references: [id])
  employee   Employee?
  @@index([orgUnitId])
}

model Employee {
  id           String         @id @default(cuid())
  code         String         @unique
  fullName     String
  dateOfBirth  DateTime?
  techStack    String?
  level        Level
  nationalId   String?        // CCCD — chỉ Admin xem được
  nationalIdIssuedAt  DateTime?
  nationalIdIssuedBy  String?
  userId       String         @unique
  user         User           @relation(fields: [userId], references: [id])
  rates        EmployeeRate[]
  projectMembers ProjectMember[]
}

model EmployeeRate {
  id            String   @id @default(cuid())
  employeeId    String
  employee      Employee @relation(fields: [employeeId], references: [id])
  effectiveDate DateTime
  ratePerDay    Decimal  @db.Decimal(18, 2)
  level         Level
  // append-only: không có updatedAt, không UPDATE
  @@index([employeeId, effectiveDate])  // idx_employee_rates_employee_effective
}

model Project {
  id           String   @id @default(cuid())
  code         String   @unique
  name         String
  type         ProjectType
  client       String?
  budgetVnd    Decimal? @db.Decimal(18, 2)
  budgetUsd    Decimal? @db.Decimal(18, 2)
  budgetEffort Decimal? @db.Decimal(10, 2)  // man-month
  startDate    DateTime
  endDate      DateTime
  status       ProjectStatus @default(PLANNING)
  orgUnitId    String
  orgUnit      OrgUnit  @relation(fields: [orgUnitId], references: [id])
  members      ProjectMember[]
  tasks        Task[]
  @@index([orgUnitId])
  @@index([status])
}

model ProjectMember {
  id           String   @id @default(cuid())
  projectId    String
  project      Project  @relation(fields: [projectId], references: [id])
  employeeId   String
  employee     Employee @relation(fields: [employeeId], references: [id])
  role         String
  level        Level
  allocation   Decimal  @db.Decimal(5, 2)   // % 0–100
  startDate    DateTime
  endDate      DateTime
  ratePerDay   Decimal  @db.Decimal(18, 2)  // override from employee rate
  @@index([projectId])
  @@index([employeeId, startDate, endDate])  // idx_project_members_allocation
}

model Task {
  id           String   @id @default(cuid())
  title        String
  description  String?
  projectId    String
  project      Project  @relation(fields: [projectId], references: [id])
  parentId     String?
  parent       Task?    @relation("TaskTree", fields: [parentId], references: [id])
  children     Task[]   @relation("TaskTree")
  assigneeId   String?
  deadline     DateTime?
  status       TaskStatus @default(TODO)
  approvalStatus ApprovalStatus?
  estimateHours Decimal @db.Decimal(8, 2)
  actualHours  Decimal  @db.Decimal(8, 2) @default(0)
  progress     Int      @default(0)       // 0–100, chỉ cho task lá
  level        Int      @default(1)       // 1–5
  @@index([projectId])
  @@index([parentId])
  @@index([assigneeId])
}

model AlertConfig {
  id                  String  @id @default(cuid())
  orgUnitId           String  @unique
  taskDueSoonDays     Int     @default(3)
  projectEndSoonDays  Int     @default(7)
  budgetAlertPct      Int     @default(80)
  effortAlertPct      Int     @default(80)
  taskEstimateMaxHours Decimal @db.Decimal(5,2) @default(4)
}

model Notification {
  id         String   @id @default(cuid())
  userId     String
  type       String
  message    String
  isRead     Boolean  @default(false)
  createdAt  DateTime @default(now())
  @@index([userId, isRead])
}

enum Role { ADMIN PM MEMBER LEADERSHIP }
enum Level { JUNIOR MID SENIOR EXPERT }
enum ProjectType { OSDC PKG }
enum ProjectStatus { PLANNING ACTIVE ON_HOLD CLOSED }
enum TaskStatus { TODO IN_PROGRESS DONE CANCELLED PENDING_APPROVAL }
enum ApprovalStatus { PENDING APPROVED RETURNED CANCELLED }
```

---

### Architectural Boundaries

**API Boundaries:**
- Tất cả endpoints đều có prefix `/api/v1/`
- Mọi request (trừ `/api/v1/auth/*`) yêu cầu JWT Bearer token
- `OrgScopeGuard` thực thi trên mọi protected endpoint — inject `orgUnitIds[]` từ org tree traversal
- Role-based access (`RolesGuard`) áp dụng thêm cho sensitive data (CCCD, rate history)

**Component Boundaries:**
- Backend → Web/Mobile: REST API only (không shared code trực tiếp, chỉ qua `packages/shared` types)
- `packages/shared` → Backend + Web + Mobile: constants + types (no business logic)
- BullMQ workers chạy trong cùng backend process, communicate qua Redis queue

**Service Boundaries:**
- Allocation validation: chỉ trong `AllocationValidatorService` — không tái hiện logic ở bất kỳ nơi nào khác
- Cost calculation: chỉ trong `CostsService` + `cost.utils.ts`
- Progress calculation: chỉ trong `ProgressCalculatorService`, kết quả cache Redis `progress:{projectId}`
- Alert scheduling: `AlertSchedulerService` (BullMQ producer) tách biệt với `NotificationDeliveryService` (consumer)

**Data Boundaries:**
- PostgreSQL: source of truth cho tất cả persistent data
- Redis: cache layer (progress calculations) + job queue (BullMQ alerts) — không lưu primary data
- Client (TanStack Query): cache với stale-time 60s, không local persistence

---

### Integration Points

**Internal Communication:**
```
Web/Mobile
  → HTTPS (Nginx) → NestJS REST API
    → Prisma ORM → PostgreSQL
    → Redis (cache reads/writes)
    → BullMQ (enqueue alert jobs)
      → Alert Worker → Nodemailer (email)
      → Alert Worker → FCM API (push)
      → Alert Worker → Notification table (in-app)
```

**External Integrations (v1):**
- FCM (Firebase Cloud Messaging) — push notifications mobile (yêu cầu internet từ server, không từ client)
- SMTP server (Nodemailer) — email alerts (cấu hình qua env var)
- Không có tích hợp ngoài nào khác trong v1

**External Integrations (v2) — Telegram Bot:**
- Platform: Telegram Bot API (`api.telegram.org`)
- Cơ chế inbound: **Long-polling** — Loop server tự gọi Telegram, không cần public IP/inbound webhook; hoàn toàn tương thích on-premise
- Outbound trigger: task mới được tạo (hook vào `TasksService`), task sắp đến hạn (mở rộng `AlertSchedulerService`)
- Inbound: `TelegramPollerService` chạy vòng lặp long-poll (`getUpdates?timeout=30`) trong NestJS `onModuleInit`; parse `callback_query` → `TasksService.updateStatus()`
- Message format: Telegram MarkdownV2 card + InlineKeyboardMarkup (3 nút: ✅ Hoàn thành | 🔄 Đang làm | ↩️ Trả lại)
- Callback data format: `task:done:{taskId}` | `task:inprogress:{taskId}` | `task:return:{taskId}`
- Auth model: group Telegram là trusted internal channel — updates accepted không cần per-user JWT; hành động được log với attribution "via Telegram"
- Module: `src/modules/integrations/telegram/` — tách biệt hoàn toàn, không ảnh hưởng v1 modules
- Config: `telegramBotToken`, `telegramChatId`, `telegramEnabled` thêm vào `AlertConfig` model
- Library: `node-telegram-bot-api` (hoặc `telegraf`) trong `apps/backend/package.json`

**Data Flow — Allocation Validation:**
```
POST /api/v1/projects/:id/members
  → AllocationValidatorService.validate(employeeId, startDate, endDate, allocation%)
    → Query tất cả ProjectMember của employee trong khoảng date range
    → Generate working days (Mon–Fri, loại T7/CN)
    → Với mỗi ngày: SUM(allocation) + new allocation ≤ 100%
    → Nếu vi phạm: trả về { conflictDays: Date[], conflictProjects: string[] }
```

**Data Flow — Cost Calculation:**
```
GET /api/v1/costs/projects/:id
  → CostsService.calculateProjectCost(projectId)
    → Lấy tất cả ProjectMember của project
    → Với mỗi member: lấy EmployeeRate theo từng giai đoạn (effective_date ranges)
    → Σ (actualHours / HOURS_PER_DAY × ratePerDay) theo từng giai đoạn
    → Cache result; invalidate khi task actualHours thay đổi
```

---

### Development Workflow

**Development (local, no Docker):**
```bash
# Từ root
pnpm install
pnpm turbo dev   # Chạy backend:3000 + web:5173 song song

# Database
cd apps/backend && npx prisma migrate dev
```

**Production (Docker Compose):**
```bash
docker-compose up -d   # Khởi động tất cả: PostgreSQL + Redis + Backend + Nginx + Web
```

**Mobile Development:**
```bash
cd apps/mobile && npx expo start
# Scan QR code bằng Expo Go app
```

---

## Architecture Validation Results

### Architecture Completeness Checklist

**Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed (100+ projects, 100+ personnel, 1000s tasks)
- [x] Technical constraints identified (on-premise, no internet dependency for core functions)
- [x] Cross-cutting concerns mapped (5 concerns: OrgScope, Hierarchical Data, Notifications, Cost Accuracy, Allocation Validation)

**Architectural Decisions**
- [x] Critical decisions documented with versions (NestJS 11, Prisma 7.8, PostgreSQL 18, React 19, Expo SDK 56, Redis 7, BullMQ, Ant Design v5)
- [x] Technology stack fully specified
- [x] Integration patterns defined (REST API, BullMQ jobs, polling, Redis cache)
- [x] Performance considerations addressed (indexes, Redis cache, TanStack Query stale-time)

**Implementation Patterns**
- [x] Naming conventions established (DB snake_case, API kebab-case, TS PascalCase/camelCase)
- [x] Structure patterns defined (8 domain modules, common guards/utils)
- [x] Communication patterns specified (API response wrapper, error format, OrgScope pattern)
- [x] Process patterns documented (OrgScope mandatory, business logic in Service, Prisma transactions)

**Project Structure**
- [x] Complete directory structure defined (full tree với tất cả files)
- [x] Component boundaries established (API / Service / Data / Cache boundaries)
- [x] Integration points mapped (data flow diagrams cho allocation validation và cost calculation)
- [x] Requirements to structure mapping complete (FR → module → file mapping)

---

### Gap Analysis Results

**Critical Gaps:** Không có ✅

**Important Gaps (không blocking implementation):**

1. **ExcelJS library chưa khai báo trong stack** — `excel-export.service.ts` cần thư viện. Resolution: thêm `exceljs` vào `apps/backend/package.json` khi implement FR-603.

2. **FCM push notifications yêu cầu internet từ server** — Nếu deploy trong môi trường hoàn toàn isolated, mobile push sẽ không hoạt động. Resolution: in-app notification (polling 60s) vẫn đảm bảo FR-505; FCM là enhancement khi server có internet access.

**Minor Gaps:**

3. `pg_dump` backup — nên schedule daily 02:00 trong Docker Compose cron config.

---

### Architecture Readiness Assessment

**Overall Status:** ✅ READY FOR IMPLEMENTATION

**Confidence Level:** High — tất cả 16 checklist items đều [x], không có Critical Gap

**Key Strengths:**
- 100% FR/NFR coverage với architectural support cụ thể, mỗi requirement map tới file/module cụ thể
- OrgScopeGuard enforced cross-cutting ở tất cả protected endpoints — không thể bypass
- Allocation validation per-day algorithm được định nghĩa chính xác (Mon–Fri, overlap detection)
- Rate history append-only với query strategy tại thời điểm T rõ ràng
- Progress calculation với Redis cache + invalidation strategy cụ thể
- "Boring" stack — tất cả công nghệ AI code generation biết sâu nhất
- Single-command Docker Compose deployment — phù hợp on-premise, không cần DevOps expertise

**Areas for Future Enhancement (post-v1):**
- WebSocket real-time updates (thay thế polling 60s)
- Horizontal scaling (hiện tại single-server, phù hợp internal tool)
- Full audit trail (hiện tại chỉ rate history append-only)
- Offline mode cho mobile
- FCM push notifications khi có internet connectivity

---

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented
- Use implementation patterns consistently across all components
- Respect project structure and boundaries
- Refer to this document for all architectural questions
- **CRITICAL:** OrgScopeGuard phải hoàn thành TRƯỚC khi implement bất kỳ domain module nào
- **CRITICAL:** Rate history — chỉ INSERT, không bao giờ UPDATE EmployeeRate records
- **CRITICAL:** Import từ `@loop/shared` cho WORK_CONSTANTS, không hardcode

**First Implementation Priority:**
```bash
# Bước 1: Khởi tạo Turborepo monorepo
npx create-turbo@latest loop

# Bước 2: Setup Docker Compose (PostgreSQL + Redis + Nginx)
# Bước 3: Prisma schema + migrations (tất cả models)
# Bước 4: NestJS auth module + JWT + OrgScopeGuard
# Bước 5: Domain modules theo thứ tự:
#   auth → org-units → personnel → projects → tasks → costs → alerts → reports
# Bước 6: React web shell + Ant Design + routing
# Bước 7: Expo mobile app (tasks + alerts)
```

---

## Amendment 2026-05-26: BPM Module — Full BPMN 2.0 Engine

### Tổng quan

Bổ sung module **Business Process Management (BPM)** cho phép Admin thiết kế quy trình nghiệp vụ dạng BPMN 2.0 và PM khởi động / giám sát các process instance. Module này là một epic độc lập, không thay đổi bất kỳ module nào đã có.

**Người dùng chính:**
- **Admin** — thiết kế process template bằng visual BPMN modeler
- **PM** — khởi động process instance, monitor tiến độ, xử lý user tasks

---

### Technology Decision: BPM Stack

**Execution Engine:** [`bpmn-engine`](https://www.npmjs.com/package/bpmn-engine) (Node.js npm)
- BPMN 2.0 standard compliant
- TypeScript-compatible, chạy trong NestJS process
- Import/export BPMN XML tương thích Bizagi, Camunda Modeler

**BPMN Modeler (Frontend):** [`bpmn-js`](https://bpmn.io/toolkit/bpmn-js/) (Camunda open-source)
- React-embeddable drag-drop BPMN editor
- Render + edit BPMN XML trực tiếp trong browser
- Token simulation overlay cho process monitoring

**Timer Events:** BullMQ + Redis (đã có trong stack) — không thêm dependency mới

**Rationale — tại sao không dùng Camunda 8 / Zeebe:**
- Zeebe là Java microservice riêng (512MB+ RAM, Docker service thứ 6) — phá vỡ nguyên tắc "boring technology" và on-premise simplicity
- `bpmn-engine` + `bpmn-js` cho phép toàn bộ BPM nằm trong NestJS monorepo hiện tại

**Libraries cần thêm:**
```json
// apps/backend/package.json
"bpmn-engine": "^x.x.x"

// apps/web/package.json
"bpmn-js": "^x.x.x"
"@bpmn-io/properties-panel": "^x.x.x"
```

---

### BPMN 2.0 Subset hỗ trợ trong v1

Chỉ support subset sau để tránh over-engineering. Defer phần còn lại sang v2:

| Element | v1 | v2 |
|---|---|---|
| Start Event / End Event | ✅ | |
| User Task (human task) | ✅ | |
| Service Task (automated) | ✅ basic | |
| Sequence Flow | ✅ | |
| Exclusive Gateway (XOR) | ✅ | |
| Parallel Gateway (AND split/join) | ✅ | |
| Timer Boundary Event | ✅ | |
| Sub-Process | | ✅ |
| Message Correlation | | ✅ |
| Compensation Event | | ✅ |
| Complex Gateway | | ✅ |

---

### Module Structure: `processes/`

Đặt tại `apps/backend/src/modules/processes/` — theo đúng pattern 8 domain modules hiện tại.

```
src/modules/processes/
├── processes.module.ts
├── definitions/
│   ├── definitions.controller.ts     ← CRUD BPMN definitions
│   ├── definitions.service.ts        ← store/version BPMN XML
│   └── dto/
│       ├── create-definition.dto.ts
│       └── update-definition.dto.ts
├── instances/
│   ├── instances.controller.ts       ← start/query/cancel instances
│   ├── instances.service.ts          ← lifecycle: start, suspend, cancel
│   └── dto/
│       └── start-instance.dto.ts
├── engine/
│   └── bpmn-engine.service.ts        ← wraps bpmn-engine, handles persistence
├── user-tasks/
│   ├── user-tasks.controller.ts      ← list/complete/claim human tasks
│   ├── user-tasks.service.ts         ← assignment + form data
│   └── dto/
│       └── complete-user-task.dto.ts
├── timers/
│   └── timer-event.service.ts        ← BullMQ jobs cho timer boundary events
└── monitoring/
    └── process-monitor.service.ts    ← token state queries cho UI overlay
```

**Thứ tự implement trong module:** `definitions` → `engine` → `instances` → `user-tasks` → `timers` → `monitoring`

---

### Prisma Schema — 4 Models mới

Thêm vào `apps/backend/prisma/schema.prisma`:

```prisma
model ProcessDefinition {
  id          String             @id @default(cuid())
  name        String
  description String?
  version     Int                @default(1)
  bpmnXml     String             @db.Text        // BPMN 2.0 XML source
  orgUnitId   String
  status      DefinitionStatus   @default(DRAFT)
  instances   ProcessInstance[]
  createdAt   DateTime           @default(now())
  updatedAt   DateTime           @updatedAt
  @@index([orgUnitId])
  @@index([status])
}

model ProcessInstance {
  id           String         @id @default(cuid())
  definitionId String
  definition   ProcessDefinition @relation(fields: [definitionId], references: [id])
  projectId    String?                         // optional link to Loop Project
  startedBy    String                          // userId
  status       InstanceStatus @default(RUNNING)
  variables    Json           @default("{}")   // process variables (form data, etc.)
  tokenState   Json           @default("{}")   // serialized bpmn-engine execution state
  startedAt    DateTime       @default(now())
  completedAt  DateTime?
  userTasks    ProcessUserTask[]
  activityLog  ProcessActivityLog[]
  @@index([definitionId, status])
  @@index([startedBy])
  @@index([projectId])
}

model ProcessUserTask {
  id               String          @id @default(cuid())
  instanceId       String
  instance         ProcessInstance @relation(fields: [instanceId], references: [id])
  activityId       String                          // BPMN element ID (e.g. "Activity_1a2b3c")
  name             String
  assigneeId       String?                         // Employee userId
  candidateRoles   String[]        @default([])    // Role[] — fallback khi chưa có assignee
  formData         Json?                           // submitted form values on complete
  status           UserTaskStatus  @default(PENDING)
  dueDate          DateTime?
  completedAt      DateTime?
  @@index([instanceId])
  @@index([assigneeId, status])
}

model ProcessActivityLog {
  id           String          @id @default(cuid())
  instanceId   String
  instance     ProcessInstance @relation(fields: [instanceId], references: [id])
  activityId   String          // BPMN element ID
  activityName String
  activityType String          // "userTask" | "serviceTask" | "exclusiveGateway" | "timerEvent" | etc.
  performedBy  String?         // userId (null cho automated activities)
  startedAt    DateTime
  completedAt  DateTime?
  @@index([instanceId])
}

enum DefinitionStatus { DRAFT ACTIVE DEPRECATED }
enum InstanceStatus   { RUNNING SUSPENDED COMPLETED CANCELLED ERROR }
enum UserTaskStatus   { PENDING IN_PROGRESS COMPLETED SKIPPED }
```

---

### API Endpoints — Module `processes/`

Tuân thủ prefix `/api/v1/` và format response chuẩn. Tất cả endpoints đều có OrgScopeGuard.

```
// Process Definitions
GET    /api/v1/processes/definitions          ← list definitions (org-scoped)
POST   /api/v1/processes/definitions          ← create definition
GET    /api/v1/processes/definitions/:id      ← get definition + BPMN XML
PUT    /api/v1/processes/definitions/:id      ← update (tạo version mới nếu ACTIVE)
PATCH  /api/v1/processes/definitions/:id/status  ← DRAFT→ACTIVE, ACTIVE→DEPRECATED

// Process Instances
GET    /api/v1/processes/instances            ← list instances (org-scoped, filter by status/definitionId)
POST   /api/v1/processes/instances            ← start new instance
GET    /api/v1/processes/instances/:id        ← instance detail + token state
PATCH  /api/v1/processes/instances/:id/cancel ← cancel running instance
GET    /api/v1/processes/instances/:id/activity-log ← audit trail

// User Tasks
GET    /api/v1/processes/user-tasks           ← list tasks assigned to me (JWT context)
GET    /api/v1/processes/user-tasks/:id       ← task detail + form schema
PATCH  /api/v1/processes/user-tasks/:id/claim ← claim candidate task
POST   /api/v1/processes/user-tasks/:id/complete ← complete với form data
POST   /api/v1/processes/user-tasks/:id/return   ← trả lại task (nếu assignee muốn unclaim)
```

---

### Frontend — 3 Trang mới (Web only)

BPM feature chỉ có trên **Web** — không đưa lên mobile (Admin/PM không cần modeler trên điện thoại).

```
// apps/web/src/pages/processes/
├── ProcessListPage.tsx           ← /processes — danh sách definitions + nút Start Instance
├── ProcessModelerPage.tsx        ← /processes/modeler/:id — embed bpmn-js editor
├── ProcessInstancesPage.tsx      ← /processes/instances — list running instances
└── ProcessMonitorPage.tsx        ← /processes/instances/:id — token overlay trên BPMN diagram

// apps/web/src/components/processes/
├── BpmnModeler.tsx               ← wrapper React cho bpmn-js
├── BpmnViewer.tsx                ← read-only viewer + token overlay (monitoring)
├── UserTaskList.tsx              ← danh sách task được assign cho tôi
└── ProcessStatusBadge.tsx        ← status badge (InstanceStatus, UserTaskStatus)

// apps/web/src/api/
└── processes.api.ts              ← TanStack Query hooks cho tất cả process endpoints
```

**BpmnModeler.tsx pattern:**
```typescript
// Wrap bpmn-js BpmnModeler trong useEffect + useRef
// Expose: onSave(bpmnXml: string) callback
// Style: 100% width, 600px min-height, dark background matching Ant Design dark theme
```

**ProcessMonitorPage — Token Overlay:**
- Dùng `bpmn-js` viewer (read-only)
- Query `GET /instances/:id` mỗi 10s (TanStack Query refetch interval)
- Highlight active BPMN elements bằng `overlays.add()` API của bpmn-js theo `tokenState`

---

### Integration với Loop hiện tại

| Điểm tích hợp | Mô tả |
|---|---|
| `OrgScopeGuard` | `ProcessDefinition.orgUnitId` và `ProcessInstance` inherit org scope — bắt buộc, giống tất cả modules khác |
| `Project` link | `ProcessInstance.projectId` → optional FK tới `Project`; PM có thể gắn process instance với dự án |
| `User` / `Employee` | `ProcessUserTask.assigneeId` → `User.id`; `candidateRoles` → `Role` enum đã có |
| Alert / Notification | Khi User Task được assign: gửi in-app notification qua `NotificationDeliveryService` hiện tại |
| BullMQ | `TimerEventService` dùng queue `process-timers` (queue mới, tách với `alert-queue` đã có) |

---

### Process Patterns — Quy tắc bắt buộc cho AI Agents

**Engine Persistence (quan trọng nhất):**
```typescript
// SAU MỖI token movement, PHẢI serialize và lưu vào DB:
instance.tokenState = JSON.stringify(engineExecution.getState());
await prisma.processInstance.update({ where: { id }, data: { tokenState: ... } });

// KHI SERVER RESTART, resume execution:
const state = JSON.parse(instance.tokenState);
engineExecution.resume(state);
```

**OrgScope cho processes:**
```typescript
// DefinitionsService: luôn filter theo orgUnitIds[]
// InstancesService: verify instance.definition.orgUnitId IN orgUnitIds[]
// KHÔNG bao giờ trả về process data ngoài org scope của user
```

**Version management:**
```typescript
// Khi update definition đang ACTIVE: tạo version mới (version + 1), set cũ → DEPRECATED
// Running instances tiếp tục dùng version cũ (giữ bpmnXml snapshot trong ProcessInstance)
// KHÔNG update bpmnXml của definition đang ACTIVE in-place
```

**User Task Assignment:**
```typescript
// Priority: assigneeId > candidateRoles
// Nếu chỉ có candidateRoles: task xuất hiện trong queue của tất cả user có role đó
// Khi một user claim: set assigneeId, status → IN_PROGRESS
// Chỉ assignee (hoặc Admin) mới được complete task
```

---

### Directory Structure — Bổ sung vào Project Structure

Thêm vào phần `apps/backend/src/modules/` trong Project Structure:

```
├── processes/                    ← BPM Module (Amendment 2026-05-26)
│   ├── processes.module.ts
│   ├── definitions/
│   │   ├── definitions.controller.ts
│   │   ├── definitions.service.ts
│   │   └── dto/
│   │       ├── create-definition.dto.ts
│   │       └── update-definition.dto.ts
│   ├── instances/
│   │   ├── instances.controller.ts
│   │   ├── instances.service.ts
│   │   └── dto/
│   │       └── start-instance.dto.ts
│   ├── engine/
│   │   └── bpmn-engine.service.ts
│   ├── user-tasks/
│   │   ├── user-tasks.controller.ts
│   │   ├── user-tasks.service.ts
│   │   └── dto/
│   │       └── complete-user-task.dto.ts
│   ├── timers/
│   │   └── timer-event.service.ts
│   └── monitoring/
│       └── process-monitor.service.ts
```

Thêm vào `apps/web/src/pages/`:
```
├── processes/
│   ├── ProcessListPage.tsx
│   ├── ProcessModelerPage.tsx
│   ├── ProcessInstancesPage.tsx
│   └── ProcessMonitorPage.tsx
```

Thêm vào `apps/web/src/api/`:
```
└── processes.api.ts
```

---

### Requirements Mapping — BPM Module

| User Story | Module/File |
|---|---|
| Admin tạo/edit BPMN process definition | `definitions/` + `ProcessModelerPage.tsx` |
| Admin publish definition (DRAFT→ACTIVE) | `PATCH /definitions/:id/status` |
| PM start process instance | `instances/` + `ProcessListPage.tsx` |
| PM gắn process với dự án | `ProcessInstance.projectId` |
| PM monitor instance đang chạy | `ProcessMonitorPage.tsx` + token overlay |
| Member nhận và hoàn thành user task | `user-tasks/` + `UserTaskList.tsx` |
| Timer deadline tự động fire | `timers/` + BullMQ `process-timers` queue |
| Audit trail mọi activity | `ProcessActivityLog` model |

---

### Risks & Mitigations

| Risk | Mitigation |
|---|---|
| `bpmn-engine` state lost khi restart | Bắt buộc serialize `tokenState` sau mỗi transition (xem Process Patterns) |
| BPMN XML XSS nếu render trực tiếp | `bpmn-js` viewer sanitize nội dung; KHÔNG render XML thô vào DOM |
| Version conflict (instance chạy trên definition cũ) | Snapshot bpmnXml vào `ProcessInstance` tại thời điểm start |
| BullMQ timer drift | Dùng `delay` + `removeOnComplete` — không cần precision cao (deadline alert ± vài giây là đủ) |

---

### Implementation Handoff — BPM Module

**AI Agent Guidelines (bổ sung):**
- Tuân thủ TẤT CẢ patterns từ phần "Implementation Patterns & Consistency Rules" gốc
- `bpmn-engine` là dependency mới duy nhất của backend — install trước khi implement `engine/`
- `bpmn-js` là dependency mới duy nhất của web — setup `BpmnModeler.tsx` wrapper trước khi implement pages
- **CRITICAL:** Serialize `tokenState` sau MỖI token movement — không dựa vào in-memory state
- **CRITICAL:** OrgScopeGuard bắt buộc trên tất cả process endpoints — không exception
- `process-timers` queue tách biệt với `alert-queue` — đăng ký riêng trong `processes.module.ts`

**Implementation Sequence (BPM epic):**
```
Bước 1: Install bpmn-engine (backend) + bpmn-js (web)
Bước 2: Prisma migration — 4 models mới
Bước 3: ProcessDefinition CRUD (definitions/ + API endpoints)
Bước 4: BpmnEngineService — wrap bpmn-engine, implement state persistence
Bước 5: ProcessInstance lifecycle (start, suspend, cancel)
Bước 6: ProcessUserTask — assignment, claim, complete
Bước 7: TimerEventService — BullMQ timer boundary events
Bước 8: ProcessMonitorService — token state queries
Bước 9: Frontend — BpmnModeler.tsx wrapper component
Bước 10: Frontend — 4 pages (List, Modeler, Instances, Monitor)
Bước 11: Notification integration — alert khi user task được assign
```

---

## Amendment 2026-05-26: Bug & Issue Tracking Module

### Tổng quan

Bổ sung module **Bug & Issue Tracking** cho phép bất kỳ user nào log bug gắn với project và task(s), đính kèm ảnh, và theo dõi lifecycle qua workflow đơn giản. Module này thêm một service mới (MinIO) vào Docker Compose và một NestJS module mới `bugs/`, không thay đổi bất kỳ module nào đã có.

**Người dùng chính:**
- **Mọi role** — tạo bug, xem bug của mình
- **Assignee** — nhận và resolve bug được giao
- **PM** — assign, cancel, quản lý toàn bộ bug trong project
- **Leadership / Admin** — xem dashboard thống kê toàn hệ thống

---

### Technology Decision: File Storage — MinIO

**Lý do cần MinIO:**
Epic 13 là lần đầu tiên Loop cần lưu binary files (ảnh đính kèm). Cần một storage backend riêng biệt với PostgreSQL.

**Các lựa chọn đã cân nhắc:**

| Option | Ưu | Nhược | Quyết định |
|--------|-----|-------|-----------|
| Local disk (Docker volume) | Đơn giản nhất | Không có API chuẩn, khó backup, khó scale | ❌ |
| External S3/Cloudflare R2 | Managed, không cần ops | Phụ thuộc internet, vi phạm on-premise constraint | ❌ |
| **MinIO** (self-hosted) | On-premise, S3-compatible API, Docker-native, có presigned URL | Thêm Docker service | ✅ |

**Decision:** MinIO — phù hợp on-premise, S3 API chuẩn cho presigned URL, Docker Compose service đơn giản.

**Libraries cần thêm:**
```json
// apps/backend/package.json
"minio": "^8.x.x"        // Official MinIO Node.js SDK (S3-compatible)
```

**Không dùng `@aws-sdk/client-s3`** — MinIO SDK nhỏ hơn, API đơn giản hơn cho use-case presigned URL, không cần AWS credentials format.

---

### Docker Compose Topology — Cập nhật

Docker Compose tăng từ 5 service lên **6 service**:

```
Nginx (80/443)
  ├── /api/*   → backend:3000  (NestJS)
  └── /*       → web:5173      (React Vite)

PostgreSQL 18   (internal: 5432)
Redis 7         (internal: 6379)
MinIO           (internal: 9000)   ← MỚI — object storage cho bug attachments
```

**MinIO Docker Compose config:**
```yaml
minio:
  image: minio/minio:latest
  command: server /data
  environment:
    MINIO_ROOT_USER: ${MINIO_ROOT_USER}
    MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
  volumes:
    - minio_data:/data
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
  # KHÔNG expose port ra ngoài — chỉ backend truy cập internal
  networks:
    - internal

# Bucket init: dùng mc (MinIO Client) one-shot container
minio-init:
  image: minio/mc:latest
  depends_on:
    minio:
      condition: service_healthy
  entrypoint: >
    /bin/sh -c "
      mc alias set local http://minio:9000 $$MINIO_ROOT_USER $$MINIO_ROOT_PASSWORD;
      mc mb --ignore-existing local/loop-bug-attachments;
      mc anonymous set none local/loop-bug-attachments;
    "
  networks:
    - internal
```

**Biến môi trường mới trong `.env.example`:**
```
MINIO_ROOT_USER=loopminiouser
MINIO_ROOT_PASSWORD=loopminiopassword
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_BUCKET_BUGS=loop-bug-attachments
```

**QUAN TRỌNG:** MinIO không expose port ra host. Chỉ `backend` service có thể kết nối tới `minio:9000` qua internal Docker network. Presigned URL được generate bởi backend và trả về client — client download trực tiếp qua Nginx proxy (cần thêm Nginx route `/storage/*` → `minio:9000`).

**Nginx update — thêm MinIO proxy route:**
```nginx
# Presigned URL download route — Nginx forward to MinIO
location /storage/ {
    proxy_pass http://minio:9000/;
    proxy_set_header Host minio:9000;
}
```
Presigned URL format: `https://loop.local/storage/loop-bug-attachments/{bugId}/{uuid}.{ext}?X-Amz-Signature=...`

---

### Module Structure: `bugs/`

Đặt tại `apps/backend/src/modules/bugs/` — theo đúng pattern 8 domain modules hiện tại.

```
src/modules/bugs/
├── bugs.module.ts
├── bugs.controller.ts              ← CRUD, transition, assign, task links
├── bugs.service.ts                 ← business logic, state machine, notifications
├── bug-attachment.service.ts       ← MinIO integration (upload/presign/delete)
├── bug-stats.service.ts            ← aggregation queries cho dashboard
├── dto/
│   ├── create-bug.dto.ts
│   ├── update-bug.dto.ts
│   ├── transition-bug.dto.ts       ← { toStatus: BugStatus }
│   ├── assign-bug.dto.ts           ← { assigneeId: string }
│   └── bug-filter.dto.ts           ← query params cho GET /bugs
└── bugs.controller.spec.ts
```

**Thứ tự implement trong module:** `bugs.service` → `bugs.controller` → `bug-attachment.service` → `bug-stats.service`

---

### Prisma Schema — 2 Enums + 3 Models mới

Thêm vào `apps/backend/prisma/schema.prisma`:

```prisma
// --- Enums ---

enum BugSeverity { CRITICAL HIGH MEDIUM LOW }
enum BugStatus   { OPEN IN_PROGRESS RESOLVED CLOSED CANCELLED }

// --- Models ---

model Bug {
  id          String        @id @default(cuid())
  projectId   String
  project     Project       @relation(fields: [projectId], references: [id])
  title       String        @db.VarChar(200)
  description String?       @db.Text
  severity    BugSeverity   @default(MEDIUM)
  status      BugStatus     @default(OPEN)
  reporterId  String
  reporter    User          @relation("BugReporter", fields: [reporterId], references: [id])
  assigneeId  String?
  assignee    User?         @relation("BugAssignee", fields: [assigneeId], references: [id])
  resolvedAt  DateTime?
  closedAt    DateTime?
  tasks       BugTask[]
  attachments BugAttachment[]
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  @@index([projectId, status])          // idx_bugs_project_status
  @@index([assigneeId, status])         // idx_bugs_assignee_status
  @@index([severity, createdAt])        // idx_bugs_severity_created — sort mặc định
}

model BugTask {
  bugId   String
  bug     Bug    @relation(fields: [bugId], references: [id], onDelete: Cascade)
  taskId  String
  task    Task   @relation(fields: [taskId], references: [id], onDelete: Cascade)
  @@id([bugId, taskId])                 // composite PK
}

model BugAttachment {
  id           String   @id @default(cuid())
  bugId        String
  bug          Bug      @relation(fields: [bugId], references: [id], onDelete: Cascade)
  fileName     String
  fileSize     Int                              // bytes
  mimeType     String                           // image/*
  storagePath  String                           // MinIO object key: {bugId}/{uuid}.{ext}
  uploadedById String
  uploadedBy   User     @relation(fields: [uploadedById], references: [id])
  createdAt    DateTime @default(now())
  @@index([bugId])                      // idx_bug_attachments_bug_id
}
```

**Thêm relations vào models hiện tại:**
```prisma
// model User — thêm:
reportedBugs    Bug[]  @relation("BugReporter")
assignedBugs    Bug[]  @relation("BugAssignee")
bugAttachments  BugAttachment[]

// model Project — thêm:
bugs  Bug[]

// model Task — thêm:
bugLinks  BugTask[]
```

---

### API Endpoints — Module `bugs/`

Tuân thủ prefix `/api/v1/` và format response chuẩn. Tất cả endpoints đều có `OrgScopeGuard`.

```
// Bug CRUD & Lifecycle
GET    /api/v1/bugs                              ← list (org-scoped via project JOIN, filters)
POST   /api/v1/bugs                              ← create (bất kỳ role)
GET    /api/v1/bugs/my                           ← assignee = me (sorted CRITICAL first)
GET    /api/v1/bugs/stats                        ← aggregated stats cho dashboard
GET    /api/v1/bugs/:id                          ← detail (tasks[], attachments[], reporter, assignee)
PUT    /api/v1/bugs/:id                          ← update (reporter hoặc PM, chỉ OPEN/IN_PROGRESS)
POST   /api/v1/bugs/:id/transition               ← đổi status { toStatus }
PUT    /api/v1/bugs/:id/assign                   ← assign { assigneeId } (PM only)

// Task Links
POST   /api/v1/bugs/:id/tasks                    ← link task { taskId }
DELETE /api/v1/bugs/:id/tasks/:taskId            ← unlink task (min 1 task must remain)

// Attachments
POST   /api/v1/bugs/:id/attachments              ← upload ảnh (multipart/form-data)
GET    /api/v1/bugs/:id/attachments/:attId/url   ← presigned GET URL (TTL 1h)
DELETE /api/v1/bugs/:id/attachments/:attId       ← delete (uploader hoặc PM)
```

---

### OrgScope Pattern cho Bug — QUAN TRỌNG

Bug không có `orgUnitId` trực tiếp — scope được tính qua project:

```typescript
// BugsService — LUÔN dùng pattern này để filter:
const bugs = await prisma.bug.findMany({
  where: {
    project: {
      orgUnitId: { in: orgUnitIds }  // JOIN Bug → Project → orgUnitId
    },
    // ... other filters
  }
});

// KHÔNG BAO GIỜ query Bug trực tiếp mà không có project orgUnit filter
// KHÔNG BAO GIỜ dùng bug.projectId rồi check orgUnit sau — phải filter ở DB level
```

**Khác với pattern task:** `Task` có `projectId` và được filter `WHERE tasks.project.orgUnitId IN (...)`. Bug cùng pattern — nhất quán.

---

### Bug State Machine — Transition Matrix

```typescript
// bugs.service.ts — PHẢI implement chính xác bảng này
const VALID_TRANSITIONS: Record<BugStatus, BugStatus[]> = {
  OPEN:        [BugStatus.IN_PROGRESS, BugStatus.CANCELLED],
  IN_PROGRESS: [BugStatus.RESOLVED, BugStatus.CANCELLED],
  RESOLVED:    [BugStatus.CLOSED, BugStatus.OPEN],      // OPEN = reporter re-opens
  CLOSED:      [],                                        // terminal — không thể chuyển
  CANCELLED:   [],                                        // terminal — không thể chuyển
};

// Role constraints cho transition:
// OPEN → IN_PROGRESS:   assignee hoặc PM
// IN_PROGRESS → RESOLVED: assignee hoặc PM
// RESOLVED → CLOSED:    reporter hoặc PM
// RESOLVED → OPEN:      reporter only (re-open nếu không hài lòng)
// Any → CANCELLED:      PM only

// Side effects bắt buộc:
// → RESOLVED: set resolvedAt = now()
// → CLOSED:   set closedAt = now()
// → RESOLVED/CLOSED/CANCELLED: trigger notification cho reporter (Story 13.9)
```

---

### File Upload Pattern — Chi tiết

```typescript
// bugs.controller.ts — file upload endpoint
@Post(':id/attachments')
@UseInterceptors(FileInterceptor('file'))   // multer built-in NestJS
async uploadAttachment(
  @Param('id') bugId: string,
  @UploadedFile() file: Express.Multer.File,
  @CurrentUser() user: JwtPayload,
) { ... }

// bug-attachment.service.ts — MinIO integration
async uploadToMinio(bugId: string, file: Express.Multer.File): Promise<string> {
  const ext = path.extname(file.originalname);
  const objectKey = `${bugId}/${randomUUID()}${ext}`;
  await this.minioClient.putObject(
    this.bucket,
    objectKey,
    file.buffer,
    file.size,
    { 'Content-Type': file.mimetype }
  );
  return objectKey;  // storagePath lưu vào BugAttachment.storagePath
}

async getPresignedUrl(storagePath: string): Promise<string> {
  // TTL 3600 giây = 1 giờ
  return this.minioClient.presignedGetObject(this.bucket, storagePath, 3600);
}
```

**Validation order (Controller level, trước khi gọi MinIO):**
1. Check bug tồn tại và thuộc org scope
2. Check `file.mimetype.startsWith('image/')` → 400 nếu không phải ảnh
3. Check `file.size <= 10 * 1024 * 1024` (10MB) → 400 nếu vượt
4. Check `attachments count < 5` → 400 nếu đã đủ
5. Upload MinIO → lưu DB (trong transaction — nếu DB fail, object MinIO phải được xóa)

```typescript
// Rollback pattern nếu DB insert fail:
let objectKey: string | null = null;
try {
  objectKey = await this.bugAttachmentService.uploadToMinio(bugId, file);
  await prisma.bugAttachment.create({ data: { bugId, storagePath: objectKey, ... } });
} catch (err) {
  if (objectKey) await this.bugAttachmentService.deleteFromMinio(objectKey);
  throw err;
}
```

---

### Bug Statistics Query Strategy

Endpoint `GET /api/v1/bugs/stats` trả về 5 loại aggregation. Một số cần Prisma `$queryRaw`:

```typescript
// byStatus, bySeverity — dùng prisma.bug.groupBy (đơn giản)
const bySeverity = await prisma.bug.groupBy({
  by: ['severity'],
  where: { project: { orgUnitId: { in: orgUnitIds } }, ...filters },
  _count: { id: true },
});

// trend — cần DATE_TRUNC, dùng $queryRaw
const trend = await prisma.$queryRaw`
  SELECT
    DATE_TRUNC('day', "createdAt")::date AS date,
    COUNT(*) FILTER (WHERE "status" != 'CANCELLED') AS created,
    COUNT(*) FILTER (WHERE "status" = 'RESOLVED' OR "status" = 'CLOSED') AS resolved
  FROM bugs b
  JOIN projects p ON b."projectId" = p.id
  WHERE p."orgUnitId" = ANY(${orgUnitIds}::text[])
    AND b."createdAt" >= NOW() - INTERVAL '30 days'
  GROUP BY 1
  ORDER BY 1 ASC
`;

// openByProject — prisma.bug.groupBy với _count + include project name
// openByTask — JOIN qua BugTask, groupBy taskId, top 10
```

**KHÔNG dùng `$queryRaw` cho queries đơn giản** — chỉ dùng khi `groupBy` cần SQL function (`DATE_TRUNC`, `FILTER`).

---

### Integration với Loop hiện tại

| Điểm tích hợp | Mô tả | Pattern |
|---|---|---|
| `OrgScopeGuard` | `Bug` scope qua `Bug.project.orgUnitId IN orgUnitIds[]` | JOIN filter — xem OrgScope Pattern phần trên |
| `Project` model | `Bug.projectId → Project.id`; task validation cần `task.projectId == bug.projectId` | FK + check |
| `Task` model | `BugTask` join table; khi Task bị xóa → cascade delete `BugTask` | Cascade FK |
| `Notification` (Epic 7) | `BugsService` gọi `NotificationDeliveryService.sendInApp()` khi: assign, status change, Critical | Inject service |
| `TelegramService` (Epic 11) | `BugsService` gọi `TelegramService.sendMessage()` khi Critical bug tạo mới; nếu Telegram chưa config → skip silently | Optional call, try/catch |
| `AlertScheduler` (Epic 7) | Không tích hợp — bugs không dùng BullMQ scheduler; notifications gửi ngay (synchronous) | N/A |

**Notification types mới cần thêm vào `NotificationDeliveryService`:**
```typescript
// Thêm vào notification type constants (packages/shared hoặc alerts module):
BUG_ASSIGNED      = 'BUG_ASSIGNED'
BUG_STATUS_CHANGED = 'BUG_STATUS_CHANGED'
BUG_CRITICAL      = 'BUG_CRITICAL'
```

---

### Frontend Structure — Bổ sung

**3 trang mới:**
```
apps/web/src/pages/
├── bugs/
│   ├── BugListPage.tsx          ← /bugs — global bug management
│   ├── MyBugsPage.tsx           ← /my-bugs — personal bug list
│   └── BugDashboardPage.tsx     ← /bugs/dashboard — charts + stats
```

**Components mới:**
```
apps/web/src/components/bugs/
├── BugCreateDrawer.tsx          ← form tạo bug (Ant Design Drawer 560px)
├── BugDetailDrawer.tsx          ← xem/edit bug detail + action buttons
├── BugSeverityBadge.tsx         ← severity badge (Critical/High/Medium/Low + color UX-DR11)
├── BugStatusTag.tsx             ← status tag (Open/In Progress/Resolved/Closed/Cancelled)
└── BugAttachmentGallery.tsx     ← thumbnail gallery + presigned URL download
```

**API hooks mới:**
```
apps/web/src/api/
└── bugs.api.ts                  ← TanStack Query hooks: useGetBugs, useGetMyBugs,
                                    useCreateBug, useTransitionBug, useGetBugStats,
                                    useUploadBugAttachment, useGetAttachmentUrl
```

**Sidebar navigation cập nhật:**
```typescript
// Thêm 2 menu item vào sidebar:
{ path: '/my-bugs',        label: 'My Bugs',    icon: <BugOutlined /> }
{ path: '/bugs',           label: 'Quản lý Bug', icon: <BugFilled /> }
```

---

### Directory Structure — Bổ sung vào Project Structure

Thêm vào `apps/backend/src/modules/`:
```
├── bugs/                          ← Bug & Issue Tracking (Amendment 2026-05-26)
│   ├── bugs.module.ts
│   ├── bugs.controller.ts
│   ├── bugs.service.ts
│   ├── bug-attachment.service.ts
│   ├── bug-stats.service.ts
│   └── dto/
│       ├── create-bug.dto.ts
│       ├── update-bug.dto.ts
│       ├── transition-bug.dto.ts
│       ├── assign-bug.dto.ts
│       └── bug-filter.dto.ts
```

Thêm vào `apps/web/src/pages/`:
```
├── bugs/
│   ├── BugListPage.tsx
│   ├── MyBugsPage.tsx
│   └── BugDashboardPage.tsx
```

Thêm vào `apps/web/src/api/`:
```
└── bugs.api.ts
```

---

### Requirements Mapping — Bug Module

| User Story | Module/File |
|---|---|
| Tạo bug với project, task(s), severity | `bugs.controller.ts POST /bugs` + `BugCreateDrawer.tsx` |
| Bug lifecycle transitions | `bugs.service.ts` (state machine) + `BugDetailDrawer.tsx` |
| Đính kèm ảnh | `bug-attachment.service.ts` + MinIO + `BugAttachmentGallery.tsx` |
| My Bugs view | `GET /bugs/my` + `MyBugsPage.tsx` |
| Global bug management | `GET /bugs` + `BugListPage.tsx` |
| Bug dashboard stats | `bug-stats.service.ts` + `BugDashboardPage.tsx` |
| Notifications (assign, resolve, critical) | `bugs.service.ts` → `NotificationDeliveryService` |
| Telegram push (Critical) | `bugs.service.ts` → `TelegramService` (Epic 11) |

---

### Risks & Mitigations

| Risk | Mitigation |
|---|---|
| MinIO data lost khi container restart | Docker volume `minio_data` persists data; backup chung với pg_dump strategy |
| Presigned URL expire (1h) khi user copy link | Frontend auto-refresh URL khi mở attachment gallery (re-fetch presigned URL on mount) |
| MinIO bucket không tồn tại khi backend start | `minio-init` service trong Docker Compose chạy trước `backend`, đảm bảo bucket tồn tại |
| Orphan MinIO objects (DB insert fail) | Rollback pattern: xóa MinIO object nếu DB transaction fail (xem File Upload Pattern) |
| Bug CRITICAL trigger Telegram khi Epic 11 chưa deploy | `try/catch` quanh TelegramService call; fail silently, log warning |
| $queryRaw SQL injection trong stats query | Dùng Prisma template literals (`$queryRaw\`...\``) — không concat string trực tiếp |

---

### Process Patterns — Quy tắc bắt buộc cho AI Agents (Bug Module)

**OrgScope — BẮT BUỘC:**
```typescript
// LUÔN filter Bug qua project.orgUnitId — không filter bug trực tiếp theo user.orgUnitId
where: { project: { orgUnitId: { in: orgUnitIds } } }
```

**State Machine — BẮT BUỘC:**
```typescript
// TRƯỚC KHI transition: kiểm tra VALID_TRANSITIONS[currentStatus].includes(toStatus)
// Nếu không hợp lệ: throw UnprocessableEntityException (422)
// KHÔNG implement if/else logic riêng lẻ — dùng VALID_TRANSITIONS map
```

**File Upload — BẮT BUỘC:**
```typescript
// Thứ tự validation: orgScope → mimeType → fileSize → attachmentCount → upload MinIO → insert DB
// Nếu DB fail sau khi upload MinIO: deleteFromMinio(objectKey) trước khi throw
// KHÔNG lưu file binary vào PostgreSQL — chỉ lưu storagePath (string)
```

**Notification — BẮT BUỘC:**
```typescript
// Gọi NotificationDeliveryService synchronously trong bugs.service.ts
// Không enqueue vào BullMQ — bug notifications là immediate, không phải scheduled
// TelegramService call phải wrapped trong try/catch — không để Telegram failure block bug create
```

---

### Implementation Sequence — Bug Module

```
Bước 1: Cài thư viện minio npm package (apps/backend)
Bước 2: Cập nhật docker-compose.yml — thêm minio + minio-init services
Bước 3: Prisma migration — 2 enums + 3 models + relations vào User/Project/Task
Bước 4: BugAttachmentService — MinIO client setup, upload, presign, delete
Bước 5: BugsService — CRUD, state machine, OrgScope filter
Bước 6: BugsController — tất cả endpoints
Bước 7: BugStatsService — aggregation queries (groupBy + $queryRaw cho trend)
Bước 8: Frontend — BugSeverityBadge + BugStatusTag (atomic components)
Bước 9: Frontend — BugCreateDrawer + BugDetailDrawer
Bước 10: Frontend — BugListPage (/bugs)
Bước 11: Frontend — MyBugsPage (/my-bugs)
Bước 12: Frontend — BugDashboardPage (/bugs/dashboard)
Bước 13: Notification integration — BUG_ASSIGNED, BUG_STATUS_CHANGED, BUG_CRITICAL
Bước 14: Telegram integration — Critical bug push (epic 11 TelegramService)
```

---

## Amendment 2026-05-27: Epic 15 — Authorization & Permission Management

### Bối cảnh

Hệ thống hiện tại chỉ có **coarse-grained role check** (`RolesGuard` check `user.role ∈ allowedRoles[]`). Org-scoped access (NFR-02) chưa được implement dù đã thiết kế trong kiến trúc gốc. Epic 15 bổ sung 3 lớp phân quyền đầy đủ.

---

### Mô hình 3 Lớp

```
REQUEST
   │
[Layer 1] JwtAuthGuard         → Ai đang gọi? (đã có)
   │
[Layer 2] PermissionGuard      → Người này có phép làm việc này không?
   │         @RequirePermission('tasks:approve')
   │
[Layer 3] OrgScopeService      → Dữ liệu nào người này được nhìn thấy?
              (inject vào Service layer, filter WHERE clause)
```

---

### Prisma Schema — Bảng mới

```prisma
model Permission {
  code        String   @id             // "tasks:approve", "reports:export"
  module      String                   // "tasks", "reports", "projects"
  action      String                   // "read","create","update","delete","approve","export"
  description String?
  createdAt   DateTime @default(now()) @map("created_at")

  rolePermissions RolePermission[]
  userPermissions UserPermission[]

  @@map("permissions")
}

model RolePermission {
  role           Role
  permissionCode String       @map("permission_code")
  permission     Permission   @relation(fields: [permissionCode], references: [code], onDelete: Cascade)
  createdAt      DateTime     @default(now()) @map("created_at")

  @@id([role, permissionCode])
  @@map("role_permissions")
}

model UserPermission {
  userId         String
  permissionCode String    @map("permission_code")
  granted        Boolean   @default(true)   // true=grant thêm, false=revoke khỏi role default
  createdAt      DateTime  @default(now())  @map("created_at")

  user       User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  permission Permission @relation(fields: [permissionCode], references: [code], onDelete: Cascade)

  @@id([userId, permissionCode])
  @@map("user_permissions")
}
```

**Thêm vào model User:**
```prisma
userPermissions UserPermission[]
```

---

### Permission Codes (định nghĩa trong code)

File: `apps/backend/src/permissions/permissions.constants.ts`

| Module | Codes |
|--------|-------|
| `projects` | `projects:read`, `projects:create`, `projects:update`, `projects:delete` |
| `tasks` | `tasks:read`, `tasks:create`, `tasks:update`, `tasks:delete`, `tasks:approve` |
| `employees` | `employees:read`, `employees:create`, `employees:update`, `employees:delete` |
| `reports` | `reports:read`, `reports:export` |
| `timesheets` | `timesheets:read`, `timesheets:approve` |
| `timelogs` | `timelogs:create`, `timelogs:update` |
| `bugs` | `bugs:read`, `bugs:create`, `bugs:update`, `bugs:assign`, `bugs:close` |
| `issues` | `issues:read`, `issues:create`, `issues:update`, `issues:approve` |
| `bpm` | `bpm:read`, `bpm:manage` |
| `alerts` | `alerts:read`, `alerts:configure` |
| `dashboard` | `dashboard:read` |
| `admin` | `admin:users`, `admin:org`, `admin:permissions` |

---

### Default Role → Permission Mapping (seeded to DB)

| Permission | ADMIN | LEADERSHIP | PM | MEMBER |
|------------|:-----:|:----------:|:--:|:------:|
| projects:read | ✅ | ✅ | ✅ | ✅ |
| projects:create/update/delete | ✅ | ❌ | ✅ | ❌ |
| tasks:read/create/update | ✅ | ✅ | ✅ | ✅ |
| tasks:delete | ✅ | ❌ | ✅ | ❌ |
| tasks:approve | ✅ | ✅ | ✅ | ❌ |
| employees:read | ✅ | ✅ | ✅ | ✅ |
| employees:create/update/delete | ✅ | ❌ | ❌ | ❌ |
| reports:read | ✅ | ✅ | ✅ | ❌ |
| reports:export | ✅ | ✅ | ✅ | ❌ |
| timesheets:approve | ✅ | ✅ | ✅ | ❌ |
| bugs:read/create/update | ✅ | ✅ | ✅ | ✅ |
| bugs:assign/close | ✅ | ✅ | ✅ | ❌ |
| issues:approve | ✅ | ✅ | ✅ | ❌ |
| bpm:manage | ✅ | ❌ | ✅ | ❌ |
| alerts:configure | ✅ | ✅ | ✅ | ❌ |
| admin:* | ✅ | ❌ | ❌ | ❌ |

---

### OrgScopeService

```typescript
// apps/backend/src/common/services/org-scope.service.ts

@Injectable()
export class OrgScopeService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  // Trả về: null = no filter (ADMIN), string[] = orgUnitIds được phép
  async getVisibleOrgUnitIds(user: User): Promise<string[] | null> {
    if (user.role === Role.ADMIN) return null;

    const cacheKey = `orgscope:${user.id}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const ids = await this.collectSubtreeIds(user.orgUnitId);
    await this.redis.setex(cacheKey, 600, JSON.stringify(ids));
    return ids;
  }

  private async collectSubtreeIds(rootId: string | null): Promise<string[]> {
    if (!rootId) return [];
    // Recursive CTE qua Prisma $queryRaw
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      WITH RECURSIVE subtree AS (
        SELECT id FROM org_units WHERE id = ${rootId}
        UNION ALL
        SELECT o.id FROM org_units o
        JOIN subtree s ON o.parent_id = s.id
      )
      SELECT id FROM subtree
    `;
    return rows.map(r => r.id);
  }
}
```

**Quy tắc org scope theo role:**
- `ADMIN` → `null` (no filter)
- `LEADERSHIP` → subtree của `user.orgUnitId`
- `PM` → subtree của `user.orgUnitId`
- `MEMBER` → `[user.orgUnitId]` (chỉ unit của mình)

**Áp dụng trong Service layer (pattern bắt buộc):**
```typescript
// Trong mọi service trả danh sách data
async findAll(user: User) {
  const orgIds = await this.orgScopeService.getVisibleOrgUnitIds(user);
  const where = orgIds ? { orgUnitId: { in: orgIds } } : {};
  return this.prisma.project.findMany({ where });
}
```

**Cache invalidation:**
- Khi OrgUnit structure thay đổi: xóa toàn bộ `orgscope:*`
- Khi User.orgUnitId thay đổi: xóa `orgscope:{userId}`

---

### PermissionsService

```typescript
// apps/backend/src/permissions/permissions.service.ts

@Injectable()
export class PermissionsService {
  async userHasPermission(userId: string, role: Role, code: string): Promise<boolean> {
    const cacheKey = `perm:${userId}`;
    let effective = await this.getEffectiveFromCache(userId);
    if (!effective) {
      effective = await this.computeEffective(userId, role);
      await this.redis.setex(cacheKey, 300, JSON.stringify(effective));
    }
    return effective.includes(code);
  }

  private async computeEffective(userId: string, role: Role): Promise<string[]> {
    // 1. Lấy role permissions
    const rolePerms = await this.prisma.rolePermission.findMany({ where: { role } });
    const base = new Set(rolePerms.map(p => p.permissionCode));

    // 2. Áp dụng user overrides
    const overrides = await this.prisma.userPermission.findMany({ where: { userId } });
    for (const o of overrides) {
      if (o.granted) base.add(o.permissionCode);
      else base.delete(o.permissionCode);
    }
    return [...base];
  }
}
```

---

### PermissionGuard

```typescript
// apps/backend/src/common/guards/permission.guard.ts

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionsService: PermissionsService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const code = this.reflector.getAllAndOverride<string>(PERMISSION_KEY, [
      ctx.getHandler(), ctx.getClass(),
    ]);
    if (!code) return true;

    const { user } = ctx.switchToHttp().getRequest();
    const allowed = await this.permissionsService.userHasPermission(user.id, user.role, code);
    if (!allowed) throw new ForbiddenException('Không có quyền thực hiện thao tác này');
    return true;
  }
}

// Decorator:
export const PERMISSION_KEY = 'permission';
export const RequirePermission = (code: string) => SetMetadata(PERMISSION_KEY, code);
```

---

### API Endpoints mới

```
GET    /api/v1/permissions                     ← list all permission codes (ADMIN)
GET    /api/v1/permissions/roles/:role         ← get role's current permissions
PUT    /api/v1/permissions/roles/:role         ← update role permissions (ADMIN)
GET    /api/v1/permissions/users/:id           ← user's effective permissions + overrides
POST   /api/v1/permissions/users/:id/grant     ← grant specific permission to user (ADMIN)
DELETE /api/v1/permissions/users/:id/:code     ← revoke specific permission from user (ADMIN)
```

**GET /api/v1/auth/me** — bổ sung trường `permissions: string[]` vào response.

---

### Frontend Permission Gate

```typescript
// packages/shared/src/permissions.ts
export const PERMISSIONS = { ... } as const;  // same codes

// apps/web/src/hooks/usePermissions.ts
export function usePermissions() {
  const { data: me } = useQuery({ queryKey: ['me'] });
  return {
    can: (code: string) => me?.permissions?.includes(code) ?? false,
  };
}

// Sử dụng:
const { can } = usePermissions();
{can('tasks:approve') && <Button>Duyệt Task</Button>}
```

---

### Cấu trúc file mới

```
apps/backend/src/
├── permissions/
│   ├── permissions.module.ts
│   ├── permissions.service.ts
│   ├── permissions.controller.ts
│   ├── permissions.constants.ts   ← all PERM codes + default mappings
│   └── dto/
│       ├── update-role-permissions.dto.ts
│       └── grant-user-permission.dto.ts
├── common/
│   ├── guards/
│   │   └── permission.guard.ts    ← NEW
│   ├── decorators/
│   │   └── require-permission.decorator.ts  ← NEW
│   └── services/
│       └── org-scope.service.ts   ← NEW

apps/web/src/
├── hooks/
│   └── usePermissions.ts          ← NEW
├── components/
│   └── auth/
│       └── CanDo.tsx              ← NEW: <CanDo permission="...">
└── pages/
    └── settings/
        └── PermissionsPage.tsx    ← NEW: Admin UI
```

---

### Cache Strategy

| Cache key | TTL | Invalidate khi |
|-----------|-----|----------------|
| `perm:{userId}` | 5 phút | Role thay đổi, user permission update |
| `orgscope:{userId}` | 10 phút | OrgUnit structure thay đổi, user orgUnitId thay đổi |

---

### Quyết định kiến trúc

| # | Quyết định | Lựa chọn | Lý do |
|---|------------|----------|-------|
| ARCH-020 | Permission storage | DB-driven (seed defaults) | Admin chỉnh runtime không cần redeploy |
| ARCH-021 | Org scope granularity | Role-based scope (no extra table) | 4 roles đủ dùng, tránh over-engineering |
| ARCH-022 | Permission library | Custom (no CASL) | Stack đơn giản hơn, AI maintain dễ hơn |
| ARCH-023 | Org scope enforcement | Service layer (không phải Guard) | Guard không có context về entity cụ thể |
| ARCH-024 | Permission cache | Redis 5 phút | Tránh query DB mỗi request |

---

## Amendment 2026-05-27 (bổ sung): ERP-Ready Permission System

### Lý do bổ sung

Thiết kế ban đầu (35 permission codes + `enum Role`) không scale khi Loop nâng cấp lên ERP với 20+ module. Cần **Dual-Track RBAC** để tránh breaking change lớn sau này.

---

### Vấn đề với thiết kế gốc

| Vấn đề | Hệ quả |
|--------|--------|
| `enum Role` có domain roles (HR_MANAGER, FINANCE_ACCOUNTANT...) | Enum toàn cục trộn domain, phải migration mỗi module mới |
| User chỉ có 1 role | Nhân viên vừa là PM vừa là HR Manager → không biểu diễn được |
| Permission codes không có domain namespace | `payroll:approve` hay `hr:payroll_approve`? — inconsistency |

---

### Dual-Track RBAC

```
User
  ├── role: SystemRole (enum, giữ nguyên)    ← Track 1: global, org scope
  └── moduleRoles: UserModuleRole[]          ← Track 2: domain-specific
        └── ModuleRole (DB, per domain)
              └── ModuleRolePermission[]
                    └── Permission (code: {domain_module}:action)
```

**Track 1 — System Role (enum, không thay đổi):**
Dùng cho: org scope rule, coarse-grained system access, backward compat.
```
ADMIN      → all access
LEADERSHIP → view org subtree, read aggregates
PM         → manage projects/tasks in subtree
MEMBER     → own data only
```
*Rule: KHÔNG thêm domain role vào enum này.*

**Track 2 — Module Role (DB-driven):**
Mỗi ERP module tự định nghĩa roles khi ra mắt:
```
Domain "hr":
  hr:manager    → hr_employee:*, hr_payroll:read, hr_leave:approve
  hr:recruiter  → hr_recruitment:*, hr_employee:read

Domain "finance":
  finance:accountant → finance_expense:*, finance_invoice:read
  finance:manager    → tất cả finance permissions

Domain "crm":
  crm:sales    → crm_leads:create, crm_deals:update
  crm:manager  → tất cả crm permissions
```

---

### Permission Code Convention (chuẩn ERP)

Format: `{domain_module}:action`
- Dùng `_` để phân tách sub-module trong domain
- Không dùng 3-part (quá phức tạp khi lookup)

| Domain | Module | Example codes |
|--------|--------|---------------|
| core | tasks | `tasks:approve`, `tasks:create` |
| core | projects | `projects:read`, `projects:delete` |
| hr | employee | `hr_employee:read`, `hr_employee:create` |
| hr | payroll | `hr_payroll:approve`, `hr_payroll:view` |
| hr | leave | `hr_leave:approve`, `hr_leave:request` |
| finance | expense | `finance_expense:approve`, `finance_expense:create` |
| finance | invoice | `finance_invoice:create`, `finance_invoice:void` |
| finance | budget | `finance_budget:view`, `finance_budget:adjust` |
| crm | leads | `crm_leads:create`, `crm_leads:assign` |
| crm | contracts | `crm_contracts:sign`, `crm_contracts:view` |

*Hiện tại (v1): chỉ có core domain codes. Codes ERP được thêm khi module tương ứng ra.*

---

### Schema bổ sung (Dual-Track)

```prisma
// Track 2: DB-driven module roles
model ModuleRole {
  code        String   @id             // "hr:manager", "finance:accountant"
  name        String                   // "HR Manager", "Kế toán"
  domain      String                   // "hr", "finance", "crm", "operations"
  description String?
  isSystem    Boolean  @default(false) // system roles: không xóa được

  permissions ModuleRolePermission[]
  userRoles   UserModuleRole[]

  @@map("module_roles")
}

model ModuleRolePermission {
  roleCode       String     @map("role_code")
  permissionCode String     @map("permission_code")
  createdAt      DateTime   @default(now()) @map("created_at")

  role       ModuleRole @relation(fields: [roleCode], references: [code], onDelete: Cascade)
  permission Permission @relation(fields: [permissionCode], references: [code], onDelete: Cascade)

  @@id([roleCode, permissionCode])
  @@map("module_role_permissions")
}

model UserModuleRole {
  userId    String   @map("user_id")
  roleCode  String   @map("role_code")
  createdAt DateTime @default(now()) @map("created_at")

  user User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  role ModuleRole @relation(fields: [roleCode], references: [code], onDelete: Cascade)

  @@id([userId, roleCode])
  @@map("user_module_roles")
}
```

**Thêm vào model User:**
```prisma
moduleRoles UserModuleRole[]
```

---

### Effective Permissions — 3 Sources

```typescript
async computeEffective(userId: string, systemRole: Role): Promise<string[]> {
  const set = new Set<string>();

  // Source 1: System role permissions (enum → role_permissions)
  const sysPerms = await this.prisma.rolePermission.findMany({
    where: { role: systemRole },
  });
  sysPerms.forEach(p => set.add(p.permissionCode));

  // Source 2: Module role permissions (UserModuleRole → ModuleRolePermission)
  const modPerms = await this.prisma.moduleRolePermission.findMany({
    where: {
      role: { userRoles: { some: { userId } } },
    },
  });
  modPerms.forEach(p => set.add(p.permissionCode));

  // Source 3: User-level overrides (UserPermission — last wins)
  const overrides = await this.prisma.userPermission.findMany({ where: { userId } });
  overrides.forEach(o => o.granted ? set.add(o.permissionCode) : set.delete(o.permissionCode));

  return [...set];
}
```

**Cache invalidation cho Track 2:**
- Khi `UserModuleRole` thêm/xóa → xóa `perm:{userId}`
- Khi `ModuleRolePermission` thay đổi → xóa `perm:*` của tất cả users có module role đó

---

### Admin API endpoints bổ sung (Track 2)

```
GET    /api/v1/permissions/module-roles                ← list all module roles
POST   /api/v1/permissions/module-roles                ← create module role (ADMIN)
PUT    /api/v1/permissions/module-roles/:code          ← update module role permissions
DELETE /api/v1/permissions/module-roles/:code          ← delete non-system module role
GET    /api/v1/permissions/users/:id/module-roles      ← user's current module roles
POST   /api/v1/permissions/users/:id/module-roles      ← assign module role to user
DELETE /api/v1/permissions/users/:id/module-roles/:code ← remove module role from user
```

**GET /auth/me** bổ sung thêm `moduleRoles: string[]` vào response.

---

### Quyết định kiến trúc bổ sung

| # | Quyết định | Lựa chọn | Lý do |
|---|------------|----------|-------|
| ARCH-025 | ERP role strategy | Dual-Track RBAC | Tách system role (enum, stable) và domain role (DB, extensible) |
| ARCH-026 | User có nhiều roles | UserModuleRole (many-to-many) | PM vừa là HR Manager → cần multi-role |
| ARCH-027 | Permission code namespace | `{domain_module}:action` (2-part) | Đủ phân biệt, không phức tạp hóa thành 3-part |
| ARCH-028 | Module role scope | Global (không per-org-unit) | Org scope đã được OrgScopeService xử lý riêng |
