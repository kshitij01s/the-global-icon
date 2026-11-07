import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  ServiceUnavailableException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { randomUUID } from 'node:crypto';
import { ApiInboxService } from '../api-inbox/api-inbox.service';
import { ApiInboxSeverity } from '../api-inbox/api-inbox.enums';
import { CurrentUser, RequirePermissions } from '../auth/decorators';
import { JwtAuthGuard, PermissionsGuard } from '../auth/guards';
import { PERMISSIONS } from '../auth/permissions';
import { writeAudit } from '../common/audit';
import type { AuthUser } from '../common/types';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import {
  MAX_IMAGE_BYTES,
  MAX_PDF_BYTES,
  type UploadedBinary,
  validateImage,
  validatePdf,
} from './upload-validation';

const fileSchema = {
  schema: {
    type: 'object',
    required: ['file'],
    properties: { file: { type: 'string', format: 'binary' } },
  },
};

/**
 * Uploads land in STORAGE_ROOT under server-generated names. Client file names are
 * never used. The returned `key` is what you pass as `pdfKey` / `coverImage`.
 */
@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/uploads')
export class AdminUploadsController {
  constructor(
    private readonly storage: StorageService,
    private readonly prisma: PrismaService,
    private readonly apiInbox: ApiInboxService,
  ) {}

  @Post('magazine-pdf')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(PERMISSIONS.MAGAZINES_CREATE)
  @ApiConsumes('multipart/form-data')
  @ApiBody(fileSchema)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_PDF_BYTES, files: 1 } }))
  async uploadPdf(@UploadedFile() file: UploadedBinary | undefined, @CurrentUser() user: AuthUser) {
    const buffer = validatePdf(file);
    const key = `magazines/pdfs/uploads/${randomUUID()}.pdf`;
    try {
      await this.storage.saveNew(key, buffer);
    } catch (err) {
      const report = await this.apiInbox.reportSafe({
        category: 'magazine_upload',
        source: 'admin.uploads.magazine-pdf',
        technicalError: err instanceof Error ? err : String(err),
        severity: ApiInboxSeverity.CRITICAL,
        userId: user.id,
        entityType: 'storage_key',
        entityId: key,
        metadata: { size: buffer.length },
      });
      throw new ServiceUnavailableException(
        report?.customerMessage ??
          'We could not upload your magazine at the moment. Please try again shortly.',
      );
    }
    await this.record(user, 'upload.magazine_pdf', key, buffer.length);
    return { key, size: buffer.length, contentType: 'application/pdf' };
  }

  @Post('magazine-cover')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(PERMISSIONS.MAGAZINES_CREATE)
  @ApiConsumes('multipart/form-data')
  @ApiBody(fileSchema)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_IMAGE_BYTES, files: 1 } }))
  async uploadCover(@UploadedFile() file: UploadedBinary | undefined, @CurrentUser() user: AuthUser) {
    const image = validateImage(file);
    const key = `magazines/covers/uploads/${randomUUID()}.${image.extension}`;
    try {
      await this.storage.saveNew(key, image.buffer);
    } catch (err) {
      const report = await this.apiInbox.reportSafe({
        category: 'cover_image',
        source: 'admin.uploads.magazine-cover',
        technicalError: err instanceof Error ? err : String(err),
        severity: ApiInboxSeverity.CRITICAL,
        userId: user.id,
        entityType: 'storage_key',
        entityId: key,
      });
      throw new ServiceUnavailableException(
        report?.customerMessage ??
          'We could not upload the cover image. Please try again shortly.',
      );
    }
    await this.record(user, 'upload.magazine_cover', key, image.buffer.length);
    return { key, size: image.buffer.length, contentType: image.contentType };
  }

  private record(actor: AuthUser, eventType: string, key: string, size: number) {
    return writeAudit(this.prisma, {
      actor,
      modelLabel: 'Upload',
      eventType,
      objectId: key,
      objectRepr: key,
      details: { size },
    });
  }
}
