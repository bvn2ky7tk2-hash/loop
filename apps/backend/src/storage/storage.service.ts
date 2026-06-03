import { Injectable, Logger, OnModuleInit, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClsServiceManager } from 'nestjs-cls';
import * as Minio from 'minio';
import { CLS_TENANT_ID } from '../common/cls/cls-keys';
import { isTenantEnforced } from '../common/config/tenant.config';
import { QuotaService } from '../common/services/quota.service';

export interface UploadOptions {
  bucket?: string;
  folder: string;
  filename: string;
  buffer: Buffer;
  size: number;
  mimeType: string;
  /** Tenant ID để tạo per-tenant path prefix trong MinIO. Nếu không có → dùng 'shared/' */
  tenantId?: string;
}

export interface UploadResult {
  bucket: string;
  storagePath: string;
}

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private client: Minio.Client;
  private defaultBucket: string;
  private internalBase: string;
  private publicBase: string;

  constructor(
    private readonly config: ConfigService,
    private readonly quota: QuotaService,
  ) {}

  onModuleInit() {
    const endpoint = this.config.get<string>('MINIO_ENDPOINT', 'localhost');
    const port     = this.config.get<string>('MINIO_PORT', '9000');
    const useSSL   = this.config.get<string>('MINIO_USE_SSL', 'false') === 'true';

    this.defaultBucket = this.config.get<string>('MINIO_BUCKET', 'loop-storage');
    // URL MinIO tạo trong presignedGetObject — dùng để rewrite sang URL công khai
    this.internalBase  = `${useSSL ? 'https' : 'http'}://${endpoint}:${port}`;
    // URL công khai trình duyệt có thể truy cập (qua nginx proxy /storage/)
    // Ví dụ: http://localhost/storage  hoặc https://app.loop.vn/storage
    this.publicBase    = this.config.get<string>('MINIO_PUBLIC_URL', '');

    this.client = new Minio.Client({
      endPoint:  endpoint,
      port:      parseInt(port, 10),
      useSSL,
      accessKey: this.config.get<string>('MINIO_ACCESS_KEY', 'loop_minio'),
      secretKey: this.config.get<string>('MINIO_SECRET_KEY', 'loop_minio_secret'),
    });
  }

  async upload(opts: UploadOptions): Promise<UploadResult> {
    const bucket = opts.bucket ?? this.defaultBucket;
    const ext = opts.filename.includes('.') ? '.' + opts.filename.split('.').pop() : '';
    // Per-tenant path: <tenantId>/<folder>/... hoặc shared/<folder>/... nếu không có tenantId
    const tenantPrefix = opts.tenantId ? `${opts.tenantId}/` : 'shared/';
    const storagePath = `${tenantPrefix}${opts.folder}/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;

    await this.quota.assertCanUpload(opts.size, opts.tenantId);

    await this.client.putObject(bucket, storagePath, opts.buffer, opts.size, {
      'Content-Type': opts.mimeType,
    });

    await this.quota.addStorage(opts.size, opts.tenantId);

    return { bucket, storagePath };
  }

  async presignedUrl(storagePath: string, bucket?: string, expirySeconds = 3600): Promise<string> {
    // Phòng thủ chiều sâu ở tầng storage: chỉ ký URL cho object thuộc tenant hiện hành
    // (hoặc shared/). Caller đã verify ownership qua DB; đây là lưới chắn cuối.
    if (isTenantEnforced()) {
      const cls = ClsServiceManager.getClsService();
      const tid = cls?.isActive() ? cls.get<string>(CLS_TENANT_ID) : undefined;
      if (tid && !storagePath.startsWith(`${tid}/`) && !storagePath.startsWith('shared/')) {
        throw new ForbiddenException('Không có quyền truy cập tệp của tenant khác');
      }
    }
    const raw = await this.client.presignedGetObject(bucket ?? this.defaultBucket, storagePath, expirySeconds);
    // Nếu MINIO_PUBLIC_URL được cấu hình, rewrite URL nội bộ (http://minio:9000/...)
    // thành URL công khai (http://localhost/storage/...) để trình duyệt có thể truy cập.
    // Nginx phải set proxy_set_header Host minio:9000 để presigned signature vẫn hợp lệ.
    if (this.publicBase) {
      return raw.replace(this.internalBase, this.publicBase);
    }
    return raw;
  }

  async delete(storagePath: string, bucket?: string): Promise<void> {
    await this.client
      .removeObject(bucket ?? this.defaultBucket, storagePath)
      .catch((err) => this.logger.warn(`MinIO removeObject failed for ${storagePath}: ${err.message}`));
  }
}
