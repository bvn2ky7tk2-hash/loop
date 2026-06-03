# Loop ERP — Đánh giá Sẵn sàng Go-live Thương mại

> **Loại tài liệu:** Architecture / Go-live Readiness Assessment (artifact của quy trình CA)
> **Người đánh giá:** Winston (System Architect)
> **Ngày:** 2026-06-03
> **Phạm vi:** Toàn hệ thống (apps/backend NestJS, apps/web React, hạ tầng) cho mục tiêu vận hành SaaS thương mại.
> **Phương pháp:** Rà soát song song 6 trục (multi-tenancy, security, reliability/ops, performance, testing/quality, tài liệu kiến trúc) + đối chiếu `architecture-audit-2026-06.md`.

---

## 1. Kết luận

> **Nền tảng kiến trúc đã chín (≈production-grade), nhưng phần "thương mại hóa/vận hành" chưa đạt. Loop CHƯA go-live thương mại được — khoảng cách là kỹ thuật vận hành (test, secrets, CI/CD deploy, observability), KHÔNG phải đập đi xây lại.**

Phân biệt cốt lõi: **Architecture ≠ Production-readiness.** Thiết kế multi-tenant (CLS + Prisma `$extends` + fail-closed + audit + quota) đã được hardening (audit 2026-06 đóng 7/7 cụm bảo mật). Cái thiếu là **bằng chứng nó đúng** và **bộ máy để vận hành an toàn**.

**Mức sẵn sàng tổng thể: ~5.5/10 → CHƯA go-live.** Lộ trình P0 ước tính **2–3 tuần**.

---

## 2. Bảng điểm sẵn sàng (đã hiệu chỉnh)

| Trục | Điểm | Trạng thái |
|---|---|---|
| Thiết kế multi-tenant (cơ chế) | 9/10 | ✅ Tốt, đã hardening |
| Bảo mật & authz (cơ chế) | 7.5/10 | 🟡 Tốt, cần siết vài điểm |
| **Kiểm thử / đảm bảo đúng** | **2/10** | 🔴 Chặn go-live |
| **CI/CD & deploy** | **3/10** | 🔴 Chặn go-live |
| **Quản lý secrets** | 4/10 | 🔴 Default yếu |
| Observability (APM/metrics/tracing) | 3/10 | 🟠 Vận hành "mù" |
| Hiệu năng @ scale | 6/10 | 🟠 Hot path ổn, đuôi còn N+1/thiếu index |
| Reliability/ops (process, queue, health) | 7/10 | 🟡 Tốt, thiếu liveness public + DLQ |

---

## 3. Hiệu chỉnh các cảnh báo bị thổi phồng (calibration)

Các phát hiện sau bị báo cáo sai mức độ — ghi lại để tránh phân bổ effort sai:

| Cảnh báo thô | Thực tế (đã verify) | Mức đúng |
|---|---|---|
| "14 `findOne` thiếu `tenantWhere` → rò rỉ chéo tenant CAO" | Prisma extension **tự inject tenantId** vào mọi query (kể cả rewrite `findUnique→findFirst`). Đây là **defense-in-depth còn thiếu**, không phải lỗ hổng đang chảy máu | TRUNG BÌNH |
| "JWT tamper → giả tenant CAO" | `JwtStrategy.validate()` đọc lại tenantId + tokenVersion **tươi từ DB** mỗi request | Thấp/Moot |
| "CSRF CAO" | Cookie `sameSite:'strict'` ở production chặn phần lớn CSRF | Trung bình (nên verify) |

> **Lưu ý:** rủi ro thật nghiêm trọng hơn các điểm lẻ trên — **toàn bộ đảm bảo cách ly tenant đang đặt cược vào 1 file extension mà gần như KHÔNG có test.**

---

## 4. Blockers P0 — Phải xong trước go-live

