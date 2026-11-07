import {
  Controller,
  Get,
  Header,
  Injectable,
  Module,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { ApiInboxService } from '../api-inbox/api-inbox.service';
import { ApiInboxSeverity } from '../api-inbox/api-inbox.enums';
import { publishedArticleWhere } from '../articles/articles.service';
import { PrismaService } from '../prisma/prisma.service';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

@Injectable()
export class RssService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly apiInbox: ApiInboxService,
  ) {}

  private siteUrl(): string {
    const explicit = this.config.get<string>('PUBLIC_SITE_URL');
    const first = this.config.get<string>('CORS_ORIGINS')?.split(',')[0];
    return (explicit || first || 'http://localhost:5173').trim().replace(/\/+$/, '');
  }

  async articlesFeed(): Promise<string> {
    try {
      const site = this.siteUrl();
      const [settings, articles] = await Promise.all([
        this.prisma.siteSettings.findUnique({ where: { id: 1 } }),
        this.prisma.article.findMany({
          where: { ...publishedArticleWhere(), memberOnly: false },
          orderBy: { publishedAt: 'desc' },
          take: 30,
          select: {
            slug: true,
            title: true,
            excerpt: true,
            publishedAt: true,
            author: { select: { name: true } },
            category: { select: { name: true } },
          },
        }),
      ]);

      const siteName = settings?.siteName ?? 'THE GLOBAL ICON';
      const tagline = settings?.tagline ?? 'Stories That Shape Tomorrow.';

      const items = articles
        .map((a) => {
          const link = `${site}/stories/${encodeURIComponent(a.slug)}`;
          return [
            '    <item>',
            `      <title>${escapeXml(a.title)}</title>`,
            `      <link>${escapeXml(link)}</link>`,
            `      <guid isPermaLink="true">${escapeXml(link)}</guid>`,
            a.publishedAt ? `      <pubDate>${a.publishedAt.toUTCString()}</pubDate>` : '',
            a.author ? `      <author>${escapeXml(a.author.name)}</author>` : '',
            a.category ? `      <category>${escapeXml(a.category.name)}</category>` : '',
            `      <description>${escapeXml(a.excerpt ?? '')}</description>`,
            '    </item>',
          ]
            .filter(Boolean)
            .join('\n');
        })
        .join('\n');

      return [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<rss version="2.0">',
        '  <channel>',
        `    <title>${escapeXml(siteName)} — Stories</title>`,
        `    <link>${escapeXml(site)}</link>`,
        `    <description>${escapeXml(tagline)}</description>`,
        '    <language>en</language>',
        `    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`,
        items,
        '  </channel>',
        '</rss>',
        '',
      ].join('\n');
    } catch (err) {
      const report = await this.apiInbox.reportSafe({
        category: 'rss',
        source: 'rss.articlesFeed',
        technicalError: err instanceof Error ? err : String(err),
        severity: ApiInboxSeverity.WARNING,
      });
      throw new ServiceUnavailableException(
        report?.customerMessage ??
          'The feed service is temporarily unavailable. Please try again shortly.',
      );
    }
  }
}

@ApiTags('rss')
@Controller('rss')
export class RssController {
  constructor(private readonly rss: RssService) {}

  @Get('articles.xml')
  @Header('Content-Type', 'application/rss+xml; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=300')
  articles(): Promise<string> {
    return this.rss.articlesFeed();
  }
}

@Module({
  controllers: [RssController],
  providers: [RssService],
})
export class RssModule {}
