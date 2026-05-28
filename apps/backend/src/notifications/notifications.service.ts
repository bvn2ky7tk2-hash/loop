import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationQueueService } from './notification-queue.service';
import { paginate, PaginatedResult } from '../common/dto/pagination.dto';
import type { NotificationType } from '../generated/prisma';

export interface CreateInAppDto {
  title: string;
  body: string;
  type: string;
  link?: string;
  entityType?: string;
  entityId?: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: NotificationQueueService,
  ) {}

  async getForUser(
    userId: string,
    page = 1,
    limit = 20,
    unreadOnly = false,
  ): Promise<PaginatedResult<unknown>> {
    const where = { userId, ...(unreadOnly ? { isRead: false } : {}) };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);
    return paginate(data, total, page, limit);
  }

  async markRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, isRead: false } });
  }

  /** Tạo in-app notification — dùng bởi các module khác, không gửi push/Telegram */
  async createInApp(userId: string, data: CreateInAppDto): Promise<void> {
    await this.prisma.notification.create({
      data: {
        userId,
        type: data.type as NotificationType,
        title: data.title,
        body: data.body,
        link: data.link ?? null,
        entityType: data.entityType ?? null,
        entityId: data.entityId ?? null,
      },
    });
  }

  async registerPushToken(userId: string, token: string, platform: string) {
    return this.prisma.pushToken.upsert({
      where: { token },
      update: { userId, platform },
      create: { userId, token, platform },
    });
  }

  async removePushToken(token: string) {
    return this.prisma.pushToken.delete({ where: { token } });
  }

  async createAndDeliver(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    payload: Record<string, unknown> = {},
    entityType?: string,
    entityId?: string,
    link?: string,
  ): Promise<void> {
    await this.prisma.notification.create({
      data: { userId, type, title, body, payload: payload as never, entityType, entityId, link: link ?? null },
    });

    await this.queue.enqueue({ userId, type, title, body });
  }
}
