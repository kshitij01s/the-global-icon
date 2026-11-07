import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ApiInboxSeverity as PrismaSeverity, ApiInboxStatus as PrismaStatus, Prisma } from '@prisma/client';
import type { AuthUser } from '../common/types';
import { writeAudit } from '../common/audit';
import { PrismaService } from '../prisma/prisma.service';
import {
  classifySeverity,
  defaultCustomerMessage,
  defaultTitle,
} from './api-inbox.classifier';
import { ApiInboxSeverity, ApiInboxStatus } from './api-inbox.enums';
import { buildFingerprint } from './api-inbox.fingerprint';
import type { ApiInboxListQueryDto, ApiInboxPatchDto } from './api-inbox.dto';
import type { ApiInboxReportInput, ApiInboxReportResult } from './api-inbox.types';
import { isNoiseError, normalizeTechnicalError, sanitizeMetadata } from './api-inbox.util';

const EMAIL_COOLDOWN_MS = 30 * 60 * 1000;
const ACTIVE: PrismaStatus[] = [PrismaStatus.OPEN, PrismaStatus.ACKNOWLEDGED];

@Injectable()
export class ApiInboxService {
  private readonly logger = new Logger(ApiInboxService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Report an operational failure. Deduplicates against OPEN/ACKNOWLEDGED by fingerprint.
   * RESOLVED incidents are never mutated; a new OPEN row is created on recurrence.
   */
  async report(input: ApiInboxReportInput): Promise<ApiInboxReportResult | null> {
    const technicalError = normalizeTechnicalError(input.technicalError);
    if (!technicalError || isNoiseError(technicalError)) {
      return null;
    }

    const category = String(input.category || 'system').trim().slice(0, 80) || 'system';
    const source = String(input.source || 'unknown').trim().slice(0, 120) || 'unknown';
    const severity = classifySeverity(
      technicalError,
      category,
      input.severity,
    ) as unknown as PrismaSeverity;
    const title = (input.title?.trim() || defaultTitle(category, source)).slice(0, 200);
    const customerMessage = (
      input.customerMessage?.trim() || defaultCustomerMessage(category)
    ).slice(0, 500);
    const metadata = sanitizeMetadata(input.metadata ?? null);
    const fingerprint = buildFingerprint({
      category,
      source,
      technicalError,
      entityType: input.entityType,
      entityId: input.entityId,
    });
    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.apiInboxItem.findFirst({
        where: { fingerprint, status: { in: ACTIVE } },
        orderBy: { lastSeenAt: 'desc' },
      });

      if (existing) {
        const mergedMeta = this.mergeMetadata(
          existing.metadata as Record<string, unknown> | null,
          metadata,
        );
        const updated = await tx.apiInboxItem.update({
          where: { id: existing.id },
          data: {
            occurrenceCount: { increment: 1 },
            lastSeenAt: now,
            technicalError,
            title,
            customerMessage,
            severity,
            metadata: mergedMeta === null ? Prisma.JsonNull : (mergedMeta as Prisma.InputJsonValue),
          },
        });
        return { item: updated, created: false };
      }

      const created = await tx.apiInboxItem.create({
        data: {
          category,
          source,
          severity,
          status: PrismaStatus.OPEN,
          title,
          customerMessage,
          technicalError,
          fingerprint,
          occurrenceCount: 1,
          lastSeenAt: now,
          userId: input.userId ?? null,
          entityId: input.entityId ?? null,
          entityType: input.entityType ?? null,
          metadata: metadata === null ? Prisma.JsonNull : (metadata as Prisma.InputJsonValue),
        },
      });
      return { item: created, created: true };
    });

    if (result.created || input.forceEmail) {
      await this.maybeNotify(result.item.id, result.item.severity as unknown as ApiInboxSeverity, result.item.fingerprint, input.forceEmail);
    }

