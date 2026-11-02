import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';
import { CurrentUser, RequirePermissions } from '../auth/decorators';
import { JwtAuthGuard, PermissionsGuard } from '../auth/guards';
import { PERMISSIONS } from '../auth/permissions';
import { writeAudit } from '../common/audit';
import type { AuthUser } from '../common/types';
import { PrismaService } from '../prisma/prisma.service';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;
const emptyToNull = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() || null : value;

const URL_OPTIONS = { protocols: ['http', 'https'], require_protocol: true };

export class UpdateSettingsDto {
  @IsOptional() @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(120)
  siteName?: string;

  @IsOptional() @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(200)
  tagline?: string;

  @IsOptional() @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(200)
  heroTitle?: string;

  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(600)
  heroCopy?: string;

  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(200)
  newsletterHeading?: string;

  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(600)
  newsletterCopy?: string;

  @IsOptional() @Transform(emptyToNull) @IsEmail() @MaxLength(254)
  contactEmail?: string | null;

  @IsOptional() @Transform(emptyToNull) @IsString() @MaxLength(40)
  contactPhone?: string | null;

  @IsOptional() @Transform(emptyToNull) @IsString() @MaxLength(400)
  officeAddress?: string | null;

  @IsOptional() @Transform(emptyToNull) @IsString() @MaxLength(200)
  contactResponseTime?: string | null;

  @IsOptional() @Transform(emptyToNull) @IsUrl(URL_OPTIONS) @MaxLength(300)
  linkedinUrl?: string | null;

  @IsOptional() @Transform(emptyToNull) @IsUrl(URL_OPTIONS) @MaxLength(300)
  instagramUrl?: string | null;

  @IsOptional() @Transform(emptyToNull) @IsUrl(URL_OPTIONS) @MaxLength(300)
  twitterUrl?: string | null;

  @IsOptional() @Transform(emptyToNull) @IsUrl(URL_OPTIONS) @MaxLength(300)
  youtubeUrl?: string | null;

  @IsOptional() @IsString()
  featuredArticleId?: string | null;

  @IsOptional() @IsString()
  featuredMagazineId?: string | null;
}

@Injectable()
export class AdminSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get() {
    const row = await this.prisma.siteSettings.upsert({
      where: { id: 1 },
      create: { id: 1 },
      update: {},
    });
    return row;
  }

  async update(dto: UpdateSettingsDto, actor: AuthUser) {
    if (dto.featuredArticleId) {
      const found = await this.prisma.article.findUnique({
        where: { id: dto.featuredArticleId },
        select: { id: true },
      });
      if (!found) throw new BadRequestException('featuredArticleId does not exist');
    }
    if (dto.featuredMagazineId) {
      const found = await this.prisma.magazine.findUnique({
        where: { id: dto.featuredMagazineId },
        select: { id: true },
      });
      if (!found) throw new BadRequestException('featuredMagazineId does not exist');
    }
    const data: Prisma.SiteSettingsUncheckedUpdateInput = { ...dto };
    const row = await this.prisma.siteSettings.upsert({
      where: { id: 1 },
      create: { id: 1, ...(data as Prisma.SiteSettingsUncheckedCreateInput) },
      update: data,
    });
    await writeAudit(this.prisma, {
      actor,
      modelLabel: 'SiteSettings',
      eventType: 'settings.updated',
      objectId: '1',
      objectRepr: row.siteName,
      details: { fields: Object.keys(dto) },
    });
    return row;
  }
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/settings')
export class AdminSettingsController {
  constructor(private readonly settings: AdminSettingsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.SITE_MANAGE)
  get() {
    return this.settings.get();
  }

  /** Super Admin only (`site.settings_update` is withheld from ADMIN). */
  @Patch()
  @RequirePermissions(PERMISSIONS.SITE_SETTINGS_UPDATE)
  update(@Body() dto: UpdateSettingsDto, @CurrentUser() user: AuthUser) {
    return this.settings.update(dto, user);
  }
}
