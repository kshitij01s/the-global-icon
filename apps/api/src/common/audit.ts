import type { Prisma } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from './types';

export interface AuditEntry {
  actor: AuthUser;
  modelLabel: string;
  eventType: string;
  objectId: string;
  objectRepr: string;
  details?: Prisma.InputJsonValue;
}

/** Appends an audit row. Never put secrets or personal free-text in `details`. */
export function writeAudit(prisma: PrismaService, entry: AuditEntry) {
  return prisma.auditLog.create({
    data: {
      actorId: entry.actor.id,
      eventType: entry.eventType,
      modelLabel: entry.modelLabel,
      objectId: entry.objectId,
      objectRepr: entry.objectRepr.slice(0, 250),
      details: entry.details,
    },
  });
}

export function isSuperAdmin(user: AuthUser): boolean {
  return user.roles.includes('SUPER_ADMIN');
}

export function hasPermission(user: AuthUser, permission: string): boolean {
  return isSuperAdmin(user) || user.permissions.includes(permission);
}
