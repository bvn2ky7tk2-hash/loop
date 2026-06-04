import { Test } from '@nestjs/testing';
import { ClsModule, ClsService } from 'nestjs-cls';
import { PrismaService } from '../../prisma/prisma.service';
import { CLS_TENANT_ID } from '../cls/cls-keys';

/**
 * INTEGRATION TEST — Cách ly dữ liệu đa tenant (P0 go-live).
 *
 * Toàn bộ đảm bảo cách ly của Loop đặt cược vào tenant-extension (Prisma $extends)
 * + CLS. Test này CHỨNG MINH bằng DB thật rằng: query dưới context tenant A KHÔNG
 * nhìn thấy dữ liệu tenant B (và ngược lại), create tự gắn đúng tenantId.
 *
 * AN TOÀN: chỉ chạy khi DATABASE_URL trỏ tới DB *test* (chứa "loop_test"/"_test")
 * để KHÔNG đụng dữ liệu dev/production. Tự dọn dẹp ở afterAll.
 * CI: postgres service `loop_test` + DATABASE_URL tương ứng → test chạy & gate.
 */
const dbUrl = process.env.DATABASE_URL ?? '';
const isTestDb = /loop_test|_test(\?|$|\/)/.test(dbUrl);
const d = isTestDb ? describe : describe.skip;

if (!isTestDb) {
  // eslint-disable-next-line no-console
  console.warn(
    '[tenant-isolation] BỎ QUA: cần DATABASE_URL trỏ DB test (vd loop_test). ' +
      'KHÔNG chạy trên dev/prod DB để tránh mất dữ liệu.',
  );
}

