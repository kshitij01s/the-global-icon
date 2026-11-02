import type { Prisma } from '@prisma/client';
import { magazinePdfUrl, publicMediaUrl } from '../common/urls';

export const magazineInclude = {
  category: { select: { name: true, slug: true } },
  editionSeries: { select: { name: true, slug: true, region: true } },
} satisfies Prisma.MagazineInclude;

export type MagazineWithRelations = Prisma.MagazineGetPayload<{
  include: typeof magazineInclude;
}>;

/** Filter that every public endpoint must apply. */
export const publishedMagazineWhere: Prisma.MagazineWhereInput = {
  isPublished: true,
  reviewStatus: 'APPROVED',
};

export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function issueLabel(issueNumber: string | null): string | null {
  if (!issueNumber) return null;
  return /^\d+$/.test(issueNumber) ? `Issue ${issueNumber}` : issueNumber;
}

/**
 * Public representation. Deliberately omits `pdfKey`, `coverImage` keys and any
 * reviewer/publisher identifiers.
 */
export function toPublicMagazine(m: MagazineWithRelations) {
  return {
    id: m.id,
    slug: m.slug,
    title: m.title,
    subtitle: m.subtitle,
    description: m.description,
    publisherName: m.publisherName,
    issueNumber: m.issueNumber,
    issueLabel: issueLabel(m.issueNumber),
    publicationDate: isoDate(m.publicationDate),
    language: m.language,
    category: m.category,
    editionSeries: m.editionSeries,
    coverUrl: publicMediaUrl(m.coverImage),
    coverAltText: m.coverAltText ?? `Cover of ${m.title}`,
    pageCount: m.pageCount,
    access: m.access,
    allowDownload: m.allowDownload,
    isFeatured: m.isFeatured,
    isDemo: m.isDemo,
    hasPdf: Boolean(m.pdfKey),
    pdfUrl: m.pdfKey ? magazinePdfUrl(m.slug) : null,
    metaDescription: m.metaDescription,
  };
}

/** Shape tailored for the editions library (grid / archive views). */
export function toEdition(m: MagazineWithRelations) {
  return {
    id: m.id,
    slug: m.slug,
    title: m.title,
    subtitle: m.subtitle,
    issueNumber: m.issueNumber,
    issueLabel: issueLabel(m.issueNumber),
    publicationDate: isoDate(m.publicationDate),
    year: m.publicationDate.getUTCFullYear(),
    month: m.publicationDate.getUTCMonth() + 1,
    series: m.editionSeries?.name ?? null,
    seriesSlug: m.editionSeries?.slug ?? null,
    region: m.editionSeries?.region ?? null,
    category: m.category,
    coverUrl: publicMediaUrl(m.coverImage),
    coverAltText: m.coverAltText ?? `Cover of ${m.title}`,
    pageCount: m.pageCount,
    access: m.access,
    isDemo: m.isDemo,
    isFeatured: m.isFeatured,
    detailUrl: `/api/magazines/${encodeURIComponent(m.slug)}`,
    pdfUrl: m.pdfKey ? magazinePdfUrl(m.slug) : null,
  };
}
