import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser, OptionalUser } from '../auth/decorators';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../auth/guards';
import type { AuthUser } from '../common/types';
import {
  EditionListQueryDto,
  MagazineListQueryDto,
  PdfQueryDto,
  SaveProgressDto,
} from './dto';
import { MagazinesService } from './magazines.service';

@ApiTags('magazines')
@Controller('magazines')
export class MagazinesController {
  constructor(private readonly magazines: MagazinesService) {}

  @Get()
  list(@Query() query: MagazineListQueryDto) {
    return this.magazines.list(query);
  }

  @Get('showcase')
  showcase() {
    return this.magazines.showcase();
  }

  @Get(':slug')
  detail(@Param('slug') slug: string) {
    return this.magazines.detail(slug);
  }

  /**
   * Authorised PDF stream (supports HTTP Range for PDF.js). MEMBERS editions
   * require a bearer token. The filesystem path is never exposed.
   */
  @Get(':slug/pdf')
  @ApiBearerAuth()
  @UseGuards(OptionalJwtAuthGuard)
  async pdf(
    @Param('slug') slug: string,
    @Query() query: PdfQueryDto,
    @OptionalUser() user: AuthUser | null,
    @Res() res: Response,
  ): Promise<void> {
    const download = query.download === true;
    const file = await this.magazines.authorisePdf(slug, user, download);
    const disposition = download ? 'attachment' : 'inline';
    await new Promise<void>((resolve, reject) => {
      res.sendFile(
        file.absolutePath,
        {
          dotfiles: 'deny',
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `${disposition}; filename="${file.slug}.pdf"`,
            'Cache-Control': 'private, no-store',
            'X-Content-Type-Options': 'nosniff',
          },
        },
        (error) => {
          if (error && !res.headersSent) reject(error);
          else resolve();
        },
      );
    });
  }

  @Get(':slug/progress')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  progress(@Param('slug') slug: string, @CurrentUser() user: AuthUser) {
    return this.magazines.getProgress(slug, user);
  }

  @Put(':slug/progress')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  saveProgress(
    @Param('slug') slug: string,
    @Body() dto: SaveProgressDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.magazines.saveProgress(slug, user, dto.page);
  }
}

@ApiTags('editions')
@Controller('editions')
export class EditionsController {
  constructor(private readonly magazines: MagazinesService) {}

  @Get()
  list(@Query() query: EditionListQueryDto) {
    return this.magazines.editions(query);
  }
}
