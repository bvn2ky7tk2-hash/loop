import { Injectable, Scope, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';
import { TenantAwareService } from '../common/services/tenant-aware.service';
import { PaginatedResult, paginate } from '../common/dto/pagination.dto';
import { PunchSource } from '../generated/prisma';
import { CreatePunchDto, PunchQueryDto, PunchImportPreviewResult } from './dto/attendance-punch.dto';
import { AttendanceRebuildQueueService } from './attendance-rebuild-queue.service';

// Trả về [ngày của mốc thời gian, ngày liền trước] theo giờ địa phương (YYYY-MM-DD).
// Ngày liền trước để phủ ca đêm (giờ ra rạng sáng thuộc ca hôm trước).
function affectedDates(at: Date): string[] {
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const prev = new Date(at);
  prev.setDate(prev.getDate() - 1);
  return [fmt(at), fmt(prev)];
}

@Injectable({ scope: Scope.REQUEST })
export class AttendancePunchService extends TenantAwareService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rebuildQueue: AttendanceRebuildQueueService,
    @Inject(REQUEST) req?: any,
  ) {
    super(req);
  }

  // ─── Danh sách giờ quẹt (phân trang) ────────────────────────────────────────
  async list(query: PunchQueryDto): Promise<PaginatedResult<any>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;

    const where: any = {};
    if (query.employeeId) where.employeeId = query.employeeId;
    if (query.orgUnitId) where.employee = { orgUnitId: query.orgUnitId };
    if (query.dateFrom || query.dateTo) {
      where.punchedAt = {};
      if (query.dateFrom) where.punchedAt.gte = new Date(query.dateFrom);
      if (query.dateTo) {
        const to = new Date(query.dateTo);
        to.setHours(23, 59, 59, 999);
        where.punchedAt.lte = to;
      }
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.attendancePunch.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { punchedAt: 'desc' },
        include: {
          employee: {
            select: {
              id: true, fullName: true, code: true, orgUnitId: true,
              orgUnit: { select: { id: true, name: true } },
            },
          },
        },
      }),
      this.prisma.attendancePunch.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  // ─── Thêm 1 lần quẹt thủ công ───────────────────────────────────────────────
  async create(dto: CreatePunchDto) {
    const emp = await this.prisma.employee.findFirst({ where: { id: dto.employeeId } });
    if (!emp) throw new NotFoundException('Không tìm thấy nhân viên');

    const punchedAt = new Date(dto.punchedAt);
    const punch = await this.prisma.attendancePunch.create({
      data: {
        employeeId: dto.employeeId,
        punchedAt,
        source: PunchSource.MANUAL,
        note: dto.note ?? null,
      },
    });
    // Tự động tính lại công cho NV này, ngày được thêm (+ ngày trước cho ca đêm)
    await this.rebuildQueue.enqueueDay(dto.employeeId, affectedDates(punchedAt));
    return punch;
  }

  async remove(id: string) {
    const punch = await this.prisma.attendancePunch.findFirst({ where: { id } });
    if (!punch) throw new NotFoundException('Không tìm thấy bản ghi quẹt thẻ');
    const deleted = await this.prisma.attendancePunch.delete({ where: { id } });
    // Xóa quẹt cũng tính lại ngày bị ảnh hưởng
    await this.rebuildQueue.enqueueDay(punch.employeeId, affectedDates(punch.punchedAt));
    return deleted;
  }

  // ─── Import Excel: preview (validate) ───────────────────────────────────────
  async preview(fileBuffer: Buffer): Promise<PunchImportPreviewResult> {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(fileBuffer as never);
    const ws = wb.getWorksheet(1);
    if (!ws) throw new BadRequestException('File không có worksheet nào');

    const rows = this.extractRows(ws);
    if (rows.length === 0) {
      return { valid: [], errors: [{ row: 1, message: 'File trống hoặc không có dữ liệu' }] };
    }

    // Prefetch nhân viên theo mã (tránh N+1)
    const codes = [...new Set(rows.map((r) => this.str(r.code)).filter(Boolean))];
    const employees = await this.prisma.employee.findMany({
      where: { code: { in: codes } },
      select: { id: true, code: true, fullName: true },
    });
    const empByCode = new Map(employees.map((e) => [e.code, e]));

    const valid: PunchImportPreviewResult['valid'] = [];
    const errors: PunchImportPreviewResult['errors'] = [];

    rows.forEach((row, idx) => {
      const rowNum = idx + 2; // +1 header, +1 1-based
      const code = this.str(row.code);
      if (!code) { errors.push({ row: rowNum, message: 'Thiếu mã nhân viên (cột "Mã NV")' }); return; }

      const emp = empByCode.get(code);
      if (!emp) { errors.push({ row: rowNum, message: `Không tìm thấy nhân viên mã "${code}"` }); return; }

      const punchedAt = this.parseDateTime(row.punchedAt);
      if (!punchedAt) { errors.push({ row: rowNum, message: `Thời gian quẹt không hợp lệ: "${this.str(row.punchedAt)}"` }); return; }

      valid.push({ employeeId: emp.id, code, fullName: emp.fullName, punchedAt: punchedAt.toISOString() });
    });

    return { valid, errors };
  }

  // ─── Import Excel: commit (chỉ ghi row hợp lệ, bỏ trùng) ────────────────────
  async commit(fileBuffer: Buffer): Promise<{ imported: number; skipped: number }> {
    const preview = await this.preview(fileBuffer);
    if (preview.valid.length === 0) {
      return { imported: 0, skipped: preview.errors.length };
    }

    const result = await this.prisma.attendancePunch.createMany({
      data: preview.valid.map((v) => ({
        employeeId: v.employeeId,
        punchedAt: new Date(v.punchedAt),
        source: PunchSource.IMPORT,
        rawCode: v.code,
      })),
      skipDuplicates: true, // @@unique([tenantId, employeeId, punchedAt])
    });

    // Sau import → tự động tính lại CẢ THÁNG cho toàn bộ NV, mỗi (năm,tháng) bị ảnh hưởng 1 job
    const months = new Set<string>();
    for (const v of preview.valid) {
      const d = new Date(v.punchedAt);
      months.add(`${d.getFullYear()}-${d.getMonth() + 1}`);
    }
    for (const ym of months) {
      const [y, m] = ym.split('-').map(Number);
      await this.rebuildQueue.enqueueMonth(y, m);
    }

    return { imported: result.count, skipped: preview.valid.length - result.count + preview.errors.length };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  private extractRows(ws: ExcelJS.Worksheet): { code?: any; punchedAt?: any }[] {
    const headerRow = ws.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell((cell) => headers.push(String(cell.value ?? '').trim()));

    const codeKeys = ['Mã NV', 'Mã nhân viên', 'code', 'employeeCode', 'Mã'];
    const timeKeys = ['Thời gian quẹt', 'Thời gian', 'Giờ quẹt', 'punchedAt', 'time', 'datetime'];

    const rows: { code?: any; punchedAt?: any }[] = [];
    ws.eachRow((row, rowIdx) => {
      if (rowIdx === 1) return;
      const obj: Record<string, any> = {};
      let hasValue = false;
      row.eachCell({ includeEmpty: true }, (cell, colIdx) => {
        const key = headers[colIdx - 1];
        if (!key) return;
        const val = cell.value;
        if (val !== null && val !== undefined && val !== '') hasValue = true;
        obj[key] = val;
      });
      if (!hasValue) return;
      rows.push({
        code: codeKeys.map((k) => obj[k]).find((v) => v !== undefined && v !== null && v !== ''),
        punchedAt: timeKeys.map((k) => obj[k]).find((v) => v !== undefined && v !== null && v !== ''),
      });
    });

    return rows;
  }

  private parseDateTime(val: unknown): Date | null {
    if (val === null || val === undefined || val === '') return null;
    if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
    // ExcelJS đôi khi trả { text } hoặc số serial
    if (typeof val === 'object' && val !== null && 'text' in (val as any)) {
      return this.parseDateTime((val as any).text);
    }
    const s = String(val).trim();
    // DD/MM/YYYY [HH:mm[:ss]]
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
    if (m) {
      const [, dd, mm, yyyy, hh = '0', min = '0', ss = '0'] = m;
      const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min), Number(ss));
      return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  private str(val: unknown): string {
    if (val === null || val === undefined) return '';
    return String(val).trim();
  }
}
