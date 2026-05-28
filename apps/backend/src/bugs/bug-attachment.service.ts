import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class BugAttachmentService {
  private readonly bucket: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    config: ConfigService,
  ) {
    this.bucket = config.get<string>('MINIO_BUCKET', 'loop-bug-attachments');
  }

  async uploadFile(bugId: string, uploaderId: string, file: Express.Multer.File) {
    const { storagePath } = await this.storage.upload({
      bucket:   this.bucket,
      folder:   `bugs/${bugId}`,
      filename: file.originalname,
      buffer:   file.buffer,
      size:     file.size,
      mimeType: file.mimetype,
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
    const attachment = await this.prisma.bugAttachment.findUnique({ where: { id: attachmentId } });
    if (!attachment) throw new NotFoundException(`Attachment ${attachmentId} không tìm thấy`);
    return this.storage.presignedUrl(attachment.storagePath, this.bucket);
  }

  async deleteFile(attachmentId: string) {
    const attachment = await this.prisma.bugAttachment.findUnique({ where: { id: attachmentId } });
    if (!attachment) throw new NotFoundException(`Attachment ${attachmentId} không tìm thấy`);
    await this.prisma.bugAttachment.delete({ where: { id: attachmentId } });
    await this.storage.delete(attachment.storagePath, this.bucket);
  }
}
