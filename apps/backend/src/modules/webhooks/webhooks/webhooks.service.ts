import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { paginate, PaginatedResult } from '../common/dto/pagination.dto';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';
import type { WebhookEndpoint, WebhookLog } from '../generated/prisma';

@Injectable()
export class WebhooksService {
  constructor(private readonly prisma: PrismaService) {}

  async listEndpoints(page = 1, limit = 50): Promise<PaginatedResult<WebhookEndpoint>> {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.webhookEndpoint.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.webhookEndpoint.count(),
    ]);
    return paginate(data, total, page, limit);
  }

  async createEndpoint(dto: CreateWebhookDto): Promise<WebhookEndpoint> {
    return this.prisma.webhookEndpoint.create({ data: dto });
  }

  async updateEndpoint(id: string, dto: UpdateWebhookDto): Promise<WebhookEndpoint> {
    await this.findEndpointOrThrow(id);
    return this.prisma.webhookEndpoint.update({ where: { id }, data: dto });
  }

  async deleteEndpoint(id: string): Promise<void> {
    await this.findEndpointOrThrow(id);
    await this.prisma.webhookEndpoint.delete({ where: { id } });
  }

  async toggleEndpoint(id: string, isActive: boolean): Promise<WebhookEndpoint> {
    await this.findEndpointOrThrow(id);
    return this.prisma.webhookEndpoint.update({ where: { id }, data: { isActive } });
  }

  async listLogs(endpointId: string, page = 1, limit = 50): Promise<PaginatedResult<WebhookLog>> {
    await this.findEndpointOrThrow(endpointId);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.webhookLog.findMany({
        where: { endpointId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { sentAt: 'desc' },
      }),
      this.prisma.webhookLog.count({ where: { endpointId } }),
    ]);
    return paginate(data, total, page, limit);
  }

  /** Gọi tất cả active endpoint đang subscribe event, log kết quả, retry 3 lần */
  async deliver(event: string, payload: object): Promise<void> {
    const endpoints = await this.prisma.webhookEndpoint.findMany({
      where: { isActive: true, events: { has: event } },
      take: 200,
    });

    await Promise.allSettled(endpoints.map((ep) => this.deliverToEndpoint(ep.id, ep.url, ep.secret ?? null, event, payload)));
  }

  private async deliverToEndpoint(
    endpointId: string,
    url: string,
    secret: string | null,
    event: string,
    payload: object,
    maxAttempts = 3,
  ): Promise<void> {
    let lastStatusCode: number | null = null;
    let lastResponse: string | null = null;
    let success = false;
    let attempt = 0;

    const body = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (secret) {
      // HMAC-SHA256 signature header
      const { createHmac } = await import('crypto');
      const sig = createHmac('sha256', secret).update(body).digest('hex');
      headers['X-Loop-Signature'] = `sha256=${sig}`;
    }

    for (attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 10_000);
        const res = await fetch(url, { method: 'POST', headers, body, signal: ctrl.signal });
        clearTimeout(timer);

        lastStatusCode = res.status;
        lastResponse = (await res.text()).slice(0, 2000);
        success = res.ok;
        if (success) break;
      } catch (err: unknown) {
        lastResponse = err instanceof Error ? err.message : String(err);
        lastStatusCode = null;
        success = false;
      }

      // Exponential backoff: 1s → 2s → 4s (chỉ khi còn lần thử tiếp)
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 1000 * 2 ** (attempt - 1)));
      }
    }

    await this.prisma.webhookLog.create({
      data: {
        endpointId,
        event,
        payload: payload as object,
        statusCode: lastStatusCode,
        response: lastResponse,
        success,
        attemptCount: attempt,
      },
    });
  }

  /** Gửi test payload đến một endpoint */
  async sendTestPayload(id: string): Promise<{ success: boolean; statusCode: number | null; response: string | null }> {
    const ep = await this.findEndpointOrThrow(id);
    const testPayload = { message: 'Loop webhook test', endpoint: ep.name };

    await this.deliverToEndpoint(ep.id, ep.url, ep.secret ?? null, 'webhook.test', testPayload, 1);

    const log = await this.prisma.webhookLog.findFirst({
      where: { endpointId: id, event: 'webhook.test' },
      orderBy: { sentAt: 'desc' },
    });

    return { success: log?.success ?? false, statusCode: log?.statusCode ?? null, response: log?.response ?? null };
  }

  private async findEndpointOrThrow(id: string): Promise<WebhookEndpoint> {
    const ep = await this.prisma.webhookEndpoint.findUnique({ where: { id } });
    if (!ep) throw new NotFoundException('Webhook endpoint không tìm thấy');
    return ep;
  }
}
