import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertSmtpConfigDto } from './dto/upsert-smtp-config.dto';
import * as nodemailer from 'nodemailer';

@Injectable()
export class SmtpConfigService {
  private readonly logger = new Logger(SmtpConfigService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getConfig(tenantId: string) {
    const config = await this.prisma.tenantSmtpConfig.findUnique({ where: { tenantId } });
    if (!config) return null;
    // Mask password before returning
    return { ...config, password: '••••••••' };
  }

  async upsertConfig(tenantId: string, dto: UpsertSmtpConfigDto) {
    const data = {
      host:      dto.host,
      port:      dto.port,
      user:      dto.user,
      password:  dto.password,
      fromEmail: dto.fromEmail,
      fromName:  dto.fromName,
      isActive:  dto.isActive ?? true,
    };

    const config = await this.prisma.tenantSmtpConfig.upsert({
      where:  { tenantId },
      update: data,
      create: { tenantId, ...data },
    });
    return { ...config, password: '••••••••' };
  }

  async testConfig(tenantId: string, to: string) {
    const config = await this.prisma.tenantSmtpConfig.findUnique({ where: { tenantId } });
    if (!config) throw new NotFoundException('Chưa cấu hình SMTP');
    if (!config.isActive) throw new BadRequestException('SMTP đang tắt');

    try {
      const transporter = nodemailer.createTransport({
        host:   config.host,
        port:   config.port,
        secure: config.port === 465,
        auth:   { user: config.user, pass: config.password },
      });

      await transporter.sendMail({
        from:    `"${config.fromName}" <${config.fromEmail}>`,
        to,
        subject: '[Loop 360] Test email từ SMTP Configuration',
        html:    '<p>Email này xác nhận cấu hình SMTP của bạn hoạt động thành công.</p><p style="color:#888;font-size:12px">— Loop 360 System</p>',
      });

      return { success: true, message: `Email test đã gửi thành công đến ${to}` };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('SMTP test failed', message);
      throw new BadRequestException(`Gửi email thất bại: ${message}`);
    }
  }
}
