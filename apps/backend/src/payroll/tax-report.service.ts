import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import ExcelJS from 'exceljs';
import dayjs from 'dayjs';

const fmt = (n: number | undefined | null) =>
  Math.round(n ?? 0).toLocaleString('vi-VN');

@Injectable()
export class TaxReportService {
  constructor(private readonly prisma: PrismaService) {}

  // ── 05-QTT-TNCN: Quyết toán thuế TNCN theo năm ───────────────────────────
  async generate05QTT(year: number): Promise<Buffer> {
    const records = await this.prisma.payrollRecord.findMany({
      where: {
        period: {
          status: { in: ['APPROVED', 'PAID'] },
          startDate: { gte: new Date(`${year}-01-01`), lte: new Date(`${year}-12-31`) },
        },
      },
      include: {
        employee: { include: { user: { select: { name: true, email: true } } } },
        period: { select: { name: true } },
      },
      orderBy: { employee: { user: { name: 'asc' } } },
    });

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Loop 360';
    wb.created = new Date();

    const ws = wb.addWorksheet('05-QTT-TNCN');

    ws.mergeCells('A1:O1');
    ws.getCell('A1').value = `PHỤ LỤC 05-QTT-TNCN — Bảng kê thu nhập từ tiền lương, tiền công năm ${year}`;
    ws.getCell('A1').font = { bold: true, size: 12, color: { argb: 'FF1D4ED8' } };
    ws.getCell('A1').alignment = { horizontal: 'center' };

    ws.mergeCells('A2:O2');
    ws.getCell('A2').value = `(Kèm theo tờ khai quyết toán thuế mẫu 05/QTT-TNCN) — Xuất từ Loop 360 ngày ${dayjs().format('DD/MM/YYYY')}`;
    ws.getCell('A2').alignment = { horizontal: 'center' };
    ws.getCell('A2').font = { italic: true, size: 9, color: { argb: 'FF64748B' } };

    ws.getRow(4).values = [
      'STT', 'Họ tên', 'Email',
      'Tổng TN gộp (đ)', 'BHXH NLĐ (đ)', 'BHYT NLĐ (đ)', 'BHTN NLĐ (đ)',
      'TN chịu thuế (đ)', 'GT bản thân (đ)', 'GT người PT (đ)', 'Số NPT',
      'Thuế TNCN (đ)', 'Lương ròng (đ)',
      'CP lao động NSDLĐ (đ)',
    ];

    const headerRow = ws.getRow(4);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } };
      cell.alignment = { horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' },
      };
    });
    headerRow.height = 36;

    // Aggregate per employee (có thể nhiều kỳ trong năm)
    const empMap = new Map<string, {
      name: string; email: string;
      grossSalary: number; bhxhEmployee: number; bhytEmployee: number; bhtnEmployee: number;
      taxableIncome: number; selfDeduction: number; dependentDeduction: number;
      dependentCount: number; pitAmount: number; netSalary: number; totalLaborCost: number;
    }>();

    for (const r of records) {
      const key = r.employee.id;
      const existing = empMap.get(key);
      if (existing) {
        existing.grossSalary      += Number(r.grossSalary);
        existing.bhxhEmployee     += Number(r.bhxhEmployee);
        existing.bhytEmployee     += Number(r.bhytEmployee);
        existing.bhtnEmployee     += Number(r.bhtnEmployee);
        existing.taxableIncome    += Number(r.taxableIncome);
        existing.selfDeduction    += Number(r.selfDeduction);
        existing.dependentDeduction += Number(r.dependentDeduction);
        existing.dependentCount    = Math.max(existing.dependentCount, r.dependentCount);
        existing.pitAmount        += Number(r.pitAmount);
        existing.netSalary        += Number(r.netSalary);
        existing.totalLaborCost   += Number(r.totalLaborCost);
      } else {
        empMap.set(key, {
          name: r.employee.user?.name ?? '—',
          email: r.employee.user?.email ?? '—',
          grossSalary:        Number(r.grossSalary),
          bhxhEmployee:       Number(r.bhxhEmployee),
          bhytEmployee:       Number(r.bhytEmployee),
          bhtnEmployee:       Number(r.bhtnEmployee),
          taxableIncome:      Number(r.taxableIncome),
          selfDeduction:      Number(r.selfDeduction),
          dependentDeduction: Number(r.dependentDeduction),
          dependentCount:     r.dependentCount,
          pitAmount:          Number(r.pitAmount),
          netSalary:          Number(r.netSalary),
          totalLaborCost:     Number(r.totalLaborCost),
        });
      }
    }

    let stt = 1;
    const totals = {
      grossSalary: 0, bhxhEmployee: 0, bhytEmployee: 0, bhtnEmployee: 0,
      taxableIncome: 0, selfDeduction: 0, dependentDeduction: 0,
      pitAmount: 0, netSalary: 0, totalLaborCost: 0,
    };

    for (const [, emp] of empMap) {
      const rowData = [
        stt++, emp.name, emp.email,
        fmt(emp.grossSalary), fmt(emp.bhxhEmployee), fmt(emp.bhytEmployee), fmt(emp.bhtnEmployee),
        fmt(emp.taxableIncome), fmt(emp.selfDeduction), fmt(emp.dependentDeduction), emp.dependentCount,
        fmt(emp.pitAmount), fmt(emp.netSalary), fmt(emp.totalLaborCost),
      ];
      const dataRow = ws.addRow(rowData);
      dataRow.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
        if (colNumber >= 4) {
          cell.alignment = { horizontal: 'right' };
        }
      });

      totals.grossSalary      += emp.grossSalary;
      totals.bhxhEmployee     += emp.bhxhEmployee;
      totals.bhytEmployee     += emp.bhytEmployee;
      totals.bhtnEmployee     += emp.bhtnEmployee;
      totals.taxableIncome    += emp.taxableIncome;
      totals.selfDeduction    += emp.selfDeduction;
      totals.dependentDeduction += emp.dependentDeduction;
      totals.pitAmount        += emp.pitAmount;
      totals.netSalary        += emp.netSalary;
      totals.totalLaborCost   += emp.totalLaborCost;
    }

    // Total row
    const totalRow = ws.addRow([
      '', 'TỔNG CỘNG', '',
      fmt(totals.grossSalary), fmt(totals.bhxhEmployee), fmt(totals.bhytEmployee), fmt(totals.bhtnEmployee),
      fmt(totals.taxableIncome), fmt(totals.selfDeduction), fmt(totals.dependentDeduction), '',
      fmt(totals.pitAmount), fmt(totals.netSalary), fmt(totals.totalLaborCost),
    ]);
    totalRow.eachCell((cell, colNumber) => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
      if (colNumber >= 4) cell.alignment = { horizontal: 'right' };
    });

    ws.columns = [
      { width: 5 }, { width: 28 }, { width: 28 },
      { width: 18 }, { width: 14 }, { width: 14 }, { width: 14 },
      { width: 18 }, { width: 16 }, { width: 20 }, { width: 8 },
      { width: 16 }, { width: 16 }, { width: 20 },
    ];

    return wb.xlsx.writeBuffer() as unknown as Promise<Buffer>;
  }

  // ── Báo cáo chi phí lao động theo kỳ ─────────────────────────────────────
  async generateLaborCostReport(periodId: string): Promise<Buffer> {
    const period = await this.prisma.payrollPeriod.findUnique({
      where: { id: periodId },
    });
    if (!period) throw new NotFoundException(`Kỳ lương ${periodId} không tìm thấy`);

    const records = await this.prisma.payrollRecord.findMany({
      where: { periodId },
      include: {
        employee: { include: { user: { select: { name: true, email: true } } } },
      },
      orderBy: { employee: { user: { name: 'asc' } } },
    });

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Loop 360';
    wb.created = new Date();

    const ws = wb.addWorksheet('Chi phí lao động');

    ws.mergeCells('A1:L1');
    ws.getCell('A1').value = `BÁO CÁO CHI PHÍ LAO ĐỘNG — ${period.name} (${dayjs(period.startDate).format('DD/MM/YYYY')} – ${dayjs(period.endDate).format('DD/MM/YYYY')})`;
    ws.getCell('A1').font = { bold: true, size: 12, color: { argb: 'FF1D4ED8' } };
    ws.getCell('A1').alignment = { horizontal: 'center' };

    ws.getRow(3).values = [
      'STT', 'Họ tên', 'Ngày công', 'Lương gộp (đ)',
      'BHXH NLĐ', 'BHYT NLĐ', 'BHTN NLĐ',
      'Thuế TNCN (đ)',
      'BHXH NSDLĐ', 'BHYT NSDLĐ', 'BHTN+TNLĐ NSDLĐ',
      'Tổng CP (đ)',
    ];

    const headerRow = ws.getRow(3);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } };
      cell.alignment = { horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' },
      };
    });
    headerRow.height = 36;

    let stt = 1;
    let totalCost = 0;
    let totalGross = 0;
    let totalPit = 0;

    for (const r of records) {
      const rowData = [
        stt++, r.employee.user?.name ?? '—', r.workDays,
        fmt(Number(r.grossSalary)),
        fmt(Number(r.bhxhEmployee)), fmt(Number(r.bhytEmployee)), fmt(Number(r.bhtnEmployee)),
        fmt(Number(r.pitAmount)),
        fmt(Number(r.bhxhEmployer)), fmt(Number(r.bhytEmployer)),
        fmt(Number(r.bhtnEmployer) + Number(r.tnldEmployer)),
        fmt(Number(r.totalLaborCost)),
      ];
      const dataRow = ws.addRow(rowData);
      dataRow.eachCell((cell, colNumber) => {
        if (colNumber >= 3) cell.alignment = { horizontal: 'right' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
      });

      totalCost  += Number(r.totalLaborCost);
      totalGross += Number(r.grossSalary);
      totalPit   += Number(r.pitAmount);
    }

    const totalRow = ws.addRow([
      '', 'TỔNG CỘNG', '',
      fmt(totalGross), '', '', '', fmt(totalPit), '', '', '', fmt(totalCost),
    ]);
    totalRow.eachCell((cell, colNumber) => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
      if (colNumber >= 3) cell.alignment = { horizontal: 'right' };
    });

    ws.columns = [
      { width: 5 }, { width: 28 }, { width: 10 }, { width: 18 },
      { width: 14 }, { width: 14 }, { width: 14 }, { width: 16 },
      { width: 14 }, { width: 14 }, { width: 18 }, { width: 18 },
    ];

    return wb.xlsx.writeBuffer() as unknown as Promise<Buffer>;
  }
}
