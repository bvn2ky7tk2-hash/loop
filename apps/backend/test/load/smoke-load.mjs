#!/usr/bin/env node
// Smoke load test bằng Node thuần (không cần k6) — kiểm nhanh latency/throughput cục bộ.
// Dùng k6-load-test.js cho load test go-live thật (quy mô lớn hơn).
//
// Chạy (NÂNG throttle backend trước — xem README):
//   node apps/backend/test/load/smoke-load.mjs
// Tham số qua env: BASE_URL, CONCURRENCY, DURATION_SEC, LOGIN_EMAIL, LOGIN_PASS

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const CONCURRENCY = parseInt(process.env.CONCURRENCY || '30', 10);
const DURATION = parseInt(process.env.DURATION_SEC || '15', 10);
const EMAIL = process.env.LOGIN_EMAIL || 'admin@loop.vn';
const PASS = process.env.LOGIN_PASS || 'admin';

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

const pct = (arr, p) => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return Math.round(s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]);
};

async function login() {
  const r = await fetch(`${BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASS }),
  });
  const j = await r.json().catch(() => ({}));
  if (!j.access_token) throw new Error(`Login fail: ${r.status} ${JSON.stringify(j).slice(0, 200)}`);
  return j.access_token;
}

const samples = [];
let stop = false;

async function worker(token) {
  while (!stop) {
    const ep = ENDPOINTS[(Math.random() * ENDPOINTS.length) | 0];
    const t0 = performance.now();
    let status = 0;
    try {
      const r = await fetch(`${BASE}${ep}`, { headers: { Authorization: `Bearer ${token}` } });
      status = r.status;
      await r.text();
    } catch {
      status = 0;
    }
    samples.push({ ep: ep.split('?')[0], ms: performance.now() - t0, status });
  }
}

(async () => {
  console.log(`Đăng nhập ${EMAIL}…`);
  const token = await login();
  console.log(`Load: ${CONCURRENCY} concurrent × ${DURATION}s → ${BASE}\n`);
  setTimeout(() => (stop = true), DURATION * 1000);
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker(token)));

  const total = samples.length;
  const errs = samples.filter((s) => s.status === 0 || s.status >= 400);
  const t429 = samples.filter((s) => s.status === 429).length;
  const all = samples.map((s) => s.ms);
  console.log('═══ TỔNG ═══');
  console.log(`Requests: ${total} | RPS: ${(total / DURATION).toFixed(1)} | Lỗi: ${errs.length} (${((errs.length / total) * 100).toFixed(1)}%)${t429 ? ` | 429(throttle): ${t429}` : ''}`);
  const maxMs = all.reduce((m, v) => (v > m ? v : m), 0);
  console.log(`Latency ms — p50: ${pct(all, 50)} | p95: ${pct(all, 95)} | p99: ${pct(all, 99)} | max: ${Math.round(maxMs)}\n`);

  console.log('═══ THEO ENDPOINT (p95 ms) ═══');
  const byEp = {};
  for (const s of samples) (byEp[s.ep] ??= []).push(s);
  for (const [ep, arr] of Object.entries(byEp).sort((a, b) => pct(b[1].map((x) => x.ms), 95) - pct(a[1].map((x) => x.ms), 95))) {
    const ms = arr.map((x) => x.ms);
    const e = arr.filter((x) => x.status === 0 || x.status >= 400).length;
    console.log(`  ${ep.padEnd(38)} n=${String(arr.length).padStart(5)}  p50=${String(pct(ms, 50)).padStart(5)}  p95=${String(pct(ms, 95)).padStart(5)}  lỗi=${e}`);
  }
})().catch((e) => {
  console.error('LỖI:', e.message);
  process.exit(1);
});
