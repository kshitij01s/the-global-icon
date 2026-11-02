import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ArticleStatus, Prisma } from '@prisma/client';
import { hasPermission, writeAudit } from '../common/audit';
import { paginated, resolvePaging } from '../common/pagination';
import { uniqueSlug } from '../common/slug';
import type { AuthUser } from '../common/types';
import { publicMediaUrl } from '../common/urls';
import { PERMISSIONS } from '../auth/permissions';
import { PrismaService } from '../prisma/prisma.service';
import type { AdminArticleListQueryDto, CreateArticleDto, UpdateArticleDto } from './articles.dto';

const articleInclude = {
  author: { select: { id: true, name: true, slug: true } },
  category: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.ArticleInclude;

type ArticleRow = Prisma.ArticleGetPayload<{ include: typeof articleInclude }>;

function toAdminArticle(a: ArticleRow, withBody: boolean) {
  const { body, featuredImage, ...rest } = a;
  return {
    ...rest,
    featuredImageKey: featuredImage,
    featuredImageUrl: publicMediaUrl(featuredImage),
    ...(withBody ? { body } : {}),
  };
}

/** Review-workflow statuses require the dedicated review permission. */
const REVIEW_ONLY_STATUSES: ArticleStatus[] = ['CHANGES_REQUESTED', 'APPROVED', 'ARCHIVED'];

@Injectable()
export class AdminArticlesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AdminArticleListQueryDto) {
    const { page, limit, skip, take } = resolvePaging(query, 20);
    const term = query.q?.trim();
    const where: Prisma.ArticleWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(term
        ? {
            OR: [
              { title: { contains: term, mode: 'insensitive' } },
              { slug: { contains: term, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.article.findMany({
        where,
        include: articleInclude,
        orderBy: [{ updatedAt: 'desc' }],
        skip,
        take,
      }),
      this.prisma.article.count({ where }),
    ]);
    return paginated(rows.map((r) => toAdminArticle(r, false)), total, page, limit);
  }

  async get(id: string) {
    return toAdminArticle(await this.find(id), true);
  }

  async create(dto: CreateArticleDto, actor: AuthUser) {
    await this.assertRefs(dto.authorId, dto.categoryId);
    const slug = await uniqueSlug(dto.title, async (candidate) =>
      Boolean(await this.prisma.article.findUnique({ where: { slug: candidate }, select: { id: true } })),
    );
    const created = await this.prisma.article.create({
      data: {
        title: dto.title,
        slug,
        excerpt: dto.excerpt,
        body: dto.body,
        language: dto.language,
        authorId: dto.authorId,
        categoryId: dto.categoryId,
        featuredImage: dto.featuredImage,
        isFeatured: dto.isFeatured ?? false,
        isSponsored: dto.isSponsored ?? false,
        memberOnly: dto.memberOnly ?? false,
        metaDescription: dto.metaDescription,
        status: 'DRAFT',
      },
      include: articleInclude,
    });
    await writeAudit(this.prisma, {
      actor,
      modelLabel: 'Article',
      eventType: 'article.created',
      objectId: created.id,
      objectRepr: created.title,
    });
    return toAdminArticle(created, true);
  }

  async update(id: string, dto: UpdateArticleDto, actor: AuthUser) {
    const current = await this.find(id);
    if (current.status === 'PUBLISHED' && dto.status && dto.status !== 'ARCHIVED') {
      throw new BadRequestException('Unpublish the article before changing its workflow status');
    }
    if (
      dto.status &&
      REVIEW_ONLY_STATUSES.includes(dto.status) &&
      !hasPermission(actor, PERMISSIONS.ARTICLES_REVIEW) &&
      !hasPermission(actor, PERMISSIONS.ARTICLES_PUBLISH)
    ) {
      throw new ForbiddenException('Changing to this status requires review permission');
    }
    await this.assertRefs(dto.authorId, dto.categoryId);
    const updated = await this.prisma.article.update({
      where: { id },
      data: { ...dto },
      include: articleInclude,
    });
    await writeAudit(this.prisma, {
      actor,
      modelLabel: 'Article',
      eventType: 'article.updated',
      objectId: id,
      objectRepr: updated.title,
      details: { fields: Object.keys(dto) },
    });
    return toAdminArticle(updated, true);
  }

  async publish(id: string, actor: AuthUser) {
    const article = await this.find(id);
    if (!article.body.trim()) throw new BadRequestException('Cannot publish an article without a body');
    const updated = await this.prisma.article.update({
      where: { id },
      data: { status: 'PUBLISHED', publishedAt: article.publishedAt ?? new Date() },
      include: articleInclude,
    });
    await writeAudit(this.prisma, {
      actor,
      modelLabel: 'Article',
      eventType: 'article.published',
      objectId: id,
      objectRepr: updated.title,
    });
    return toAdminArticle(updated, true);
  }

  async unpublish(id: string, actor: AuthUser) {
    await this.find(id);
    const updated = await this.prisma.article.update({
      where: { id },
      data: { status: 'DRAFT' },
      include: articleInclude,
    });
    await writeAudit(this.prisma, {
      actor,
      modelLabel: 'Article',
      eventType: 'article.unpublished',
      objectId: id,
      objectRepr: updated.title,
    });
    return toAdminArticle(updated, true);
  }

  async remove(id: string, actor: AuthUser) {
    const article = await this.find(id);
    await this.prisma.article.delete({ where: { id } });
    await writeAudit(this.prisma, {
      actor,
      modelLabel: 'Article',
      eventType: 'article.deleted',
      objectId: id,
      objectRepr: article.title,
    });
    return { deleted: true };
  }

  private async find(id: string) {
    const article = await this.prisma.article.findUnique({ where: { id }, include: articleInclude });
    if (!article) throw new NotFoundException('Article not found');
    return article;
  }

  private async assertRefs(authorId?: string | null, categoryId?: string | null) {
    if (authorId && !(await this.prisma.author.findUnique({ where: { id: authorId }, select: { id: true } }))) {
      throw new BadRequestException('authorId does not exist');
    }
    if (categoryId && !(await this.prisma.category.findUnique({ where: { id: categoryId }, select: { id: true } }))) {
      throw new BadRequestException('categoryId does not exist');
    }
  }
}
