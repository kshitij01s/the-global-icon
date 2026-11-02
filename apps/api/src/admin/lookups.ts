import { Controller, Get, Injectable, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../auth/decorators';
import { JwtAuthGuard, PermissionsGuard } from '../auth/guards';
import { PERMISSIONS } from '../auth/permissions';
import { PrismaService } from '../prisma/prisma.service';

const LOOKUP_LIMIT = 500;

@Injectable()
export class AdminLookupsService {
  constructor(private readonly prisma: PrismaService) {}

  categories() {
    return this.prisma.category.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
      take: LOOKUP_LIMIT,
    });
  }

  editionSeries() {
    return this.prisma.editionSeries.findMany({
      select: { id: true, name: true, slug: true, region: true },
      orderBy: { name: 'asc' },
      take: LOOKUP_LIMIT,
    });
  }

  authors() {
    return this.prisma.author.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
      take: LOOKUP_LIMIT,
    });
  }
}

/** Dropdown sources for the admin UI. Available to any staff role with dashboard access. */
@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin')
export class AdminLookupsController {
  constructor(private readonly lookups: AdminLookupsService) {}

  @Get('categories')
  @RequirePermissions(PERMISSIONS.DASHBOARD_VIEW)
  categories() {
    return this.lookups.categories();
  }

  @Get('edition-series')
  @RequirePermissions(PERMISSIONS.DASHBOARD_VIEW)
  editionSeries() {
    return this.lookups.editionSeries();
  }

  @Get('authors')
  @RequirePermissions(PERMISSIONS.DASHBOARD_VIEW)
  authors() {
    return this.lookups.authors();
  }
}
