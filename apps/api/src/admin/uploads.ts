import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { randomUUID } from 'node:crypto';
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
    await this.storage.saveNew(key, buffer);
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
    await this.storage.saveNew(key, image.buffer);
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
