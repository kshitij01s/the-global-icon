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
import { catalogBySlug, THEME_CATALOG, type ThemeEffects, type ThemeTokens } from './theme-catalog';

/**
 * Priority (highest first):
 * 1. Super Admin manual override (while active)
 * 2. Enabled scheduled festival (highest priority, then latest start)
 * 3. Configured global default theme
 * 4. Reader preference is applied client-side only when allowReaderPreference
 */
@Injectable()
export class ThemesService {
  constructor(private readonly prisma: PrismaService) {}

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
            restoreThemeSlug: 'midnight-dark',
          },
        ],
      });
    }
  }

  async listLibrary() {
    await this.ensureSeeded();
    return this.prisma.themeDefinition.findMany({ orderBy: [{ kind: 'asc' }, { name: 'asc' }] });
  }

  async getAppearance() {
    await this.ensureSeeded();
    return this.prisma.appearanceSettings.findUniqueOrThrow({ where: { id: 1 } });
  }

  async resolveActive(now = new Date()) {
    await this.ensureSeeded();
    const settings = await this.getAppearance();
    let source: 'manual_override' | 'festival' | 'global' = 'global';
    let slug = settings.globalThemeSlug;
    let schedule: Awaited<ReturnType<ThemesService['findActiveFestival']>> | null = null;

    if (
      settings.manualOverrideSlug &&
      (!settings.manualOverrideUntil || settings.manualOverrideUntil > now)
    ) {
      slug = settings.manualOverrideSlug;
      source = 'manual_override';
    } else if (settings.festivalAutoEnabled) {
      schedule = await this.findActiveFestival(now);
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
        schedule: null,
        settings: {
          globalThemeSlug: settings.globalThemeSlug,
          festivalAutoEnabled: settings.festivalAutoEnabled,
          manualOverrideSlug: settings.manualOverrideSlug,
        },
        priorityRules: [
          '1. Super Admin emergency/manual override',
          '2. Active scheduled festival theme',
          '3. Configured global default theme',
          '4. Reader light/dark preference (client, when permitted)',
        ],
        serverTime: now.toISOString(),
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
      effects: source === 'festival' ? effects : null,
      effectsEnabled: settings.effectsEnabled,
      allowReaderPreference: settings.allowReaderPreference,
      allowAdminGlobalChange: settings.allowAdminGlobalChange,
      schedule: schedule
        ? {
            id: schedule.id,
            eventKey: schedule.eventKey,
            name: schedule.name,
            startsAt: schedule.startsAt.toISOString(),
            endsAt: schedule.endsAt.toISOString(),
            priority: schedule.priority,
            timezone: schedule.timezone,
          }
        : null,
      settings: {
        globalThemeSlug: settings.globalThemeSlug,
        festivalAutoEnabled: settings.festivalAutoEnabled,
        manualOverrideSlug: settings.manualOverrideSlug,
      },
      priorityRules: [
        '1. Super Admin emergency/manual override',
        '2. Active scheduled festival theme',
        '3. Configured global default theme',
        '4. Reader light/dark preference (client, when permitted)',
      ],
      serverTime: now.toISOString(),
    };
  }

  private async findActiveFestival(now: Date) {
    const rows = await this.prisma.festivalSchedule.findMany({
      where: { enabled: true, startsAt: { lte: now }, endsAt: { gte: now } },
      orderBy: [{ priority: 'desc' }, { startsAt: 'desc' }],
      take: 1,
    });
    return rows[0] ?? null;
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
      defaultRestoreSlug: string;
    }>,
  ) {
    await this.ensureSeeded();
    const updated = await this.prisma.appearanceSettings.update({
      where: { id: 1 },
      data: {
        ...body,
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
      restoreThemeSlug: body.restoreThemeSlug ?? 'midnight-dark',
    };

    const row = body.id
      ? await this.prisma.festivalSchedule.update({ where: { id: body.id }, data })
      : await this.prisma.festivalSchedule.create({ data });

    await this.recordHistory(actor, null, body.themeSlug, 'SCHEDULE_UPSERT', {
      scheduleId: row.id,
      eventKey: row.eventKey,
    });
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