| # | Vấn đề | Vì sao chặn | Bằng chứng | Effort |
|---|---|---|---|---|
| **P0-1** | **Test ≈ 0%, 0 test cách ly tenant cấp API** | Cả mô hình SaaS dựa vào extension nhưng chỉ có 1 unit test 52 dòng (`tenant-extension.spec.ts`). Không có gì chứng minh "Tenant A không đọc/ghi được dữ liệu Tenant B" | BE 10 spec / 539 file (~1.9%); FE 17 test / 402 file (~4.2%); e2e chỉ "Hello World" | Cao (2–3 tuần) |
| **P0-2** | **CI/CD deploy chỉ là placeholder** | `deploy-backend` = `echo "Deploying..."`; không staging, không rollback → không có đường ra production có kiểm soát | `.github/workflows/backend.yml` | Trung bình |
| **P0-3** | **Secrets có default yếu** | `docker-compose.yml` fallback `JWT_SECRET:-change_me...`; MinIO `config.get('MINIO_SECRET_KEY', 'loop_minio_secret')` | docker-compose.yml; `storage.service.ts` | Thấp (1–2 ngày) |
| **P0-4** | **Health check yêu cầu ADMIN** | Orchestrator (k8s/docker) không probe được liveness/readiness | `health.controller.ts` `@Roles(ADMIN)` | Thấp (~30 phút) |

---

## 5. P1 — Nên fix trong 1–2 tuần đầu

| # | Vấn đề | Ghi chú |
|---|---|---|
| **P1-1** | Defense-in-depth tenant | Thêm `tenantWhere()` cho ~14 `findOne/findFirst`; scope cache `perm:{userId}` → `perm:{tenantId}:{userId}` |
| **P1-2** | Hiệu năng @ scale | ~10 composite index dẫn đầu `tenantId` (bug/payroll/contract/leave/invoice/deal/process_instance); thêm `take` cho list còn thiếu (accounting/interviews/hr-attendance/invoices); `$transaction({timeout})` cho accounting/payroll; cache dashboard KPI |
| **P1-3** | Connection pool @ scale ngang | `DB_POOL_MAX=20 × N instance` dễ vượt `max_connections` Postgres → đặt PgBouncer hoặc tính `pool = max_connections / instances` |
| **P1-4** | Observability tối thiểu | OpenTelemetry/metrics + DLQ cho BullMQ + lịch backup tự động (script `db-backup.sh` đã có, thiếu cron) |
| **P1-5** | Siết chất lượng | FE 372 lỗi eslint đang bị nuốt (`2>/dev/null \|\| true`) → bật gate; BE bật `no-explicit-any` (151 chỗ `as any`); triage 85+ TODO/FIXME |
| **P1-6** | File upload hardening | Validate magic bytes (không chỉ `file.mimetype` do client cấp) |
| **P1-7** | Auth siết nhẹ | Refresh TTL 7d→3d; refresh throttle 20→5/phút; password policy ≥8 + complexity |

---

## 6. Điểm mạnh cần giữ (không động vào)

- **Stack "boring"**: NestJS / Prisma / Postgres / React — ổn định, dễ tuyển người, AI hỗ trợ tốt.
- **Cách ly tenant**: CLS + `$extends` fail-closed; raw SQL có tenant_id tường minh; CLS phủ HTTP + cron (TenantRunner) + BullMQ worker.
- **Nền vận hành**: process guards, `enableShutdownHooks`, health đầy đủ (chỉ thiếu probe public), pino redact secret + correlation id, BullMQ retry/backoff/cleanup, env fail-fast ở production.
- **Provisioning + quota per-tenant** đã có và enforce.

---

## 7. Cổng Go-live (Definition of Done)

- [ ] **P0-1**: ≥1 bộ integration test chứng minh cách ly tenant cấp API (A không truy cập được B) + smoke E2E luồng tiền/lương/chấm công; bật trong CI.
- [ ] **P0-2**: pipeline deploy thật tới staging + production, có rollback.
- [ ] **P0-3**: bỏ mọi secret default; ép `getOrThrow`; secret manager.
- [ ] **P0-4**: `GET /health/liveness` `@Public()`.
- [ ] **Cổng cuối**: load test ≥500 user đồng thời + pen-test cross-tenant.

---

## 8. Trade-offs (góc nhìn kiến trúc sư)

- **Đừng để "perfection" chặn launch.** Hai thứ KHÔNG nhân nhượng: (a) cách ly dữ liệu *có test chứng minh*, (b) đường deploy + rollback an toàn. APM, DLQ, refactor god-service... có thể làm *sau* go-live có kiểm soát (beta khách hàng giới hạn / canary).
- **God services/components** (bpmn-engine 793 LOC, accounting 723, ~13 page FE >700 LOC) là nợ bảo trì, **không** chặn go-live — refactor dần theo Rule of Three.
</content>
