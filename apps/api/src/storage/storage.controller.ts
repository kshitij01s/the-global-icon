import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { StorageService } from './storage.service';

@ApiTags('media')
@Controller('media')
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  /** Serves public images (covers, portraits). Never serves PDFs. */
  @Get('public/*path')
  async publicFile(
    @Param('path') segments: string | string[],
    @Res() res: Response,
  ): Promise<void> {
    const key = Array.isArray(segments) ? segments.join('/') : segments;
    const file = await this.storage.resolvePublicImage(key);
    await new Promise<void>((resolve, reject) => {
      res.sendFile(
        file.absolutePath,
        {
          dotfiles: 'deny',
          headers: {
            'Content-Type': file.contentType,
            'Cache-Control': 'public, max-age=86400',
            'Content-Security-Policy': "default-src 'none'; sandbox",
            'X-Content-Type-Options': 'nosniff',
          },
        },
        (error) => {
          if (error && !res.headersSent) reject(new NotFoundException());
          else resolve();
        },
      );
    });
  }
}
