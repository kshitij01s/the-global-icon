import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { writeAudit } from '../common/audit';
import type { AuthUser } from '../common/types';
import { PrismaService } from '../prisma/prisma.service';
import { FestivalStudioService } from './festival-studio.service';
import { catalogBySlug, THEME_CATALOG, type ThemeEffects, type ThemeTokens } from './theme-catalog';

/**
 * Priority (highest first):
 * 1. Super Admin manual override (while active)
 * 2. Active scheduled regional festival (matching country/region)
 * 3. Active scheduled global festival
 * 4. Configured global default theme
 * 5. Reader preference is applied client-side only when allowReaderPreference
 */
@Injectable()
export class ThemesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly studio: FestivalStudioService,
  ) {}

  async ensureSeeded() {
    const count = await this.prisma.themeDefinition.count();
    if (count === 0) {
      await this.prisma.themeDefinition.createMany({
        data: THEME_CATALOG.map((t) => ({
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
    await this.prisma.appearanceSettings.upsert({
      where: { id: 1 },
      create: { id: 1 },
      update: {},
    });
    // Seed Christmas schedule for current / next season if none exist
    const festCount = await this.prisma.festivalSchedule.count();
    if (festCount === 0) {
      const year = new Date().getUTCFullYear();
      await this.prisma.festivalSchedule.createMany({
        data: [
          {
            eventKey: 'christmas',
            name: 'Christmas',
            themeSlug: 'festival-christmas',
            startsAt: new Date(Date.UTC(year, 11, 20, 0, 0, 0)),
            endsAt: new Date(Date.UTC(year, 11, 27, 23, 59, 59)),
            timezone: 'UTC',
            priority: 100,
            enabled: true,
            status: 'SCHEDULED',
            restoreThemeSlug: 'midnight-dark',
          },
          {
            eventKey: 'new-year',
            name: 'New Year',
            themeSlug: 'festival-new-year',
            startsAt: new Date(Date.UTC(year, 11, 31, 0, 0, 0)),
            endsAt: new Date(Date.UTC(year + 1, 0, 2, 23, 59, 59)),
            timezone: 'UTC',
            priority: 90,
            enabled: true,
            status: 'SCHEDULED',
            restoreThemeSlug: 'midnight-dark',
          },
          {
            eventKey: 'diwali',
            name: 'Diwali (sample window — adjust dates annually)',
            themeSlug: 'festival-diwali',
            startsAt: new Date(Date.UTC(year, 9, 18, 0, 0, 0)),
            endsAt: new Date(Date.UTC(year, 9, 24, 23, 59, 59)),
            timezone: 'Asia/Kolkata',
            priority: 80,
            enabled: false,
            status: 'DRAFT',
            countryCode: 'IN',
            restoreThemeSlug: 'midnight-dark',
          },
        ],
      });
    }
    await this.studio.ensureFestivalSeeded();
  }

  async listLibrary() {
    await this.ensureSeeded();
    return this.prisma.themeDefinition.findMany({ orderBy: [{ kind: 'asc' }, { name: 'asc' }] });
  }

  async getAppearance() {
    await this.ensureSeeded();
    return this.prisma.appearanceSettings.findUniqueOrThrow({ where: { id: 1 } });
  }

  async resolveActive(now = new Date(), opts: { countryCode?: string; regionCode?: string } = {}) {
    await this.ensureSeeded();
    const settings = await this.getAppearance();
    // Super Admin scheduler test mode: simulate "now" without publishing to real visitors unless override is set.
    // Public clients never receive test-mode activation unless they pass ?test=1 AND testAsOf is set — still read-only resolve.
    const effectiveNow = settings.schedulerTestAsOf ?? now;
    let source: 'manual_override' | 'festival' | 'global' = 'global';
    let slug = settings.globalThemeSlug;
    let schedule: Awaited<ReturnType<ThemesService['findActiveFestival']>> | null = null;

    if (
      settings.manualOverrideSlug &&
      (!settings.manualOverrideUntil || settings.manualOverrideUntil > effectiveNow)
    ) {
      slug = settings.manualOverrideSlug;
      source = 'manual_override';
    } else if (settings.festivalAutoEnabled) {
      schedule = await this.findActiveFestival(effectiveNow, opts.countryCode, opts.regionCode);
      if (schedule) {
        slug = schedule.themeSlug;
        source = 'festival';
      }
    }

    const theme =
      (await this.prisma.themeDefinition.findUnique({ where: { slug } })) ??
      (catalogBySlug(slug)
        ? {
            slug,
            name: catalogBySlug(slug)!.name,
            description: catalogBySlug(slug)!.description,
            kind: catalogBySlug(slug)!.kind,
            festivalKey: catalogBySlug(slug)!.festivalKey ?? null,
            tokens: catalogBySlug(slug)!.tokens,
            effects: catalogBySlug(slug)!.effects ?? null,
          }
        : null);

    if (!theme) {
      const fallback = catalogBySlug('midnight-dark')!;
      return {
        source: 'global' as const,
        slug: fallback.slug,
        name: fallback.name,
        kind: fallback.kind,
        festivalKey: null as string | null,
        tokens: fallback.tokens,
        effects: null as ThemeEffects | null,
        effectsEnabled: settings.effectsEnabled,
        allowReaderPreference: settings.allowReaderPreference,
        allowAdminGlobalChange: settings.allowAdminGlobalChange,
        allowVisitorRegionSelect: settings.allowVisitorRegionSelect,
        schedule: null,
        settings: {
          globalThemeSlug: settings.globalThemeSlug,
          festivalAutoEnabled: settings.festivalAutoEnabled,
          manualOverrideSlug: settings.manualOverrideSlug,
          schedulerTestAsOf: settings.schedulerTestAsOf?.toISOString() ?? null,
        },
        priorityRules: [
          '1. Super Admin emergency/manual override',
          '2. Active scheduled regional festival theme',
          '3. Active scheduled global festival theme',
          '4. Configured global default theme',
          '5. Reader light/dark preference (client, when permitted)',
        ],
        serverTime: now.toISOString(),
        effectiveTime: effectiveNow.toISOString(),
        region: opts,
      };
    }

    const rawEffects = (theme.effects as ThemeEffects | null) ?? null;
    // Show decorative effects for festival themes when activated by schedule or manual override.
    const effects =
      settings.effectsEnabled &&
      rawEffects &&
      (source === 'festival' || source === 'manual_override')
        ? rawEffects
        : null;

    return {
      source,
      slug: theme.slug,
      name: theme.name,
      kind: theme.kind,
      festivalKey: theme.festivalKey,
      tokens: theme.tokens as ThemeTokens,
      effects,
      effectsEnabled: settings.effectsEnabled,
      allowReaderPreference: settings.allowReaderPreference,
      allowAdminGlobalChange: settings.allowAdminGlobalChange,
      allowVisitorRegionSelect: settings.allowVisitorRegionSelect,
      schedule: schedule
        ? {
            id: schedule.id,
            eventKey: schedule.eventKey,
            name: schedule.name,
            startsAt: schedule.startsAt.toISOString(),
            endsAt: schedule.endsAt.toISOString(),
            priority: schedule.priority,
            timezone: schedule.timezone,
            countryCode: schedule.countryCode,
            regionCode: schedule.regionCode,
            status: schedule.status,
          }
        : null,
      settings: {
        globalThemeSlug: settings.globalThemeSlug,
        festivalAutoEnabled: settings.festivalAutoEnabled,
        manualOverrideSlug: settings.manualOverrideSlug,
        schedulerTestAsOf: settings.schedulerTestAsOf?.toISOString() ?? null,
      },
      priorityRules: [
        '1. Super Admin emergency/manual override',
        '2. Active scheduled regional festival theme',
        '3. Active scheduled global festival theme',
        '4. Configured global default theme',
        '5. Reader light/dark preference (client, when permitted)',
      ],
      serverTime: now.toISOString(),
      effectiveTime: effectiveNow.toISOString(),
      region: opts,
    };
  }

  private async findActiveFestival(now: Date, countryCode?: string, regionCode?: string) {
    const rows = await this.prisma.festivalSchedule.findMany({
      where: {
        enabled: true,
        status: { in: ['SCHEDULED', 'ACTIVE'] },
        startsAt: { lte: now },
        endsAt: { gte: now },
      },
      orderBy: [{ priority: 'desc' }, { startsAt: 'desc' }],
    });

    // Prefer region match, then country, then global (null country)
    const scored = rows
      .map((r) => {
        let score = 0;
        if (regionCode && r.regionCode && r.regionCode === regionCode) score += 100;
        if (countryCode && r.countryCode && r.countryCode === countryCode) score += 50;
        if (!r.countryCode && !r.regionCode) score += 10; // global festival
        // If schedule is country-locked and visitor has different country, skip
        if (r.countryCode && countryCode && r.countryCode !== countryCode) score = -1;
        if (r.regionCode && regionCode && r.regionCode !== regionCode && r.countryCode === countryCode) {
          // region-specific schedule: only apply when region matches (or visitor has no region)
          if (regionCode && r.regionCode !== regionCode) score = -1;
        }
        return { r, score };
      })
      .filter((x) => x.score >= 0)
      .sort((a, b) => b.score - a.score || b.r.priority - a.r.priority);

    const best = scored[0]?.r ?? null;
    if (best && best.status === 'SCHEDULED') {
      // Mark ACTIVE for audit trail (idempotent)
      await this.prisma.festivalSchedule
        .update({ where: { id: best.id }, data: { status: 'ACTIVE' } })
        .catch(() => null);
    }
    return best;
  }

  async listSchedules() {
    await this.ensureSeeded();
    return this.prisma.festivalSchedule.findMany({ orderBy: [{ startsAt: 'desc' }] });
  }

  async history(limit = 40) {
    return this.prisma.themeHistory.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  private async recordHistory(
    actor: AuthUser | null,
    previousSlug: string | null,
    newSlug: string,
    changeType: string,
    details?: Prisma.InputJsonValue,
  ) {
    await this.prisma.themeHistory.create({
      data: {
        previousSlug,
        newSlug,
        changeType,
        actorId: actor?.id,
        details: details ?? undefined,
      },
    });
  }

  async setGlobalTheme(actor: AuthUser, slug: string, opts: { asAdmin?: boolean } = {}) {
    await this.ensureSeeded();
    const settings = await this.getAppearance();
    if (opts.asAdmin && !settings.allowAdminGlobalChange) {
      throw new ForbiddenException('Super Admin has disabled global theme changes for Admin roles.');
    }
    const theme = await this.prisma.themeDefinition.findUnique({ where: { slug } });
    if (!theme) throw new NotFoundException('Theme not found');
    const previous = settings.globalThemeSlug;
    const updated = await this.prisma.appearanceSettings.update({
      where: { id: 1 },
      data: { globalThemeSlug: slug, updatedById: actor.id },
    });
    await this.recordHistory(actor, previous, slug, 'MANUAL_GLOBAL', { scope: 'global' });
    await writeAudit(this.prisma, {
      actor,
      modelLabel: 'AppearanceSettings',
      eventType: 'theme.global_set',
      objectId: '1',
      objectRepr: slug,
      details: { previous, slug },
    });
    return updated;
  }

  async setManualOverride(
    actor: AuthUser,
    slug: string | null,
    until?: string | null,
  ) {
    await this.ensureSeeded();
    if (slug) {
      const theme = await this.prisma.themeDefinition.findUnique({ where: { slug } });
      if (!theme) throw new NotFoundException('Theme not found');
    }
    const settings = await this.getAppearance();
    const updated = await this.prisma.appearanceSettings.update({
      where: { id: 1 },
      data: {
        manualOverrideSlug: slug,
        manualOverrideUntil: until ? new Date(until) : null,
        updatedById: actor.id,
      },
    });
    await this.recordHistory(
      actor,
      settings.manualOverrideSlug,
      slug ?? settings.globalThemeSlug,
      slug ? 'MANUAL_OVERRIDE' : 'CLEAR_OVERRIDE',
    );
    return updated;
  }

  async updateAppearanceFlags(
    actor: AuthUser,
    body: Partial<{
      festivalAutoEnabled: boolean;
      effectsEnabled: boolean;
      allowAdminGlobalChange: boolean;
      allowReaderPreference: boolean;
      allowVisitorRegionSelect: boolean;
      defaultRestoreSlug: string;
      schedulerTestAsOf: string | null;
    }>,
  ) {
    await this.ensureSeeded();
    const { schedulerTestAsOf, ...rest } = body;
    const updated = await this.prisma.appearanceSettings.update({
      where: { id: 1 },
      data: {
        ...rest,
        ...(schedulerTestAsOf !== undefined
          ? { schedulerTestAsOf: schedulerTestAsOf ? new Date(schedulerTestAsOf) : null }
          : {}),
        updatedById: actor.id,
      },
    });
    await writeAudit(this.prisma, {
      actor,
      modelLabel: 'AppearanceSettings',
      eventType: 'theme.flags_update',
      objectId: '1',
      objectRepr: 'appearance',
      details: body as Prisma.InputJsonValue,
    });
    return updated;
  }

  async upsertSchedule(
    actor: AuthUser,
    body: {
      id?: string;
      eventKey: string;
      name: string;
      themeSlug: string;
      startsAt: string;
      endsAt: string;
      timezone?: string;
      priority?: number;
      enabled?: boolean;
      status?: string;
      countryCode?: string | null;
      regionCode?: string | null;
      festivalId?: string | null;
      restoreThemeSlug?: string | null;
    },
  ) {
    await this.ensureSeeded();
    const startsAt = new Date(body.startsAt);
    const endsAt = new Date(body.endsAt);
    if (!(startsAt < endsAt)) throw new BadRequestException('startsAt must be before endsAt');
    const theme = await this.prisma.themeDefinition.findUnique({ where: { slug: body.themeSlug } });
    if (!theme) throw new NotFoundException('Theme not found');

    const data = {
      eventKey: body.eventKey,
      name: body.name,
      themeSlug: body.themeSlug,
      startsAt,
      endsAt,
      timezone: body.timezone ?? 'UTC',
      priority: body.priority ?? 10,
      enabled: body.enabled ?? true,
      status: body.status ?? (body.enabled === false ? 'PAUSED' : 'SCHEDULED'),
      countryCode: body.countryCode ?? null,
      regionCode: body.regionCode ?? null,
      festivalId: body.festivalId ?? null,
      restoreThemeSlug: body.restoreThemeSlug ?? 'midnight-dark',
    };

    const row = body.id
      ? await this.prisma.festivalSchedule.update({ where: { id: body.id }, data })
      : await this.prisma.festivalSchedule.create({ data });

    await this.recordHistory(actor, null, body.themeSlug, 'SCHEDULE_UPSERT', {
      scheduleId: row.id,
      eventKey: row.eventKey,
      countryCode: row.countryCode,
    });
    return row;
  }

  async setScheduleStatus(actor: AuthUser, id: string, status: string) {
    const allowed = ['DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'EXPIRED', 'CANCELLED'];
    if (!allowed.includes(status)) throw new BadRequestException('Invalid status');
    const row = await this.prisma.festivalSchedule.update({
      where: { id },
      data: {
        status,
        enabled: status === 'SCHEDULED' || status === 'ACTIVE',
      },
    });
    await this.recordHistory(actor, null, row.themeSlug, 'SCHEDULE_STATUS', { id, status });
    return row;
  }

  async deleteSchedule(actor: AuthUser, id: string) {
    const row = await this.prisma.festivalSchedule.delete({ where: { id } }).catch(() => null);
    if (!row) throw new NotFoundException('Schedule not found');
    await writeAudit(this.prisma, {
      actor,
      modelLabel: 'FestivalSchedule',
      eventType: 'theme.schedule_delete',
      objectId: id,
      objectRepr: row.eventKey,
    });
    return { deleted: true };
  }

  async rollback(actor: AuthUser, historyId: string) {
    const entry = await this.prisma.themeHistory.findUnique({ where: { id: historyId } });
    if (!entry?.previousSlug) throw new BadRequestException('Nothing to roll back to for this entry');
    return this.setGlobalTheme(actor, entry.previousSlug);
  }
}
