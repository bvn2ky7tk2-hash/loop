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
}
