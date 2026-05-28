import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;
  private readonly from: string;

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT ?? 587);
    const user = process.env.SMTP_USER ?? '';
    const pass = process.env.SMTP_PASS;
    this.from = process.env.SMTP_FROM ?? user;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
    } else {
      this.logger.warn('SMTP not configured — email notifications disabled');
    }
  }

  async sendNotificationEmail(to: string, name: string, subject: string, body: string): Promise<void> {
    if (!this.transporter) return;
    await this.transporter
      .sendMail({
        from: this.from,
        to,
        subject,
        html: `<p>Xin chào <strong>${name}</strong>,</p><p>${body}</p><hr><p style="color:#888;font-size:12px">— Loop System</p>`,
      })
      .catch((e) => this.logger.error('Email send failed', e));
  }

  async sendHtml(to: string, subject: string, html: string): Promise<void> {
    if (!this.transporter) return;
    await this.transporter
      .sendMail({ from: this.from, to, subject, html })
      .catch((e) => this.logger.error('HTML email send failed', e));
  }

  async sendPayslipEmail(
    to: string,
    name: string,
    periodName: string,
    _storagePath: string,
    netSalary: number,
  ): Promise<void> {
    if (!this.transporter) return;
    const netFmt = netSalary.toLocaleString('vi-VN');
    const appUrl = process.env.APP_URL ?? 'http://localhost:5173';
    await this.transporter
      .sendMail({
        from: this.from,
        to,
        subject: `[Loop 360] Phiếu lương ${periodName} đã sẵn sàng`,
        html: `
<div style="font-family:sans-serif;max-width:520px;margin:0 auto">
  <h2 style="color:#1D4ED8">Phiếu lương ${periodName}</h2>
  <p>Xin chào <strong>${name}</strong>,</p>
  <p>Phiếu lương của bạn cho kỳ <strong>${periodName}</strong> đã được phát hành.</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <tr>
      <td style="padding:8px;color:#475569">Lương thực nhận (Net)</td>
      <td style="padding:8px;text-align:right;font-weight:bold;font-size:18px;color:#1D4ED8">${netFmt} đ</td>
    </tr>
  </table>
  <p>
    <a href="${appUrl}/payroll/my-payslips"
       style="display:inline-block;background:#1D4ED8;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none">
      Xem chi tiết phiếu lương
    </a>
  </p>
  <hr style="border:none;border-top:1px solid #E2E8F0;margin:24px 0">
  <p style="color:#94A3B8;font-size:12px">— Loop 360 HR System</p>
</div>`,
      })
      .catch((e) => this.logger.error('Payslip email send failed', e));
  }
}
