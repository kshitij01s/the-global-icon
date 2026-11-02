import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsObject, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { CurrentUser, RequirePermissions } from '../auth/decorators';
import { JwtAuthGuard, PermissionsGuard } from '../auth/guards';
import { PERMISSIONS } from '../auth/permissions';
import type { AuthUser } from '../common/types';
import { FestivalStudioService } from '../themes/festival-studio.service';
import { ThemesService } from '../themes/themes.service';

class SetGlobalDto {
  @IsString()
  @MaxLength(80)
  slug!: string;
}

class OverrideDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  slug?: string | null;

  @IsOptional()
  @IsString()
  until?: string | null;
}

class FlagsDto {
  @IsOptional()
  @IsBoolean()
  festivalAutoEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  effectsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  allowAdminGlobalChange?: boolean;

  @IsOptional()
  @IsBoolean()
  allowReaderPreference?: boolean;

  @IsOptional()
  @IsBoolean()
  allowVisitorRegionSelect?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  defaultRestoreSlug?: string;

  /** Super Admin scheduler test instant (ISO) or null to clear. Does not auto-publish. */
  @IsOptional()
  @IsString()
  schedulerTestAsOf?: string | null;
}

class ScheduleDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @MaxLength(80)
  eventKey!: string;

  @IsString()
  @MaxLength(120)
  name!: string;

  @IsString()
  @MaxLength(80)
  themeSlug!: string;

  @IsString()
  startsAt!: string;

  @IsString()
  endsAt!: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  countryCode?: string | null;

  @IsOptional()
  @IsString()
  regionCode?: string | null;

  @IsOptional()
  @IsString()
  festivalId?: string | null;

  @IsOptional()
  @IsString()
  restoreThemeSlug?: string | null;
}

class TemplateCreateDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  festivalId?: string | null;

  @IsOptional()
  @IsString()
  countryCode?: string | null;

  @IsOptional()
  @IsString()
  regionCode?: string | null;

  @IsOptional()
  @IsString()
  baseThemeSlug?: string;

  @IsOptional()
  @IsString()
  duplicateFromId?: string;
}

class TemplateUpdateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  tokens?: Record<string, string>;

  @IsOptional()
  @IsObject()
  effects?: Record<string, unknown> | null;

  @IsOptional()
  @IsObject()
  layout?: Record<string, unknown> | null;

  @IsOptional()
  @IsString()
  festivalId?: string | null;

  @IsOptional()
  @IsString()
  countryCode?: string | null;

  @IsOptional()
  @IsString()
  regionCode?: string | null;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsBoolean()
  saveVersion?: boolean;
}

class FestivalUpsertDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  slug!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  countryCode!: string;

  @IsOptional()
  @IsString()
  regionCode?: string | null;

  @IsOptional()
  @IsString()
  continent?: string;

  @IsOptional()
  @IsString()
  culturalCategory?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  calendarBasis?: string;

  @IsOptional()
  @IsString()
  dateSource?: string;

  @IsOptional()
  @IsBoolean()
  dateVerified?: boolean;

  @IsOptional()
  @IsString()
  defaultThemeSlug?: string | null;

  @IsOptional()
  @IsInt()
  priority?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/themes')
export class AdminThemesController {
  constructor(
    private readonly themes: ThemesService,
    private readonly studio: FestivalStudioService,
  ) {}

  @Get('overview')
  @RequirePermissions(PERMISSIONS.THEMES_VIEW)
  async overview() {
    const [active, settings, schedules, history] = await Promise.all([
      this.themes.resolveActive(),
      this.themes.getAppearance(),
      this.themes.listSchedules(),
      this.themes.history(20),
    ]);
    const upcoming = schedules
      .filter((s) => s.enabled && s.startsAt > new Date())
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
      .slice(0, 5);
    return { active, settings, schedules, upcoming, history };
  }

  @Get('studio')
  @RequirePermissions(PERMISSIONS.THEMES_VIEW)
  studioBootstrap() {
    return this.studio.studioBootstrap();
  }

  @Get('festivals')
  @RequirePermissions(PERMISSIONS.THEMES_VIEW)
  festivals(
    @Query('country') countryCode?: string,
    @Query('continent') continent?: string,
    @Query('category') category?: string,
  ) {
    return this.studio.listFestivals({ countryCode, continent, category });
  }

  @Post('festivals')
  @RequirePermissions(PERMISSIONS.THEMES_MANAGE)
  upsertFestival(@CurrentUser() user: AuthUser, @Body() body: FestivalUpsertDto) {
    return this.studio.upsertFestival(user, body);
  }

  @Get('templates')
  @RequirePermissions(PERMISSIONS.THEMES_VIEW)
  templates() {
    return this.studio.listTemplates();
  }

