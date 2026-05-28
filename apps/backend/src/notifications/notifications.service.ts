import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationQueueService } from './notification-queue.service';
import type { NotificationType } from '../generated/prisma';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: NotificationQueueService,
  ) {}

  async getForUser(userId: string, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: { userId, ...(unreadOnly ? { isRead: false } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
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
  ): Promise<void> {
    await this.prisma.notification.create({
      data: { userId, type, title, body, payload: payload as never, entityType, entityId },
    });

    await this.queue.enqueue({ userId, type, title, body });
  }
}
