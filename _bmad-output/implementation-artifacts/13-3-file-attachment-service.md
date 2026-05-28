# Story 13.3: File Attachment Service (MinIO)

Status: ready

## Story

As a developer,
I want a BugAttachmentService that handles image uploads to MinIO and generates presigned URLs,
So that users can attach screenshots to bugs and view them securely without exposing storage credentials.

## Acceptance Criteria

1. `minio` npm package được install vào `apps/backend`.
2. `BugAttachmentService` kết nối MinIO thành công khi backend start (dùng env vars từ Story 13.1).
3. `POST /api/v1/bugs/:id/attachments` nhận multipart file, validate mime `image/*` và size ≤ 10MB và count < 5, upload lên MinIO, lưu `BugAttachment` record.
4. Non-image file trả `{ statusCode: 400, message: "Chỉ chấp nhận file ảnh" }`.
5. File > 10MB trả `{ statusCode: 400, message: "File không được vượt quá 10MB" }`.
6. Bug đã có 5 attachments trả `{ statusCode: 400, message: "Tối đa 5 ảnh đính kèm mỗi bug" }`.
7. `GET /api/v1/bugs/:id/attachments/:attId/url` trả presigned URL với TTL 1 giờ.
8. `DELETE /api/v1/bugs/:id/attachments/:attId` xóa file khỏi MinIO và xóa record DB; chỉ uploader hoặc PM được xóa.
9. Nếu DB insert fail sau khi upload MinIO: file MinIO được cleanup (rollback pattern).
10. MinIO object key format: `{bugId}/{uuid}.{ext}`.

## Tasks / Subtasks

- [ ] Task 1: Install `minio` npm package (AC: 1)
  - [ ] `pnpm --filter backend add minio`
  - [ ] Verify package trong `apps/backend/package.json`

- [ ] Task 2: Tạo `BugAttachmentService` với MinIO client (AC: 2)
  - [ ] Tạo `apps/backend/src/bugs/bug-attachment.service.ts`
  - [ ] Inject env vars qua `ConfigService` hoặc `process.env`
  - [ ] Init MinIO client trong constructor
  - [ ] Implement `uploadFile(bugId, file): Promise<string>` — trả storagePath
  - [ ] Implement `getPresignedUrl(storagePath): Promise<string>` — TTL 3600s
  - [ ] Implement `deleteFile(storagePath): Promise<void>`

- [ ] Task 3: Thêm upload endpoint vào `BugsController` (AC: 3-6, 9)
  - [ ] `POST /api/v1/bugs/:id/attachments` với `@UseInterceptors(FileInterceptor('file'))`
  - [ ] Validation: mime type, file size, attachment count
  - [ ] Gọi `BugAttachmentService.uploadFile()` rồi `prisma.bugAttachment.create()`
  - [ ] Rollback: nếu DB insert fail → gọi `deleteFile(storagePath)`

- [ ] Task 4: Thêm presigned URL endpoint (AC: 7)
  - [ ] `GET /api/v1/bugs/:id/attachments/:attId/url`
  - [ ] Verify attachment thuộc bug và trong org scope
  - [ ] Gọi `getPresignedUrl(attachment.storagePath)`

- [ ] Task 5: Thêm delete endpoint (AC: 8)
  - [ ] `DELETE /api/v1/bugs/:id/attachments/:attId`
  - [ ] Check uploader === caller OR caller.role === PM/ADMIN
  - [ ] Xóa MinIO object trước, xóa DB record sau

- [ ] Task 6: Manual test (AC: 3-10)
  - [ ] Upload ảnh PNG → 201 + attachment record trong DB
  - [ ] Upload non-image → 400
  - [ ] Upload > 10MB → 400
  - [ ] GET presigned URL → trả URL, download thành công
  - [ ] DELETE → file không còn accessible

## Dev Notes

### Install minio

```bash
pnpm --filter backend add minio
```

Package: `minio` (official MinIO Node.js SDK, version 8.x). Không dùng `@aws-sdk/client-s3`.

### BugAttachmentService

