import { ExecutionContext, ForbiddenException, BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { RoleName } from '@prisma/client';
import { PERMISSIONS_KEY } from '../auth/decorators';
import { PermissionsGuard } from '../auth/guards';
import { PERMISSIONS, ROLE_PERMISSIONS } from '../auth/permissions';
import type { AuthUser } from '../common/types';
import type { PrismaService } from '../prisma/prisma.service';
import { ApiInboxController } from '../api-inbox/api-inbox.controller';
import { AdminController } from './admin.controller';
import { AdminAdvertisingController } from './advertising';
import { AdminArticlesController } from './articles.controller';
import { AdminEnquiriesController } from './enquiries';
import { AdminLeadersController } from './leaders';
import { AdminLookupsController } from './lookups';
import { AdminSettingsController } from './settings';
import { AdminUploadsController } from './uploads';
import { AdminUsersController, AdminUsersService } from './users';
import {
  MAX_IMAGE_BYTES,
  MAX_PDF_BYTES,
  sniffImage,
  validateImage,
  validatePdf,
} from './upload-validation';

const CONTROLLERS = [
  AdminController,
  AdminArticlesController,
  AdminLeadersController,
  AdminEnquiriesController,
  AdminUsersController,
  AdminSettingsController,
  AdminLookupsController,
  AdminUploadsController,
  AdminAdvertisingController,
  ApiInboxController,
];

function makeUser(id: string, roles: RoleName[]): AuthUser {
  const permissions = new Set<string>();
  for (const role of roles) ROLE_PERMISSIONS[role].forEach((p) => permissions.add(p));
  return {
    id,
    email: `${id}@example.test`,
    username: id,
    firstName: null,
    lastName: null,
    roles,
    permissions: [...permissions],
  };
}

function contextFor(
  controller: new (...args: never[]) => unknown,
  method: string,
  user: AuthUser,
): ExecutionContext {
  const handler = (controller.prototype as unknown as Record<string, () => unknown>)[method];
  return {
    getHandler: () => handler,
    getClass: () => controller,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

function routeMethods(controller: new (...args: never[]) => unknown): string[] {
  return Object.getOwnPropertyNames(controller.prototype).filter(
    (name) =>
      name !== 'constructor' &&
      Reflect.hasMetadata('path', (controller.prototype as unknown as Record<string, object>)[name]),
  );
}

describe('admin RBAC', () => {
  const guard = new PermissionsGuard(new Reflector());
  const reader = makeUser('reader', ['READER']);
  const admin = makeUser('admin', ['ADMIN']);
  const superAdmin = makeUser('root', ['SUPER_ADMIN']);

  it('declares explicit permissions on every admin route', () => {
    const reflector = new Reflector();
    for (const controller of CONTROLLERS) {
      const methods = routeMethods(controller);
      expect(methods.length).toBeGreaterThan(0);
      for (const method of methods) {
        const required = reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
          (controller.prototype as unknown as Record<string, () => unknown>)[method],
          controller,
        ]);
        expect({ route: `${controller.name}.${method}`, ok: Boolean(required?.length) }).toEqual({
          route: `${controller.name}.${method}`,
          ok: true,
        });
      }
    }
  });

  it('forbids a reader on every admin route', () => {
    for (const controller of CONTROLLERS) {
      for (const method of routeMethods(controller)) {
        expect(() => guard.canActivate(contextFor(controller, method, reader))).toThrow(
          ForbiddenException,
        );
      }
    }
  });

  it('lets an admin use content routes but not Super-Admin-only settings PATCH', () => {
    expect(guard.canActivate(contextFor(AdminArticlesController, 'create', admin))).toBe(true);
    expect(guard.canActivate(contextFor(AdminSettingsController, 'get', admin))).toBe(true);
    expect(() => guard.canActivate(contextFor(AdminSettingsController, 'update', admin))).toThrow(
      ForbiddenException,
    );
    expect(guard.canActivate(contextFor(AdminSettingsController, 'update', superAdmin))).toBe(true);
  });

  it('withholds role-elevation permissions from ADMIN', () => {
    expect(ROLE_PERMISSIONS.ADMIN).not.toContain(PERMISSIONS.USERS_MANAGE_ADMINS);
    expect(ROLE_PERMISSIONS.ADMIN).not.toContain(PERMISSIONS.SITE_SETTINGS_UPDATE);
    expect(ROLE_PERMISSIONS.ADMIN).not.toContain(PERMISSIONS.THEMES_MANAGE);
    expect(ROLE_PERMISSIONS.ADMIN).not.toContain(PERMISSIONS.PAGES_PUBLISH);
    expect(ROLE_PERMISSIONS.ADMIN).toContain(PERMISSIONS.THEMES_VIEW);
    expect(ROLE_PERMISSIONS.ADMIN).toContain(PERMISSIONS.PAGES_EDIT);
    expect(ROLE_PERMISSIONS.SUPER_ADMIN).toContain(PERMISSIONS.USERS_MANAGE_ADMINS);
    expect(ROLE_PERMISSIONS.SUPER_ADMIN).toContain(PERMISSIONS.THEMES_SCHEDULE);
  });
});

describe('AdminUsersService role assignment', () => {
  function build(targetRoles: RoleName[], otherSuperAdmins = 1) {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'target',
          email: 'target@example.test',
          username: 'target',
          firstName: null,
          lastName: null,
          isActive: true,
          createdAt: new Date(),
          roles: targetRoles.map((name) => ({ role: { name } })),
        }),
        count: jest.fn().mockResolvedValue(otherSuperAdmins),
        update: jest.fn(),
      },
      role: {
        findMany: jest
          .fn()
          .mockImplementation(({ where }: { where: { name: { in: string[] } } }) =>
            Promise.resolve(where.name.in.map((name) => ({ id: `role-${name}`, name }))),
          ),
      },
      userRole: { deleteMany: jest.fn(), createMany: jest.fn() },
      refreshToken: { updateMany: jest.fn() },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn().mockResolvedValue([]),
    };
    return { prisma, service: new AdminUsersService(prisma as unknown as PrismaService) };
  }

  const admin = makeUser('admin', ['ADMIN']);
  const superAdmin = makeUser('root', ['SUPER_ADMIN']);

  it('prevents an admin from granting SUPER_ADMIN to someone else', async () => {
    const { service, prisma } = build(['READER']);
    await expect(service.setRoles('target', ['SUPER_ADMIN'], admin)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('prevents an admin from self-granting SUPER_ADMIN', async () => {
    const { service, prisma } = build(['ADMIN']);
    await expect(service.setRoles('admin', ['ADMIN', 'SUPER_ADMIN'], admin)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('prevents an admin from granting ADMIN or editing an existing admin', async () => {
    await expect(
      build(['READER']).service.setRoles('target', ['ADMIN'], admin),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      build(['ADMIN']).service.setRoles('target', ['READER'], admin),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows an admin to assign non-privileged staff roles', async () => {
    const { service, prisma } = build(['READER']);
    await service.setRoles('target', ['EDITOR'], admin);
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });

  it('allows a super admin to elevate to SUPER_ADMIN', async () => {
    const { service, prisma } = build(['ADMIN']);
    await service.setRoles('target', ['SUPER_ADMIN'], superAdmin);
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('refuses to demote the last active super admin', async () => {
    const { service } = build(['SUPER_ADMIN'], 0);
    await expect(service.setRoles('target', ['READER'], superAdmin)).rejects.toThrow(
      /last active Super Admin/,
    );
  });

  it('blocks self deactivation and admin deactivating a super admin', async () => {
    await expect(build(['ADMIN']).service.setActive('admin', false, admin)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(
      build(['SUPER_ADMIN']).service.setActive('target', false, admin),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('upload validation', () => {
  const pdf = (body = '%PDF-1.7\n%%EOF') => Buffer.from(body, 'latin1');
  const file = (buffer: Buffer, mimetype: string) => ({
    originalname: 'x',
    mimetype,
    size: buffer.length,
    buffer,
  });
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.alloc(16),
  ]);

  it('accepts a real PDF header and rejects spoofed content', () => {
    expect(validatePdf(file(pdf(), 'application/pdf'))).toBeInstanceOf(Buffer);
    expect(() => validatePdf(file(Buffer.from('<html>'), 'application/pdf'))).toThrow(
      BadRequestException,
    );
    expect(() => validatePdf(file(pdf(), 'text/plain'))).toThrow(BadRequestException);
    expect(() => validatePdf(undefined)).toThrow(BadRequestException);
  });

  it('enforces size limits', () => {
    const big = { ...file(pdf(), 'application/pdf'), size: MAX_PDF_BYTES + 1 };
    expect(() => validatePdf(big)).toThrow(PayloadTooLargeException);
    const bigImage = { ...file(png, 'image/png'), size: MAX_IMAGE_BYTES + 1 };
    expect(() => validateImage(bigImage)).toThrow(PayloadTooLargeException);
  });

  it('accepts PNG and rejects mismatched/unsupported images', () => {
    expect(validateImage(file(png, 'image/png')).extension).toBe('png');
    expect(() => validateImage(file(png, 'image/jpeg'))).toThrow(BadRequestException);
    expect(() => validateImage(file(Buffer.from('<svg/>'), 'image/svg+xml'))).toThrow(
      BadRequestException,
    );
    expect(() => validateImage(file(pdf(), 'image/png'))).toThrow(BadRequestException);
    expect(sniffImage(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
  });
});
