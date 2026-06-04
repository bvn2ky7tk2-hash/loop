# Load Test — Loop (cổng go-live)

Đo throughput/latency/error dưới tải. Hai công cụ:
- **`k6-load-test.js`** — chuẩn công nghiệp, quy mô lớn (khuyến nghị cho go-live).
- **`smoke-load.mjs`** — Node thuần, chạy ngay không cần cài gì (smoke nhanh).

## ⚠️ Bắt buộc: TẮT throttle khi load test

App có rate-limit per-tenant + per-route (`@Throttle`) cho production → tải từ **1 nguồn** sẽ dính `429` ngay.
Khi load test, chạy backend với cờ **`DISABLE_THROTTLE=1`** (CHỈ môi trường kiểm soát, KHÔNG dùng prod):

```bash
# Build rồi chạy 1 instance riêng để load test
cd apps/backend && npx nest build
PORT=3100 DISABLE_THROTTLE=1 node dist/src/main
```

## Chạy smoke (Node)

```bash
BASE_URL=http://localhost:3100 CONCURRENCY=50 DURATION_SEC=20 \
  node apps/backend/test/load/smoke-load.mjs
```

## Chạy k6 (go-live)

```bash
brew install k6   # nếu chưa có
k6 run -e BASE_URL=http://localhost:3100 -e VUS=200 -e DURATION=2m \
  apps/backend/test/load/k6-load-test.js
# Đa-tenant: thêm -e MULTITENANT=1 (cần test-a/test-b + login subdomain)
```

Thresholds k6: `http_req_failed < 2%`, `p95 < 800ms`, `p99 < 2s`.

## Baseline đã đo (2026-06-04, 1 instance dev, ~1101 user)

| Tải | RPS | p95 | p99 | Lỗi |
|---|---|---|---|---|
| 50 concurrent | 457 | 243ms | 282ms | 0% |
| 100 concurrent | 502 | 500ms | 570ms | 0% |

- Nhanh: dashboards + finance-analytics ~85ms (cache hiệu quả).
- Chậm nhất: list `/users` (293ms), `/employees` (237ms) — ứng viên tối ưu nếu cần.
- 1 instance dev bão hòa ~500 RPS. **≥500 user đồng thời → scale ngang 3–5 instance** (stateless + chỉnh `DB_POOL_MAX` theo số instance; xem `.env.example`).

## Cổng go-live còn lại
Chạy lại trên **staging** (cấu hình giống prod, nhiều instance) với k6 VUS≥500; theo dõi p95/error + DB connections. Kèm pen-test cross-tenant.
