import { BadRequestException } from '@nestjs/common';

interface Sig {
  offset: number;
  bytes: number[];
}

/**
 * Chữ ký byte đầu tệp (magic number) theo MIME. Chống client spoof Content-Type
 * (vd gửi .exe khai báo application/pdf). MIME không có trong bảng → bỏ qua (cho phép).
 */
const SIGNATURES: Record<string, Sig[]> = {
  'application/pdf': [{ offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] }], // %PDF
  'image/png': [{ offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47] }],
  'image/jpeg': [{ offset: 0, bytes: [0xff, 0xd8, 0xff] }],
  'image/gif': [{ offset: 0, bytes: [0x47, 0x49, 0x46, 0x38] }], // GIF8
  // OOXML (docx/xlsx/pptx) + zip → PK\x03\x04
  'application/zip': [{ offset: 0, bytes: [0x50, 0x4b, 0x03, 0x04] }],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [{ offset: 0, bytes: [0x50, 0x4b, 0x03, 0x04] }],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [{ offset: 0, bytes: [0x50, 0x4b, 0x03, 0x04] }],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': [{ offset: 0, bytes: [0x50, 0x4b, 0x03, 0x04] }],
  // OLE2 cũ (doc/xls/ppt)
  'application/msword': [{ offset: 0, bytes: [0xd0, 0xcf, 0x11, 0xe0] }],
  'application/vnd.ms-excel': [{ offset: 0, bytes: [0xd0, 0xcf, 0x11, 0xe0] }],
};

/** Throw BadRequestException nếu nội dung tệp KHÔNG khớp MIME khai báo. */
export function assertMagicBytesMatch(buffer: Buffer, mimeType?: string): void {
  if (!mimeType || !buffer?.length) return;
  const sigs = SIGNATURES[mimeType];
  if (!sigs) return; // không kiểm loại này
  const ok = sigs.some(
    (sig) =>
      buffer.length >= sig.offset + sig.bytes.length &&
      sig.bytes.every((b, i) => buffer[sig.offset + i] === b),
  );
  if (!ok) {
    throw new BadRequestException('Nội dung tệp không khớp định dạng khai báo');
  }
}
