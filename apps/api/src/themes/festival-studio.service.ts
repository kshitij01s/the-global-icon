import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { writeAudit } from '../common/audit';
import type { AuthUser } from '../common/types';
import { PrismaService } from '../prisma/prisma.service';
import { ANIMATION_PRESETS, FESTIVAL_CATALOG } from './festival-catalog';
import { catalogBySlug, THEME_CATALOG, type ThemeEffects, type ThemeTokens } from './theme-catalog';

@Injectable()
export class FestivalStudioService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureFestivalSeeded() {
    // Sync any new built-in themes missing from DB (additive, no wipe)
    const existing = await this.prisma.themeDefinition.findMany({ select: { slug: true } });
    const have = new Set(existing.map((e) => e.slug));
    const missing = THEME_CATALOG.filter((t) => !have.has(t.slug));
    if (missing.length) {
      await this.prisma.themeDefinition.createMany({
        data: missing.map((t) => ({
          slug: t.slug,
          name: t.name,
          description: t.description,
          kind: t.kind,
          festivalKey: t.festivalKey ?? null,
          tokens: t.tokens as Prisma.InputJsonValue,
          effects: (t.effects ?? null) as Prisma.InputJsonValue,
          isBuiltIn: true,
        })),
      });
    }

    const festCount = await this.prisma.festival.count();
    if (festCount === 0) {
      await this.prisma.festival.createMany({
        data: FESTIVAL_CATALOG.map((f) => ({
          slug: f.slug,
          name: f.name,
          description: f.description,
          countryCode: f.countryCode,
          regionCode: f.regionCode ?? null,
          continent: f.continent,
          culturalCategory: f.culturalCategory,
          timezone: f.timezone,
          calendarBasis: f.calendarBasis,
          dateSource: f.dateSource,
          dateVerified: f.dateVerified,
          defaultThemeSlug: f.defaultThemeSlug,
          priority: f.priority,
          sampleStartMonth: f.sampleStartMonth ?? null,
          sampleStartDay: f.sampleStartDay ?? null,
          sampleEndMonth: f.sampleEndMonth ?? null,
          sampleEndDay: f.sampleEndDay ?? null,
          updatedAt: new Date(),
        })),
      });
    }

    const animCount = await this.prisma.animationPreset.count();
    if (animCount === 0) {
      await this.prisma.animationPreset.createMany({
        data: ANIMATION_PRESETS.map((a) => ({
          slug: a.slug,
          name: a.name,
          description: a.description,
          festivalKey: a.festivalKey,
          config: a.config as Prisma.InputJsonValue,
          updatedAt: new Date(),
        })),
      });
    }

