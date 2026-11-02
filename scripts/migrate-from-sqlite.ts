/**
 * Django (SQLite) -> PostgreSQL (Prisma) data migration — THE GLOBAL ICON.
 *
 * Run from the repo root:
 *   npm run migrate:sqlite -w @tgi/api                       # dry run (default, read-only)
 *   npm run migrate:sqlite -w @tgi/api -- --apply            # write to PostgreSQL
 *   npm run migrate:sqlite -w @tgi/api -- --db ./db.sqlite3 --apply
 *
 * Properties
 *  - Reads `db.sqlite3` with sql.js (pure WASM, no native build needed). The
 *    SQLite file is never modified.
 *  - Idempotent: every migrated row is recorded in `MigrationIdMap`
 *    (oldTable, oldId -> newId); re-running skips rows already migrated.
 *  - Dry run by default; nothing is written without `--apply`.
 *  - Never deletes or overwrites existing PostgreSQL rows. Legacy rows whose slug already
 *    exists are imported with a numeric suffix (`slug-2`, ...) instead of being merged.
 *  - Magazines recorded in `publications_demoseedrecord` (Django demo seed) are skipped, so the
 *    five seeded demo PDF magazines are untouched. Legacy magazines with no PDF are imported
 *    UNPUBLISHED so the public library lists only readable issues.
 *
 * ID/field mapping (Django table -> Prisma model)
 * ------------------------------------------------------------------------------
 *  publications_category            -> Category
 *  publications_edition             -> EditionSeries         (name, slug, region)
 *  publications_author              -> Author                (portrait key kept)
 *  publications_article             -> Article               (status upper-cased)
 *  publications_magazine            -> Magazine              (cover->coverImage, pdf_file->pdfKey,
 *                                                             edition_id->editionSeriesId,
 *                                                             access/review_status upper-cased)
 *  publications_featuredleader      -> Leader
 *  publications_newslettersubscriber-> NewsletterSubscriber (unsubscribe token kept)
 *  publications_siteconfiguration   -> SiteSettings id=1 (contact, social, newsletter copy only;
 *                                      brand/hero text + featured ids are NOT overwritten)
 *  auth_user (non-staff only)       -> User + READER role    (see "Users" below)
 *
 * NOT migrated yet (documented TODOs, see docs/MIGRATION.md):
 *  - Article<->Magazine M2M (publications_magazine_related_articles)
 *  - Magazine<->Magazine recommendations, translations (translated_from_id)
 *  - HomepageSection(+articles), PartnerOrganization, Announcement
 *  - Advertisement / AdvertisementEvent, ClientEnquiry, UserNotification
 *  - SavedContent / ReadingHistory / ReaderPreference, ManagementAuditEvent
 *  - Staff / superuser accounts and Django groups -> Roles (re-provision via seed + admin UI)
 *
 * Users
 *  Django hashes (PBKDF2) are not compatible with bcrypt, and we never copy
 *  them. Migrated readers get an unusable random password and must use
 *  "forgot password"/admin reset. Staff & superusers are intentionally skipped.
 *
 * Files
 *  Only storage KEYS are migrated. Copy binaries separately:
 *    media/magazines/covers/*      -> <STORAGE_ROOT>/magazines/covers/
 *    private_media/magazines/pdfs/ -> <STORAGE_ROOT>/magazines/pdfs/
 *    media/articles|authors|leaders/ -> <STORAGE_ROOT>/articles|authors|leaders/
 */
