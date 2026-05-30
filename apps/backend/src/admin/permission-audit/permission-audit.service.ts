import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PermissionsService } from '../../permissions/permissions.service';
import * as ExcelJS from 'exceljs';

export interface UserPermissionRow {
  userId: string;
  userName: string;
  email: string;
  role: string;
  permissions: string[];
  moduleRoles: string[];
}

@Injectable()
export class PermissionAuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionsService: PermissionsService,
  ) {}

  async getAuditMatrix(tenantId: string | null): Promise<UserPermissionRow[]> {
    const users = await this.prisma.user.findMany({
      where: {
        isActive: true,
        ...(tenantId ? { tenantId } : {}),
      },
      select: { id: true, name: true, email: true, role: true },
      take: 500,
    });

    const results: UserPermissionRow[] = [];

    for (const user of users) {
      const [perms, moduleRoles] = await Promise.all([
        this.permissionsService.getEffectivePermissions(user.id),
        this.permissionsService.getUserModuleRoleCodes(user.id),
      ]);

      results.push({
        userId: user.id,
        userName: user.name,
        email: user.email,
        role: user.role,
        permissions: Array.from(perms).sort(),
        moduleRoles,
      });
    }

    return results;
  }

  async searchByPermission(action: string, tenantId: string | null): Promise<UserPermissionRow[]> {
    const all = await this.getAuditMatrix(tenantId);
    return all.filter((u) =>
      u.permissions.some((p) =>
        p.toLowerCase().includes(action.toLowerCase()),
      ),
    );
  }

  async exportToExcel(tenantId: string | null): Promise<Buffer> {
    const rows = await this.getAuditMatrix(tenantId);

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Phân quyền');

    ws.columns = [
      { header: 'Tên', key: 'name', width: 28 },
      { header: 'Email', key: 'email', width: 32 },
      { header: 'Role hệ thống', key: 'role', width: 16 },
      { header: 'Module Roles', key: 'moduleRoles', width: 30 },
      { header: 'Số quyền', key: 'permCount', width: 12 },
      { header: 'Danh sách quyền', key: 'permissions', width: 80 },
    ];

    // Style header
    ws.getRow(1).eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    rows.forEach((r) => {
      ws.addRow({
        name: r.userName,
        email: r.email,
        role: r.role,
        moduleRoles: r.moduleRoles.join(', '),
        permCount: r.permissions.length,
        permissions: r.permissions.join(', '),
      });
    });

    ws.eachRow((row, idx) => {
      if (idx === 1) return;
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: idx % 2 === 0 ? 'FFF8FAFC' : 'FFFFFFFF' },
        };
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
      });
    });

    const arrayBuffer = await wb.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }
}
