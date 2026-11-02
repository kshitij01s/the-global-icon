import { Controller, Get, Injectable, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdPlacement, Prisma } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsDateString, IsEnum, IsOptional } from 'class-validator';
import { RequirePermissions } from '../auth/decorators';
import { JwtAuthGuard, PermissionsGuard } from '../auth/guards';
import { PERMISSIONS } from '../auth/permissions';
import { PaginationQueryDto, paginated, resolvePaging } from '../common/pagination';
import { publicMediaUrl } from '../common/urls';
import { PrismaService } from '../prisma/prisma.service';

export class AdListQueryDto extends PaginationQueryDto {
  @IsOptional() @IsEnum(AdPlacement)
  placement?: AdPlacement;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  isActive?: boolean;
}

export class AdReportQueryDto {
  @IsOptional() @IsDateString({ strict: false })
  from?: string;

  @IsOptional() @IsDateString({ strict: false })
  to?: string;
}

@Injectable()
export class AdminAdvertisingService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AdListQueryDto) {
    const { page, limit, skip, take } = resolvePaging(query, 20);
    const term = query.q?.trim();
    const where: Prisma.AdvertisementWhereInput = {
      ...(query.placement ? { placement: query.placement } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(term
        ? {
            OR: [
              { title: { contains: term, mode: 'insensitive' } },
              { advertiser: { contains: term, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.advertisement.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take,
      }),
      this.prisma.advertisement.count({ where }),
    ]);
    return paginated(
      rows.map(({ image, ...ad }) => ({ ...ad, imageUrl: publicMediaUrl(image) })),
      total,
      page,
      limit,
    );
  }

  /** Aggregate impressions/clicks per advertisement. Contains no personal data. */
  async report(query: AdReportQueryDto) {
    const createdAt: Prisma.DateTimeFilter = {
      ...(query.from ? { gte: new Date(query.from) } : {}),
      ...(query.to ? { lte: new Date(query.to) } : {}),
    };
    const events = await this.prisma.advertisementEvent.groupBy({
      by: ['advertisementId', 'eventType'],
      where: Object.keys(createdAt).length ? { createdAt } : {},
      _count: { _all: true },
    });
    const ads = await this.prisma.advertisement.findMany({
      select: { id: true, title: true, advertiser: true, placement: true, isActive: true },
    });
    const totals = new Map<string, { impressions: number; clicks: number }>();
    for (const e of events) {
      const entry = totals.get(e.advertisementId) ?? { impressions: 0, clicks: 0 };
      if (e.eventType === 'IMPRESSION') entry.impressions += e._count._all;
      else entry.clicks += e._count._all;
      totals.set(e.advertisementId, entry);
    }
    const items = ads.map((ad) => {
      const t = totals.get(ad.id) ?? { impressions: 0, clicks: 0 };
      return {
        ...ad,
        ...t,
        ctr: t.impressions > 0 ? Number((t.clicks / t.impressions).toFixed(4)) : 0,
      };
    });
    return {
      from: query.from ?? null,
      to: query.to ?? null,
      totals: items.reduce(
        (acc, i) => ({
          impressions: acc.impressions + i.impressions,
          clicks: acc.clicks + i.clicks,
        }),
        { impressions: 0, clicks: 0 },
      ),
      items,
    };
  }
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/advertisements')
export class AdminAdvertisingController {
  constructor(private readonly ads: AdminAdvertisingService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.ADS_MANAGE)
  list(@Query() query: AdListQueryDto) {
    return this.ads.list(query);
  }

  @Get('report')
  @RequirePermissions(PERMISSIONS.ADS_MANAGE)
  report(@Query() query: AdReportQueryDto) {
    return this.ads.report(query);
  }
}
