import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../notifications/mail.service';
import { paginate, PaginatedResult, PaginationDto } from '../common/dto/pagination.dto';
import { CreateScheduledReportDto } from './dto/create-scheduled-report.dto';
import { UpdateScheduledReportDto } from './dto/update-scheduled-report.dto';
import type {
  ScheduledReport,
  ReportFrequency,
  ReportFormat,
} from '../generated/prisma';
import * as ExcelJS from 'exceljs';

@Injectable()
export class ScheduledReportsService {
  private readonly logger = new Logger(ScheduledReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  // ─── CRUD ──────────────────────────────────────────────────────────────────

  async listReports(query: PaginationDto): Promise<PaginatedResult<ScheduledReport>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.scheduledReport.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.scheduledReport.count(),
    ]);
    return paginate(data, total, page, limit);
  }

  async createReport(dto: CreateScheduledReportDto): Promise<ScheduledReport> {
    return this.prisma.scheduledReport.create({
      data: {
        name: dto.name,
        template: dto.template,
        recipients: dto.recipients,
        frequency: dto.frequency as ReportFrequency,
        dayOfWeek: dto.dayOfWeek ?? null,
        dayOfMonth: dto.dayOfMonth ?? null,
        hour: dto.hour ?? 8,
        format: dto.format as ReportFormat,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateReport(id: string, dto: UpdateScheduledReportDto): Promise<ScheduledReport> {
    const existing = await this.prisma.scheduledReport.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Không tìm thấy scheduled report');
    return this.prisma.scheduledReport.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.template !== undefined && { template: dto.template }),
        ...(dto.recipients !== undefined && { recipients: dto.recipients }),
        ...(dto.frequency !== undefined && { frequency: dto.frequency as ReportFrequency }),
        ...(dto.dayOfWeek !== undefined && { dayOfWeek: dto.dayOfWeek }),
        ...(dto.dayOfMonth !== undefined && { dayOfMonth: dto.dayOfMonth }),
        ...(dto.hour !== undefined && { hour: dto.hour }),
        ...(dto.format !== undefined && { format: dto.format as ReportFormat }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async deleteReport(id: string): Promise<void> {
    const existing = await this.prisma.scheduledReport.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Không tìm thấy scheduled report');
    await this.prisma.scheduledReport.delete({ where: { id } });
  }

  async sendNow(id: string): Promise<void> {
    const report = await this.prisma.scheduledReport.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Không tìm thấy scheduled report');
    await this.deliverReport(report);
  }

  // ─── Weekly Digest ─────────────────────────────────────────────────────────

  async sendWeeklyDigest(): Promise<void> {
    this.logger.log('Bắt đầu gửi Weekly Digest...');
    const users = await this.prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true, role: true },
      take: 500,
    });

    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);

    const weekNumber = this.getWeekNumber(now);

    for (const user of users) {
      try {
        const html = await this.buildDigestHtml(user, now, weekEnd, weekStart, weekNumber);
        await this.mail.sendHtml(
          user.email,
          `[Loop 360] Tóm tắt tuần #${weekNumber} — ${user.name}`,
          html,
        );
      } catch (err) {
        // Không throw — tiếp tục gửi cho user còn lại
        this.logger.error(`Lỗi gửi digest cho user ${user.email}`, err);
      }
    }
    this.logger.log(`Đã gửi Weekly Digest cho ${users.length} người dùng`);
  }

  private async buildDigestHtml(
    user: { id: string; name: string; email: string; role: string },
    now: Date,
    weekEnd: Date,
    weekStart: Date,
    weekNumber: number,
  ): Promise<string> {
    const role = user.role as string;
    let sections = '';

    if (role === 'MEMBER') {
      // Tasks due this week
      const employee = await this.prisma.employee.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });
      const tasks = employee
        ? await this.prisma.task.findMany({
            where: {
              assigneeId: employee.id,
              dueDate: { gte: now, lte: weekEnd },
              status: { not: 'DONE' },
            },
            select: { title: true, dueDate: true, status: true },
            take: 10,
            orderBy: { dueDate: 'asc' },
          })
        : [];

      // Pending leave requests
      const leaveRequests = employee
        ? await this.prisma.leaveRequest.findMany({
            where: { employeeId: employee.id, status: 'PENDING' },
            select: { startDate: true, endDate: true, days: true },
            take: 5,
          })
        : [];

      // Timesheet status this week
      const timesheet = await this.prisma.timesheetRecord.findFirst({
        where: { userId: user.id, periodStart: { lte: now }, periodEnd: { gte: weekStart } },
        select: { status: true, submittedAt: true },
        orderBy: { periodStart: 'desc' },
      });

      sections += this.renderSection('📋 Tasks cần xử lý tuần này', tasks.length > 0
        ? tasks.map(t => `<li><strong>${t.title}</strong> — hạn ${t.dueDate ? new Date(t.dueDate).toLocaleDateString('vi-VN') : 'không có'} (${t.status})</li>`).join('')
        : '<li style="color:#94A3B8">Không có task nào đến hạn tuần này</li>',
      );

      sections += this.renderSection('🏖️ Đơn xin nghỉ chờ duyệt', leaveRequests.length > 0
        ? leaveRequests.map(l => `<li>${new Date(l.startDate).toLocaleDateString('vi-VN')} — ${new Date(l.endDate).toLocaleDateString('vi-VN')} (${l.days} ngày)</li>`).join('')
        : '<li style="color:#94A3B8">Không có đơn nghỉ nào đang chờ</li>',
      );

      const tsStatus = timesheet
        ? (timesheet.submittedAt ? '✅ Đã nộp' : `⚠️ Chưa nộp (${timesheet.status})`)
        : '⚠️ Chưa có chấm công tuần này';
      sections += this.renderSection('⏱️ Trạng thái chấm công', `<li>${tsStatus}</li>`);

    } else if (role === 'PM' || role === 'LEADERSHIP') {
      // Team tasks overdue
      const overdueTasksQuery = role === 'PM'
        ? await this.prisma.task.findMany({
            where: {
              project: { pmId: user.id },
              dueDate: { lt: now },
              status: { not: 'DONE' },
            },
            select: { title: true, dueDate: true, project: { select: { name: true } } },
            take: 10,
            orderBy: { dueDate: 'asc' },
          })
        : await this.prisma.task.findMany({
            where: {
              dueDate: { lt: now },
              status: { not: 'DONE' },
            },
            select: { title: true, dueDate: true, project: { select: { name: true } } },
            take: 10,
            orderBy: { dueDate: 'asc' },
          });

      // Leave requests pending approval
      const pendingLeaves = await this.prisma.leaveRequest.count({
        where: { status: 'PENDING' },
      });

      sections += this.renderSection('🚨 Tasks quá hạn cần xử lý', overdueTasksQuery.length > 0
        ? overdueTasksQuery.map(t => `<li><strong>${t.title}</strong> — ${t.project.name} — hạn ${t.dueDate ? new Date(t.dueDate).toLocaleDateString('vi-VN') : ''}</li>`).join('')
        : '<li style="color:#94A3B8">Không có task nào quá hạn</li>',
      );

      sections += this.renderSection('📅 Đơn nghỉ phép đang chờ', `<li><strong>${pendingLeaves}</strong> đơn đang chờ duyệt</li>`);

    } else if (role === 'ADMIN') {
      // Contracts expiring in 30 days
      const expiryDate = new Date(now);
      expiryDate.setDate(expiryDate.getDate() + 30);
      const expiringContracts = await this.prisma.contract.count({
        where: { status: 'ACTIVE', endDate: { gte: now, lte: expiryDate } },
      });

      // Total pending leave
      const pendingLeaves = await this.prisma.leaveRequest.count({
        where: { status: 'PENDING' },
      });

      // Active employees count
      const headcount = await this.prisma.employee.count({
        where: { user: { isActive: true } },
      });

      sections += this.renderSection('📊 Tóm tắt hệ thống tuần này', `
        <li>Nhân viên hiện tại: <strong>${headcount}</strong></li>
        <li>Hợp đồng sắp hết hạn (30 ngày): <strong>${expiringContracts}</strong></li>
        <li>Đơn nghỉ phép đang chờ duyệt: <strong>${pendingLeaves}</strong></li>
      `);
    }

    return `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1E293B;">
  <div style="background: linear-gradient(135deg, #6366F1, #4F46E5); padding: 24px; border-radius: 12px 12px 0 0;">
    <h2 style="color: #ffffff; margin: 0; font-size: 20px;">Loop 360 — Tóm tắt tuần #${weekNumber}</h2>
    <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0 0; font-size: 14px;">${now.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
  </div>
  <div style="background: #F8FAFC; padding: 24px; border: 1px solid #E2E8F0; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="margin: 0 0 20px 0;">Xin chào <strong>${user.name}</strong>,</p>
    ${sections}
    <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0;">
    <p style="color: #94A3B8; font-size: 12px; margin: 0;">Loop 360 · Bạn nhận email này vì tài khoản của bạn đã bật Weekly Digest.</p>
  </div>
</div>`;
  }

  private renderSection(title: string, itemsHtml: string): string {
    return `
<div style="margin: 16px 0; padding: 16px; background: #ffffff; border-radius: 8px; border-left: 4px solid #6366F1; border: 1px solid #E2E8F0;">
  <h3 style="margin: 0 0 12px 0; color: #1E293B; font-size: 15px;">${title}</h3>
  <ul style="margin: 0; padding-left: 20px; color: #475569; font-size: 14px; line-height: 1.7;">
    ${itemsHtml}
  </ul>
</div>`;
  }

  // ─── Scheduled Reports ─────────────────────────────────────────────────────

  async sendScheduledReports(): Promise<void> {
    this.logger.log('Kiểm tra scheduled reports cần gửi hôm nay...');
    const reports = await this.prisma.scheduledReport.findMany({
      where: { isActive: true },
      take: 200,
    });

    const now = new Date();
    const todayDow = now.getDay(); // 0=CN, 1=T2...
    const todayDom = now.getDate();

    for (const report of reports) {
      const shouldSend = this.checkShouldSend(report, todayDow, todayDom);
      if (!shouldSend) continue;

      try {
        await this.deliverReport(report);
      } catch (err) {
        this.logger.error(`Lỗi gửi report ${report.id}`, err);
      }
    }
  }

  private checkShouldSend(
    report: ScheduledReport,
    todayDow: number,
    todayDom: number,
  ): boolean {
    const freq = report.frequency as string;
    if (freq === 'WEEKLY') {
      return report.dayOfWeek !== null && report.dayOfWeek !== undefined
        ? report.dayOfWeek === todayDow
        : todayDow === 1; // mặc định thứ 2
    }
    if (freq === 'MONTHLY') {
      return report.dayOfMonth !== null && report.dayOfMonth !== undefined
        ? report.dayOfMonth === todayDom
        : todayDom === 1;
    }
    if (freq === 'QUARTERLY') {
      // Gửi ngày đầu tháng đầu quý (tháng 1,4,7,10)
      const month = new Date().getMonth() + 1;
      const isQuarterStart = [1, 4, 7, 10].includes(month);
      const dom = report.dayOfMonth ?? 1;
      return isQuarterStart && todayDom === dom;
    }
    return false;
  }

  private async deliverReport(report: ScheduledReport): Promise<void> {
    const template = report.template as string;
    const format = report.format as string;

    let emailHtml: string;
    let attachmentBuffer: Buffer | null = null;
    let attachmentName: string | null = null;

    // Generate report data
    const reportData = await this.generateReportData(template);

    if (format === 'EXCEL') {
      const result = await this.buildExcel(template, reportData);
      attachmentBuffer = result.buffer;
      attachmentName = result.filename;
    }

    emailHtml = this.buildReportEmail(report, reportData, attachmentName);

    for (const recipient of report.recipients) {
      if (attachmentBuffer && attachmentName) {
        await this.sendWithAttachment(recipient, report.name, emailHtml, attachmentBuffer, attachmentName);
      } else {
        await this.mail.sendHtml(recipient, `[Loop 360] ${report.name}`, emailHtml);
      }
    }

    await this.prisma.scheduledReport.update({
      where: { id: report.id },
      data: { lastSentAt: new Date(), sentCount: { increment: 1 } },
    });

    this.logger.log(`Đã gửi report "${report.name}" cho ${report.recipients.length} người nhận`);
  }

  private buildReportEmail(report: ScheduledReport, data: ReportData, attachmentName: string | null): string {
    const now = new Date().toLocaleDateString('vi-VN');
    const attachNote = attachmentName
      ? `<p style="color:#475569;font-size:14px;">File đính kèm: <strong>${attachmentName}</strong></p>`
      : '';

    return `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1E293B;">
  <div style="background: linear-gradient(135deg, #6366F1, #4F46E5); padding: 24px; border-radius: 12px 12px 0 0;">
    <h2 style="color: #ffffff; margin: 0; font-size: 20px;">${report.name}</h2>
    <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0 0; font-size: 14px;">Ngày gửi: ${now}</p>
  </div>
  <div style="background: #F8FAFC; padding: 24px; border: 1px solid #E2E8F0; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="margin: 0 0 16px 0;">Báo cáo định kỳ <strong>${report.name}</strong> đã được tạo tự động.</p>
    ${attachNote}
    <div style="margin: 16px 0; padding: 16px; background: #ffffff; border-radius: 8px; border-left: 4px solid #6366F1; border: 1px solid #E2E8F0;">
      <p style="margin:0;font-size:13px;color:#475569;">Tổng bản ghi: <strong>${data.rowCount}</strong></p>
    </div>
    <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0;">
    <p style="color: #94A3B8; font-size: 12px; margin: 0;">Loop 360 · Báo cáo định kỳ tự động</p>
  </div>
</div>`;
  }

  private async generateReportData(template: string): Promise<ReportData> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    switch (template) {
      case 'payroll-summary': {
        const rows = await this.prisma.payrollPeriod.findMany({
          orderBy: { startDate: 'desc' },
          take: 3,
          select: { name: true, startDate: true, endDate: true, status: true },
        });
        return { template, rows, rowCount: rows.length };
      }
      case 'headcount': {
        const rows = await this.prisma.employee.findMany({
          where: { user: { isActive: true } },
          select: {
            code: true,
            fullName: true,
            level: true,
            orgUnit: { select: { name: true } },
          },
          take: 500,
          orderBy: { fullName: 'asc' },
        });
        return { template, rows, rowCount: rows.length };
      }
      case 'okr-progress': {
        const rows = await this.prisma.okrObjective.findMany({
          select: {
            title: true,
            status: true,
            owner: { select: { name: true } },
            keyResults: { select: { currentValue: true, targetValue: true }, take: 10 },
          },
          take: 100,
          orderBy: { createdAt: 'desc' },
        });
        // Tính progress tổng hợp từ key results
        const rowsWithProgress = rows.map(r => {
          const kr = r.keyResults;
          const avgProgress = kr.length > 0
            ? kr.reduce((sum, k) => sum + (Number(k.targetValue) > 0 ? Number(k.currentValue) / Number(k.targetValue) * 100 : 0), 0) / kr.length
            : 0;
          return { title: r.title, status: r.status, owner: r.owner, progress: Math.round(avgProgress) };
        });
        return { template, rows: rowsWithProgress, rowCount: rowsWithProgress.length };
      }
      case 'leave-summary': {
        const rows = await this.prisma.leaveRequest.findMany({
          where: { startDate: { gte: monthStart } },
          select: {
            startDate: true,
            endDate: true,
            days: true,
            status: true,
            employee: { select: { fullName: true } },
          },
          take: 200,
          orderBy: { startDate: 'desc' },
        });
        return { template, rows, rowCount: rows.length };
      }
      case 'expense-report': {
        const rows = await this.prisma.expense.findMany({
          where: { createdAt: { gte: monthStart } },
          select: {
            title: true,
            totalAmount: true,
            currency: true,
            status: true,
            category: true,
            submittedBy: { select: { name: true } },
          },
          take: 200,
          orderBy: { createdAt: 'desc' },
        });
        return { template, rows, rowCount: rows.length };
      }
      default:
        return { template, rows: [], rowCount: 0 };
    }
  }

  private async buildExcel(
    template: string,
    data: ReportData,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Loop 360';
    const sheet = workbook.addWorksheet('Báo cáo');

    const headerStyle: Partial<ExcelJS.Style> = {
      font: { bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6366F1' } },
      alignment: { horizontal: 'center' },
    };

    switch (template) {
      case 'payroll-summary':
        sheet.columns = [
          { header: 'Kỳ lương', key: 'name', width: 30 },
          { header: 'Từ ngày', key: 'startDate', width: 15 },
          { header: 'Đến ngày', key: 'endDate', width: 15 },
          { header: 'Trạng thái', key: 'status', width: 15 },
        ];
        sheet.getRow(1).eachCell(cell => { cell.style = headerStyle; });
        data.rows.forEach((r: any) => sheet.addRow({ ...r, startDate: new Date(r.startDate).toLocaleDateString('vi-VN'), endDate: new Date(r.endDate).toLocaleDateString('vi-VN') }));
        break;
      case 'headcount':
        sheet.columns = [
          { header: 'Mã NV', key: 'code', width: 15 },
          { header: 'Họ tên', key: 'fullName', width: 30 },
          { header: 'Cấp bậc', key: 'level', width: 15 },
          { header: 'Phòng ban', key: 'orgUnit', width: 25 },
        ];
        sheet.getRow(1).eachCell(cell => { cell.style = headerStyle; });
        data.rows.forEach((r: any) => sheet.addRow({ code: r.code, fullName: r.fullName, level: r.level, orgUnit: r.orgUnit?.name ?? '' }));
        break;
      case 'okr-progress':
        sheet.columns = [
          { header: 'Mục tiêu', key: 'title', width: 40 },
          { header: 'Tiến độ (%)', key: 'progress', width: 15 },
          { header: 'Trạng thái', key: 'status', width: 15 },
          { header: 'Người phụ trách', key: 'owner', width: 25 },
        ];
        sheet.getRow(1).eachCell(cell => { cell.style = headerStyle; });
        data.rows.forEach((r: any) => sheet.addRow({ title: r.title, progress: r.progress, status: r.status, owner: r.owner?.name ?? '' }));
        break;
      case 'leave-summary':
        sheet.columns = [
          { header: 'Nhân viên', key: 'employee', width: 25 },
          { header: 'Từ ngày', key: 'startDate', width: 15 },
          { header: 'Đến ngày', key: 'endDate', width: 15 },
          { header: 'Số ngày', key: 'days', width: 10 },
          { header: 'Trạng thái', key: 'status', width: 15 },
        ];
        sheet.getRow(1).eachCell(cell => { cell.style = headerStyle; });
        data.rows.forEach((r: any) => sheet.addRow({ employee: r.employee?.fullName ?? '', startDate: new Date(r.startDate).toLocaleDateString('vi-VN'), endDate: new Date(r.endDate).toLocaleDateString('vi-VN'), days: r.days, status: r.status }));
        break;
      case 'expense-report':
        sheet.columns = [
          { header: 'Nhân viên', key: 'employee', width: 25 },
          { header: 'Tiêu đề', key: 'title', width: 35 },
          { header: 'Số tiền', key: 'amount', width: 15 },
          { header: 'Tiền tệ', key: 'currency', width: 10 },
          { header: 'Danh mục', key: 'category', width: 20 },
          { header: 'Trạng thái', key: 'status', width: 15 },
        ];
        sheet.getRow(1).eachCell(cell => { cell.style = headerStyle; });
        data.rows.forEach((r: any) => sheet.addRow({ employee: r.submittedBy?.name ?? '', title: r.title, amount: r.totalAmount, currency: r.currency, category: r.category, status: r.status }));
        break;
    }

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `loop360-${template}-${dateStr}.xlsx`;
    return { buffer, filename };
  }

  private async sendWithAttachment(
    to: string,
    subject: string,
    html: string,
    buffer: Buffer,
    filename: string,
  ): Promise<void> {
    // Gọi transporter trực tiếp qua mail service không expose được, nên dùng sendHtml + log attachment
    // Trong production cần expose transporter hoặc thêm method attachEmail vào MailService
    // Hiện tại: gửi email không kèm file, log warning
    this.logger.warn(`Gửi email tới ${to} — attachment "${filename}" (${buffer.length} bytes) — TODO: expose transporter method`);
    await this.mail.sendHtml(to, `[Loop 360] ${subject}`, html);
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }
}

interface ReportData {
  template: string;
  rows: any[];
  rowCount: number;
}