d('Tenant isolation (DB thật)', () => {
  let prisma: PrismaService;
  let cls: ClsService;

  const suffix = `${Date.now()}`;
  const A = `test-iso-a-${suffix}`;
  const B = `test-iso-b-${suffix}`;

  const asTenant = <T>(tid: string, fn: () => Promise<T>): Promise<T> =>
    cls.run(async () => {
      cls.set(CLS_TENANT_ID, tid);
      return fn();
    });

  beforeAll(async () => {
    // Bật enforcement (isTenantEnforced đọc env lúc gọi).
    process.env.DEPLOYMENT_MODE = 'saas';
    process.env.TENANT_ENFORCEMENT = 'true';

    const moduleRef = await Test.createTestingModule({
      imports: [ClsModule.forRoot({ global: true })],
      providers: [PrismaService],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    cls = moduleRef.get(ClsService);
    await prisma.onModuleInit();

    // 2 tenant (Tenant KHÔNG tenant-scoped → tạo trực tiếp).
    await prisma.tenant.create({ data: { id: A, name: 'ISO A', slug: A } });
    await prisma.tenant.create({ data: { id: B, name: 'ISO B', slug: B } });
  });

  afterAll(async () => {
    if (!prisma) return;
    // Dọn dẹp tường minh (raw — bỏ qua extension) kể cả khi assertion fail.
    await prisma.$executeRawUnsafe(`DELETE FROM org_units WHERE tenant_id IN ('${A}','${B}')`);
    await prisma.$executeRawUnsafe(`DELETE FROM tenants WHERE id IN ('${A}','${B}')`);
    await prisma.onModuleDestroy();
  });

  it('create KHÔNG kèm tenantId → tự gắn tenantId từ CLS', async () => {
    // LƯU Ý: extension dùng { tenantId, ...create } → tenantId tường minh (nếu có)
    // được GIỮ (chủ định: để provisioning tạo dữ liệu cho tenant khác). Bảo vệ thực
    // tế: DTO không nhận tenantId (ValidationPipe whitelist) nên service không truyền.
    const ou = await asTenant(A, () =>
      prisma.orgUnit.create({ data: { name: 'OU-A', code: `A-${suffix}` } }),
    );
    const [row] = await prisma.$queryRawUnsafe<{ tenant_id: string }[]>(
      `SELECT tenant_id FROM org_units WHERE id = '${ou.id}'`,
    );
    expect(row.tenant_id).toBe(A);
  });

  it('tenant B KHÔNG đọc được dữ liệu tenant A (findMany + findFirst by id)', async () => {
    const ouA = await asTenant(A, () =>
      prisma.orgUnit.create({ data: { name: 'OU-A2', code: `A2-${suffix}` } }),
    );

    // Dưới context B: findMany không chứa bản ghi của A
    const bList = await asTenant(B, () => prisma.orgUnit.findMany());
    expect(bList.find((o) => o.id === ouA.id)).toBeUndefined();

    // Dưới context B: findFirst theo id của A → null (rewrite từ findUnique cũng vậy)
    const bById = await asTenant(B, () => prisma.orgUnit.findFirst({ where: { id: ouA.id } }));
    expect(bById).toBeNull();
    const bUnique = await asTenant(B, () => prisma.orgUnit.findUnique({ where: { id: ouA.id } }));
    expect(bUnique).toBeNull();

    // Dưới context A: vẫn thấy bản ghi của mình
    const aById = await asTenant(A, () => prisma.orgUnit.findFirst({ where: { id: ouA.id } }));
    expect(aById?.id).toBe(ouA.id);
  });

  it('count chỉ đếm dữ liệu của tenant hiện tại (delta độc lập thứ tự test)', async () => {
    const a0 = await asTenant(A, () => prisma.orgUnit.count());
    const b0 = await asTenant(B, () => prisma.orgUnit.count());

    await asTenant(A, () => prisma.orgUnit.create({ data: { name: 'OU-A3', code: `A3-${suffix}` } }));
    await asTenant(A, () => prisma.orgUnit.create({ data: { name: 'OU-A3b', code: `A3b-${suffix}` } }));
    await asTenant(B, () => prisma.orgUnit.create({ data: { name: 'OU-B1', code: `B1-${suffix}` } }));

    // A +2, B +1 — count mỗi bên CHỈ phản ánh thay đổi của chính tenant đó.
    expect(await asTenant(A, () => prisma.orgUnit.count())).toBe(a0 + 2);
    expect(await asTenant(B, () => prisma.orgUnit.count())).toBe(b0 + 1);
  });

  it('update/delete không vượt biên tenant', async () => {
    const ouA = await asTenant(A, () =>
      prisma.orgUnit.create({ data: { name: 'OU-A4', code: `A4-${suffix}` } }),
    );
    // B cố update bản ghi của A → updateMany scoped theo B → 0 dòng bị ảnh hưởng.
    const upd = await asTenant(B, () =>
      prisma.orgUnit.updateMany({ where: { id: ouA.id }, data: { name: 'HACKED' } }),
    );
    expect(upd.count).toBe(0);
    // Bản ghi A giữ nguyên tên.
    const still = await asTenant(A, () => prisma.orgUnit.findFirst({ where: { id: ouA.id } }));
    expect(still?.name).toBe('OU-A4');
  });

  it('deleteMany không xóa được dữ liệu tenant khác', async () => {
    const ouA = await asTenant(A, () =>
      prisma.orgUnit.create({ data: { name: 'OU-A5', code: `A5-${suffix}` } }),
    );
    const del = await asTenant(B, () => prisma.orgUnit.deleteMany({ where: { id: ouA.id } }));
    expect(del.count).toBe(0);
    const still = await asTenant(A, () => prisma.orgUnit.findFirst({ where: { id: ouA.id } }));
    expect(still?.id).toBe(ouA.id);
  });

  it('findFirst theo unique business (code) bị scope tenant — không lộ qua mã trùng', async () => {
    // code unique theo [tenantId, code] → 2 tenant có thể trùng "code", nhưng KHÔNG thấy của nhau.
    const sharedCode = `SHARED-${suffix}`;
    await asTenant(A, () => prisma.orgUnit.create({ data: { name: 'OU-shared-A', code: sharedCode } }));
    await asTenant(B, () => prisma.orgUnit.create({ data: { name: 'OU-shared-B', code: sharedCode } }));

    const seenByA = await asTenant(A, () => prisma.orgUnit.findFirst({ where: { code: sharedCode } }));
    const seenByB = await asTenant(B, () => prisma.orgUnit.findFirst({ where: { code: sharedCode } }));
    expect(seenByA?.name).toBe('OU-shared-A');
    expect(seenByB?.name).toBe('OU-shared-B');
  });

  it('groupBy & aggregate cũng scoped theo tenant', async () => {
    // Mỗi tenant tự gom/nhóm trên dữ liệu của riêng mình.
    const aGroups = await asTenant(A, () => prisma.orgUnit.groupBy({ by: ['tenantId'], _count: { _all: true } }));
    const bGroups = await asTenant(B, () => prisma.orgUnit.groupBy({ by: ['tenantId'], _count: { _all: true } }));
    // Chỉ có đúng 1 nhóm = chính tenant đang xét (không lẫn tenant khác).
    expect(aGroups.every((g) => g.tenantId === A)).toBe(true);
    expect(bGroups.every((g) => g.tenantId === B)).toBe(true);

    const aCount = await asTenant(A, () => prisma.orgUnit.count());
    const aAgg = await asTenant(A, () => prisma.orgUnit.aggregate({ _count: { _all: true } }));
    expect(aAgg._count._all).toBe(aCount);
  });
});
