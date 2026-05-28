# Story 13.1: Bug Schema & MinIO Setup

Status: ready

## Story

As a developer,
I want the Bug domain models added to Prisma schema and MinIO configured in Docker Compose,
So that all subsequent Bug stories have a stable data foundation and file storage available.

## Acceptance Criteria

1. `docker-compose.yml` có thêm service `minio` (image `minio/minio`) và `minio-init` (image `minio/mc`) — MinIO không expose port ra ngoài host.
2. `infra/nginx/nginx.conf` có thêm location block `/storage/` proxy tới `minio:9000`.
3. `volumes:` section trong `docker-compose.yml` có thêm `minio_data`.
4. Prisma schema có 2 enums mới: `BugSeverity` và `BugStatus`.
5. Prisma schema có 3 models mới: `Bug`, `BugTask`, `BugAttachment` với đầy đủ fields, indexes, và relations theo spec.
6. `NotificationType` enum có thêm 3 values: `BUG_ASSIGNED`, `BUG_STATUS_CHANGED`, `BUG_CRITICAL`.
7. Model `User` có thêm relations `reportedBugs` và `assignedBugs` và `bugAttachments`.
8. Model `Project` có thêm relation `bugs Bug[]`.
9. Model `Task` có thêm relation `bugLinks BugTask[]`.
10. `npx prisma db push` chạy thành công.
11. `npx prisma generate` thành công — Prisma Client có types cho 3 models mới.
12. Backend TypeScript compile không lỗi (`cd apps/backend && npx tsc --noEmit`).

## Tasks / Subtasks

- [ ] Task 1: Cập nhật `docker-compose.yml` — thêm MinIO services và volume (AC: 1, 3)
  - [ ] Thêm service `minio` với image `minio/minio`, volume, healthcheck, env vars
  - [ ] Thêm service `minio-init` với image `minio/mc`, depends_on minio healthy
  - [ ] Thêm `minio_data:` vào `volumes:` section
  - [ ] Thêm env vars MinIO vào service `backend`: `MINIO_ENDPOINT`, `MINIO_PORT`, `MINIO_USE_SSL`, `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`, `MINIO_BUCKET_BUGS`

- [ ] Task 2: Cập nhật `infra/nginx/nginx.conf` — thêm MinIO proxy route (AC: 2)
  - [ ] Thêm `location /storage/` block proxy tới `http://minio:9000/`

- [ ] Task 3: Thêm 2 enums vào Prisma schema (AC: 4)
  - [ ] Thêm `BugSeverity { CRITICAL HIGH MEDIUM LOW }`
  - [ ] Thêm `BugStatus { OPEN IN_PROGRESS RESOLVED CLOSED CANCELLED }`

- [ ] Task 4: Thêm 3 values vào `NotificationType` enum (AC: 6)
  - [ ] Thêm `BUG_ASSIGNED`, `BUG_STATUS_CHANGED`, `BUG_CRITICAL`

- [ ] Task 5: Thêm model `Bug` vào Prisma schema (AC: 5)
  - [ ] Thêm model với đầy đủ fields theo Dev Notes

- [ ] Task 6: Thêm model `BugTask` vào Prisma schema (AC: 5)
  - [ ] Thêm join table với composite PK `(bugId, taskId)`
  - [ ] Cascade delete trên cả hai FKs

- [ ] Task 7: Thêm model `BugAttachment` vào Prisma schema (AC: 5)
  - [ ] Thêm model với storagePath (MinIO object key)

- [ ] Task 8: Thêm relations ngược vào models hiện có (AC: 7, 8, 9)
  - [ ] `model User`: thêm `reportedBugs`, `assignedBugs`, `bugAttachments`
  - [ ] `model Project`: thêm `bugs Bug[]`
  - [ ] `model Task`: thêm `bugLinks BugTask[]`

- [ ] Task 9: Chạy Prisma push và generate (AC: 10, 11)
  - [ ] `cd apps/backend && npx prisma db push`
  - [ ] `npx prisma generate`

- [ ] Task 10: Verify TypeScript compile (AC: 12)
  - [ ] `cd apps/backend && npx tsc --noEmit`

## Dev Notes

### docker-compose.yml — Thêm vào section `services:`

```yaml
  minio:
    image: minio/minio:latest
    command: server /data
    environment:
      - MINIO_ROOT_USER=${MINIO_ROOT_USER:-loopminio}
      - MINIO_ROOT_PASSWORD=${MINIO_ROOT_PASSWORD:-loopminio123}
    volumes:
      - minio_data:/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    expose:
      - "9000"

  minio-init:
    image: minio/mc:latest
    depends_on:
      minio:
        condition: service_healthy
    entrypoint: >
      /bin/sh -c "
        mc alias set local http://minio:9000 $${MINIO_ROOT_USER:-loopminio} $${MINIO_ROOT_PASSWORD:-loopminio123};
        mc mb --ignore-existing local/loop-bug-attachments;
        mc anonymous set none local/loop-bug-attachments;
        exit 0;
      "
    restart: on-failure
```

