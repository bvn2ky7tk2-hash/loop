import { Injectable, Inject, Optional } from '@nestjs/common';
import { Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationQueueService } from './notification-queue.service';
import { paginate, PaginatedResult } from '../common/dto/pagination.dto';
import type { NotificationType } from '../generated/prisma';
import { TenantAwareService } from '../common/services/tenant-aware.service';

export interface CreateInAppDto {
  title: string;
  body: string;
  type: string;
  link?: string;
  entityType?: string;
  entityId?: string;
}

@Injectable({ scope: Scope.REQUEST })
export class NotificationsService extends TenantAwareService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: NotificationQueueService,
    @Optional() @Inject(REQUEST) req?: any,
  ) {
    super(req);
  }

  private getTenantFilter() {
    const tid = this.getTenantId();
    return tid ? { user: { tenantId: tid } } : {};
  }

  async getForUser(
    userId: string,
    page = 1,
    limit = 20,
    unreadOnly = false,
  ): Promise<PaginatedResult<unknown>> {
    const tenantFilter = this.getTenantFilter();
    const where = { userId, ...(unreadOnly ? { isRead: false } : {}), ...tenantFilter };
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
    const tenantFilter = this.getTenantFilter();
    return this.prisma.notification.updateMany({
      where: { id, userId, ...tenantFilter },
      data: { isRead: true },
    });
  }

  async markAllRead(userId: string) {
    const tenantFilter = this.getTenantFilter();
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false, ...tenantFilter },
      data: { isRead: true },
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    const tenantFilter = this.getTenantFilter();
    return this.prisma.notification.count({ where: { userId, isRead: false, ...tenantFilter } });
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

  // ─── E23.4 Notification Preferences ────────────────────────────────────────

  /** Trả về danh sách tùy chọn thông báo của user, đảm bảo đủ 8 module mặc định */
  async getPreferences(userId: string): Promise<{ data: unknown[] }> {
    const MODULES = ['TASK', 'LEAVE', 'EXPENSE', 'TIMESHEET', 'CONTRACT', 'PAYROLL', 'BPM', 'ALERT'];

    const existing = await this.prisma.notificationPreference.findMany({
      where: { userId },
    });

    const existingMap = new Map(existing.map((p) => [p.moduleType, p]));

    // Đảm bảo tất cả module có preference — tạo nếu thiếu
    const missing = MODULES.filter((m) => !existingMap.has(m));
    if (missing.length) {
      await this.prisma.notificationPreference.createMany({
        data: missing.map((moduleType) => ({ userId, moduleType, channel: 'BOTH' as never })),
        skipDuplicates: true,
      });
    }

    const all = await this.prisma.notificationPreference.findMany({
      where: { userId },
      orderBy: { moduleType: 'asc' },
    });

    return { data: all };
  }

  /** Upsert preference cho một module */
  async upsertPreference(
    userId: string,
    moduleType: string,
    channel: 'EMAIL' | 'IN_APP' | 'BOTH',
  ): Promise<{ data: unknown }> {
    const pref = await this.prisma.notificationPreference.upsert({
      where: { userId_moduleType: { userId, moduleType } },
      update: { channel: channel as never },
      create: { userId, moduleType, channel: channel as never },
    });
    return { data: pref };
  }
}
