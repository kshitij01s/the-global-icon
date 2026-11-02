import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { RoleName } from '@prisma/client';
import type { Request } from 'express';
import type { AuthUser } from '../common/types';
import type { PermissionKey } from './permissions';

export const ROLES_KEY = 'tgi:roles';
export const PERMISSIONS_KEY = 'tgi:permissions';

/** Require ANY of the given roles. SUPER_ADMIN always passes. */
export const Roles = (...roles: RoleName[]) => SetMetadata(ROLES_KEY, roles);

/** Require ALL of the given permissions. SUPER_ADMIN always passes. */
export const RequirePermissions = (...permissions: PermissionKey[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser =>
    ctx.switchToHttp().getRequest<Request & { user: AuthUser }>().user,
);

export const OptionalUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser | null =>
    ctx.switchToHttp().getRequest<Request & { user?: AuthUser | null }>().user ?? null,
);
