import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../notifications/mail.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

export interface EmailLogFilter {
  status?: string;
  module?: string;
  fromDate?: string;
  toDate?: string;
}

@Injectable()
export class EmailLogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async list(tenantId: string | null, filter: EmailLogFilter, pagination: PaginationDto) {
    const { page = 1, limit = 50 } = pagination;
    const where: Record<string, unknown> = {};

    if (tenantId) where.tenantId = tenantId;
    if (filter.status) where.status = filter.status;
    if (filter.module) where.module = filter.module;
    if (filter.fromDate || filter.toDate) {
      where.createdAt = {
        ...(filter.fromDate ? { gte: new Date(filter.fromDate) } : {}),
        ...(filter.toDate ? { lte: new Date(filter.toDate) } : {}),
      };
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.emailLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.emailLog.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async retry(id: string): Promise<void> {
    const log = await this.prisma.emailLog.findFirst({ where: { id } });
    if (!log) throw new NotFoundException('Email log không tồn tại');
    if (log.status !== 'FAILED') {
      throw new NotFoundException('Chỉ có thể retry email có trạng thái FAILED');
    }

    // Gửi lại email với subject dạng retry
    try {
      await this.mailService.sendHtml(
        log.toEmail,
        `[Retry] ${log.subject}`,
        `<p>Email này được gửi lại từ hệ thống Loop 360.</p><p>Subject gốc: ${log.subject}</p>`,
      );
      await this.prisma.emailLog.update({
        where: { id },
        data: { status: 'SENT', sentAt: new Date(), error: null },
      });
    } catch (e) {
      await this.prisma.emailLog.update({
        where: { id },
        data: { error: e instanceof Error ? e.message : String(e) },
      });
      throw e;
    }
  }
}
