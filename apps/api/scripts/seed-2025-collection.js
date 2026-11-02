/**
 * Idempotent seed: clearly labelled DEMO 2025 Collection magazines.
 * Does not invent "real" publications — titles and descriptions mark demo status.
 * Reuses existing demo cover artwork; PDFs optional (linked to supplied samples when present).
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const STORAGE = path.resolve(__dirname, '../../../storage/development-only');

const DEMOS = [
  {
    slug: 'demo-2025-global-business-outlook',
    title: 'DEMO SEED: 2025 Global Business Outlook',
    subtitle: 'Sample archive edition for the 2025 Collection',
    issueNumber: '2025-01',
    publicationDate: '2025-03-15',
    categorySlug: 'business',
    categoryName: 'Business',
    cover: 'demo-pdf-covers/Magazine_1-cover.png',
    pdf: 'magazines/pdfs/supplied/Magazine_1.pdf',
    description:
      'DEMO SEED content for THE GLOBAL ICON 2025 archive. This is a sample edition used to demonstrate year filtering and archive navigation — not an official published issue.',
  },
  {
    slug: 'demo-2025-women-in-leadership',
    title: 'DEMO SEED: Women in Leadership 2025',
    subtitle: 'Sample special edition',
    issueNumber: '2025-02',
    publicationDate: '2025-06-01',
    categorySlug: 'demo-category-leadership',
    categoryName: 'Leadership & Interviews',
    cover: 'demo-pdf-covers/Magazine_4-cover.png',
    pdf: 'magazines/pdfs/supplied/Magazine_4.pdf',
    description:
      'DEMO SEED special edition illustrating Women in Leadership archive presentation for 2025.',
  },
  {
    slug: 'demo-2025-technology-innovators',
    title: 'DEMO SEED: Technology Innovators 2025',
    subtitle: 'Sample technology collection',
    issueNumber: '2025-03',
    publicationDate: '2025-09-12',
    categorySlug: 'technology',
    categoryName: 'Technology',
    cover: 'demo-pdf-covers/magazine_2-cover.png',
    pdf: 'magazines/pdfs/supplied/magazine_2.pdf',
    description:
      'DEMO SEED technology collection for the 2025 year archive and Magazines discovery filters.',
  },
  {
    slug: 'demo-2025-entrepreneurship-special',
    title: 'DEMO SEED: Entrepreneurship Special 2025',
    subtitle: 'Sample founders edition',
    issueNumber: '2025-04',
    publicationDate: '2025-11-20',
    categorySlug: 'demo-category-entrepreneurship',
    categoryName: 'Entrepreneurship',
    cover: 'demo-pdf-covers/magazine_3-cover.png',
    pdf: 'magazines/pdfs/supplied/magazine_3.pdf',
    description:
      'DEMO SEED entrepreneurship edition for demonstrating 2025 Collection browsing.',
  },
];

async function ensureCategory(slug, name) {
  return prisma.category.upsert({
    where: { slug },
    create: { slug, name, description: 'Editorial category' },
    update: { name },
  });
}

(async () => {
  let created = 0;
  let skipped = 0;
  for (const d of DEMOS) {
    const existing = await prisma.magazine.findUnique({ where: { slug: d.slug } });
    if (existing) {
      skipped += 1;
      continue;
    }
    const category = await ensureCategory(d.categorySlug, d.categoryName);
    const coverOk = fs.existsSync(path.join(STORAGE, d.cover));
    const pdfOk = fs.existsSync(path.join(STORAGE, d.pdf));
    await prisma.magazine.create({
      data: {
        title: d.title,
        slug: d.slug,
        subtitle: d.subtitle,
        description: d.description,
        publisherName: 'THE GLOBAL ICON (Demo Seed)',
        issueNumber: d.issueNumber,
        categoryId: category.id,
        coverImage: coverOk ? d.cover : null,
        coverAltText: `Demo cover for ${d.title}`,
        pdfKey: pdfOk ? d.pdf : null,
        pageCount: pdfOk ? 9 : null,
        access: 'PUBLIC',
        allowDownload: true,
        reviewStatus: 'APPROVED',
        isFeatured: d.slug.includes('women'),
        isPublished: true,
        isDemo: true,
        publicationDate: new Date(d.publicationDate),
        publishedAt: new Date(d.publicationDate),
        metaDescription: 'Demo seed magazine for 2025 archive testing.',
      },
    });
    created += 1;
  }
  console.log(JSON.stringify({ created, skipped, year: 2025 }, null, 2));
  await prisma.$disconnect();
})().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
