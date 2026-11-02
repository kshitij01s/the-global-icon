import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';

export const MAX_PDF_BYTES = 50 * 1024 * 1024; // 50 MiB
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MiB

export const ALLOWED_IMAGE_MIME = ['image/png', 'image/jpeg', 'image/webp'] as const;
export type AllowedImageMime = (typeof ALLOWED_IMAGE_MIME)[number];

/** Minimal shape of an in-memory multer file (we do not depend on @types/multer). */
export interface UploadedBinary {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

function requireFile(file: UploadedBinary | undefined): UploadedBinary {
  if (!file || !file.buffer || file.buffer.length === 0) {
    throw new BadRequestException('A non-empty "file" field is required (multipart/form-data)');
  }
  return file;
}

/** PDFs must be declared as application/pdf and start with the "%PDF-" magic bytes. */
export function validatePdf(input: UploadedBinary | undefined): Buffer {
  const file = requireFile(input);
  if (file.size > MAX_PDF_BYTES || file.buffer.length > MAX_PDF_BYTES) {
    throw new PayloadTooLargeException(`PDF exceeds ${MAX_PDF_BYTES / 1024 / 1024} MiB limit`);
  }
  if (file.mimetype !== 'application/pdf') {
    throw new BadRequestException('File must be sent as application/pdf');
  }
  if (file.buffer.subarray(0, 5).toString('latin1') !== '%PDF-') {
    throw new BadRequestException('File content is not a valid PDF');
  }
  return file.buffer;
}

/** Detects PNG / JPEG / WebP from magic bytes; returns null for anything else. */
export function sniffImage(buffer: Buffer): AllowedImageMime | null {
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'image/png';
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('latin1') === 'RIFF' &&
    buffer.subarray(8, 12).toString('latin1') === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

const EXTENSIONS: Record<AllowedImageMime, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

/** Declared mime must be allow-listed AND match the sniffed content type. */
export function validateImage(input: UploadedBinary | undefined): {
  buffer: Buffer;
  extension: string;
  contentType: AllowedImageMime;
} {
  const file = requireFile(input);
  if (file.size > MAX_IMAGE_BYTES || file.buffer.length > MAX_IMAGE_BYTES) {
    throw new PayloadTooLargeException(`Image exceeds ${MAX_IMAGE_BYTES / 1024 / 1024} MiB limit`);
  }
  if (!(ALLOWED_IMAGE_MIME as readonly string[]).includes(file.mimetype)) {
    throw new BadRequestException('Image must be PNG, JPEG or WebP');
  }
  const sniffed = sniffImage(file.buffer);
  if (!sniffed || sniffed !== file.mimetype) {
    throw new BadRequestException('Image content does not match its declared type');
  }
  return { buffer: file.buffer, extension: EXTENSIONS[sniffed], contentType: sniffed };
}