  @Get('templates/:id')
  @RequirePermissions(PERMISSIONS.THEMES_VIEW)
  template(@Param('id') id: string) {
    return this.studio.getTemplate(id);
  }

  @Post('templates')
  @RequirePermissions(PERMISSIONS.THEMES_MANAGE)
  createTemplate(@CurrentUser() user: AuthUser, @Body() body: TemplateCreateDto) {
    return this.studio.createTemplate(user, body);
  }

  @Patch('templates/:id')
  @RequirePermissions(PERMISSIONS.THEMES_MANAGE)
  updateTemplate(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: TemplateUpdateDto,
  ) {
    return this.studio.updateTemplate(user, id, body as any);
  }

  @Post('templates/:id/publish')
  @RequirePermissions(PERMISSIONS.THEMES_MANAGE)
  publishTemplate(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { publishSlug?: string },
  ) {
    return this.studio.publishTemplate(user, id, body?.publishSlug);
  }

  @Post('templates/:id/duplicate')
  @RequirePermissions(PERMISSIONS.THEMES_MANAGE)
  duplicateTemplate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.studio.createTemplate(user, {
      name: 'Copy',
      duplicateFromId: id,
    }).then(async (tpl) => {
      const src = await this.studio.getTemplate(id);
      return this.studio.updateTemplate(user, tpl.id, {
        name: `${src.name} (copy)`,
        saveVersion: false,
      });
    });
  }

  @Post('templates/:id/versions/:versionId/restore')
  @RequirePermissions(PERMISSIONS.THEMES_MANAGE)
  restoreVersion(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
  ) {
    return this.studio.restoreVersion(user, id, versionId);
  }

  @Post('templates/:id/archive')
  @RequirePermissions(PERMISSIONS.THEMES_MANAGE)
  archiveTemplate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.studio.archiveTemplate(user, id);
  }

  @Get('assets')
  @RequirePermissions(PERMISSIONS.THEMES_VIEW)
  assets(@Query('category') category?: string) {
    return this.studio.listAssets(category);
  }

  @Get('animations')
  @RequirePermissions(PERMISSIONS.THEMES_VIEW)
  animations() {
    return this.studio.listAnimations();
  }

  @Get('calendar')
  @RequirePermissions(PERMISSIONS.THEMES_VIEW)
  calendar(@Query('year') year?: string, @Query('country') country?: string) {
    const y = year ? Number(year) : new Date().getUTCFullYear();
    return this.studio.calendar(y, country);
  }

  @Get('library')
  @RequirePermissions(PERMISSIONS.THEMES_VIEW)
  library() {
    return this.themes.listLibrary();
  }

  @Get('history')
  @RequirePermissions(PERMISSIONS.THEMES_VIEW)
  history(@Query('limit') limit?: string) {
    return this.themes.history(limit ? Number(limit) : 40);
  }

  @Post('global')
  @RequirePermissions(PERMISSIONS.THEMES_MANAGE)
  setGlobal(@CurrentUser() user: AuthUser, @Body() body: SetGlobalDto) {
    return this.themes.setGlobalTheme(user, body.slug);
  }

  @Post('global-as-admin')
  @RequirePermissions(PERMISSIONS.THEMES_VIEW)
  setGlobalAsAdmin(@CurrentUser() user: AuthUser, @Body() body: SetGlobalDto) {
    return this.themes.setGlobalTheme(user, body.slug, { asAdmin: true });
  }

  @Post('override')
  @RequirePermissions(PERMISSIONS.THEMES_MANAGE)
  override(@CurrentUser() user: AuthUser, @Body() body: OverrideDto) {
    return this.themes.setManualOverride(user, body.slug ?? null, body.until);
  }

  @Patch('settings')
  @RequirePermissions(PERMISSIONS.THEMES_MANAGE)
  flags(@CurrentUser() user: AuthUser, @Body() body: FlagsDto) {
    return this.themes.updateAppearanceFlags(user, body);
  }

  @Post('schedules')
  @RequirePermissions(PERMISSIONS.THEMES_SCHEDULE)
  upsertSchedule(@CurrentUser() user: AuthUser, @Body() body: ScheduleDto) {
    return this.themes.upsertSchedule(user, body);
  }

  @Patch('schedules/:id/status')
  @RequirePermissions(PERMISSIONS.THEMES_SCHEDULE)
  scheduleStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    return this.themes.setScheduleStatus(user, id, body.status);
  }

  @Delete('schedules/:id')
  @RequirePermissions(PERMISSIONS.THEMES_SCHEDULE)
  deleteSchedule(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.themes.deleteSchedule(user, id);
  }

  @Post('history/:id/rollback')
  @RequirePermissions(PERMISSIONS.THEMES_MANAGE)
  rollback(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.themes.rollback(user, id);
  }
}