```typescript
// apps/backend/src/bugs/bug-attachment.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import * as Minio from 'minio';
import { randomUUID } from 'crypto';
import * as path from 'path';

@Injectable()
export class BugAttachmentService implements OnModuleInit {
  private client: Minio.Client;
  private bucket: string;

  onModuleInit() {
    this.client = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT ?? 'localhost',
      port: parseInt(process.env.MINIO_PORT ?? '9000'),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ROOT_USER ?? 'loopminio',
      secretKey: process.env.MINIO_ROOT_PASSWORD ?? 'loopminio123',
    });
    this.bucket = process.env.MINIO_BUCKET_BUGS ?? 'loop-bug-attachments';
  }

  async uploadFile(bugId: string, file: Express.Multer.File): Promise<string> {
    const ext = path.extname(file.originalname).toLowerCase();
    const objectKey = `${bugId}/${randomUUID()}${ext}`;
    await this.client.putObject(
      this.bucket,
      objectKey,
      file.buffer,
      file.size,
      { 'Content-Type': file.mimetype },
    );
    return objectKey; // storagePath
  }

  async getPresignedUrl(storagePath: string): Promise<string> {
    return this.client.presignedGetObject(this.bucket, storagePath, 3600);
  }

  async deleteFile(storagePath: string): Promise<void> {
    await this.client.removeObject(this.bucket, storagePath);
  }
}
```

### Upload endpoint pattern

```typescript
// bugs.controller.ts
import { FileInterceptor } from '@nestjs/platform-express';

@Post(':id/attachments')
@UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
async uploadAttachment(
  @Param('id') bugId: string,
  @UploadedFile() file: Express.Multer.File,
  @CurrentUser() user: JwtPayload,
  @OrgUnitIds() orgUnitIds: string[],
) {
  // Validation
  if (!file.mimetype.startsWith('image/')) {
    throw new BadRequestException('Chỉ chấp nhận file ảnh');
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new BadRequestException('File không được vượt quá 10MB');
  }

  // Check bug exists in scope
  const bug = await this.bugsService.findOne(bugId, orgUnitIds);

  // Check attachment count
  const count = await this.prisma.bugAttachment.count({ where: { bugId } });
  if (count >= 5) {
    throw new BadRequestException('Tối đa 5 ảnh đính kèm mỗi bug');
  }

  return this.bugsService.addAttachment(bugId, file, user.sub);
}
```

### addAttachment() — rollback pattern trong BugsService

```typescript
async addAttachment(bugId: string, file: Express.Multer.File, uploadedById: string) {
  let storagePath: string | null = null;
  try {
    storagePath = await this.bugAttachmentService.uploadFile(bugId, file);
    const attachment = await this.prisma.bugAttachment.create({
      data: {
        bugId,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        storagePath,
        uploadedById,
      },
    });
    return attachment;
  } catch (err) {
    // Rollback MinIO nếu DB fail
    if (storagePath) {
      await this.bugAttachmentService.deleteFile(storagePath).catch(() => {});
    }
    throw err;
  }
}
```

### Multer memory storage

Upload đến MinIO cần file buffer. Dùng `memoryStorage()` thay vì disk storage:

```typescript
import { memoryStorage } from 'multer';
// FileInterceptor('file', { storage: memoryStorage() })
```

Thêm `multer` type definitions nếu chưa có: `pnpm --filter backend add -D @types/multer`

### Lưu ý môi trường local (không Docker)

Khi dev local (không chạy Docker), MinIO không có. Test Story 13.3 cần chạy `docker-compose up minio minio-init` hoặc chạy MinIO standalone. Endpoint trong dev: `localhost:9000`.

Thêm vào `apps/backend/.env` (dev):
```
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ROOT_USER=loopminio
MINIO_ROOT_PASSWORD=loopminio123
MINIO_BUCKET_BUGS=loop-bug-attachments
```

### References

- `apps/backend/src/bugs/bugs.service.ts` (Story 13.2)
- `apps/backend/src/bugs/bugs.module.ts` — phải register `BugAttachmentService` trong providers
- `apps/backend/package.json` — thêm `minio` dependency
- MinIO SDK docs: `client.putObject`, `client.presignedGetObject`, `client.removeObject`
