import { PrismaService } from '../../prisma/prisma.service';

/**
 * Lấy tất cả orgUnitId trong cây con (subtree) của một đơn vị — bao gồm chính nó.
 * Load toàn bộ org units một lần rồi BFS trong memory.
 */
export async function getOrgSubtreeIds(
  prisma: PrismaService,
  orgUnitId: string,
): Promise<string[]> {
  const allUnits = await prisma.orgUnit.findMany({
    select: { id: true, parentId: true },
  });

  const ids = new Set<string>([orgUnitId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const unit of allUnits) {
      if (unit.parentId && ids.has(unit.parentId) && !ids.has(unit.id)) {
        ids.add(unit.id);
        changed = true;
      }
    }
  }

  return [...ids];
}

/**
 * Lấy tất cả employeeId thuộc subtree của một đơn vị tổ chức.
 * Dùng để filter trực tiếp trên FK employeeId thay vì relation filter.
 */
export async function getEmployeeIdsInOrgSubtree(
  prisma: PrismaService,
  orgUnitId: string,
): Promise<string[]> {
  const orgIds = await getOrgSubtreeIds(prisma, orgUnitId);
  const employees = await prisma.employee.findMany({
    where: { orgUnitId: { in: orgIds } },
    select: { id: true },
  });
  return employees.map((e) => e.id);
}
