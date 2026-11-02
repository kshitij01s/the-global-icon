import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { CurrentUser, RequirePermissions } from '../auth/decorators';
import { JwtAuthGuard, PermissionsGuard } from '../auth/guards';
import { PERMISSIONS } from '../auth/permissions';
import { writeAudit } from '../common/audit';
import type { AuthUser } from '../common/types';
import { PrismaService } from '../prisma/prisma.service';

class AnnouncementDto {
  @IsString()
  @MaxLength(160)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  linkLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  linkUrl?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/announcements')
export class AdminAnnouncementsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.SITE_MANAGE)
  list() {
    return this.prisma.announcement.findMany({ orderBy: { updatedAt: 'desc' } });
  }

  @Post()
  @RequirePermissions(PERMISSIONS.SITE_MANAGE)
  async create(@CurrentUser() user: AuthUser, @Body() body: AnnouncementDto) {
    const row = await this.prisma.announcement.create({
      data: {
        title: body.title,
        message: body.message,
        linkLabel: body.linkLabel,
        linkUrl: body.linkUrl,
        isActive: body.isActive ?? true,
      },
    });
    await writeAudit(this.prisma, {
      actor: user,
      modelLabel: 'Announcement',
      eventType: 'announcement.create',
      objectId: row.id,
      objectRepr: row.title,
    });
    return row;
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.SITE_MANAGE)
  async update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: Partial<AnnouncementDto>) {
    const existing = await this.prisma.announcement.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Announcement not found');
    const row = await this.prisma.announcement.update({
      where: { id },
      data: {
        title: body.title ?? existing.title,
        message: body.message ?? existing.message,
        linkLabel: body.linkLabel ?? existing.linkLabel,
        linkUrl: body.linkUrl ?? existing.linkUrl,
        isActive: body.isActive ?? existing.isActive,
      },
    });
    await writeAudit(this.prisma, {
      actor: user,
      modelLabel: 'Announcement',
      eventType: 'announcement.update',
      objectId: row.id,
      objectRepr: row.title,
    });
    return row;
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.SITE_MANAGE)
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const existing = await this.prisma.announcement.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Announcement not found');
    await this.prisma.announcement.delete({ where: { id } });
    await writeAudit(this.prisma, {
      actor: user,
      modelLabel: 'Announcement',
      eventType: 'announcement.delete',
      objectId: id,
      objectRepr: existing.title,
    });
    return { deleted: true };
  }
}
