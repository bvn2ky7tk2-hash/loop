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

export function validateEnv(): { ok: boolean; issues: EnvIssue[] } {
  const issues: EnvIssue[] = [];

  for (const check of ENV_CHECKS) {
    const value = process.env[check.key];
    if (!value || value.trim() === '') {
      issues.push({ key: check.key, level: check.level, description: check.description });
    }
  }

  const hasCritical = issues.some((i) => i.level === 'CRITICAL');

  // Log to console so issues appear at startup even before logger is ready
  if (hasCritical) {
    console.error('[EnvValidation] CRITICAL env vars missing — application may not function correctly');
  }

  return { ok: !hasCritical, issues };
}