import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import * as path from 'node:path';
import {
  ArticleStatus,
  MagazineAccess,
  MagazineReviewStatus,
  PrismaClient,
  RoleName,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import initSqlJs, { Database } from 'sql.js';

type Row = Record<string, unknown>;

const prisma = new PrismaClient();

// ---------------------------------------------------------------- CLI -------

const argv = process.argv.slice(2);
const APPLY = argv.includes('--apply');

function argValue(flag: string): string | undefined {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : undefined;
}

// ------------------------------------------------------------ value helpers --

const str = (v: unknown): string | null =>
  v === null || v === undefined || v === '' ? null : String(v);
const reqStr = (v: unknown, fallback = ''): string => str(v) ?? fallback;
const bool = (v: unknown): boolean => v === 1 || v === true || v === '1';
const int = (v: unknown): number | null =>
  v === null || v === undefined || v === '' ? null : Number(v);
const date = (v: unknown): Date | null => {
  const s = str(v);
  if (!s) return null;
  const parsed = new Date(s.includes('T') ? s : s.replace(' ', 'T') + 'Z');
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

function upperEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  const candidate = String(value ?? '').toUpperCase() as T;
  return allowed.includes(candidate) ? candidate : fallback;
}

// ------------------------------------------------------------------ sqlite --

class Source {
  constructor(private readonly db: Database) {}

  static async open(file: string): Promise<Source> {
    if (!existsSync(file)) throw new Error(`SQLite file not found: ${file}`);
    const SQL = await initSqlJs();
    return new Source(new SQL.Database(readFileSync(file)));
  }

  tables(): Set<string> {
    return new Set(
      this.all("SELECT name FROM sqlite_master WHERE type='table'").map((r) =>
        String(r.name),
      ),
    );
  }

  all(sql: string): Row[] {
    const stmt = this.db.prepare(sql);
    const rows: Row[] = [];
    try {
      while (stmt.step()) rows.push(stmt.getAsObject() as Row);
    } finally {
      stmt.free();
    }
    return rows;
  }
}

// ------------------------------------------------------------- id mapping ---

class IdMap {
  private cache = new Map<string, string>();

  async load(): Promise<void> {
    const rows = await prisma.migrationIdMap.findMany();
    for (const r of rows) this.cache.set(`${r.oldTable}:${r.oldId}`, r.newId);
  }

  get(oldTable: string, oldId: unknown): string | null {
    if (oldId === null || oldId === undefined) return null;
    return this.cache.get(`${oldTable}:${String(oldId)}`) ?? null;
  }

  async set(oldTable: string, oldId: unknown, newId: string): Promise<void> {
    const key = `${oldTable}:${String(oldId)}`;
    this.cache.set(key, newId);
    if (!APPLY) return;
    await prisma.migrationIdMap.upsert({
      where: { oldTable_oldId: { oldTable, oldId: String(oldId) } },
      create: { oldTable, oldId: String(oldId), newId },
      update: { newId },
    });
  }
}

// -------------------------------------------------------------- migrators ---

interface Ctx {
  src: Source;
  tables: Set<string>;
  ids: IdMap;
}

interface Stats {
  created: number;
  skipped: number;
  failed: number;
}

/**
 * Generic driver: iterate source rows, skip migrated ones, and call `create`
 * (which returns the new id). In dry-run mode `create` is not called.
 */
async function migrateTable(
  ctx: Ctx,
  oldTable: string,
  label: string,
  create: (row: Row) => Promise<string | null>,
  orderBy = 'id',
  exclude?: (row: Row) => boolean,
): Promise<Stats> {
  const stats: Stats = { created: 0, skipped: 0, failed: 0 };
  if (!ctx.tables.has(oldTable)) {
    console.log(`  - ${oldTable}: table not found, skipping`);
    return stats;
  }
  const rows = ctx.src.all(`SELECT * FROM ${oldTable} ORDER BY ${orderBy}`);
  for (const row of rows) {
    if (exclude?.(row) || ctx.ids.get(oldTable, row.id)) {
      stats.skipped += 1;
      continue;
    }
    if (!APPLY) {
      stats.created += 1;
      continue;
    }
    try {
      const newId = await create(row);
      if (newId) {
        await ctx.ids.set(oldTable, row.id, newId);
        stats.created += 1;
      } else {
        stats.skipped += 1;
      }
    } catch (error) {
      stats.failed += 1;
      console.error(`  ! ${oldTable}#${String(row.id)} failed: ${(error as Error).message}`);
    }
  }
  console.log(
    `  ${label.padEnd(22)} source=${rows.length} ${APPLY ? 'created' : 'would create'}=${stats.created} skipped=${stats.skipped} failed=${stats.failed}`,
  );
  return stats;
}

/** Returns `base` or `base-2`, `base-3`, ... — the first slug that is not taken. */
async function freeSlug(
  base: string,
  exists: (candidate: string) => Promise<boolean>,
): Promise<string> {
  let candidate = base;
  for (let n = 2; await exists(candidate); n += 1) candidate = `${base}-${n}`;
  return candidate;
}

async function migrateCategories(ctx: Ctx) {
  return migrateTable(ctx, 'publications_category', 'Category', async (r) => {
    const slug = reqStr(r.slug);
    const name = reqStr(r.name, slug);
    // Categories are a shared taxonomy: reuse an existing one with the same slug or name.
    const existing = await prisma.category.findFirst({
      where: { OR: [{ slug }, { name }] },
      select: { id: true },
    });
    if (existing) return existing.id;
    const row = await prisma.category.create({
      data: { name, slug, description: str(r.description) },
    });
    return row.id;
  });
}

async function migrateEditions(ctx: Ctx) {
  return migrateTable(ctx, 'publications_edition', 'EditionSeries', async (r) => {
    const slug = reqStr(r.slug);
    const existing = await prisma.editionSeries.findUnique({ where: { slug }, select: { id: true } });
    if (existing) return existing.id;
    const row = await prisma.editionSeries.create({
      data: { name: reqStr(r.name, slug), slug, region: str(r.region) },
    });
    return row.id;
  });
}

async function migrateAuthors(ctx: Ctx) {
  return migrateTable(ctx, 'publications_author', 'Author', async (r) => {
    const slug = await freeSlug(reqStr(r.slug), async (s) =>
      Boolean(await prisma.author.findUnique({ where: { slug: s }, select: { id: true } })),
    );
    const row = await prisma.author.create({
      data: {
        name: reqStr(r.name, slug),
        slug,
        bio: str(r.bio),
        portrait: str(r.portrait),
        // user_id link is resolved after users are migrated (see migrateUsers TODO).
      },
    });
    return row.id;
  });
}

async function migrateArticles(ctx: Ctx) {
  return migrateTable(ctx, 'publications_article', 'Article', async (r) => {
    const slug = await freeSlug(reqStr(r.slug), async (s) =>
      Boolean(await prisma.article.findUnique({ where: { slug: s }, select: { id: true } })),
    );
    const row = await prisma.article.create({
      data: {
        slug,
        title: reqStr(r.title, slug),
        excerpt: str(r.excerpt),
        body: reqStr(r.body),
        language: reqStr(r.language, 'en'),
        authorId: ctx.ids.get('publications_author', r.author_id),
        categoryId: ctx.ids.get('publications_category', r.category_id),
        featuredImage: str(r.featured_image),
        status: upperEnum(r.status, Object.values(ArticleStatus), ArticleStatus.DRAFT),
        isFeatured: bool(r.is_featured),
        isSponsored: bool(r.is_sponsored),
        memberOnly: bool(r.member_only),
        metaDescription: str(r.meta_description),
        publishedAt: date(r.published_at),
        createdAt: date(r.created_at) ?? new Date(),
      },
    });
    return row.id;
  });
}

/** Legacy magazine ids that belong to the Django demo seed (never imported). */
function legacyDemoMagazineIds(ctx: Ctx): Set<string> {
  if (!ctx.tables.has('publications_demoseedrecord')) return new Set();
  return new Set(
    ctx.src
      .all("SELECT object_id FROM publications_demoseedrecord WHERE model_name = 'publications.magazine'")
      .map((r) => String(r.object_id)),
  );
}

async function migrateMagazines(ctx: Ctx) {
  const demoIds = legacyDemoMagazineIds(ctx);
  console.log(`  (skipping ${demoIds.size} Django demo-seed magazines; modern demo PDFs are preserved)`);
  return migrateTable(
    ctx,
    'publications_magazine',
    'Magazine',
    async (r) => {
      const slug = await freeSlug(reqStr(r.slug), async (s) =>
        Boolean(await prisma.magazine.findUnique({ where: { slug: s }, select: { id: true } })),
      );
      const reviewStatus = upperEnum(
        r.review_status,
        Object.values(MagazineReviewStatus),
        MagazineReviewStatus.DRAFT,
      );
      const pdfKey = str(r.pdf_file);
      const title = reqStr(r.title, slug);
      const row = await prisma.magazine.create({
        data: {
          slug,
          title,
          subtitle: str(r.subtitle),
          language: reqStr(r.language, 'en'),
          description: str(r.description),
          publisherName: str(r.publisher_name),
          issueNumber: str(r.issue_number),
          editionSeriesId: ctx.ids.get('publications_edition', r.edition_id),
          categoryId: ctx.ids.get('publications_category', r.category_id),
          coverImage: str(r.cover),
          coverAltText: str(r.cover_alt_text),
          pdfKey,
          access: upperEnum(r.access, Object.values(MagazineAccess), MagazineAccess.PUBLIC),
          allowDownload: bool(r.allow_download),
          reviewStatus,
          submittedAt: date(r.submitted_at),
          reviewedAt: date(r.reviewed_at),
          publishedAt: date(r.published_at),
          isFeatured: bool(r.is_featured),
          // Without a PDF there is nothing to read: keep unpublished until a file is uploaded.
          isPublished: bool(r.is_published) && Boolean(pdfKey),
          isDemo: /^demo[-_ ]/i.test(slug) || /^demo\b/i.test(title),
          publicationDate: date(r.publication_date) ?? new Date(),
          metaDescription: str(r.meta_description),
          pageCount: int(r.page_count),
        },
      });
      return row.id;
    },
    'id',
    (row) => demoIds.has(String(row.id)),
  );
}

async function migrateLeaders(ctx: Ctx) {
  return migrateTable(ctx, 'publications_featuredleader', 'Leader', async (r) => {
    const slug = await freeSlug(reqStr(r.slug), async (s) =>
      Boolean(await prisma.leader.findUnique({ where: { slug: s }, select: { id: true } })),
    );
    const row = await prisma.leader.create({
      data: {
        name: reqStr(r.name, slug),
        slug,
        designation: str(r.designation),
        organization: str(r.organization),
        introduction: str(r.introduction),
        portrait: str(r.portrait),
        categoryId: ctx.ids.get('publications_category', r.category_id),
        articleId: ctx.ids.get('publications_article', r.article_id),
        // Demo-skipped legacy magazines resolve to null, which is the correct outcome.
        magazineId: ctx.ids.get('publications_magazine', r.magazine_id),
        publicationDate: date(r.publication_date) ?? new Date(),
        isPublished: bool(r.is_published),
        isFeatured: bool(r.is_featured),
        displayOrder: int(r.display_order) ?? 0,
      },
    });
    return row.id;
  });
}

async function migrateNewsletter(ctx: Ctx) {
  return migrateTable(
    ctx,
    'publications_newslettersubscriber',
    'NewsletterSubscriber',
    async (r) => {
      const email = reqStr(r.email).toLowerCase();
      if (!email) return null;
      const existing = await prisma.newsletterSubscriber.findUnique({
        where: { email },
        select: { id: true },
      });
      if (existing) return existing.id;
      const token = str(r.unsubscribe_token);
      const tokenTaken = token
        ? await prisma.newsletterSubscriber.findUnique({
            where: { unsubscribeToken: token },
            select: { id: true },
          })
        : null;
      const row = await prisma.newsletterSubscriber.create({
        data: {
          email,
          ...(token && !tokenTaken ? { unsubscribeToken: token } : {}),
          consentedAt: date(r.consented_at) ?? new Date(),
          isActive: bool(r.is_active),
          unsubscribedAt: date(r.unsubscribed_at),
        },
      });
      return row.id;
    },
  );
}

/**
 * Fill-only SiteSettings import: contact details, social links and newsletter copy are copied
 * only where the target field is still empty. Brand/hero text (legacy "The Editorial") and the
 * featured article/magazine are deliberately NOT imported so the rebrand and demo cover wall stay.
 */
async function migrateSiteSettings(ctx: Ctx) {
  return migrateTable(ctx, 'publications_siteconfiguration', 'SiteSettings', async (r) => {
    const current = await prisma.siteSettings.upsert({
      where: { id: 1 },
      create: { id: 1 },
      update: {},
    });
    const fill: Record<string, string> = {};
    const candidates: [keyof typeof current, unknown][] = [
      ['contactEmail', r.contact_email],
      ['contactPhone', r.contact_phone],
      ['officeAddress', r.office_address],
      ['contactResponseTime', r.contact_response_time],
      ['linkedinUrl', r.linkedin_url],
      ['instagramUrl', r.instagram_url],
    ];
    for (const [field, legacy] of candidates) {
      const value = str(legacy);
      if (value && !current[field]) fill[field] = value;
    }
    if (Object.keys(fill).length > 0) {
      await prisma.siteSettings.update({ where: { id: 1 }, data: fill });
    }
    return '1';
  });
}

async function migrateUsers(ctx: Ctx) {
  const readerRole = APPLY
    ? await prisma.role.upsert({
        where: { name: RoleName.READER },
        create: { name: RoleName.READER },
        update: {},
      })
    : null;

  return migrateTable(ctx, 'auth_user', 'User (readers)', async (r) => {
    if (bool(r.is_staff) || bool(r.is_superuser)) {
      console.log(`  • skipping staff/superuser "${reqStr(r.username)}" (re-provision manually)`);
      return null;
    }
    const username = reqStr(r.username);
    const email = (str(r.email) ?? `${username}@migrated.invalid`).toLowerCase();

    const clash = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
      select: { id: true },
    });
    if (clash) return clash.id; // already present (e.g. seeded); just record the mapping

    // Unusable password: random 256-bit secret hashed with bcrypt; user must reset.
    const passwordHash = await bcrypt.hash(randomBytes(32).toString('hex'), 12);
    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        firstName: str(r.first_name),
        lastName: str(r.last_name),
        isActive: bool(r.is_active),
        createdAt: date(r.date_joined) ?? new Date(),
        roles: readerRole ? { create: [{ roleId: readerRole.id }] } : undefined,
      },
    });
    return user.id;
  });
}

