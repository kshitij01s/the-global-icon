import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, RequirePermissions } from '../auth/decorators';
import { JwtAuthGuard, PermissionsGuard } from '../auth/guards';
import { PERMISSIONS } from '../auth/permissions';
import type { AuthUser } from '../common/types';
import { ApiInboxService } from './api-inbox.service';
import { ApiInboxListQueryDto, ApiInboxPatchDto, ApiInboxSimulateDto } from './api-inbox.dto';
import { ApiInboxSeverity } from './api-inbox.enums';
import { defaultCustomerMessage } from './api-inbox.classifier';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/api-inbox')
export class ApiInboxController {
  constructor(private readonly inbox: ApiInboxService) {}

  @Get('alerts')
  @RequirePermissions(PERMISSIONS.API_INBOX_VIEW)
  alerts() {
    return this.inbox.alerts();
  }

  @Get('stats/categories')
  @RequirePermissions(PERMISSIONS.API_INBOX_VIEW)
  categoryStats() {
    return this.inbox.categoryStats();
  }

  @Get('stats/sources')
  @RequirePermissions(PERMISSIONS.API_INBOX_VIEW)
  sourceStats() {
    return this.inbox.sourceStats();
  }

  @Get()
  @RequirePermissions(PERMISSIONS.API_INBOX_VIEW)
  list(@Query() query: ApiInboxListQueryDto) {
    return this.inbox.list(query);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.API_INBOX_VIEW)
  get(@Param('id') id: string) {
    return this.inbox.getById(id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.API_INBOX_MANAGE)
  patch(@Param('id') id: string, @Body() dto: ApiInboxPatchDto, @CurrentUser() user: AuthUser) {
    return this.inbox.patch(id, dto, user);
  }
}

@ApiTags('dev')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('dev/api-inbox')
export class ApiInboxDevController {
  constructor(private readonly inbox: ApiInboxService) {}

  @Post('simulate-failure')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @RequirePermissions(PERMISSIONS.API_INBOX_MANAGE)
  async simulate(@Body() dto: ApiInboxSimulateDto, @CurrentUser() user: AuthUser) {
    if (process.env.NODE_ENV === 'production') {
      throw new NotFoundException();
    }

    const scenario = dto.scenario ?? 'storage';
    const presets: Record<
      string,
      { category: string; source: string; technicalError: string; severity?: ApiInboxSeverity }
    > = {
      storage: {
        category: 'file_storage',
        source: 'storage.service',
        technicalError: 'EACCES: permission denied, open STORAGE_ROOT/magazines/pdfs/uploads',
        severity: ApiInboxSeverity.CRITICAL,
      },
      pdf: {
        category: 'pdf_processing',
        source: 'admin.uploads',
        technicalError: 'PDF processing failed: upstream converter returned HTTP 503',
        severity: ApiInboxSeverity.WARNING,
      },
      rss: {
        category: 'rss',
        source: 'rss.feed',
        technicalError: 'ETIMEDOUT waiting for external RSS synchronization endpoint',
        severity: ApiInboxSeverity.WARNING,
      },
      campaign: {
        category: 'campaign',
        source: 'admin.advertising',
        technicalError: 'Advertising campaign API failed: upstream 502 Bad Gateway',
        severity: ApiInboxSeverity.WARNING,
      },
      festival: {
        category: 'festival_schedule',
        source: 'themes.scheduler',
        technicalError: 'Festival schedule activation job failed: theme asset missing',
        severity: ApiInboxSeverity.CRITICAL,
      },
      html_upstream: {
        category: 'third_party_api',
        source: 'external.integration',
        technicalError:
          '<html><body><h1>503 Service Unavailable</h1><p>nginx</p></body></html>\nError: stack\n    at Object.<anonymous> (/app/internal/secret.ts:1)\nBearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.aaa.bbb',
        severity: ApiInboxSeverity.CRITICAL,
      },
    };

    const preset = presets[scenario] ?? presets.storage;
    const category = dto.category ?? preset.category;
    const report = await this.inbox.report({
      category,
      source: dto.source ?? preset.source,
      technicalError: dto.technicalError ?? preset.technicalError,
      severity: dto.severity ?? preset.severity,
      userId: user.id,
      metadata: { simulated: true, scenario },
    });

    return {
      ok: true,
      scenario,
      report,
      customerMessage: report?.customerMessage ?? defaultCustomerMessage(category),
    };
  }
}
