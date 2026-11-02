import { Controller, Get, Injectable, Module, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsString, Max, MaxLength, Min, MinLength, IsOptional } from 'class-validator';
import { publishedArticleWhere } from '../articles/articles.service';
import { publicMediaUrl } from '../common/urls';
import { publishedMagazineWhere } from '../magazines/magazine.mapper';
import { PrismaService } from '../prisma/prisma.service';

export class SearchQueryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  q!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number;
}

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: SearchQueryDto) {
    const term = query.q.trim();
    const take = query.limit ?? 6;
    const contains = { contains: term, mode: 'insensitive' as const };

    const [magazines, articles, leaders] = await Promise.all([
      this.prisma.magazine.findMany({
        where: {
          ...publishedMagazineWhere,
          OR: [{ title: contains }, { subtitle: contains }, { description: contains }],
        },
        select: {
          slug: true,
          title: true,
          issueNumber: true,
          publicationDate: true,
          coverImage: true,
        },
        orderBy: { publicationDate: 'desc' },
        take,
      }),
      this.prisma.article.findMany({
        where: {
          ...publishedArticleWhere(),
          OR: [{ title: contains }, { excerpt: contains }],
        },
        select: { slug: true, title: true, excerpt: true, publishedAt: true },
        orderBy: { publishedAt: 'desc' },
        take,
      }),
      this.prisma.leader.findMany({
        where: {
          isPublished: true,
          OR: [{ name: contains }, { organization: contains }, { designation: contains }],
        },
        select: { slug: true, name: true, designation: true, organization: true, portrait: true },
        orderBy: { displayOrder: 'asc' },
        take,
      }),
    ]);

    return {
      query: term,
      magazines: magazines.map((m) => ({
        slug: m.slug,
        title: m.title,
        issueNumber: m.issueNumber,
        publicationDate: m.publicationDate.toISOString().slice(0, 10),
        coverUrl: publicMediaUrl(m.coverImage),
      })),
      articles,
      leaders: leaders.map(({ portrait, ...rest }) => ({
        ...rest,
        portraitUrl: publicMediaUrl(portrait),
      })),
    };
  }
}

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  /** Global search across published content only. */
  @Get()
  run(@Query() query: SearchQueryDto) {
    return this.search.search(query);
  }
}

@Module({
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
