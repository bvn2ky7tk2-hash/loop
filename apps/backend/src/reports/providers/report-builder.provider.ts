import { Injectable, BadRequestException, Inject, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantAwareService } from '../../common/services/tenant-aware.service';
import type { BuilderColumnDef, BuilderEntityKey, BuilderPreviewDto } from '../reports.service';
import ExcelJS from 'exceljs';

/**
 * Nhóm 3 — Dynamic report builder.
 * getBuilderEntities trả metadata cột theo entity; builderPreview/builderExport
 * truy vấn động qua fetchBuilderRows + pickColumns.
 */
@Injectable({ scope: Scope.REQUEST })
export class ReportBuilderProvider extends TenantAwareService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REQUEST) req?: any,
  ) {
    super(req);
  }

  // ── E24.7: Report Builder ─────────────────────────────────────────────────

  private static readonly ENTITY_COLUMNS: Record<BuilderEntityKey, BuilderColumnDef[]> = {
    Employee: [
      { key: 'code',       label: 'Mã NV',         type: 'text'   },
      { key: 'fullName',   label: 'Họ tên',         type: 'text'   },
      { key: 'email',      label: 'Email',          type: 'text'   },
      { key: 'level',      label: 'Level',          type: 'status' },
      { key: 'startDate',  label: 'Ngày vào làm',   type: 'date'   },
      { key: 'isActive',   label: 'Trạng thái',     type: 'status' },
      { key: 'orgUnit',    label: 'Phòng ban',      type: 'text'   },
    ],
    Project: [
      { key: 'name',       label: 'Tên dự án',      type: 'text'   },
      { key: 'code',       label: 'Mã dự án',       type: 'text'   },
      { key: 'status',     label: 'Trạng thái',     type: 'status' },
      { key: 'type',       label: 'Loại',           type: 'text'   },
      { key: 'startDate',  label: 'Ngày bắt đầu',   type: 'date'   },
      { key: 'endDate',    label: 'Ngày kết thúc',  type: 'date'   },
      { key: 'budgetCost', label: 'Ngân sách',      type: 'number' },
    ],
    Invoice: [
      { key: 'code',       label: 'Số hoá đơn',     type: 'text'   },
      { key: 'type',       label: 'Loại',           type: 'status' },
      { key: 'status',     label: 'Trạng thái',     type: 'status' },
      { key: 'totalAmount',label: 'Số tiền',        type: 'number' },
      { key: 'issueDate',  label: 'Ngày xuất',      type: 'date'   },
      { key: 'dueDate',    label: 'Hạn thanh toán', type: 'date'   },
      { key: 'customer',   label: 'Khách hàng',     type: 'text'   },
    ],
    Leave: [
      { key: 'employee',   label: 'Nhân viên',      type: 'text'   },
      { key: 'type',       label: 'Loại phép',      type: 'text'   },
      { key: 'startDate',  label: 'Từ ngày',        type: 'date'   },
      { key: 'endDate',    label: 'Đến ngày',       type: 'date'   },
      { key: 'days',       label: 'Số ngày',        type: 'number' },
      { key: 'status',     label: 'Trạng thái',     type: 'status' },
    ],
    Expense: [
      { key: 'title',      label: 'Tiêu đề',        type: 'text'   },
      { key: 'employee',   label: 'Nhân viên',      type: 'text'   },
      { key: 'category',   label: 'Danh mục',       type: 'text'   },
      { key: 'totalAmount',label: 'Số tiền',        type: 'number' },
      { key: 'status',     label: 'Trạng thái',     type: 'status' },
      { key: 'createdAt',  label: 'Ngày nộp',       type: 'date'   },
    ],
    Payroll: [
      { key: 'employee',   label: 'Nhân viên',      type: 'text'   },
      { key: 'period',     label: 'Kỳ lương',       type: 'text'   },
      { key: 'baseSalary', label: 'Lương cơ bản',   type: 'number' },
      { key: 'grossSalary',label: 'Gross',          type: 'number' },
      { key: 'netSalary',  label: 'Net',            type: 'number' },
      { key: 'status',     label: 'Trạng thái',     type: 'status' },
    ],
  };

  getBuilderEntities(): Record<BuilderEntityKey, BuilderColumnDef[]> {
    return ReportBuilderProvider.ENTITY_COLUMNS;
  }

  async builderPreview(dto: BuilderPreviewDto): Promise<{ rows: Record<string, unknown>[]; total: number }> {
    const rows = await this.fetchBuilderRows(dto, 20);
    return { rows, total: rows.length };
  }

  async builderExport(dto: BuilderPreviewDto): Promise<Buffer> {
    const rows = await this.fetchBuilderRows(dto, 5000);
    const cols = (ReportBuilderProvider.ENTITY_COLUMNS[dto.entity] ?? [])
      .filter(c => dto.columns.includes(c.key));

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(dto.entity);
    ws.columns = cols.map(c => ({ header: c.label, key: c.key, width: 20 }));
    ws.getRow(1).font = { bold: true };
    rows.forEach(r => ws.addRow(r as any));
    return wb.xlsx.writeBuffer() as unknown as Promise<Buffer>;
  }

  private async fetchBuilderRows(
    dto: BuilderPreviewDto,
    take: number,
  ): Promise<Record<string, unknown>[]> {
    const { entity, columns, filters = [] } = dto;

    // Helper: parse filter value into Prisma where clause
    const applyFilter = (where: any, col: string, op: string, val: string) => {
      const num = Number(val);
      switch (op) {
        case '=':
          where[col] = isNaN(num) ? val : num;
          break;
        case '>':
          where[col] = { gt: isNaN(num) ? val : num };
          break;
        case '<':
          where[col] = { lt: isNaN(num) ? val : num };
          break;
        case 'contains':
          where[col] = { contains: val, mode: 'insensitive' };
          break;
      }
    };

    switch (entity) {
      case 'Employee': {
        const where: any = this.tenantWhere({ deletedAt: null });
        for (const f of filters) {
          if (f.field === 'isActive') where.isActive = f.value === 'true';
          else if (f.field === 'level') applyFilter(where, 'level', f.op, f.value);
          else if (f.field === 'fullName') applyFilter(where, 'fullName', f.op, f.value);
          else if (f.field === 'code') applyFilter(where, 'code', f.op, f.value);
        }
        const employees = await this.prisma.employee.findMany({
          where,
          include: { orgUnit: { select: { name: true } } },
          orderBy: { fullName: 'asc' },
          take,
        });
        return employees.map(e => this.pickColumns(columns, {
          code:      e.code,
          fullName:  e.fullName,
          email:     e.email ?? '—',
          level:     e.level,
          startDate: e.startDate?.toISOString().split('T')[0] ?? null,
          isActive:  e.isActive ? 'ACTIVE' : 'INACTIVE',
          orgUnit:   e.orgUnit?.name ?? '—',
        }));
      }

      case 'Project': {
        const where: any = this.tenantWhere({ deletedAt: null });
        for (const f of filters) {
          if (f.field === 'status') applyFilter(where, 'status', f.op, f.value);
          else if (f.field === 'name') applyFilter(where, 'name', f.op, f.value);
        }
        const projects = await this.prisma.project.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take,
        });
        return projects.map(p => this.pickColumns(columns, {
          name:       p.name,
          code:       p.code,
          status:     p.status,
          type:       p.type ?? '—',
          startDate:  p.startDate?.toISOString().split('T')[0] ?? null,
          endDate:    p.endDate?.toISOString().split('T')[0] ?? null,
          budgetCost: p.budgetCost ? Number(p.budgetCost) : null,
        }));
      }

      case 'Invoice': {
        const where: any = this.tenantWhere({ deletedAt: null });
        for (const f of filters) {
          if (f.field === 'status') applyFilter(where, 'status', f.op, f.value);
          else if (f.field === 'type') applyFilter(where, 'type', f.op, f.value);
        }
        const invoices = await this.prisma.invoice.findMany({
          where,
          include: { customer: { select: { name: true } } },
          orderBy: { issueDate: 'desc' },
          take,
        });
        return invoices.map(inv => this.pickColumns(columns, {
          code:        inv.code,
          type:        inv.type,
          status:      inv.status,
          totalAmount: Number(inv.totalAmount),
          issueDate:   inv.issueDate?.toISOString().split('T')[0] ?? null,
          dueDate:     inv.dueDate?.toISOString().split('T')[0] ?? null,
          customer:    inv.customer?.name ?? '—',
        }));
      }

      case 'Leave': {
        const tid = this.getTenantId();
        const where: any = tid ? { tenantId: tid } : {};
        for (const f of filters) {
          if (f.field === 'status') applyFilter(where, 'status', f.op, f.value);
        }
        const leaves = await this.prisma.leaveRequest.findMany({
          where,
          include: {
            employee: { select: { fullName: true } },
            leaveType: { select: { name: true } },
          },
          orderBy: { startDate: 'desc' },
          take,
        });
        return leaves.map(l => this.pickColumns(columns, {
          employee:  l.employee.fullName,
          type:      l.leaveType?.name ?? '—',
          startDate: l.startDate?.toISOString().split('T')[0] ?? null,
          endDate:   l.endDate?.toISOString().split('T')[0] ?? null,
          days:      Number(l.days ?? 0),
          status:    l.status,
        }));
      }

      case 'Expense': {
        const where: any = {};
        for (const f of filters) {
          if (f.field === 'status') applyFilter(where, 'status', f.op, f.value);
          else if (f.field === 'category') applyFilter(where, 'category', f.op, f.value);
        }
        const expenses = await this.prisma.expense.findMany({
          where,
          include: { employee: { select: { fullName: true } } },
          orderBy: { createdAt: 'desc' },
          take,
        });
        return expenses.map(e => this.pickColumns(columns, {
          title:       e.title,
          employee:    e.employee?.fullName ?? '—',
          category:    e.category,
          totalAmount: Number(e.totalAmount),
          status:      e.status,
          createdAt:   e.createdAt?.toISOString().split('T')[0] ?? null,
        }));
      }

      case 'Payroll': {
        const tid = this.getTenantId();
        const where: any = tid ? { period: { tenantId: tid } } : {};
        for (const f of filters) {
          if (f.field === 'status') where.period = { ...(where.period ?? {}), status: f.value };
        }
        const records = await this.prisma.payrollRecord.findMany({
          where,
          include: {
            employee: { select: { fullName: true } },
            period:   { select: { name: true, status: true } },
          },
          orderBy: { periodId: 'desc' },
          take,
        });
        return records.map(r => this.pickColumns(columns, {
          employee:    r.employee.fullName,
          period:      r.period?.name ?? '—',
          baseSalary:  Number(r.baseSalary ?? 0),
          grossSalary: Number(r.grossSalary ?? 0),
          netSalary:   Number(r.netSalary ?? 0),
          status:      r.period?.status ?? '—',
        }));
      }

      default:
        throw new BadRequestException(`Entity không hợp lệ: ${entity as string}`);
    }
  }

  private pickColumns(
    columns: string[],
    data: Record<string, unknown>,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const col of columns) {
      result[col] = data[col] ?? null;
    }
    return result;
  }
}
