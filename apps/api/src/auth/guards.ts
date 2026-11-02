import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import type { RoleName } from '@prisma/client';
import type { Request } from 'express';
import type { AuthUser } from '../common/types';
import { PERMISSIONS_KEY, ROLES_KEY } from './decorators';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

/** Populates `req.user` when a valid token is supplied; never rejects. */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = AuthUser | null>(_err: unknown, user: unknown): TUser {
    return (user || null) as TUser;
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<RoleName[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const user = context.switchToHttp().getRequest<Request & { user?: AuthUser }>().user;
    if (!user) throw new ForbiddenException('Authentication required');
    if (user.roles.includes('SUPER_ADMIN')) return true;
    if (required.some((role) => user.roles.includes(role))) return true;
    throw new ForbiddenException('Insufficient role');
  }
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[] | undefined>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const user = context.switchToHttp().getRequest<Request & { user?: AuthUser }>().user;
    if (!user) throw new ForbiddenException('Authentication required');
    if (user.roles.includes('SUPER_ADMIN')) return true;
    if (required.every((permission) => user.permissions.includes(permission))) {
      return true;
    }
    throw new ForbiddenException('Insufficient permissions');
  }
}