// ------------------------------------------------------------------- main ---

async function main(): Promise<void> {
  const dbPath = path.resolve(
    process.cwd(),
    argValue('--db') ?? '../../db.sqlite3',
  );
  console.log(`Source SQLite : ${dbPath}`);
  console.log(`Mode          : ${APPLY ? 'APPLY (writing to PostgreSQL)' : 'DRY RUN (no writes) — pass --apply to write'}`);

  const src = await Source.open(dbPath);
  const tables = src.tables();
  console.log(`Found ${tables.size} tables in source.\n`);

  const ids = new IdMap();
  if (APPLY) await ids.load();
  else {
    try {
      await ids.load();
    } catch {
      console.log('(MigrationIdMap unavailable — database not reachable; assuming nothing migrated yet)\n');
    }
  }

  const ctx: Ctx = { src, tables, ids };

  // Order matters: parents before children so foreign keys can be resolved.
  await migrateCategories(ctx);
  await migrateEditions(ctx);
  await migrateAuthors(ctx);
  await migrateArticles(ctx);
  await migrateMagazines(ctx);
  await migrateLeaders(ctx);
  await migrateNewsletter(ctx);
  await migrateSiteSettings(ctx);
  await migrateUsers(ctx);

  await printCounts();
  console.log('\nDone. Remember to copy media/PDF binaries into STORAGE_ROOT (see header comment).');
}

/** Post-run verification: current PostgreSQL row counts. */
async function printCounts(): Promise<void> {
  try {
    const [categories, editions, authors, articles, magazines, demoMagazines, pdfMagazines, leaders, subscribers] =
      await Promise.all([
        prisma.category.count(),
        prisma.editionSeries.count(),
        prisma.author.count(),
        prisma.article.count(),
        prisma.magazine.count(),
        prisma.magazine.count({ where: { isDemo: true, pdfKey: { startsWith: 'magazines/pdfs/supplied/' } } }),
        prisma.magazine.count({ where: { isPublished: true, pdfKey: { not: null } } }),
        prisma.leader.count(),
        prisma.newsletterSubscriber.count(),
      ]);
    console.log('\nPostgreSQL counts now:');
    console.log(
      JSON.stringify(
        { categories, editions, authors, articles, magazines, suppliedDemoPdfMagazines: demoMagazines, publishedMagazinesWithPdf: pdfMagazines, leaders, subscribers },
        null,
        2,
      ),
    );
  } catch (error) {
    console.log(`(could not read PostgreSQL counts: ${(error as Error).message})`);
  }
}

main()
  .catch((error: unknown) => {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
