import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ApiInboxService } from '../api-inbox/api-inbox.service';
import { ApiInboxSeverity } from '../api-inbox/api-inbox.enums';
import { paginated, resolvePaging } from '../common/pagination';
import type { AuthUser } from '../common/types';
import { uniqueSlug } from '../common/slug';
import {
  magazineInclude,
  MagazineWithRelations,
  toPublicMagazine,
} from '../magazines/magazine.mapper';
import { PrismaService } from '../prisma/prisma.service';
import type {
  AdminMagazineListQueryDto,
  CreateMagazineDto,
  UpdateMagazineDto,
} from './dto';

function toAdminMagazine(m: MagazineWithRelations) {
  return {
    ...toPublicMagazine(m),
    reviewStatus: m.reviewStatus,
    isPublished: m.isPublished,
    publishedAt: m.publishedAt,
    submittedAt: m.submittedAt,
    reviewedAt: m.reviewedAt,
    pdfKey: m.pdfKey,
    coverImageKey: m.coverImage,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  };
}

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly apiInbox: ApiInboxService,
  ) {}

  async dashboard() {
    const [
      magazinesTotal,
      magazinesPublished,
      magazinesDraft,
      magazinesInReview,
      magazinesDemo,
      articlesTotal,
      articlesPublished,
      articlesInReview,
      leadersTotal,
      leadersPublished,
      enquiriesTotal,
      enquiriesNew,
      subscribersActive,
      usersTotal,
      adsActive,
      recentEnquiries,
    ] = await this.prisma.$transaction([
      this.prisma.magazine.count(),
      this.prisma.magazine.count({ where: { isPublished: true } }),
      this.prisma.magazine.count({ where: { reviewStatus: 'DRAFT' } }),
      this.prisma.magazine.count({ where: { reviewStatus: 'IN_REVIEW' } }),
      this.prisma.magazine.count({ where: { isDemo: true } }),
      this.prisma.article.count(),
      this.prisma.article.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.article.count({ where: { status: 'IN_REVIEW' } }),
      this.prisma.leader.count(),
      this.prisma.leader.count({ where: { isPublished: true } }),
      this.prisma.enquiry.count(),
      this.prisma.enquiry.count({ where: { status: 'NEW' } }),
      this.prisma.newsletterSubscriber.count({ where: { isActive: true } }),
      this.prisma.user.count(),
      this.prisma.advertisement.count({ where: { isActive: true } }),
      this.prisma.enquiry.findMany({
        orderBy: { submittedAt: 'desc' },
        take: 5,
        select: {
          reference: true,
          fullName: true,
          company: true,
          enquiryType: true,
          status: true,
          submittedAt: true,
        },
      }),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      magazines: {
        total: magazinesTotal,
        published: magazinesPublished,
        draft: magazinesDraft,
        inReview: magazinesInReview,
        demo: magazinesDemo,
      },
      articles: {
        total: articlesTotal,
        published: articlesPublished,
        inReview: articlesInReview,
      },
      leaders: { total: leadersTotal, published: leadersPublished },
      enquiries: { total: enquiriesTotal, new: enquiriesNew },
      newsletter: { activeSubscribers: subscribersActive },
      users: { total: usersTotal },
      advertisements: { active: adsActive },
      recentEnquiries,
    };
  }

  async listMagazines(query: AdminMagazineListQueryDto) {
    const { page, limit, skip, take } = resolvePaging(query, 20);
    const term = query.q?.trim();
    const where: Prisma.MagazineWhereInput = {
      ...(query.reviewStatus ? { reviewStatus: query.reviewStatus } : {}),
      ...(term
        ? {
            OR: [
              { title: { contains: term, mode: 'insensitive' } },
              { issueNumber: { contains: term, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.magazine.findMany({
        where,
        include: magazineInclude,
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take,
      }),
      this.prisma.magazine.count({ where }),
    ]);
    return paginated(rows.map(toAdminMagazine), total, page, limit);
  }

  async getMagazine(id: string) {
    return toAdminMagazine(await this.findMagazine(id));
  }

  async createMagazine(dto: CreateMagazineDto, actor: AuthUser) {
    const slug = await uniqueSlug(dto.title, async (candidate) =>
      Boolean(
        await this.prisma.magazine.findUnique({
          where: { slug: candidate },
          select: { id: true },
        }),
      ),
    );
    const created = await this.prisma.magazine.create({
      data: {
        title: dto.title,
        slug,
        subtitle: dto.subtitle,
        description: dto.description,
        publisherName: dto.publisherName,
        issueNumber: dto.issueNumber,
        categoryId: dto.categoryId,
        editionSeriesId: dto.editionSeriesId,
        coverImage: dto.coverImage,
        coverAltText: dto.coverAltText,
        pdfKey: dto.pdfKey,
        pageCount: dto.pageCount,
        access: dto.access,
        allowDownload: dto.allowDownload,
        isFeatured: dto.isFeatured ?? false,
        publicationDate: new Date(dto.publicationDate),
        metaDescription: dto.metaDescription,
        reviewStatus: 'DRAFT',
        isPublished: false,
        submittedById: actor.id,
      },
      include: magazineInclude,
    });
    await this.audit(actor, 'magazine.created', created.id, created.title);
    return toAdminMagazine(created);
  }

  async updateMagazine(id: string, dto: UpdateMagazineDto, actor: AuthUser) {
    await this.findMagazine(id);
    const { publicationDate, reviewStatus, ...rest } = dto;
    const updated = await this.prisma.magazine.update({
      where: { id },
      data: {
        ...rest,
        ...(publicationDate ? { publicationDate: new Date(publicationDate) } : {}),
        ...(reviewStatus
          ? { reviewStatus, reviewedById: actor.id, reviewedAt: new Date() }
          : {}),
      },
      include: magazineInclude,
    });
    await this.audit(actor, 'magazine.updated', id, updated.title, {
      fields: Object.keys(dto),
    });
    return toAdminMagazine(updated);
  }

  async publishMagazine(id: string, actor: AuthUser) {
    const magazine = await this.findMagazine(id);
    if (!magazine.pdfKey) {
      throw new BadRequestException('Cannot publish a magazine without a PDF');
    }
    try {
      const updated = await this.prisma.magazine.update({
        where: { id },
        data: {
          isPublished: true,
          reviewStatus: 'APPROVED',
          publishedAt: magazine.publishedAt ?? new Date(),
          publishedById: actor.id,
        },
        include: magazineInclude,
      });
      await this.audit(actor, 'magazine.published', id, updated.title);
      return toAdminMagazine(updated);
    } catch (err) {
      if (err instanceof BadRequestException || err instanceof NotFoundException) throw err;
      const report = await this.apiInbox.reportSafe({
        category: 'magazine_publish',
        source: 'admin.magazines.publish',
        technicalError: err instanceof Error ? err : String(err),
        severity: ApiInboxSeverity.CRITICAL,
        userId: actor.id,
        entityType: 'magazine',
        entityId: id,
      });
      throw new ServiceUnavailableException(
        report?.customerMessage ??
          'The magazine could not be published. Please try again later.',
      );
    }
  }

  async unpublishMagazine(id: string, actor: AuthUser) {
    await this.findMagazine(id);
    const updated = await this.prisma.magazine.update({
      where: { id },
      data: { isPublished: false },
      include: magazineInclude,
    });
    await this.audit(actor, 'magazine.unpublished', id, updated.title);
    return toAdminMagazine(updated);
  }

  async deleteMagazine(id: string, actor: AuthUser) {
    const magazine = await this.findMagazine(id);
    await this.prisma.magazine.delete({ where: { id } });
    await this.audit(actor, 'magazine.deleted', id, magazine.title);
    return { deleted: true };
  }

  private async findMagazine(id: string) {
    const magazine = await this.prisma.magazine.findUnique({
      where: { id },
      include: magazineInclude,
    });
    if (!magazine) throw new NotFoundException('Magazine not found');
    return magazine;
  }

  private audit(
    actor: AuthUser,
    eventType: string,
    objectId: string,
    objectRepr: string,
    details?: Prisma.InputJsonValue,
  ) {
    return this.prisma.auditLog.create({
      data: {
        actorId: actor.id,
        eventType,
        modelLabel: 'Magazine',
        objectId,
        objectRepr,
        details,
      },
    });
  }
}
