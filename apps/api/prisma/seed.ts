/**
 * THE GLOBAL ICON — database seed.
 *
 * Idempotent: safe to run repeatedly.
 *  - Roles + core permissions (+ role/permission mapping)
 *  - Super Admin bootstrap ONLY when SUPER_ADMIN_PASSWORD is set in the env
 *  - SiteSettings singleton
 *  - Categories + edition series used by the demo magazines
 *  - 5 demo magazines built from the supplied PDFs (docs/SUPPLIED_PDFS.md)
 */
import 'dotenv/config';
import { PrismaClient, RoleName } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { existsSync } from 'node:fs';
import * as path from 'node:path';
import {
  ALL_PERMISSIONS,
  PERMISSION_DESCRIPTIONS,
  ROLE_DESCRIPTIONS,
  ROLE_PERMISSIONS,
} from '../src/auth/permissions';

const prisma = new PrismaClient();

const MIN_SUPER_ADMIN_PASSWORD_LENGTH = 12;

async function seedRolesAndPermissions(): Promise<void> {
  for (const key of ALL_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key },
      create: { key, description: PERMISSION_DESCRIPTIONS[key] },
      update: { description: PERMISSION_DESCRIPTIONS[key] },
    });
  }

  const permissions = await prisma.permission.findMany();
  const permissionIdByKey = new Map(permissions.map((p) => [p.key, p.id]));

  for (const name of Object.values(RoleName)) {
    const role = await prisma.role.upsert({
      where: { name },
      create: { name, description: ROLE_DESCRIPTIONS[name] },
      update: { description: ROLE_DESCRIPTIONS[name] },
    });

    const wanted = ROLE_PERMISSIONS[name].map((key) => {
      const id = permissionIdByKey.get(key);
      if (!id) throw new Error(`Permission ${key} missing after upsert`);
      return id;
    });

    // Keep the mapping in sync with code (remove stale grants, add new ones).
    await prisma.rolePermission.deleteMany({
      where: { roleId: role.id, permissionId: { notIn: wanted } },
    });
    await prisma.rolePermission.createMany({
      data: wanted.map((permissionId) => ({ roleId: role.id, permissionId })),
      skipDuplicates: true,
    });
  }
  console.log(
    `✔ Roles (${Object.values(RoleName).length}) and permissions (${ALL_PERMISSIONS.length}) seeded`,
  );
}

async function bootstrapSuperAdmin(): Promise<void> {
  const password = process.env.SUPER_ADMIN_PASSWORD;
  if (!password) {
    console.log('• SUPER_ADMIN_PASSWORD not set — skipping Super Admin bootstrap');
    return;
  }
  if (password.length < MIN_SUPER_ADMIN_PASSWORD_LENGTH) {
    throw new Error(
      `SUPER_ADMIN_PASSWORD must be at least ${MIN_SUPER_ADMIN_PASSWORD_LENGTH} characters`,
    );
  }

  const email = (process.env.SUPER_ADMIN_EMAIL ?? 'superadmin@example.test')
    .trim()
    .toLowerCase();
  const username = (process.env.SUPER_ADMIN_USERNAME ?? 'superadmin').trim();

  const role = await prisma.role.findUniqueOrThrow({
    where: { name: RoleName.SUPER_ADMIN },
  });

  let user = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash: await bcrypt.hash(password, 12),
        firstName: 'Super',
        lastName: 'Admin',
      },
    });
    console.log(`✔ Super Admin created (${email})`);
  } else {
    // Never overwrite an existing password silently.
    console.log(`• Super Admin account already exists (${user.email}); password unchanged`);
  }

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: role.id } },
    create: { userId: user.id, roleId: role.id },
    update: {},
  });
}

async function seedSiteSettings(): Promise<void> {
  await prisma.siteSettings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      siteName: 'THE GLOBAL ICON',
      tagline: 'Stories That Shape Tomorrow.',
      heroTitle: 'Stories That Shape Tomorrow.',
      heroCopy:
        "Discover the people, ideas, and innovations shaping tomorrow's world.",
      newsletterHeading: 'The week, in perspective.',
      newsletterCopy:
        'Thoughtful reads and new editions, delivered to your inbox.',
      contactResponseTime: 'We aim to respond within two business days.',
    },
    update: {},
  });
  console.log('✔ SiteSettings seeded');
}

interface DemoMagazine {
  file: string;
  cover: string;
  title: string;
  slug: string;
  issueNumber: string;
  categorySlug: string;
  subtitle: string;
  description: string;
  isFeatured: boolean;
  coverAltText: string;
}

const DEMO_PUBLICATION_DATE = new Date(Date.UTC(2026, 9, 1)); // October 2026

const DEMO_CATEGORIES = [
  { name: 'Technology Leadership', slug: 'technology-leadership' },
  { name: 'Cybersecurity', slug: 'cybersecurity' },
  { name: 'Entrepreneurship & Social Impact', slug: 'entrepreneurship-social-impact' },
  { name: 'AI & Education', slug: 'ai-education' },
  { name: 'CEOs to Watch', slug: 'ceos-to-watch' },
];

