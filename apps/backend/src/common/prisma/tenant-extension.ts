import { Prisma } from '../../generated/prisma';
import type { ClsService } from 'nestjs-cls';
import { CLS_TENANT_ID } from '../cls/cls-keys';
import { isTenantEnforced } from '../config/tenant.config';

/**
 * Prisma Client Extension — tự động inject `tenantId` vào MỌI query dựa trên
 * tenantId hiện hành trong CLS. Đây là LỚP PHÒNG THỦ 1 (chủ động): service
 * không cần nhớ gọi `tenantWhere()`. Lớp 2 (TenantAwareService.tenantWhere) vẫn
 * giữ nguyên — hai lớp inject cùng `tenantId` nên idempotent, không xung đột.
 *
 * Nguyên tắc FAIL-SAFE (không bao giờ làm vỡ query):
 *  - on-prem / tắt enforcement  → skip (single-tenant)
 *  - model KHÔNG có cột tenantId → skip (đọc từ Prisma.dmmf, không hardcode)
 *  - CLS chưa có tenantId        → skip (background job chưa cls.run, request lạ);
 *    khi đó lớp 2 + runPerTenant(cron) đảm nhận việc lọc.
 */

// Model có field `tenantId` thật trong schema → mới được phép inject.
// Tự suy từ DMMF nên khi Đợt 1 thêm cột tenantId cho model mới, nó tự "kết nạp".
const MODELS_WITH_TENANT: ReadonlySet<string> = new Set(
  Prisma.dmmf.datamodel.models
    .filter((m) => m.fields.some((f) => f.name === 'tenantId'))
    .map((m) => m.name),
);

// Tên khóa unique GHÉP (compound) theo model — vd PayrollRecord: 'periodId_employeeId'.
// findUnique nhận where { periodId_employeeId: { periodId, employeeId } } nhưng findFirst
// KHÔNG hiểu cú pháp này → khi rewrite findUnique→findFirst phải "làm phẳng".
const COMPOUND_KEYS: ReadonlyMap<string, ReadonlySet<string>> = new Map(
  Prisma.dmmf.datamodel.models.map((m) => {
    const keys = new Set<string>();
    if (m.primaryKey && m.primaryKey.fields.length > 1) {
      keys.add(m.primaryKey.name ?? m.primaryKey.fields.join('_'));
    }
    for (const u of m.uniqueIndexes ?? []) {
      if (u.fields.length > 1) keys.add(u.name ?? u.fields.join('_'));
    }
    return [m.name, keys as ReadonlySet<string>] as const;
  }),
);

/** Làm phẳng khóa unique ghép trong `where` để dùng được với findFirst. */
function flattenCompoundWhere(model: string, where: Record<string, unknown>): Record<string, unknown> {
  const compound = COMPOUND_KEYS.get(model);
  if (!compound || compound.size === 0) return where;
  const out: Record<string, unknown> = { ...where };
  for (const key of compound) {
    const val = out[key];
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      Object.assign(out, val as Record<string, unknown>);
      delete out[key];
    }
  }
  return out;
}

const WHERE_OPS = new Set([
  'findFirst', 'findFirstOrThrow', 'findMany',
  'count', 'aggregate', 'groupBy',
  'update', 'updateMany', 'delete', 'deleteMany',
]);
const CREATE_OPS = new Set(['create', 'createMany']);

export function tenantExtension(cls: ClsService) {
  const currentTenant = (): string | undefined => {
    if (!isTenantEnforced()) return undefined;
    if (!cls.isActive()) return undefined;
    return cls.get<string>(CLS_TENANT_ID) ?? undefined;
  };

  return Prisma.defineExtension((client) =>
    client.$extends({
      name: 'tenant-isolation',
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            const tenantId = currentTenant();
            if (!tenantId || !model || !MODELS_WITH_TENANT.has(model)) {
              return query(args);
            }
            // findUnique/findUniqueOrThrow xử lý ở nhánh `model` (rewrite findFirst).
            const a: any = args ?? {};

            if (CREATE_OPS.has(operation)) {
              if (operation === 'createMany') {
                const rows = Array.isArray(a.data) ? a.data : [a.data];
                a.data = rows.map((d: any) => ({ tenantId, ...d }));
              } else {
                a.data = { tenantId, ...(a.data ?? {}) };
              }
              return query(a);
            }

            if (operation === 'upsert') {
              // where của upsert PHẢI là khóa unique — KHÔNG được thêm tenantId
              // (tenantId không thuộc unique selector → Prisma báo invalid).
              // Khóa unique đã định danh đủ; tenantId chỉ cần ở `create`.
              a.create = { tenantId, ...(a.create ?? {}) };
              return query(a);
            }

            if (WHERE_OPS.has(operation)) {
              a.where = { ...(a.where ?? {}), tenantId };
              return query(a);
            }

            return query(args);
          },
        },
      },
      model: {
        $allModels: {
          // findUnique: tenantId KHÔNG thuộc unique selector → REWRITE sang findFirst.
          async findUnique<T, A>(this: T, args: A): Promise<unknown> {
            const ctx = Prisma.getExtensionContext(this) as any;
            const model = ctx.$name as string;
            const tenantId = currentTenant();
            if (!tenantId || !MODELS_WITH_TENANT.has(model)) {
              return ctx.$parent[model].findUnique(args);
            }
            const a: any = args ?? {};
            return ctx.$parent[model].findFirst({
              ...a,
              where: { ...flattenCompoundWhere(model, a.where ?? {}), tenantId },
            });
          },
          async findUniqueOrThrow<T, A>(this: T, args: A): Promise<unknown> {
            const ctx = Prisma.getExtensionContext(this) as any;
            const model = ctx.$name as string;
            const tenantId = currentTenant();
            if (!tenantId || !MODELS_WITH_TENANT.has(model)) {
              return ctx.$parent[model].findUniqueOrThrow(args);
            }
            const a: any = args ?? {};
            return ctx.$parent[model].findFirstOrThrow({
              ...a,
              where: { ...flattenCompoundWhere(model, a.where ?? {}), tenantId },
            });
          },
        },
      },
    }),
  );
}
