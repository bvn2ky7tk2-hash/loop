import { Injectable, NotFoundException, BadRequestException, Inject, Optional } from '@nestjs/common';
import { Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { TenantAwareService } from '../common/services/tenant-aware.service';

const ATTACHMENT_ALLOWED_MIMES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'text/plain',
];
const ATTACHMENT_MAX_SIZE = 10 * 1024 * 1024; // 10MB

@Injectable({ scope: Scope.REQUEST })
export class BugAttachmentService extends TenantAwareService {
  private readonly bucket: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    config: ConfigService,
    @Optional() @Inject(REQUEST) req?: any,
  ) {
    super(req);
    this.bucket = config.get<string>('MINIO_BUCKET', 'loop-bug-attachments');
  }

  private getTenantFilter() {
    const tid = this.getTenantId();
    return tid ? { bug: { tenantId: tid } } : {};
  }

  async uploadFile(bugId: string, uploaderId: string, file: Express.Multer.File, tenantId?: string) {
    if (!file) {
      throw new BadRequestException('Thiếu file đính kèm');
    }
    if (!ATTACHMENT_ALLOWED_MIMES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Định dạng file không được hỗ trợ. Chỉ chấp nhận ảnh (png/jpeg/gif/webp), PDF, Word, Excel, ZIP, TXT',
      );
    }
    if (file.size > ATTACHMENT_MAX_SIZE) {
      throw new BadRequestException('File đính kèm không được vượt quá 10MB');
    }

    // KHÔNG dùng originalname làm storage filename (path injection / collision).
    // Sinh tên an toàn bằng UUID; tên gốc vẫn lưu vào cột `filename` để hiển thị.
    const ext = file.originalname.split('.').pop()?.toLowerCase() ?? 'bin';
    const safeFilename = `${randomUUID()}.${ext}`;

    const { storagePath } = await this.storage.upload({
      bucket:   this.bucket,
      folder:   `bugs/${bugId}`,
      filename: safeFilename,
      buffer:   file.buffer,
      size:     file.size,
      mimeType: file.mimetype,
      tenantId,
    });

    try {
      return await this.prisma.bugAttachment.create({
        data: { bugId, uploaderId, filename: file.originalname, storagePath, mimeType: file.mimetype, sizeBytes: file.size },
      });
    } catch (err) {
      await this.storage.delete(storagePath, this.bucket);
      throw err;
    }
  }

  async getPresignedUrl(attachmentId: string): Promise<string> {
    const tenantFilter = this.getTenantFilter();
    const attachment = await this.prisma.bugAttachment.findFirst({
      where: { id: attachmentId, ...tenantFilter },
    });
    if (!attachment) throw new NotFoundException(`Attachment ${attachmentId} không tìm thấy`);
    return this.storage.presignedUrl(attachment.storagePath, this.bucket);
  }

  async deleteFile(attachmentId: string) {
    const tenantFilter = this.getTenantFilter();
    const attachment = await this.prisma.bugAttachment.findFirst({
      where: { id: attachmentId, ...tenantFilter },
    });
    if (!attachment) throw new NotFoundException(`Attachment ${attachmentId} không tìm thấy`);
    await this.prisma.bugAttachment.delete({ where: { id: attachmentId } });
    await this.storage.delete(attachment.storagePath, this.bucket);
  }
}
