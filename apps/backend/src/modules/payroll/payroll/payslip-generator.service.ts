import { Injectable } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';

const pdfmake = require('pdfmake/js');

const FONT_DIR = path.join(__dirname, '../../../../node_modules/pdfmake/fonts/Roboto');

const fonts = {
  Roboto: {
    normal:      path.join(FONT_DIR, 'Roboto-Regular.ttf'),
    bold:        path.join(FONT_DIR, 'Roboto-Medium.ttf'),
    italics:     path.join(FONT_DIR, 'Roboto-Italic.ttf'),
    bolditalics: path.join(FONT_DIR, 'Roboto-MediumItalic.ttf'),
  },
};

const fmt = (n: number | undefined | null, decimals = 0) =>
  (n ?? 0).toLocaleString('vi-VN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

function buildDocDef(payload: PayslipPayload) {
  const {
    employeeName, employeeEmail, periodName, startDate, endDate,
    baseSalary, overtimePay, allowances, bonus, grossSalary,
    bhxhEmployee, bhytEmployee, bhtnEmployee,
    taxableIncome, selfDeduction, dependentDeduction, dependentCount, pitAmount,
    netSalary,
    workDays, leaveDays, paidLeaveDays, unpaidLeaveDays, overtimeHours,
    totalLaborCost, generatedAt,
  } = payload;

  const rowStyle = { fontSize: 10 };
  const boldRow = { fontSize: 10, bold: true };
  const headerStyle = { fontSize: 11, bold: true, color: '#1D4ED8' };

  const separator = {
    table: { widths: ['*'], body: [[{ text: '', border: [false, true, false, false] }]] },
    margin: [0, 4, 0, 4],
    layout: { hLineColor: () => '#E2E8F0' },
  };

  const row = (label: string, value: string, bold = false) => [
    { text: label, style: bold ? boldRow : rowStyle, color: bold ? '#0F172A' : '#475569' },
    { text: value, style: bold ? boldRow : rowStyle, alignment: 'right', color: bold ? '#0F172A' : '#0F172A' },
  ];

  return {
    defaultStyle: { font: 'Roboto', fontSize: 10, color: '#0F172A' },
    pageSize: 'A4',
    pageMargins: [40, 60, 40, 60],
    content: [
      // ── Header ─────────────────────────────────────────────────────────
      {
        columns: [
          {
            stack: [
              { text: 'LOOP 360', fontSize: 18, bold: true, color: '#1D4ED8' },
              { text: 'Phiếu lương / Payslip', fontSize: 13, color: '#475569', margin: [0, 2, 0, 0] },
            ],
          },
          {
            stack: [
              { text: periodName, fontSize: 13, bold: true, alignment: 'right' },
              { text: `${startDate} → ${endDate}`, fontSize: 9, color: '#64748B', alignment: 'right', margin: [0, 2, 0, 0] },
            ],
          },
        ],
        margin: [0, 0, 0, 12],
      },
      separator,

      // ── Thông tin nhân viên ────────────────────────────────────────────
      { text: 'THÔNG TIN NHÂN VIÊN', style: headerStyle, margin: [0, 4, 0, 8] },
      {
        table: {
          widths: ['*', '*'],
          body: [
            [{ text: 'Họ tên', style: rowStyle, color: '#475569' }, { text: employeeName, style: boldRow }],
            [{ text: 'Email', style: rowStyle, color: '#475569' }, { text: employeeEmail, style: rowStyle }],
          ],
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 8],
      },
      separator,

      // ── Chấm công ─────────────────────────────────────────────────────
      { text: 'CHẤM CÔNG', style: headerStyle, margin: [0, 4, 0, 8] },
      {
        table: {
          widths: ['*', 'auto'],
          body: [
            row('Ngày công thực tế', `${workDays} ngày`),
            ...(leaveDays > 0 ? [row('Tổng ngày nghỉ', `${leaveDays} ngày`)] : []),
            ...(paidLeaveDays > 0 ? [row('  - Nghỉ phép có lương', `${paidLeaveDays} ngày`)] : []),
            ...(unpaidLeaveDays > 0 ? [row('  - Nghỉ không lương', `${unpaidLeaveDays} ngày`)] : []),
            ...(overtimeHours > 0 ? [row('Giờ làm thêm', `${overtimeHours} giờ`)] : []),
          ],
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 8],
      },
      separator,

      // ── Thu nhập ──────────────────────────────────────────────────────
      { text: 'THU NHẬP', style: headerStyle, margin: [0, 4, 0, 8] },
      {
        table: {
          widths: ['*', 'auto'],
          body: [
            row('Lương cơ bản', `${fmt(baseSalary)} đ`),
            ...(overtimePay > 0 ? [row('Lương OT', `${fmt(overtimePay)} đ`)] : []),
            ...(allowances > 0 ? [row('Phụ cấp', `${fmt(allowances)} đ`)] : []),
            ...(bonus > 0 ? [row('Thưởng', `${fmt(bonus)} đ`)] : []),
            row('Tổng thu nhập gộp', `${fmt(grossSalary)} đ`, true),
          ],
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 8],
      },
      separator,

      // ── Khấu trừ ──────────────────────────────────────────────────────
      { text: 'KHẤU TRỪ (NLĐ)', style: headerStyle, margin: [0, 4, 0, 8] },
      {
        table: {
          widths: ['*', 'auto'],
          body: [
            row('BHXH (8%)', `${fmt(bhxhEmployee)} đ`),
            row('BHYT (1.5%)', `${fmt(bhytEmployee)} đ`),
            row('BHTN (1%)', `${fmt(bhtnEmployee)} đ`),
            row('Thu nhập chịu thuế', `${fmt(taxableIncome)} đ`),
            row('Giảm trừ bản thân', `${fmt(selfDeduction)} đ`),
            ...(dependentCount > 0
              ? [row(`Giảm trừ người phụ thuộc (×${dependentCount})`, `${fmt(dependentDeduction)} đ`)]
              : []),
            row('Thuế TNCN', `${fmt(pitAmount)} đ`),
            row('Tổng khấu trừ', `${fmt(bhxhEmployee + bhytEmployee + bhtnEmployee + pitAmount)} đ`, true),
          ],
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 8],
      },
      separator,

      // ── Thực nhận ─────────────────────────────────────────────────────
      {
        table: {
          widths: ['*', 'auto'],
          body: [
            [
              { text: 'THỰC NHẬN (NET)', fontSize: 14, bold: true, color: '#1D4ED8' },
              { text: `${fmt(netSalary)} đ`, fontSize: 14, bold: true, color: '#1D4ED8', alignment: 'right' },
            ],
          ],
        },
        layout: 'noBorders',
        margin: [0, 8, 0, 8],
      },
      separator,

      // ── Chi phí NSDLĐ ─────────────────────────────────────────────────
      {
        stack: [
          { text: '* Tổng chi phí lao động (NSDLĐ): ', style: { fontSize: 9, color: '#64748B' }, margin: [0, 4, 0, 0] },
          { text: `${fmt(totalLaborCost)} đ`, style: { fontSize: 9, bold: true, color: '#64748B' } },
        ],
      },

      // ── Footer ────────────────────────────────────────────────────────
      {
        text: `Phiếu lương được tạo tự động ngày ${generatedAt} bởi hệ thống Loop 360. Mọi thắc mắc vui lòng liên hệ phòng Nhân sự.`,
        fontSize: 8,
        color: '#94A3B8',
        margin: [0, 20, 0, 0],
        alignment: 'center',
      },
    ],
  };
}

export interface PayslipPayload {
  employeeName: string;
  employeeEmail: string;
  periodName: string;
  startDate: string;
  endDate: string;
  baseSalary: number;
  overtimePay: number;
  allowances: number;
  bonus: number;
  grossSalary: number;
  bhxhEmployee: number;
  bhytEmployee: number;
  bhtnEmployee: number;
  taxableIncome: number;
  selfDeduction: number;
  dependentDeduction: number;
  dependentCount: number;
  pitAmount: number;
  netSalary: number;
  workDays: number;
  leaveDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  overtimeHours: number;
  totalLaborCost: number;
  generatedAt: string;
}

@Injectable()
export class PayslipGeneratorService {
  async generate(payload: PayslipPayload): Promise<Buffer> {
    const printer = new pdfmake(fonts);
    const docDef = buildDocDef(payload);
    const doc = printer.createPdfKitDocument(docDef);

    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      doc.end();
    });
  }
}
