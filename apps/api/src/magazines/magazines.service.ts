import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { paginated, resolvePaging } from '../common/pagination';
import type { AuthUser } from '../common/types';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import type { EditionListQueryDto, MagazineListQueryDto } from './dto';
import {
  magazineInclude,
  publishedMagazineWhere,
  toEdition,
  toPublicMagazine,
} from './magazine.mapper';

@Injectable()
export class MagazinesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  private searchClause(q?: string): Prisma.MagazineWhereInput {
    const term = q?.trim();
    if (!term) return {};
    return {
      OR: [
        { title: { contains: term, mode: 'insensitive' } },
        { subtitle: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { issueNumber: { contains: term, mode: 'insensitive' } },
      ],
    };
  }

  async list(query: MagazineListQueryDto) {
    const { page, limit, skip, take } = resolvePaging(query);
    const where: Prisma.MagazineWhereInput = {
      ...publishedMagazineWhere,
      ...this.searchClause(query.q),
      ...(query.category ? { category: { slug: query.category } } : {}),
      ...(query.featured !== undefined ? { isFeatured: query.featured } : {}),
      ...(query.year
        ? {
            publicationDate: {
              gte: new Date(Date.UTC(query.year, 0, 1)),
              lt: new Date(Date.UTC(query.year + 1, 0, 1)),
            },
          }
        : {}),
    };
    const [rows, total, facetRows, categoryRows] = await this.prisma.$transaction([
      this.prisma.magazine.findMany({
        where,
        include: magazineInclude,
        orderBy: [{ publicationDate: 'desc' }, { issueNumber: 'desc' }],
        skip,
        take,
      }),
      this.prisma.magazine.count({ where }),
      this.prisma.magazine.findMany({
        where: publishedMagazineWhere,
        select: { publicationDate: true },
      }),
      this.prisma.magazine.findMany({
        where: publishedMagazineWhere,
        select: { category: { select: { slug: true, name: true } } },
      }),
    ]);
    const years = [
      ...new Set(facetRows.map((r) => r.publicationDate.getUTCFullYear())),
    ].sort((a, b) => b - a);
    const categories = new Map<string, string>();
    for (const row of categoryRows) {
      if (row.category) categories.set(row.category.slug, row.category.name);
    }
    return {
      ...paginated(rows.map(toPublicMagazine), total, page, limit),
      facets: {
        years,
        categories: [...categories].map(([slug, name]) => ({ slug, name })),
      },
    };
  }

  /** Compact list for homepage / showcase rails: featured first, then newest. */
  async showcase(limit = 8) {
    const rows = await this.prisma.magazine.findMany({
      where: publishedMagazineWhere,
      include: magazineInclude,
      orderBy: [
        { isFeatured: 'desc' },
        { publicationDate: 'desc' },
        { issueNumber: 'asc' },
      ],
      take: limit,
    });
    return { items: rows.map(toPublicMagazine) };
  }

  async detail(slug: string) {
    const magazine = await this.prisma.magazine.findFirst({
      where: { slug, ...publishedMagazineWhere },
      include: {
        ...magazineInclude,
        relatedArticles: {
          where: { article: { status: 'PUBLISHED' } },
          select: { article: { select: { slug: true, title: true, excerpt: true } } },
        },
        leaders: {
          where: { isPublished: true },
          select: { slug: true, name: true, designation: true, organization: true },
        },
      },
    });
    if (!magazine) throw new NotFoundException('Magazine not found');
    const { relatedArticles, leaders, ...rest } = magazine;
    return {
      ...toPublicMagazine(rest),
      relatedArticles: relatedArticles.map((r) => r.article),
      leaders,
    };
  }

  /** Editions library: same table, response shaped for archive browsing. */
  async editions(query: EditionListQueryDto) {
    const { page, limit, skip, take } = resolvePaging(query, 24);
    const where: Prisma.MagazineWhereInput = {
      ...publishedMagazineWhere,
      ...this.searchClause(query.q),
      ...(query.series ? { editionSeries: { slug: query.series } } : {}),
      ...(query.year
        ? {
            publicationDate: {
              gte: new Date(Date.UTC(query.year, 0, 1)),
              lt: new Date(Date.UTC(query.year + 1, 0, 1)),
            },
          }
        : {}),
    };
    const [rows, total, facetRows] = await this.prisma.$transaction([
      this.prisma.magazine.findMany({
        where,
        include: magazineInclude,
        orderBy: [{ publicationDate: 'desc' }, { issueNumber: 'asc' }],
        skip,
        take,
      }),
      this.prisma.magazine.count({ where }),
      this.prisma.magazine.findMany({
        where: publishedMagazineWhere,
        select: {
          publicationDate: true,
          editionSeries: { select: { name: true, slug: true } },
        },
      }),
    ]);

    const years = [
      ...new Set(facetRows.map((r) => r.publicationDate.getUTCFullYear())),
    ].sort((a, b) => b - a);
    const seriesMap = new Map<string, string>();
    for (const row of facetRows) {
      if (row.editionSeries) seriesMap.set(row.editionSeries.slug, row.editionSeries.name);
    }

    return {
      ...paginated(rows.map(toEdition), total, page, limit),
      facets: {
        years,
        series: [...seriesMap].map(([slug, name]) => ({ slug, name })),
      },
    };
  }

  /**
   * Authorises and resolves a PDF. Returns the absolute path for streaming
   * only — callers must never serialise it.
   */
  async authorisePdf(slug: string, user: AuthUser | null, download: boolean) {
    const magazine = await this.prisma.magazine.findFirst({
      where: { slug, ...publishedMagazineWhere },
      select: { id: true, slug: true, pdfKey: true, access: true, allowDownload: true },
    });
    if (!magazine) throw new NotFoundException('Magazine not found');
    if (magazine.access === 'MEMBERS' && !user) {
      throw new UnauthorizedException('Sign in to read this edition');
    }
    if (download && !magazine.allowDownload) {
      throw new ForbiddenException('Downloads are disabled for this edition');
    }
    const file = await this.storage.resolvePrivatePdf(magazine.pdfKey);
    return { slug: magazine.slug, ...file };
  }

  async saveProgress(slug: string, user: AuthUser, page: number) {
    const magazine = await this.prisma.magazine.findFirst({
      where: { slug, ...publishedMagazineWhere },
      select: { id: true, pageCount: true },
    });
    if (!magazine) throw new NotFoundException('Magazine not found');
    if (magazine.pageCount && page > magazine.pageCount) {
      throw new BadRequestException(
        `page must be between 1 and ${magazine.pageCount}`,
      );
    }
    const existing = await this.prisma.readingHistory.findFirst({
      where: { userId: user.id, magazineId: magazine.id },
      select: { id: true },
    });
    const record = existing
      ? await this.prisma.readingHistory.update({
          where: { id: existing.id },
          data: { lastPage: page, lastViewedAt: new Date() },
        })
      : await this.prisma.readingHistory.create({
          data: { userId: user.id, magazineId: magazine.id, lastPage: page },
        });
    return { slug, lastPage: record.lastPage, lastViewedAt: record.lastViewedAt };
  }

  async getProgress(slug: string, user: AuthUser) {
    const record = await this.prisma.readingHistory.findFirst({
      where: { userId: user.id, magazine: { slug } },
      select: { lastPage: true, lastViewedAt: true },
    });
    return { slug, lastPage: record?.lastPage ?? 1, lastViewedAt: record?.lastViewedAt ?? null };
  }
}