    return {
      itemId: result.item.id,
      created: result.created,
      occurrenceCount: result.item.occurrenceCount,
      customerMessage: result.item.customerMessage,
      severity: result.item.severity as unknown as ApiInboxSeverity,
      status: result.item.status,
    };
  }

  /** Fire-and-forget helper for catch blocks — never throws into the caller. */
  async reportSafe(input: ApiInboxReportInput): Promise<ApiInboxReportResult | null> {
    try {
      const result = await this.report(input);
      const raw = input.technicalError;
      if (raw && typeof raw === 'object') {
        (raw as { __apiInboxReported?: boolean }).__apiInboxReported = true;
      }
      return result;
    } catch (err) {
      this.logger.warn(`api-inbox report failed: ${normalizeTechnicalError(err)}`);
      return null;
    }
  }

  async alerts() {
    const [openCount, criticalCount, warningCount, latest] = await Promise.all([
      this.prisma.apiInboxItem.count({ where: { status: { in: ACTIVE } } }),
      this.prisma.apiInboxItem.count({
        where: { status: { in: ACTIVE }, severity: PrismaSeverity.CRITICAL },
      }),
      this.prisma.apiInboxItem.count({
        where: { status: { in: ACTIVE }, severity: PrismaSeverity.WARNING },
      }),
      this.prisma.apiInboxItem.findMany({
        where: { status: { in: ACTIVE } },
        orderBy: [{ severity: 'asc' }, { lastSeenAt: 'desc' }],
        take: 8,
        select: {
          id: true,
          title: true,
          category: true,
          source: true,
          severity: true,
          status: true,
          occurrenceCount: true,
          lastSeenAt: true,
        },
      }),
    ]);
    // severity enum order CRITICAL < INFO in postgres alpha — re-sort critical first
    const ordered = [...latest].sort((a, b) => {
      const rank = (s: string) => (s === 'CRITICAL' ? 0 : s === 'WARNING' ? 1 : 2);
      const d = rank(a.severity) - rank(b.severity);
      return d !== 0 ? d : b.lastSeenAt.getTime() - a.lastSeenAt.getTime();
    });
    return { openCount, criticalCount, warningCount, latest: ordered };
  }

  async list(query: ApiInboxListQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const where = this.buildWhere(query);
    const [total, items] = await Promise.all([
      this.prisma.apiInboxItem.count({ where }),
      this.prisma.apiInboxItem.findMany({
        where,
        orderBy: [{ lastSeenAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return {
      items,
      total,
      page,
      limit,
      pageCount: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async getById(id: string) {
    const item = await this.prisma.apiInboxItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Inbox item not found');
    return item;
  }

  async patch(id: string, dto: ApiInboxPatchDto, actor: AuthUser) {
    const item = await this.getById(id);
    const data: Prisma.ApiInboxItemUpdateInput = {};
    const now = new Date();

    if (dto.adminNotes !== undefined) {
      data.adminNotes = dto.adminNotes;
    }

    if (dto.status === ApiInboxStatus.ACKNOWLEDGED) {
      if (item.status === PrismaStatus.RESOLVED) {
        throw new BadRequestException('Resolved incidents must be reopened before acknowledgement');
      }
      data.status = PrismaStatus.ACKNOWLEDGED;
      data.acknowledgedAt = item.acknowledgedAt ?? now;
      data.acknowledgedById = item.acknowledgedById ?? actor.id;
    } else if (dto.status === ApiInboxStatus.RESOLVED) {
      data.status = PrismaStatus.RESOLVED;
      data.resolvedAt = now;
      data.resolvedById = actor.id;
      if (!item.acknowledgedAt) {
        data.acknowledgedAt = now;
        data.acknowledgedById = actor.id;
      }
    } else if (dto.status === ApiInboxStatus.OPEN) {
      // Reopen policy: clear resolution, keep history in notes/timestamps on prior fields
      data.status = PrismaStatus.OPEN;
      data.resolvedAt = null;
      data.resolvedById = null;
    } else if (dto.status && dto.status !== item.status) {
      throw new BadRequestException('Unsupported status transition');
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No updates provided');
    }

    const updated = await this.prisma.apiInboxItem.update({ where: { id }, data });
    await writeAudit(this.prisma, {
      actor,
      modelLabel: 'ApiInboxItem',
      eventType: `api_inbox.${(dto.status ?? 'note').toLowerCase()}`,
      objectId: id,
      objectRepr: updated.title,
      details: { status: updated.status, notesLength: (dto.adminNotes ?? '').length },
    });
    return updated;
  }

  async categoryStats() {
    const rows = await this.prisma.apiInboxItem.groupBy({
      by: ['category'],
      where: { status: { in: ACTIVE } },
      _count: { _all: true },
    });
    return rows.map((r) => ({ category: r.category, count: r._count._all }));
  }

  async sourceStats() {
    const rows = await this.prisma.apiInboxItem.groupBy({
      by: ['source'],
      where: { status: { in: ACTIVE } },
      _count: { _all: true },
    });
    return rows.map((r) => ({ source: r.source, count: r._count._all }));
  }

  private buildWhere(query: ApiInboxListQueryDto): Prisma.ApiInboxItemWhereInput {
    const where: Prisma.ApiInboxItemWhereInput = {};
    if (query.status) where.status = query.status as PrismaStatus;
    if (query.severity) where.severity = query.severity as PrismaSeverity;
    if (query.category) where.category = query.category;
    if (query.source) where.source = { contains: query.source, mode: 'insensitive' };
    if (query.entityType) where.entityType = query.entityType;
    if (query.dateFrom || query.dateTo) {
      where.lastSeenAt = {};
      if (query.dateFrom) where.lastSeenAt.gte = new Date(query.dateFrom);
      if (query.dateTo) where.lastSeenAt.lte = new Date(query.dateTo);
    }
    if (query.search?.trim()) {
      const q = query.search.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { technicalError: { contains: q, mode: 'insensitive' } },
        { source: { contains: q, mode: 'insensitive' } },
        { category: { contains: q, mode: 'insensitive' } },
        { entityId: { contains: q, mode: 'insensitive' } },
      ];
    }
    return where;
  }

  private mergeMetadata(
    existing: Record<string, unknown> | null,
    incoming: Record<string, unknown> | null,
  ): Record<string, unknown> | null {
    if (!existing && !incoming) return null;
    return { ...(existing ?? {}), ...(incoming ?? {}), _lastMergedAt: new Date().toISOString() };
  }

  private async maybeNotify(
    id: string,
    severity: ApiInboxSeverity,
    fingerprint: string,
    force?: boolean,
  ) {
    if (!force && severity === ApiInboxSeverity.INFO) return;
    if (!force && severity !== ApiInboxSeverity.CRITICAL && severity !== ApiInboxSeverity.WARNING) {
      return;
    }
    // WARNING only when explicitly forced or env enabled
    const warnEnabled = process.env.API_INBOX_EMAIL_WARNINGS === 'true';
    if (!force && severity === ApiInboxSeverity.WARNING && !warnEnabled) return;

    const item = await this.prisma.apiInboxItem.findUnique({ where: { id } });
    if (!item) return;
    if (
      !force &&
      item.emailSentAt &&
      Date.now() - item.emailSentAt.getTime() < EMAIL_COOLDOWN_MS
    ) {
      return;
    }

    // No dedicated mail provider in this project — record intent + log (avoids silent drop).
    try {
      this.logger.log(
        `[api-inbox notify] fingerprint=${fingerprint.slice(0, 12)} severity=${severity} title=${item.title}`,
      );
      await this.prisma.apiInboxItem.update({
        where: { id },
        data: { emailSentAt: new Date() },
      });
    } catch (err) {
      // Never recurse into report() from notification failure
      this.logger.warn(`api-inbox notify failed: ${normalizeTechnicalError(err)}`);
    }
  }
}
