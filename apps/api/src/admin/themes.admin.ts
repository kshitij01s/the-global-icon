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
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { CurrentUser, RequirePermissions } from '../auth/decorators';
import { JwtAuthGuard, PermissionsGuard } from '../auth/guards';
import { PERMISSIONS } from '../auth/permissions';
import type { AuthUser } from '../common/types';
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
  @IsString()
  @MaxLength(80)
  defaultRestoreSlug?: string;
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
  restoreThemeSlug?: string | null;
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/themes')
export class AdminThemesController {
  constructor(private readonly themes: ThemesService) {}

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

  /** Admin path — only when Super Admin enabled allowAdminGlobalChange. */
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
