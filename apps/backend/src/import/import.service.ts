import { Injectable, BadRequestException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';
import { QuotaService } from '../common/services/quota.service';
import type { ImportTemplate, ImportRow, ImportError, ImportPreviewResult } from './dto/import.dto';

@Injectable()
export class ImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly quota: QuotaService,
  ) {}

  // ── Parse & validate Excel buffer ──────────────────────────────────────────

  async preview(fileBuffer: Buffer, template: ImportTemplate): Promise<ImportPreviewResult> {
    const wb = new ExcelJS.Workbook();
    // ExcelJS.load expects Buffer — cast to avoid Node version Buffer type mismatch
    await wb.xlsx.load(fileBuffer as never);

    const ws = wb.getWorksheet(1);
    if (!ws) throw new BadRequestException('File không có worksheet nào');

    const rows = this.extractRows(ws);
    if (rows.length === 0) {
      return { template, valid: [], errors: [{ row: 1, message: 'File trống hoặc không có dữ liệu' }] };
    }

    switch (template) {
      case 'employees':     return { template, ...this.validateEmployees(rows) };
      case 'assets':        return { template, ...this.validateAssets(rows) };
      case 'jobs':          return { template, ...this.validateJobs(rows) };
      case 'leave_balances': return { template, ...this.validateLeaveBalances(rows) };
      case 'customers':     return { template, ...this.validateCustomers(rows) };
      case 'leads':         return { template, ...this.validateLeads(rows) };
    }
  }

  // ── Commit — chỉ import các row hợp lệ ────────────────────────────────────

  async commit(fileBuffer: Buffer, template: ImportTemplate): Promise<{ imported: number; skipped: number }> {
    const preview = await this.preview(fileBuffer, template);

    if (preview.valid.length === 0) {
      return { imported: 0, skipped: preview.errors.length };
    }

    let imported = 0;

    switch (template) {
      case 'employees':     imported = await this.commitEmployees(preview.valid);     break;
      case 'assets':        imported = await this.commitAssets(preview.valid);        break;
      case 'jobs':          imported = await this.commitJobs(preview.valid);          break;
      case 'leave_balances': imported = await this.commitLeaveBalances(preview.valid); break;
      case 'customers':     imported = await this.commitCustomers(preview.valid);     break;
      case 'leads':         imported = await this.commitLeads(preview.valid);         break;
    }

    return { imported, skipped: preview.errors.length };
  }

  // ── Extract rows from worksheet ─────────────────────────────────────────────

  private extractRows(ws: ExcelJS.Worksheet): ImportRow[] {
    const headerRow = ws.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell((cell) => headers.push(String(cell.value ?? '').trim()));

    const rows: ImportRow[] = [];
    ws.eachRow((row, rowIdx) => {
      if (rowIdx === 1) return; // skip header
      const obj: ImportRow = {};
      let hasValue = false;
      row.eachCell({ includeEmpty: true }, (cell, colIdx) => {
        const key = headers[colIdx - 1];
        if (!key) return;
        const val = cell.value;
        if (val !== null && val !== undefined && val !== '') hasValue = true;
        obj[key] = val as string | number | undefined;
      });
      if (hasValue) rows.push(obj);
    });

    return rows;
  }

  // ── Validators ──────────────────────────────────────────────────────────────

  private validateEmployees(rows: ImportRow[]): { valid: ImportRow[]; errors: ImportError[] } {
    const valid: ImportRow[] = [];
    const errors: ImportError[] = [];

    rows.forEach((row, idx) => {
      const rowNum = idx + 2;
      const name  = this.str(row['Họ tên'] ?? row['fullName'] ?? row['name']);
      const email = this.str(row['Email'] ?? row['email']);

      if (!name) {
        errors.push({ row: rowNum, message: 'Thiếu họ tên (cột "Họ tên")' });
        return;
      }
      if (!email) {
        errors.push({ row: rowNum, message: 'Thiếu email (cột "Email")' });
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push({ row: rowNum, message: `Email không hợp lệ: ${email}` });
        return;
      }

      valid.push({
        fullName:  name,
        email,
        orgUnit:   this.str(row['Phòng ban'] ?? row['orgUnit']),
        startDate: this.str(row['Ngày vào làm'] ?? row['startDate']),
      });
    });

    return { valid, errors };
  }

  private validateAssets(rows: ImportRow[]): { valid: ImportRow[]; errors: ImportError[] } {
    const valid: ImportRow[] = [];
    const errors: ImportError[] = [];

    rows.forEach((row, idx) => {
      const rowNum  = idx + 2;
      const name     = this.str(row['Tên tài sản'] ?? row['name']);
      const code     = this.str(row['Mã tài sản'] ?? row['code']);
      const category = this.str(row['Danh mục'] ?? row['category']);

      if (!name)     { errors.push({ row: rowNum, message: 'Thiếu tên tài sản' }); return; }
      if (!code)     { errors.push({ row: rowNum, message: 'Thiếu mã tài sản' }); return; }
      if (!category) { errors.push({ row: rowNum, message: 'Thiếu danh mục' }); return; }

      valid.push({
        name,
        code,
        category,
        serialNumber:  this.str(row['Số serial'] ?? row['serialNumber']),
        purchaseDate:  this.str(row['Ngày mua'] ?? row['purchaseDate']),
      });
    });

    return { valid, errors };
  }

  private validateJobs(rows: ImportRow[]): { valid: ImportRow[]; errors: ImportError[] } {
    const valid: ImportRow[] = [];
    const errors: ImportError[] = [];

    rows.forEach((row, idx) => {
      const rowNum   = idx + 2;
      const title    = this.str(row['Vị trí'] ?? row['title']);
      const orgUnit  = this.str(row['Phòng ban'] ?? row['orgUnit']);
      const level    = this.str(row['Cấp độ'] ?? row['level']);
      const headcount = Number(row['Số lượng'] ?? row['headcount'] ?? 1);

      if (!title)   { errors.push({ row: rowNum, message: 'Thiếu tên vị trí' }); return; }
      if (!orgUnit) { errors.push({ row: rowNum, message: 'Thiếu phòng ban' }); return; }
      if (!level)   { errors.push({ row: rowNum, message: 'Thiếu cấp độ' }); return; }
      if (isNaN(headcount) || headcount < 1) {
        errors.push({ row: rowNum, message: 'Số lượng phải là số nguyên >= 1' });
        return;
      }

      valid.push({ title, orgUnit, level, headcount });
    });

    return { valid, errors };
  }

  // ── Commit helpers ──────────────────────────────────────────────────────────

  private async commitEmployees(rows: ImportRow[]): Promise<number> {
    let count = 0;
    for (const row of rows) {
      // Quota: chặn cứng khi đạt maxEmployees. ĐẶT NGOÀI try để ForbiddenException
      // KHÔNG bị catch nuốt — import dừng và báo rõ thay vì lách giới hạn hàng loạt.
      await this.quota.assertCanAddEmployee();
      try {
        // Lookup orgUnit by name
        let orgUnitId: string | null = null;
        if (row.orgUnit) {
          const ou = await this.prisma.orgUnit.findFirst({ where: { name: String(row.orgUnit) } });
          orgUnitId = ou?.id ?? null;
        }

        // Kiểm tra email đã tồn tại chưa
        const existing = await this.prisma.employee.findFirst({
          where: { email: String(row.email) },
        });
        if (existing) continue; // Skip duplicate

        const empData: {
          fullName: string; email: string; level: 'MID';
          startDate: Date; code: string; techStack: string[];
          orgUnitId?: string;
        } = {
          fullName:  String(row.fullName),
          email:     String(row.email),
          level:     'MID',
          startDate: row.startDate ? new Date(String(row.startDate)) : new Date(),
          code:      `IMP-${Date.now()}-${count}`,
          techStack: [],
        };
        if (orgUnitId) empData.orgUnitId = orgUnitId;

        await this.prisma.employee.create({ data: empData as never });
        count++;
      } catch {
        // Skip row on error — không throw để tiếp tục xử lý các row còn lại
      }
    }
    return count;
  }

  private async commitAssets(rows: ImportRow[]): Promise<number> {
    let count = 0;
    for (const row of rows) {
      try {
        const existing = await this.prisma.asset.findFirst({ where: { code: String(row.code) } });
        if (existing) continue;

        await this.prisma.asset.create({
          data: {
            name:         String(row.name),
            code:         String(row.code),
            category:     String(row.category) as never,
            serialNumber: row.serialNumber ? String(row.serialNumber) : null,
            purchaseDate: row.purchaseDate ? new Date(String(row.purchaseDate)) : null,
          },
        });
        count++;
      } catch {
        // Skip row on error
      }
    }
    return count;
  }

  private async commitJobs(rows: ImportRow[]): Promise<number> {
    let count = 0;
    for (const row of rows) {
      try {
        let orgUnitId: string | null = null;
        if (row.orgUnit) {
          const ou = await this.prisma.orgUnit.findFirst({ where: { name: String(row.orgUnit) } });
          orgUnitId = ou?.id ?? null;
        }

        const jobData: {
          code: string; title: string; level: never; headcount: number; status: never; orgUnitId?: string;
        } = {
          code:      `JOB-${Date.now()}-${count}`,
          title:     String(row.title),
          level:     String(row.level) as never,
          headcount: Number(row.headcount),
          status:    'OPEN' as never,
        };
        if (orgUnitId) jobData.orgUnitId = orgUnitId;

        await this.prisma.jobOpening.create({ data: jobData as never });
        count++;
      } catch {
        // Skip row on error
      }
    }
    return count;
  }

  private validateLeaveBalances(rows: ImportRow[]): { valid: ImportRow[]; errors: ImportError[] } {
    const valid: ImportRow[] = [];
    const errors: ImportError[] = [];

    rows.forEach((row, idx) => {
      const rowNum     = idx + 2;
      const email      = this.str(row['Email'] ?? row['email']);
      const leaveType  = this.str(row['Loại nghỉ'] ?? row['leaveType']);
      const year       = Number(row['Năm'] ?? row['year']);
      const totalDays  = Number(row['Số ngày'] ?? row['totalDays'] ?? row['total_days']);

      if (!email)      { errors.push({ row: rowNum, message: 'Thiếu email nhân viên' }); return; }
      if (!leaveType)  { errors.push({ row: rowNum, message: 'Thiếu loại nghỉ' }); return; }
      if (isNaN(year) || year < 2020) { errors.push({ row: rowNum, message: 'Năm không hợp lệ (>= 2020)' }); return; }
      if (isNaN(totalDays) || totalDays < 0) { errors.push({ row: rowNum, message: 'Số ngày không hợp lệ (>= 0)' }); return; }

      valid.push({ email, leaveType, year, totalDays });
    });

    return { valid, errors };
  }

  private validateCustomers(rows: ImportRow[]): { valid: ImportRow[]; errors: ImportError[] } {
    const valid: ImportRow[] = [];
    const errors: ImportError[] = [];

    rows.forEach((row, idx) => {
      const rowNum  = idx + 2;
      const name    = this.str(row['Tên khách hàng'] ?? row['name']);
      const code    = this.str(row['Mã'] ?? row['code']);

      if (!name) { errors.push({ row: rowNum, message: 'Thiếu tên khách hàng' }); return; }
      if (!code) { errors.push({ row: rowNum, message: 'Thiếu mã khách hàng' }); return; }

      valid.push({
        name,
        code,
        industry: this.str(row['Ngành'] ?? row['industry']),
        website:  this.str(row['Website'] ?? row['website']),
        taxCode:  this.str(row['Mã số thuế'] ?? row['taxCode']),
      });
    });

    return { valid, errors };
  }

  private validateLeads(rows: ImportRow[]): { valid: ImportRow[]; errors: ImportError[] } {
    const valid: ImportRow[] = [];
    const errors: ImportError[] = [];

    rows.forEach((row, idx) => {
      const rowNum = idx + 2;
      const title  = this.str(row['Tên lead'] ?? row['title']);
      const source = this.str(row['Nguồn'] ?? row['source']);

      if (!title)  { errors.push({ row: rowNum, message: 'Thiếu tên lead' }); return; }
      if (!source) { errors.push({ row: rowNum, message: 'Thiếu nguồn (WEBSITE, REFERRAL, COLD_CALL, EVENT, OTHER)' }); return; }

      const validSources = ['WEBSITE', 'REFERRAL', 'COLD_CALL', 'EVENT', 'OTHER'];
      if (!validSources.includes(source.toUpperCase())) {
        errors.push({ row: rowNum, message: `Nguồn không hợp lệ: ${source}. Chọn: ${validSources.join(', ')}` });
        return;
      }

      valid.push({
        title,
        source: source.toUpperCase(),
        estimatedValue: row['Giá trị ước tính'] ?? row['estimatedValue'] ?? 0,
        notes: this.str(row['Ghi chú'] ?? row['notes']),
      });
    });

    return { valid, errors };
  }

  // ── Commit helpers (extended) ────────────────────────────────────────────────

  private async commitLeaveBalances(rows: ImportRow[]): Promise<number> {
    let count = 0;
    for (const row of rows) {
      try {
        const employee = await this.prisma.employee.findFirst({
          where: { email: String(row.email) },
        });
        if (!employee) continue;

        const leaveType = await this.prisma.leaveType.findFirst({
          where: { name: String(row.leaveType) },
        });
        if (!leaveType) continue;

        await this.prisma.leaveBalance.upsert({
          where: {
            employeeId_leaveTypeId_year: {
              employeeId: employee.id,
              leaveTypeId: leaveType.id,
              year: Number(row.year),
            },
          },
          update: { totalDays: Number(row.totalDays) as never },
          create: {
            employeeId: employee.id,
            leaveTypeId: leaveType.id,
            year: Number(row.year),
            totalDays: Number(row.totalDays) as never,
            usedDays: 0 as never,
          },
        });
        count++;
      } catch {
        // Skip row on error
      }
    }
    return count;
  }

  private async commitCustomers(rows: ImportRow[]): Promise<number> {
    let count = 0;
    for (const row of rows) {
      try {
        const existing = await this.prisma.customer.findFirst({
          where: { code: String(row.code) },
        });
        if (existing) continue;

        await this.prisma.customer.create({
          data: {
            name:     String(row.name),
            code:     String(row.code),
            industry: row.industry ? String(row.industry) : null,
            website:  row.website  ? String(row.website)  : null,
            taxCode:  row.taxCode  ? String(row.taxCode)  : null,
          },
        });
        count++;
      } catch {
        // Skip row on error
      }
    }
    return count;
  }

  private async commitLeads(rows: ImportRow[]): Promise<number> {
    let count = 0;
    // Lấy user đầu tiên làm assignee mặc định khi import
    const defaultAssignee = await this.prisma.user.findFirst({ select: { id: true } });
    if (!defaultAssignee) return 0;

    for (const row of rows) {
      try {
        await this.prisma.lead.create({
          data: {
            title:          String(row.title),
            source:         String(row.source) as never,
            status:         'NEW' as never,
            estimatedValue: row.estimatedValue ? Number(row.estimatedValue) as never : null,
            notes:          row.notes ? String(row.notes) : null,
            assigneeId:     defaultAssignee.id,
          },
        });
        count++;
      } catch {
        // Skip row on error
      }
    }
    return count;
  }

  // ── Utility ─────────────────────────────────────────────────────────────────

  private str(val: unknown): string {
    if (val === null || val === undefined) return '';
    return String(val).trim();
  }
}
