import { BadRequestException } from '@nestjs/common';
import { BugAttachmentService } from './bug-attachment.service';

/**
 * Khoá hành vi validate upload (chống DoS memory + file độc + path injection):
 * - chặn MIME ngoài allowlist
 * - chặn file > 10MB
 * - lưu storage bằng tên UUID an toàn, KHÔNG dùng originalname
 */
describe('BugAttachmentService.uploadFile — validate', () => {
  let prisma: any;
  let storage: any;
  let service: BugAttachmentService;

  const makeFile = (over: Partial<Express.Multer.File>): Express.Multer.File =>
    ({
      originalname: 'x.png',
      mimetype: 'image/png',
      size: 1024,
      buffer: Buffer.from('x'),
      ...over,
    } as Express.Multer.File);

  beforeEach(() => {
    prisma = { bugAttachment: { create: jest.fn().mockResolvedValue({ id: 'att-1' }) } };
    storage = {
      upload: jest.fn().mockResolvedValue({ storagePath: 'bugs/b1/file' }),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    const config = { get: jest.fn().mockReturnValue('bucket') } as any;
    service = new BugAttachmentService(prisma, storage, config, undefined);
  });

  it('ném BadRequest khi thiếu file', async () => {
    await expect(
      service.uploadFile('b1', 'u1', undefined as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('chặn MIME ngoài allowlist (vd executable)', async () => {
    await expect(
      service.uploadFile('b1', 'u1', makeFile({ mimetype: 'application/x-msdownload' })),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('chặn file > 10MB', async () => {
    await expect(
      service.uploadFile('b1', 'u1', makeFile({ size: 11 * 1024 * 1024 })),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('chấp nhận file hợp lệ và lưu bằng tên UUID an toàn (không phải originalname)', async () => {
    await service.uploadFile('b1', 'u1', makeFile({ originalname: '../../evil.png' }));

    expect(storage.upload).toHaveBeenCalledTimes(1);
    const arg = storage.upload.mock.calls[0][0];
    // filename gửi cho storage là UUID.png — không chứa path traversal / tên gốc
    expect(arg.filename).toMatch(/^[0-9a-f-]+\.png$/i);
    expect(arg.filename).not.toContain('..');
    expect(arg.filename).not.toBe('../../evil.png');
    // DB vẫn lưu tên gốc để hiển thị
    expect(prisma.bugAttachment.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ filename: '../../evil.png' }) }),
    );
  });
});