    // Seed CSS-based decorative assets (no external licenses)
    const assetCount = await this.prisma.themeAsset.count();
    if (assetCount === 0) {
      const assets = [
        { key: 'deco-snowflake', name: 'Snowflake motif', category: 'decoration', festivalKey: 'christmas', urlOrPath: 'css:snowflake' },
        { key: 'deco-diya', name: 'Diya motif', category: 'decoration', festivalKey: 'diwali', urlOrPath: 'css:diya' },
        { key: 'deco-lantern', name: 'Lantern motif', category: 'decoration', festivalKey: 'lunar-new-year', urlOrPath: 'css:lantern' },
        { key: 'deco-crescent', name: 'Crescent motif', category: 'decoration', festivalKey: 'eid', urlOrPath: 'css:crescent' },
        { key: 'deco-pumpkin', name: 'Pumpkin motif', category: 'decoration', festivalKey: 'halloween', urlOrPath: 'css:pumpkin' },
        { key: 'deco-heart', name: 'Heart motif', category: 'decoration', festivalKey: 'valentines', urlOrPath: 'css:heart' },
        { key: 'pattern-rangoli', name: 'Rangoli pattern', category: 'pattern', festivalKey: 'diwali', urlOrPath: 'css:rangoli' },
        { key: 'banner-festive', name: 'Festive banner frame', category: 'banner', festivalKey: null, urlOrPath: 'css:banner-frame' },
      ];
      await this.prisma.themeAsset.createMany({
        data: assets.map((a) => ({
          ...a,
          mimeType: 'text/css',
          updatedAt: new Date(),
        })),
      });
    }
  }

  async listFestivals(q?: { countryCode?: string; continent?: string; category?: string }) {
    await this.ensureFestivalSeeded();
    return this.prisma.festival.findMany({
      where: {
        isActive: true,
        ...(q?.countryCode ? { countryCode: q.countryCode } : {}),
        ...(q?.continent ? { continent: q.continent } : {}),
        ...(q?.category ? { culturalCategory: q.category } : {}),
      },
      orderBy: [{ countryCode: 'asc' }, { priority: 'desc' }, { name: 'asc' }],
    });
  }

  async upsertFestival(
    actor: AuthUser,
    body: {
      id?: string;
      slug: string;
      name: string;
      description?: string;
      countryCode: string;
      regionCode?: string | null;
      continent?: string;
      culturalCategory?: string;
      timezone?: string;
      calendarBasis?: string;
      dateSource?: string;
      dateVerified?: boolean;
      defaultThemeSlug?: string | null;
      priority?: number;
      isActive?: boolean;
      sampleStartMonth?: number | null;
      sampleStartDay?: number | null;
      sampleEndMonth?: number | null;
      sampleEndDay?: number | null;
    },
  ) {
    await this.ensureFestivalSeeded();
    const data = {
      slug: body.slug,
      name: body.name,
      description: body.description,
      countryCode: body.countryCode,
      regionCode: body.regionCode ?? null,
      continent: body.continent,
      culturalCategory: body.culturalCategory,
      timezone: body.timezone ?? 'UTC',
      calendarBasis: body.calendarBasis ?? 'GREGORIAN',
      dateSource: body.dateSource,
      dateVerified: body.dateVerified ?? false,
      defaultThemeSlug: body.defaultThemeSlug,
      priority: body.priority ?? 10,
      isActive: body.isActive ?? true,
      sampleStartMonth: body.sampleStartMonth,
      sampleStartDay: body.sampleStartDay,
      sampleEndMonth: body.sampleEndMonth,
      sampleEndDay: body.sampleEndDay,
    };
    const row = body.id
      ? await this.prisma.festival.update({ where: { id: body.id }, data })
      : await this.prisma.festival.create({ data });
    await writeAudit(this.prisma, {
      actor,
      modelLabel: 'Festival',
      eventType: body.id ? 'festival.update' : 'festival.create',
      objectId: row.id,
      objectRepr: row.slug,
    });
    return row;
  }

  async listTemplates() {
    await this.ensureFestivalSeeded();
    return this.prisma.themeTemplate.findMany({
      include: { festival: true, versions: { orderBy: { createdAt: 'desc' }, take: 5 } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getTemplate(id: string) {
    const row = await this.prisma.themeTemplate.findUnique({
      where: { id },
      include: { festival: true, versions: { orderBy: { createdAt: 'desc' }, take: 20 } },
    });
    if (!row) throw new NotFoundException('Template not found');
    return row;
  }

  async createTemplate(
    actor: AuthUser,
    body: {
      name: string;
      slug?: string;
      description?: string;
      festivalId?: string | null;
      countryCode?: string | null;
      regionCode?: string | null;
      baseThemeSlug?: string;
      duplicateFromId?: string;
    },
  ) {
    await this.ensureFestivalSeeded();
    let tokens: ThemeTokens;
    let effects: ThemeEffects | null = null;
    let layout: Prisma.InputJsonValue | undefined;
    let baseThemeSlug = body.baseThemeSlug ?? 'midnight-dark';

    if (body.duplicateFromId) {
      const src = await this.getTemplate(body.duplicateFromId);
      tokens = src.tokens as ThemeTokens;
      effects = (src.effects as ThemeEffects | null) ?? null;
      layout = (src.layout as Prisma.InputJsonValue) ?? undefined;
      baseThemeSlug = src.baseThemeSlug ?? baseThemeSlug;
    } else {
      const base =
        (await this.prisma.themeDefinition.findUnique({ where: { slug: baseThemeSlug } })) ??
        catalogBySlug(baseThemeSlug);
      if (!base) throw new NotFoundException('Base theme not found');
      tokens = (base.tokens as ThemeTokens) ?? catalogBySlug('midnight-dark')!.tokens;
      effects = (base.effects as ThemeEffects | null) ?? null;
    }

    const slug =
      body.slug ??
      `${body.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')}-${Date.now().toString(36)}`;

    const row = await this.prisma.themeTemplate.create({
      data: {
        slug,
        name: body.name,
        description: body.description,
        festivalId: body.festivalId ?? null,
        countryCode: body.countryCode ?? null,
        regionCode: body.regionCode ?? null,
        baseThemeSlug,
        tokens: tokens as Prisma.InputJsonValue,
        effects: (effects ?? null) as Prisma.InputJsonValue,
        layout,
        status: 'DRAFT',
        createdById: actor.id,
        updatedById: actor.id,
      },
    });
    await this.prisma.themeTemplateVersion.create({
      data: {
        templateId: row.id,
        note: 'Initial draft',
        tokens: tokens as Prisma.InputJsonValue,
        effects: (effects ?? null) as Prisma.InputJsonValue,
        layout,
        createdById: actor.id,
      },
    });
    return this.getTemplate(row.id);
  }

  async updateTemplate(
    actor: AuthUser,
    id: string,
    body: {
      name?: string;
      description?: string;
      tokens?: ThemeTokens;
      effects?: ThemeEffects | null;
      layout?: Record<string, unknown> | null;
      festivalId?: string | null;
      countryCode?: string | null;
      regionCode?: string | null;
      note?: string;
      saveVersion?: boolean;
    },
  ) {
    const existing = await this.getTemplate(id);
    if (existing.status === 'ARCHIVED') throw new BadRequestException('Restore before editing');

    const tokens = (body.tokens ?? existing.tokens) as ThemeTokens;
    const effects = body.effects !== undefined ? body.effects : (existing.effects as ThemeEffects | null);
    const layout =
      body.layout !== undefined ? body.layout : (existing.layout as Record<string, unknown> | null);

    const row = await this.prisma.themeTemplate.update({
      where: { id },
      data: {
        name: body.name ?? existing.name,
        description: body.description ?? existing.description,
        tokens: tokens as Prisma.InputJsonValue,
        effects: (effects ?? null) as Prisma.InputJsonValue,
        layout: (layout ?? null) as Prisma.InputJsonValue,
        festivalId: body.festivalId !== undefined ? body.festivalId : existing.festivalId,
        countryCode: body.countryCode !== undefined ? body.countryCode : existing.countryCode,
        regionCode: body.regionCode !== undefined ? body.regionCode : existing.regionCode,
        updatedById: actor.id,
      },
    });

    if (body.saveVersion !== false) {
      await this.prisma.themeTemplateVersion.create({
        data: {
          templateId: id,
          note: body.note ?? 'Draft save',
          tokens: tokens as Prisma.InputJsonValue,
          effects: (effects ?? null) as Prisma.InputJsonValue,
          layout: (layout ?? null) as Prisma.InputJsonValue,
          createdById: actor.id,
        },
      });
    }
    return this.getTemplate(row.id);
  }

  async publishTemplate(actor: AuthUser, id: string, publishSlug?: string) {
    const tpl = await this.getTemplate(id);
    const slug =
      publishSlug ??
      tpl.publishedSlug ??
      `custom-${tpl.slug}`.slice(0, 80);

    const theme = await this.prisma.themeDefinition.upsert({
      where: { slug },
      create: {
        slug,
        name: tpl.name,
        description: tpl.description,
        kind: 'FESTIVAL',
        festivalKey: tpl.festival?.slug ?? tpl.slug,
        tokens: tpl.tokens as Prisma.InputJsonValue,
        effects: (tpl.effects ?? null) as Prisma.InputJsonValue,
        isBuiltIn: false,
      },
      update: {
        name: tpl.name,
        description: tpl.description,
        tokens: tpl.tokens as Prisma.InputJsonValue,
        effects: (tpl.effects ?? null) as Prisma.InputJsonValue,
      },
    });

    await this.prisma.themeTemplate.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        publishedSlug: theme.slug,
        publishedAt: new Date(),
        updatedById: actor.id,
      },
    });
    await this.prisma.themeTemplateVersion.create({
      data: {
        templateId: id,
        note: `Published as ${theme.slug}`,
        tokens: tpl.tokens as Prisma.InputJsonValue,
        effects: (tpl.effects ?? null) as Prisma.InputJsonValue,
        layout: (tpl.layout ?? null) as Prisma.InputJsonValue,
        createdById: actor.id,
      },
    });
    await writeAudit(this.prisma, {
      actor,
      modelLabel: 'ThemeTemplate',
      eventType: 'theme.template_publish',
      objectId: id,
      objectRepr: theme.slug,
    });
    return { template: await this.getTemplate(id), theme };
  }

  async restoreVersion(actor: AuthUser, templateId: string, versionId: string) {
    const ver = await this.prisma.themeTemplateVersion.findFirst({
      where: { id: versionId, templateId },
    });
    if (!ver) throw new NotFoundException('Version not found');
    return this.updateTemplate(actor, templateId, {
      tokens: ver.tokens as ThemeTokens,
      effects: ver.effects as ThemeEffects | null,
      layout: ver.layout as Record<string, unknown> | null,
      note: `Restored version ${versionId.slice(0, 8)}`,
    });
  }

  async archiveTemplate(actor: AuthUser, id: string) {
    await this.getTemplate(id);
    return this.prisma.themeTemplate.update({
      where: { id },
      data: { status: 'ARCHIVED', updatedById: actor.id },
    });
  }

  async listAssets(category?: string) {
    await this.ensureFestivalSeeded();
    return this.prisma.themeAsset.findMany({
      where: { isActive: true, ...(category ? { category } : {}) },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  async listAnimations() {
    await this.ensureFestivalSeeded();
    return this.prisma.animationPreset.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async calendar(year: number, countryCode?: string) {
    await this.ensureFestivalSeeded();
    const start = new Date(Date.UTC(year, 0, 1));
    const end = new Date(Date.UTC(year, 11, 31, 23, 59, 59));
    const schedules = await this.prisma.festivalSchedule.findMany({
      where: {
        startsAt: { lte: end },
        endsAt: { gte: start },
        ...(countryCode ? { countryCode } : {}),
      },
      include: { festival: true },
      orderBy: { startsAt: 'asc' },
    });
    const festivals = await this.prisma.festival.findMany({
      where: {
        isActive: true,
        ...(countryCode ? { countryCode } : {}),
        sampleStartMonth: { not: null },
      },
    });
    const sampleWindows = festivals
      .filter((f) => f.sampleStartMonth && f.sampleStartDay)
      .map((f) => {
        const y = year;
        const sm = f.sampleStartMonth!;
        const sd = f.sampleStartDay!;
        const em = f.sampleEndMonth ?? sm;
        const ed = f.sampleEndDay ?? sd;
        let startsAt = new Date(Date.UTC(y, sm - 1, sd));
        let endsAt = new Date(Date.UTC(y, em - 1, ed, 23, 59, 59));
        if (endsAt < startsAt) {
          endsAt = new Date(Date.UTC(y + 1, em - 1, ed, 23, 59, 59));
        }
        return {
          type: 'sample' as const,
          festival: f,
          startsAt,
          endsAt,
          needsVerification: !f.dateVerified || f.calendarBasis !== 'GREGORIAN',
        };
      });

    return { year, schedules, sampleWindows };
  }

  async studioBootstrap() {
    await this.ensureFestivalSeeded();
    const [festivals, templates, assets, animations, themes, settings] = await Promise.all([
      this.listFestivals(),
      this.listTemplates(),
      this.listAssets(),
      this.listAnimations(),
      this.prisma.themeDefinition.findMany({ orderBy: [{ kind: 'asc' }, { name: 'asc' }] }),
      this.prisma.appearanceSettings.findUniqueOrThrow({ where: { id: 1 } }),
    ]);
    const countries = [...new Set(festivals.map((f) => f.countryCode))].sort();
    return { festivals, templates, assets, animations, themes, settings, countries };
  }
}
