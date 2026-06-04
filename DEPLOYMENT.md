# Loop — Hướng dẫn Deploy (Go-live)

> Pipeline: [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) — build image → push GHCR → SSH vào server → backup DB → cập nhật schema → `docker compose up` → healthcheck readiness → rollback nếu fail.
> Kích hoạt **thủ công** (Actions → Deploy → Run workflow) hoặc gắn **tag `v*`**.

---

## 1. ✅ Đồng bộ schema khi deploy (đã xử lý)

**Bối cảnh:** history migration bị drift → `prisma migrate deploy` THẤT BẠI trên DB mới
(migration `process_workflow_integration` lỗi `relation "process_definitions" does not exist`).

**Đã chọn hướng B (an toàn):** `entrypoint.sh` dùng `prisma db push` (KHÔNG `--accept-data-loss`):
- Thay đổi **additive** (thêm bảng/cột/index — gồm index go-live) → áp **tự động** mỗi lần deploy.
- Thay đổi **phá hủy** (drop) → **LỖI an toàn**, container thoát (KHÔNG âm thầm mất dữ liệu).
  Khi gặp: người vận hành xem diff (`prisma migrate diff`), backup, rồi quyết định thủ công.

> Đánh đổi: bỏ history/rollback theo từng migration. Khi product ổn định, có thể chuyển lại
> migration sạch bằng cách **baseline**: tạo init migration từ DB prod + `prisma migrate resolve --applied`.

> Index go-live nằm trong `schema.prisma` (db push tự tạo). Muốn tạo **không khóa bảng** trên DB
> đang chạy: `psql "$DATABASE_URL" -f apps/backend/prisma/scripts/golive-composite-indexes.sql` (CONCURRENTLY).

---

## 2. GitHub Secrets cần đặt (Settings → Secrets and variables → Actions)

| Secret | Mô tả |
|---|---|
| `DEPLOY_HOST` | IP/hostname server đích |
| `DEPLOY_USER` | user SSH (vd `deploy`) |
| `DEPLOY_SSH_KEY` | private key SSH (PEM) |
| `DEPLOY_PATH` | thư mục chứa `docker-compose.yml` + `.env` trên server |

GHCR dùng `GITHUB_TOKEN` sẵn có — không cần thêm.

---

## 3. Chuẩn bị server (1 lần)

- Cài **Docker + Docker Compose**.
- Có `docker-compose.yml` + `scripts/db-backup.sh` + file `.env` tại `DEPLOY_PATH`.
- **`.env` production phải có secret MẠNH** (app từ chối boot nếu yếu — xem mục 4):
  ```bash
  JWT_SECRET=$(openssl rand -hex 32)
  JWT_REFRESH_SECRET=$(openssl rand -hex 32)
  MINIO_SECRET_KEY=$(openssl rand -hex 24)
  POSTGRES_PASSWORD=<mật khẩu mạnh>
  NODE_ENV=production
  DEPLOYMENT_MODE=saas        # hoặc onprem nếu single-tenant
  TENANT_ENFORCEMENT=true
  CORS_ORIGIN=https://<domain-that-that>
  MINIO_PUBLIC_URL=https://<domain>/storage
  ```
- Compose backend trỏ image `ghcr.io/<owner>/<repo>/backend:latest` (đăng nhập GHCR nếu repo private).

---

## 4. Chốt an toàn đã có sẵn (không cần làm gì thêm)

- **Secret yếu → KHÔNG boot:** `env-validation` chặn khởi động ở `NODE_ENV=production` nếu JWT/JWT_REFRESH/MINIO secret là giá trị mặc định/yếu/<32 ký tự.
- **Liveness/Readiness:** `GET /health/liveness` (process) + `/health/readiness` (DB) — pipeline dùng readiness để healthcheck; cấu hình orchestrator probe 2 path này.
- **Backup trước deploy:** pipeline gọi `scripts/db-backup.sh` trước khi đổi schema, fail thì dừng.

---

## 5. Trình tự go-live đề xuất

1. Xử lý **BLOCKER mục 1** (baseline migration).
2. Đặt secrets (mục 2) + chuẩn bị server (mục 3) với secret mạnh.
3. Deploy **staging** trước (`workflow_dispatch` → environment=staging), smoke test.
4. Áp index: `psql "$DATABASE_URL" -f apps/backend/prisma/scripts/golive-composite-indexes.sql`.
5. **Load test ≥500 user** + **pen-test cross-tenant** (cổng cuối, xem `_bmad-output/planning-artifacts/go-live-readiness-2026-06.md`).
6. Deploy **production** + theo dõi readiness/health.

---

## 6. Giám sát (Observability)

- **Prometheus**: scrape `GET /metrics` (public, không auth — giới hạn ở tầng network/ingress).
  Có sẵn: `http_requests_total{route,status}`, `http_request_duration_seconds` (histogram →
  p50/p95/p99 qua `histogram_quantile`), `nodejs_heap_used_bytes`, `process_uptime_seconds`.
  Dựng Grafana dashboard: request rate, error rate (status≥500), latency p95/p99 per route.
- **Health**: `GET /api/v1/admin/health` (ADMIN) — DB/Redis/queue depth/storage/env. Probe hạ tầng:
  `GET /health/liveness` + `GET /health/readiness` (public).
- **Background jobs**: số job failed hiển thị ở `/admin/health` (queues). DLQ đầy đủ (re-queue) =
  hạng mục follow-up; hiện job giữ `removeOnFail: 100` để điều tra.

## 7. Backup

- **Theo lịch**: `.github/workflows/backup.yml` — cron hằng ngày SSH chạy `scripts/db-backup.sh`
  (giữ 15 bản). Dùng chung secrets DEPLOY_*. Production nâng cao: upload object storage hoặc
  snapshot managed Postgres.
- **Trước mỗi deploy**: pipeline `deploy.yml` tự `db-backup.sh` trước khi đổi schema (fail thì dừng).