### docker-compose.yml — Thêm `minio_data:` vào `volumes:`

```yaml
volumes:
  postgres_data:
  redis_data:
  minio_data:
```

### docker-compose.yml — Thêm env vars vào service `backend`

```yaml
      - MINIO_ENDPOINT=minio
      - MINIO_PORT=9000
      - MINIO_USE_SSL=false
      - MINIO_ROOT_USER=${MINIO_ROOT_USER:-loopminio}
      - MINIO_ROOT_PASSWORD=${MINIO_ROOT_PASSWORD:-loopminio123}
      - MINIO_BUCKET_BUGS=loop-bug-attachments
```

### infra/nginx/nginx.conf — Thêm location block

Thêm TRƯỚC `location /api/` block:

```nginx
    location /storage/ {
        proxy_pass         http://minio:9000/;
        proxy_set_header   Host minio:9000;
        proxy_buffering    off;
    }
```

### Prisma Schema — Enums mới (thêm vào section BPM ở cuối file)

Thêm NGAY SAU section `// ─── BPM ───`:

```prisma
// ─── Bug & Issue Tracking ────────────────────────────────────────────────────

enum BugSeverity {
  CRITICAL
  HIGH
  MEDIUM
  LOW
}

enum BugStatus {
  OPEN
  IN_PROGRESS
  RESOLVED
  CLOSED
  CANCELLED
}
```

### Prisma Schema — Thêm vào `NotificationType` enum

Tìm `enum NotificationType` (line ~350) và thêm 3 values trước dấu `}`:

```prisma
  BUG_ASSIGNED
  BUG_STATUS_CHANGED
  BUG_CRITICAL
```

### Prisma Schema — Models mới (thêm sau enums BugStatus)

```prisma
model Bug {
  id          String      @id @default(uuid())
  projectId   String      @map("project_id")
  title       String      @db.VarChar(200)
  description String?     @db.Text
  severity    BugSeverity @default(MEDIUM)
  status      BugStatus   @default(OPEN)
  reporterId  String      @map("reporter_id")
  assigneeId  String?     @map("assignee_id")
  resolvedAt  DateTime?   @map("resolved_at")
  closedAt    DateTime?   @map("closed_at")
  createdAt   DateTime    @default(now()) @map("created_at")
  updatedAt   DateTime    @updatedAt @map("updated_at")

  project     Project       @relation(fields: [projectId], references: [id], onDelete: Cascade)
  reporter    User          @relation("BugReporter", fields: [reporterId], references: [id])
  assignee    User?         @relation("BugAssignee", fields: [assigneeId], references: [id])
  tasks       BugTask[]
  attachments BugAttachment[]

  @@index([projectId, status])
  @@index([assigneeId, status])
  @@index([severity, createdAt])
  @@map("bugs")
}

model BugTask {
  bugId  String @map("bug_id")
  taskId String @map("task_id")

  bug  Bug  @relation(fields: [bugId], references: [id], onDelete: Cascade)
  task Task @relation(fields: [taskId], references: [id], onDelete: Cascade)

  @@id([bugId, taskId])
  @@map("bug_tasks")
}

model BugAttachment {
  id           String   @id @default(uuid())
  bugId        String   @map("bug_id")
  fileName     String   @map("file_name")
  fileSize     Int      @map("file_size")
  mimeType     String   @map("mime_type")
  storagePath  String   @map("storage_path")
  uploadedById String   @map("uploaded_by_id")
  createdAt    DateTime @default(now()) @map("created_at")

  bug        Bug  @relation(fields: [bugId], references: [id], onDelete: Cascade)
  uploadedBy User @relation("BugAttachmentUploader", fields: [uploadedById], references: [id])

  @@index([bugId])
  @@map("bug_attachments")
}
```

### Prisma Schema — Relations ngược thêm vào models hiện có

**Trong `model User`** (line ~12) — thêm vào cuối block relations, trước `@@map`:
```prisma
  reportedBugs     Bug[]          @relation("BugReporter")
  assignedBugs     Bug[]          @relation("BugAssignee")
  bugAttachments   BugAttachment[] @relation("BugAttachmentUploader")
```

**Trong `model Project`** (line ~127) — thêm sau `processInstances ProcessInstance[]`:
```prisma
  bugs             Bug[]
```

**Trong `model Task`** (line ~191) — thêm sau `telegramMessages TelegramMessage[]`:
```prisma
  bugLinks         BugTask[]
```

### References

- `docker-compose.yml` — root của project
- `infra/nginx/nginx.conf` — nginx config
- `apps/backend/prisma/schema.prisma` — Prisma schema
- `NotificationType` enum: line ~350 của schema
- Model `User`: line ~12; `Project`: line ~127; `Task`: line ~191
