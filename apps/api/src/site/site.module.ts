import { Controller, Get, Injectable, Module } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { SiteSettings } from '@prisma/client';
import { publishedArticleWhere } from '../articles/articles.service';
import { publicMediaUrl } from '../common/urls';
import {
  magazineInclude,
  publishedMagazineWhere,
  toPublicMagazine,
} from '../magazines/magazine.mapper';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_SETTINGS = {
  siteName: 'THE GLOBAL ICON',
  tagline: 'Stories That Shape Tomorrow.',
  heroTitle: 'Stories That Shape Tomorrow.',
  heroCopy: "Discover the people, ideas, and innovations shaping tomorrow's world.",
  newsletterHeading: 'The week, in perspective.',
  newsletterCopy: 'Thoughtful reads and new editions, delivered to your inbox.',
};

function toPublicSettings(s: SiteSettings | null) {
  return {
    siteName: s?.siteName ?? DEFAULT_SETTINGS.siteName,
    tagline: s?.tagline ?? DEFAULT_SETTINGS.tagline,
    heroTitle: s?.heroTitle ?? DEFAULT_SETTINGS.heroTitle,
    heroCopy: s?.heroCopy ?? DEFAULT_SETTINGS.heroCopy,
    newsletterHeading: s?.newsletterHeading ?? DEFAULT_SETTINGS.newsletterHeading,
    newsletterCopy: s?.newsletterCopy ?? DEFAULT_SETTINGS.newsletterCopy,
    contactEmail: s?.contactEmail ?? null,
    contactPhone: s?.contactPhone ?? null,
    officeAddress: s?.officeAddress ?? null,
    contactResponseTime: s?.contactResponseTime ?? null,
    social: {
      linkedin: s?.linkedinUrl ?? null,
      instagram: s?.instagramUrl ?? null,
      twitter: s?.twitterUrl ?? null,
      youtube: s?.youtubeUrl ?? null,
    },
  };
}

@Injectable()
export class SiteService {
  constructor(private readonly prisma: PrismaService) {}

  private getSettingsRow() {
    return this.prisma.siteSettings.findUnique({ where: { id: 1 } });
  }

  async settings() {
    return toPublicSettings(await this.getSettingsRow());
  }

  async homepage() {
    const now = new Date();
    const [settings, announcement, latestMagazines, stories, leaders, sections, partners] =
      await Promise.all([
        this.getSettingsRow(),
        this.prisma.announcement.findFirst({
          where: {
            isActive: true,
            AND: [
              { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
              { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
            ],
          },
          orderBy: { updatedAt: 'desc' },
          select: { title: true, message: true, linkLabel: true, linkUrl: true },
        }),
        this.prisma.magazine.findMany({
          where: publishedMagazineWhere,
          include: magazineInclude,
          orderBy: [{ isFeatured: 'desc' }, { publicationDate: 'desc' }, { issueNumber: 'asc' }],
          take: 6,
        }),
        this.prisma.article.findMany({
          where: publishedArticleWhere(),
          include: { author: { select: { name: true, slug: true } }, category: { select: { name: true, slug: true } } },
          orderBy: [{ isFeatured: 'desc' }, { publishedAt: 'desc' }],
          take: 6,
        }),
        this.prisma.leader.findMany({
          where: { isPublished: true },
          orderBy: [{ isFeatured: 'desc' }, { displayOrder: 'asc' }, { publicationDate: 'desc' }],
          take: 6,
          select: {
            slug: true,
            name: true,
            designation: true,
            organization: true,
            portrait: true,
          },
        }),
        this.prisma.homepageSection.findMany({
          where: { isVisible: true },
          orderBy: { displayOrder: 'asc' },
          include: {
            category: { select: { name: true, slug: true } },
            articles: {
              where: { article: publishedArticleWhere() },
              select: { article: { select: { slug: true, title: true, excerpt: true, featuredImage: true } } },
              take: 4,
            },
          },
        }),
        this.prisma.partner.findMany({
          where: { isVisible: true },
          orderBy: { displayOrder: 'asc' },
          select: { name: true, logo: true, websiteUrl: true },
        }),
      ]);

    const featuredMagazine = settings?.featuredMagazineId
      ? await this.prisma.magazine.findFirst({
          where: { id: settings.featuredMagazineId, ...publishedMagazineWhere },
          include: magazineInclude,
        })
      : null;
    const featuredArticle = settings?.featuredArticleId
      ? await this.prisma.article.findFirst({
          where: { id: settings.featuredArticleId, ...publishedArticleWhere() },
          select: { slug: true, title: true, excerpt: true, featuredImage: true },
        })
      : null;

    return {
      settings: toPublicSettings(settings),
      announcement,
      featuredMagazine: featuredMagazine ? toPublicMagazine(featuredMagazine) : null,
      featuredArticle: featuredArticle
        ? {
            slug: featuredArticle.slug,
            title: featuredArticle.title,
            excerpt: featuredArticle.excerpt,
            featuredImageUrl: publicMediaUrl(featuredArticle.featuredImage),
          }
        : null,
      latestMagazines: latestMagazines.map(toPublicMagazine),
      stories: stories.map((a) => ({
        slug: a.slug,
        title: a.title,
        excerpt: a.excerpt,
        author: a.author,
        category: a.category,
        featuredImageUrl: publicMediaUrl(a.featuredImage),
        publishedAt: a.publishedAt,
      })),
      leaders: leaders.map(({ portrait, ...rest }) => ({
        ...rest,
        portraitUrl: publicMediaUrl(portrait),
      })),
      sections: sections.map((s) => ({
        title: s.title,
        subtitle: s.subtitle,
        category: s.category,
        articles: s.articles.map(({ article }) => ({
          slug: article.slug,
          title: article.title,
          excerpt: article.excerpt,
          featuredImageUrl: publicMediaUrl(article.featuredImage),
        })),
      })),
      partners: partners.map(({ logo, ...rest }) => ({
        ...rest,
        logoUrl: publicMediaUrl(logo),
      })),
    };
  }
}

@ApiTags('site')
@Controller('site')
export class SiteController {
  constructor(private readonly site: SiteService) {}

  @Get('settings')
  settings() {
    return this.site.settings();
  }

  @Get('homepage')
  homepage() {
    return this.site.homepage();
  }
}

@Module({
  controllers: [SiteController],
  providers: [SiteService],
})
export class SiteModule {}
