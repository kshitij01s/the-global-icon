/**
 * Idempotent DEMO editorial stories. Original sample copy only — not third-party articles.
 * Authors are clearly labelled as demo authors. Safe to re-run.
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const STORIES = [
  {
    slug: 'demo-future-of-global-business-leadership',
    title: 'DEMO: The Future of Global Business Leadership',
    category: { slug: 'business', name: 'Business' },
    excerpt:
      'How boards and executive teams are rethinking leadership for cross-border growth, governance, and trust.',
    body: `## A shifting mandate

DEMO SEED editorial. Leadership is no longer only about quarterly targets. Across regions, executives are balancing stakeholder expectations, digital transformation, and geopolitical uncertainty.

## What durable leaders practise

They invest in clear decision rights, cultivate diverse benches of talent, and treat narrative as seriously as numbers. THE GLOBAL ICON will continue covering these themes with interviews and long-form reporting.

> “Clarity of purpose travels farther than any single market plan.” — DEMO author note

This sample article demonstrates Stories layout, categories, and reading experience until editorial replaces it.`,
  },
  {
    slug: 'demo-ai-transforming-industries',
    title: 'DEMO: How Artificial Intelligence Is Transforming Industries',
    category: { slug: 'technology', name: 'Technology' },
    excerpt: 'From operations to product design, AI is reshaping how organisations compete — and where humans stay essential.',
    body: `## Beyond the hype cycle

DEMO SEED editorial. Artificial intelligence is moving from pilot projects into production workflows in logistics, finance, healthcare administration, and creative tooling.

## Guardrails matter

Responsible adoption pairs capability with data stewardship, workforce reskilling, and transparent disclosure. This demo story outlines the conversation without claiming proprietary research.`,
  },
  {
    slug: 'demo-new-generation-entrepreneurs',
    title: 'DEMO: The New Generation of Entrepreneurs',
    category: { slug: 'entrepreneurship', name: 'Entrepreneurship' },
    excerpt: 'Founders building across borders share a bias for speed, community, and capital that understands long cycles.',
    body: `## Founders without borders

DEMO SEED editorial. A new cohort of entrepreneurs is assembling distributed teams, raising capital across hubs, and designing products for multiple regulatory environments from day one.

## What they ask of media

They want profiles that respect substance over spectacle — a standard THE GLOBAL ICON aims to uphold in future published features.`,
  },
  {
    slug: 'demo-women-leaders-shaping-business',
    title: 'DEMO: Women Leaders Shaping the Future of Business',
    category: { slug: 'leadership', name: 'Leadership' },
    excerpt: 'Perspectives on representation, mentorship, and decision-making power inside global organisations.',
    body: `## Representation with responsibility

DEMO SEED editorial. Women leaders featured across industries emphasise sponsorship, measurable inclusion goals, and cultures that reward contribution over proximity.

## Why this demo exists

It exercises category filters, featured presentation, and story detail typography for Women in Leadership browsing.`,
  },
  {
    slug: 'demo-innovation-technology-whats-next',
    title: 'DEMO: Innovation and Technology — What’s Next?',
    category: { slug: 'innovation', name: 'Innovation' },
    excerpt: 'A field guide to signals worth watching — connectivity, climate tech, and applied research that leaves the lab.',
    body: `## Signals, not noise

DEMO SEED editorial. Innovation desks track patents, university spin-outs, and enterprise pilots that survive budget cycles. This sample summarises how an editorial calendar might organise those beats.`,
  },
  {
    slug: 'demo-building-sustainable-global-businesses',
    title: 'DEMO: Building Sustainable Global Businesses',
    category: { slug: 'global-impact', name: 'Global Impact' },
    excerpt: 'Sustainability as operating discipline — supply chains, reporting, and product design that endure scrutiny.',
    body: `## Durability over slogans

DEMO SEED editorial. Sustainable businesses treat environmental and social performance as core operations, not seasonal campaigns. Sample narrative for Global Impact category browsing.`,
  },
  {
    slug: 'demo-future-healthcare-digital-innovation',
    title: 'DEMO: The Future of Healthcare and Digital Innovation',
    category: { slug: 'healthcare', name: 'Healthcare' },
    excerpt: 'Digital care pathways, diagnostics, and hospital systems learning to ship software with clinical caution.',
    body: `## Care, coded carefully

DEMO SEED editorial. Healthcare innovation succeeds when clinicians, engineers, and regulators share a vocabulary. This demo article stands in for forthcoming Healthcare coverage.`,
  },
  {
    slug: 'demo-emerging-markets-global-opportunities',
    title: 'DEMO: Emerging Markets and Global Opportunities',
    category: { slug: 'finance', name: 'Finance' },
    excerpt: 'Where capital, talent, and policy align — and how international readers can follow the story with nuance.',
    body: `## Opportunity with context

DEMO SEED editorial. Emerging markets are not a monolith. Local institutions, demographics, and infrastructure determine which opportunities compound. Sample Finance desk copy for discovery filters.`,
  },
];

async function ensureCategory(slug, name) {
  const bySlug = await prisma.category.findUnique({ where: { slug } });
  if (bySlug) return bySlug;
  const byName = await prisma.category.findUnique({ where: { name } });
  if (byName) return byName;
  return prisma.category.create({
    data: { slug, name, description: 'Editorial category' },
  });
}

async function ensureAuthor() {
  return prisma.author.upsert({
    where: { slug: 'demo-editorial-desk' },
    create: {
      name: 'DEMO Editorial Desk',
      slug: 'demo-editorial-desk',
      bio: 'Sample author identity for demo stories. Replace before real publication.',
    },
    update: { name: 'DEMO Editorial Desk' },
  });
}

(async () => {
  const author = await ensureAuthor();
  let created = 0;
  let skipped = 0;
  for (const s of STORIES) {
    const existing = await prisma.article.findUnique({ where: { slug: s.slug } });
    if (existing) {
      skipped += 1;
      continue;
    }
    const category = await ensureCategory(s.category.slug, s.category.name);
    await prisma.article.create({
      data: {
        title: s.title,
        slug: s.slug,
        excerpt: s.excerpt,
        body: s.body,
        status: 'PUBLISHED',
        isFeatured: s.slug.includes('women-leaders'),
        authorId: author.id,
        categoryId: category.id,
        publishedAt: new Date(),
        metaDescription: `${s.excerpt.slice(0, 150)} (Demo seed)`,
      },
    });
    created += 1;
  }
  console.log(JSON.stringify({ created, skipped, author: author.slug }, null, 2));
  await prisma.$disconnect();
})().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
