import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertNotifTemplateDto } from './dto/upsert-template.dto';
import { DEFAULT_TEMPLATES } from './notification-templates.constants';

@Injectable()
export class NotificationTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  /** List all keys with DB override or default */
  async listAll(tenantId?: string | null) {
    const dbRecords = await this.prisma.notificationTemplate.findMany({
      where: { tenantId: tenantId ?? null },
      take: 200,
    });
    const dbMap = new Map(dbRecords.map((r) => [r.key, r]));

    return Object.entries(DEFAULT_TEMPLATES).map(([key, defaults]) => {
      const db = dbMap.get(key);
      return {
        key,
        description:  defaults.description,
        subject:      db?.subject  ?? defaults.subject,
        bodyHtml:     db?.bodyHtml ?? defaults.bodyHtml,
        isCustomized: !!db,
        updatedAt:    db?.updatedAt ?? null,
      };
    });
  }

  /** Get single template (DB override or default) */
  async getOne(key: string, tenantId?: string | null) {
    const defaults = DEFAULT_TEMPLATES[key];
    if (!defaults) throw new NotFoundException(`Template key "${key}" không tồn tại`);

    const db = await this.prisma.notificationTemplate.findUnique({
      where: { tenantId_key: { tenantId: tenantId ?? null, key } as any },
    }).catch(() => null);

    // Prisma @@unique([tenantId, key]) — tenantId nullable: use findFirst fallback
    const dbRecord = db ?? await this.prisma.notificationTemplate.findFirst({
      where: { tenantId: tenantId ?? null, key },
    });

    return {
      key,
      description:  defaults.description,
      subject:      dbRecord?.subject  ?? defaults.subject,
      bodyHtml:     dbRecord?.bodyHtml ?? defaults.bodyHtml,
      isCustomized: !!dbRecord,
      defaultSubject:  defaults.subject,
      defaultBodyHtml: defaults.bodyHtml,
    };
  }

  /** Upsert customized template */
  async upsert(key: string, dto: UpsertNotifTemplateDto, tenantId?: string | null) {
    if (!DEFAULT_TEMPLATES[key]) throw new NotFoundException(`Template key "${key}" không tồn tại`);

    return this.prisma.notificationTemplate.upsert({
      where: {
        tenantId_key: { tenantId: tenantId as string, key },
      },
      update: { subject: dto.subject, bodyHtml: dto.bodyHtml },
      create: { key, subject: dto.subject, bodyHtml: dto.bodyHtml, tenantId: tenantId ?? null },
    });
  }

  /** Reset to default (delete custom) */
  async reset(key: string, tenantId?: string | null) {
    if (!DEFAULT_TEMPLATES[key]) throw new NotFoundException(`Template key "${key}" không tồn tại`);

    await this.prisma.notificationTemplate.deleteMany({
      where: { key, tenantId: tenantId ?? null },
    });

    return DEFAULT_TEMPLATES[key];
  }

  /** Resolve template for sending — used by other services */
  async resolve(key: string, tenantId?: string | null): Promise<{ subject: string; bodyHtml: string }> {
    const defaults = DEFAULT_TEMPLATES[key];
    if (!defaults) return { subject: '', bodyHtml: '' };

    const db = await this.prisma.notificationTemplate.findFirst({
      where: { key, tenantId: tenantId ?? null },
    });

    return {
      subject:  db?.subject  ?? defaults.subject,
      bodyHtml: db?.bodyHtml ?? defaults.bodyHtml,
    };
  }
}
