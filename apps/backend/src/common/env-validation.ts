export interface EnvCheck {
  key: string;
  level: 'CRITICAL' | 'WARNING' | 'INFO';
  description: string;
}

export interface EnvIssue {
  key: string;
  level: 'CRITICAL' | 'WARNING' | 'INFO';
  description: string;
}

const ENV_CHECKS: EnvCheck[] = [
  { key: 'DATABASE_URL', level: 'CRITICAL', description: 'PostgreSQL connection' },
  { key: 'JWT_SECRET', level: 'CRITICAL', description: 'JWT signing key' },
  { key: 'JWT_REFRESH_SECRET', level: 'CRITICAL', description: 'JWT refresh signing key' },
  { key: 'REDIS_URL', level: 'WARNING', description: 'Redis for caching/queues' },
  { key: 'MINIO_ENDPOINT', level: 'WARNING', description: 'MinIO object storage' },
  { key: 'MINIO_PUBLIC_URL', level: 'WARNING', description: 'MinIO public URL cho presigned (thiếu → lộ URL nội bộ)' },
  { key: 'CORS_ORIGIN', level: 'WARNING', description: 'CORS allowlist (thiếu → fallback localhost)' },
  { key: 'SMTP_HOST', level: 'INFO', description: 'Email delivery' },
  { key: 'TELEGRAM_BOT_TOKEN', level: 'INFO', description: 'Telegram integration' },
];

// Giá trị secret ví dụ/mặc định yếu — KHÔNG được phép dùng ở production.
const WEAK_SECRETS = new Set([
  'change_me_in_production',
  'change_refresh_in_production',
  'change_me_in_production_32chars_min',
  'change_refresh_in_production_32chars',
  'loop_minio',
  'loop_minio_secret',
  'loop_password',
  'secret',
  'changeme',
]);

// Secret bắt buộc MẠNH ở production (đủ dài + không phải giá trị mặc định yếu).
const STRONG_SECRET_KEYS: { key: string; minLen: number }[] = [
  { key: 'JWT_SECRET', minLen: 32 },
  { key: 'JWT_REFRESH_SECRET', minLen: 32 },
];

export function validateEnv(): { ok: boolean; issues: EnvIssue[] } {
  const issues: EnvIssue[] = [];
  const isProd = process.env.NODE_ENV === 'production';

  for (const check of ENV_CHECKS) {
    const value = process.env[check.key];
    if (!value || value.trim() === '') {
      issues.push({ key: check.key, level: check.level, description: check.description });
    }
  }

  // Ở PRODUCTION: secret phải đủ mạnh — chặn boot với giá trị mặc định/yếu/ngắn.
  if (isProd) {
    for (const { key, minLen } of STRONG_SECRET_KEYS) {
      const v = (process.env[key] ?? '').trim();
      if (!v) continue; // đã báo missing ở trên
      if (WEAK_SECRETS.has(v)) {
        issues.push({ key, level: 'CRITICAL', description: `${key} đang dùng giá trị mặc định/yếu — đặt secret ngẫu nhiên (openssl rand -hex 32)` });
      } else if (v.length < minLen) {
        issues.push({ key, level: 'CRITICAL', description: `${key} quá ngắn (<${minLen} ký tự) — không an toàn cho production` });
      }
    }

    // MinIO: nếu dùng storage mà secret yếu/thiếu → CRITICAL ở production.
    const minioConfigured = !!(process.env.MINIO_ENDPOINT ?? '').trim();
    const minioSecret = (process.env.MINIO_SECRET_KEY ?? '').trim();
    if (minioConfigured && (!minioSecret || WEAK_SECRETS.has(minioSecret))) {
      issues.push({ key: 'MINIO_SECRET_KEY', level: 'CRITICAL', description: 'MINIO_SECRET_KEY mặc định/yếu/thiếu ở production — đặt secret mạnh' });
    }
  }

  const hasCritical = issues.some((i) => i.level === 'CRITICAL');

  // Log to console so issues appear at startup even before logger is ready
  if (hasCritical) {
    console.error('[EnvValidation] CRITICAL env vars missing/weak — application may not function correctly');
  }

  return { ok: !hasCritical, issues };
}