const DEMO_MAGAZINES: DemoMagazine[] = [
  {
    file: 'Magazine_1.pdf',
    cover: 'Magazine_1-cover.png',
    title: 'The Leadership Edit: Visionary Technology Leaders',
    slug: 'the-leadership-edit-visionary-technology-leaders',
    issueNumber: '01',
    categorySlug: 'technology-leadership',
    subtitle: 'October 2026 · Issue 01',
    description:
      'FICTIONAL DEMO EDITION. This issue is a fictional demonstration edition created to showcase the digital reader. ' +
      'The people, organisations and stories in it are invented for demonstration purposes and do not describe real individuals or companies. ' +
      'Cover feature: Aarvav Maliaceaa of Nexora Labs (fictional).',
    isFeatured: true,
    coverAltText: 'Cover of The Leadership Edit: Visionary Technology Leaders, October 2026 (fictional demo edition)',
  },
  {
    file: 'magazine_2.pdf',
    cover: 'magazine_2-cover.png',
    title: 'Visionary Cybersecurity Leaders',
    slug: 'visionary-cybersecurity-leaders',
    issueNumber: '07',
    categorySlug: 'cybersecurity',
    subtitle: 'October 2026 · Issue 07',
    description:
      'Demo edition supplied for publishing demonstrations. Cover showcases Jake Bernardes and the theme of cybersecurity leadership.',
    isFeatured: true,
    coverAltText: 'Cover of Visionary Cybersecurity Leaders, October 2026',
  },
  {
    file: 'magazine_3.pdf',
    cover: 'magazine_3-cover.png',
    title: 'Influential Entrepreneur: Social Impact',
    slug: 'influential-entrepreneur-social-impact',
    issueNumber: '04',
    categorySlug: 'entrepreneurship-social-impact',
    subtitle: 'October 2026 · Issue 04',
    description:
      'Demo edition supplied for publishing demonstrations. Cover features Jose Antonio Del Valle Torres and the theme of entrepreneurship and social impact.',
    isFeatured: false,
    coverAltText: 'Cover of Influential Entrepreneur: Social Impact, October 2026',
  },
  {
    file: 'Magazine_4.pdf',
    cover: 'Magazine_4-cover.png',
    title: 'Powerful and Influential Leaders: AI Education',
    slug: 'powerful-and-influential-leaders-ai-education',
    issueNumber: '06',
    categorySlug: 'ai-education',
    subtitle: 'October 2026 · Issue 06',
    description:
      'Demo edition supplied for publishing demonstrations. Cover features Dr. Quiana Bradshaw and the theme of AI in education.',
    isFeatured: false,
    coverAltText: 'Cover of Powerful and Influential Leaders: AI Education, October 2026',
  },
  {
    file: 'magazine_5.pdf',
    cover: 'magazine_5-cover.png',
    title: 'Visionary CEOs to Watch',
    slug: 'visionary-ceos-to-watch',
    issueNumber: '05',
    categorySlug: 'ceos-to-watch',
    subtitle: 'October 2026 · Issue 05',
    description:
      'Demo edition supplied for publishing demonstrations. Cover features Souvik Ghosh of CMART.',
    isFeatured: false,
    coverAltText: 'Cover of Visionary CEOs to Watch, October 2026',
  },
];

async function seedDemoMagazines(): Promise<void> {
  const categoryIdBySlug = new Map<string, string>();
  for (const category of DEMO_CATEGORIES) {
    const row = await prisma.category.upsert({
      where: { slug: category.slug },
      create: category,
      update: {},
    });
    categoryIdBySlug.set(category.slug, row.id);
  }

  const series = await prisma.editionSeries.upsert({
    where: { slug: 'global-edition' },
    create: { name: 'Global Edition', slug: 'global-edition', region: 'Global' },
    update: {},
  });

  const storageRoot = path.resolve(
    process.cwd(),
    process.env.STORAGE_ROOT ?? '../../storage/development-only',
  );

  for (const demo of DEMO_MAGAZINES) {
    const pdfKey = `magazines/pdfs/supplied/${demo.file}`;
    const coverImage = `demo-pdf-covers/${demo.cover}`;

    for (const key of [pdfKey, coverImage]) {
      if (!existsSync(path.join(storageRoot, ...key.split('/')))) {
        console.warn(`  ! Missing file under STORAGE_ROOT: ${key}`);
      }
    }

    const data = {
      title: demo.title,
      subtitle: demo.subtitle,
      description: demo.description,
      publisherName: 'THE GLOBAL ICON',
      issueNumber: demo.issueNumber,
      editionSeriesId: series.id,
      categoryId: categoryIdBySlug.get(demo.categorySlug) ?? null,
      coverImage,
      coverAltText: demo.coverAltText,
      pdfKey,
      pageCount: 9,
      access: 'PUBLIC' as const,
      allowDownload: true,
      reviewStatus: 'APPROVED' as const,
      isPublished: true,
      isFeatured: demo.isFeatured,
      isDemo: true,
      publicationDate: DEMO_PUBLICATION_DATE,
      metaDescription: `${demo.title} — ${demo.subtitle}`.slice(0, 160),
    };

    const existing = await prisma.magazine.findUnique({ where: { slug: demo.slug } });
    const magazine = existing
      ? await prisma.magazine.update({ where: { id: existing.id }, data })
      : await prisma.magazine.create({
          data: { ...data, slug: demo.slug, publishedAt: new Date() },
        });

    await prisma.demoSeedRecord.upsert({
      where: {
        modelName_objectId: { modelName: 'Magazine', objectId: magazine.id },
      },
      create: { modelName: 'Magazine', objectId: magazine.id },
      update: {},
    });
  }
  console.log(`✔ ${DEMO_MAGAZINES.length} demo magazines seeded (isDemo=true)`);
}

async function main(): Promise<void> {
  await seedRolesAndPermissions();
  await bootstrapSuperAdmin();
  await seedSiteSettings();
  await seedDemoMagazines();
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
