import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto, paginated, resolvePaging } from '../common/pagination';
import type { AuthUser } from '../common/types';
import { publicMediaUrl } from '../common/urls';
import { PrismaService } from '../prisma/prisma.service';

export class ArticleListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(110)
  category?: string;
}

const articleInclude = {
  author: { select: { name: true, slug: true } },
  category: { select: { name: true, slug: true } },
} satisfies Prisma.ArticleInclude;

type ArticleWithRelations = Prisma.ArticleGetPayload<{ include: typeof articleInclude }>;

export function publishedArticleWhere(): Prisma.ArticleWhereInput {
  return { status: 'PUBLISHED', publishedAt: { lte: new Date() } };
}

function toSummary(a: ArticleWithRelations) {
  return {
    id: a.id,
    slug: a.slug,
    title: a.title,
    excerpt: a.excerpt,
    language: a.language,
    author: a.author,
    category: a.category,
    featuredImageUrl: publicMediaUrl(a.featuredImage),
    isFeatured: a.isFeatured,
    isSponsored: a.isSponsored,
    memberOnly: a.memberOnly,
    publishedAt: a.publishedAt,
  };
}

@Injectable()
export class ArticlesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ArticleListQueryDto) {
    const { page, limit, skip, take } = resolvePaging(query);
    const term = query.q?.trim();
    const where: Prisma.ArticleWhereInput = {
      ...publishedArticleWhere(),
      ...(query.category ? { category: { slug: query.category } } : {}),
      ...(term
        ? {
            OR: [
              { title: { contains: term, mode: 'insensitive' } },
              { excerpt: { contains: term, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.article.findMany({
        where,
        include: articleInclude,
        orderBy: [{ publishedAt: 'desc' }],
        skip,
        take,
      }),
      this.prisma.article.count({ where }),
    ]);
    return paginated(rows.map(toSummary), total, page, limit);
  }

  async detail(slug: string, user: AuthUser | null) {
    const article = await this.prisma.article.findFirst({
      where: { slug, ...publishedArticleWhere() },
      include: articleInclude,
    });
    if (!article) throw new NotFoundException('Story not found');
    const locked = article.memberOnly && !user;
    return {
      ...toSummary(article),
      metaDescription: article.metaDescription,
      locked,
      body: locked ? null : article.body,
    };
  }
}
