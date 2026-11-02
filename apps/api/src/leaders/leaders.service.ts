import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto, paginated, resolvePaging } from '../common/pagination';
import { publicMediaUrl } from '../common/urls';
import { PrismaService } from '../prisma/prisma.service';

export class LeaderListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(110)
  category?: string;
}

const leaderInclude = {
  category: { select: { name: true, slug: true } },
  magazine: { select: { slug: true, title: true, isPublished: true, reviewStatus: true } },
  article: { select: { slug: true, title: true, status: true } },
} satisfies Prisma.LeaderInclude;

type LeaderWithRelations = Prisma.LeaderGetPayload<{ include: typeof leaderInclude }>;

export function toPublicLeader(l: LeaderWithRelations) {
  const magazineVisible =
    l.magazine?.isPublished && l.magazine.reviewStatus === 'APPROVED';
  const articleVisible = l.article?.status === 'PUBLISHED';
  return {
    id: l.id,
    slug: l.slug,
    name: l.name,
    designation: l.designation,
    organization: l.organization,
    introduction: l.introduction,
    portraitUrl: publicMediaUrl(l.portrait),
    category: l.category,
    publicationDate: l.publicationDate.toISOString().slice(0, 10),
    isFeatured: l.isFeatured,
    magazine: magazineVisible && l.magazine
      ? { slug: l.magazine.slug, title: l.magazine.title }
      : null,
    article: articleVisible && l.article
      ? { slug: l.article.slug, title: l.article.title }
      : null,
  };
}

export const leaderInclusion = leaderInclude;

@Injectable()
export class LeadersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: LeaderListQueryDto) {
    const { page, limit, skip, take } = resolvePaging(query);
    const term = query.q?.trim();
    const where: Prisma.LeaderWhereInput = {
      isPublished: true,
      ...(query.category ? { category: { slug: query.category } } : {}),
      ...(term
        ? {
            OR: [
              { name: { contains: term, mode: 'insensitive' } },
              { organization: { contains: term, mode: 'insensitive' } },
              { designation: { contains: term, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.leader.findMany({
        where,
        include: leaderInclude,
        orderBy: [{ displayOrder: 'asc' }, { publicationDate: 'desc' }],
        skip,
        take,
      }),
      this.prisma.leader.count({ where }),
    ]);
    return paginated(rows.map(toPublicLeader), total, page, limit);
  }

  async detail(slug: string) {
    const leader = await this.prisma.leader.findFirst({
      where: { slug, isPublished: true },
      include: leaderInclude,
    });
    if (!leader) throw new NotFoundException('Leader not found');
    return toPublicLeader(leader);
  }
}
