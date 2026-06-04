/* eslint-disable */
// Load test đa-tenant cho Loop (k6). Cổng go-live: đo throughput/latency/error dưới tải.
//
// Cài k6:  brew install k6   (hoặc https://k6.io/docs/get-started/installation)
// Chạy:
//   THROTTLE_GLOBAL_LIMIT=100000 trên backend (xem README) rồi:
//   k6 run -e BASE_URL=http://localhost:3000 -e VUS=200 -e DURATION=2m apps/backend/test/load/k6-load-test.js
//
// Tài khoản: mặc định dùng admin tenant gốc. Đa-tenant: -e MULTITENANT=1 (cần test-a/test-b + subdomain).

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.BASE_URL || 'http://localhost:3000';
const VUS = parseInt(__ENV.VUS || '100', 10);
const DURATION = __ENV.DURATION || '60s';
const MULTITENANT = __ENV.MULTITENANT === '1';

export const options = {
  scenarios: {
    ramp: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '20s', target: VUS },
        { duration: DURATION, target: VUS },
        { duration: '10s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.02'],                 // <2% lỗi
    http_req_duration: ['p(95)<800', 'p(99)<2000'], // p95<800ms, p99<2s
  },
};

// Endpoint NÓNG (đọc), không thuộc prefix module bị tắt ở tenant test → tránh 403 nhiễu.
const ENDPOINTS = [
  '/api/v1/dashboard/finance',
  '/api/v1/dashboard/people',
  '/api/v1/dashboard/work',
  '/api/v1/projects?page=1&limit=20',
  '/api/v1/users?page=1&limit=20',
  '/api/v1/employees?page=1&limit=20',
  '/api/v1/finance/analytics/summary',
  '/api/v1/tenants',
];

function login(email, password, host) {
  const headers = { 'Content-Type': 'application/json' };
  if (host) headers['x-forwarded-host'] = host;
  const res = http.post(`${BASE}/api/v1/auth/login`, JSON.stringify({ email, password }), { headers });
  const token = res.status === 200 ? res.json('access_token') : null;
  if (!token) throw new Error(`Login ${email} fail: ${res.status} ${String(res.body).slice(0, 200)}`);
  return token;
}

export function setup() {
  const tenants = [{ token: login('admin@loop.vn', 'admin') }];
  if (MULTITENANT) {
    tenants.push({ token: login('admin@test-a.vn', 'admin', 'test-a.localhost') });
    tenants.push({ token: login('admin@test-b.vn', 'admin', 'test-b.localhost') });
  }
  return { tenants };
}

export default function (data) {
  const t = data.tenants[Math.floor(Math.random() * data.tenants.length)];
  const ep = ENDPOINTS[Math.floor(Math.random() * ENDPOINTS.length)];
  const res = http.get(`${BASE}${ep}`, {
    headers: { Authorization: `Bearer ${t.token}` },
    tags: { endpoint: ep.split('?')[0] },
  });
  check(res, { 'status 2xx/3xx': (r) => r.status < 400 });
  sleep(Math.random() * 0.4 + 0.1);
}
