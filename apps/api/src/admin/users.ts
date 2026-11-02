import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Injectable,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Prisma, RoleName } from '@prisma/client';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { CurrentUser, RequirePermissions } from '../auth/decorators';
import { JwtAuthGuard, PermissionsGuard } from '../auth/guards';
import { PERMISSIONS } from '../auth/permissions';
import { hasPermission, isSuperAdmin, writeAudit } from '../common/audit';
import { PaginationQueryDto, paginated, resolvePaging } from '../common/pagination';
import type { AuthUser } from '../common/types';
import { PrismaService } from '../prisma/prisma.service';

/** Roles that confer administrative power; only Super Admin may grant/revoke/modify them. */
export const PRIVILEGED_ROLES: RoleName[] = ['SUPER_ADMIN', 'ADMIN'];

const toBool = ({ value }: { value: unknown }): unknown =>
  value === 'true' || value === '1' || value === true
    ? true
    : value === 'false' || value === '0' || value === false
      ? false
      : value;

export class AdminUserListQueryDto extends PaginationQueryDto {
  @IsOptional() @Transform(toBool) @IsBoolean()
  isActive?: boolean;

  @IsOptional() @IsEnum(RoleName)
  role?: RoleName;
}

export class SetUserRolesDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(9) @IsEnum(RoleName, { each: true })
  roles!: RoleName[];
}

const userSelect = {
  id: true,
  email: true,
  username: true,
  firstName: true,
  lastName: true,
  isActive: true,
  createdAt: true,
  roles: { select: { role: { select: { name: true } } } },
} satisfies Prisma.UserSelect;

type UserRow = Prisma.UserGetPayload<{ select: typeof userSelect }>;

function toAdminUser(u: UserRow) {
  const { roles, ...rest } = u;
  return { ...rest, roles: roles.map((r) => r.role.name).sort() };
}

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AdminUserListQueryDto) {
    const { page, limit, skip, take } = resolvePaging(query, 20);
    const term = query.q?.trim();
    const where: Prisma.UserWhereInput = {
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.role ? { roles: { some: { role: { name: query.role } } } } : {}),
      ...(term
        ? {
            OR: [
              { email: { contains: term, mode: 'insensitive' } },
              { username: { contains: term, mode: 'insensitive' } },
              { firstName: { contains: term, mode: 'insensitive' } },
              { lastName: { contains: term, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: userSelect,
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take,
      }),
      this.prisma.user.count({ where }),
    ]);
    return paginated(rows.map(toAdminUser), total, page, limit);
  }

  async get(id: string) {
    return toAdminUser(await this.find(id));
  }

  async setActive(id: string, isActive: boolean, actor: AuthUser) {
    if (id === actor.id) throw new ForbiddenException('You cannot change your own active status');
    const target = await this.find(id);
    const targetRoles = target.roles.map((r) => r.role.name);
    this.requireAdminAuthority(actor, targetRoles);
    if (!isActive && targetRoles.includes('SUPER_ADMIN')) {
      await this.assertNotLastSuperAdmin(id);
    }
    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive },
      select: userSelect,
    });
    if (!isActive) {
      // Kill all sessions immediately (access tokens are re-validated per request).
      await this.prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    await writeAudit(this.prisma, {
      actor,
      modelLabel: 'User',
      eventType: isActive ? 'user.activated' : 'user.deactivated',
      objectId: id,
      objectRepr: target.email,
    });
    return toAdminUser(updated);
  }

  /** Replaces a user's complete role set. */
  async setRoles(id: string, requested: RoleName[], actor: AuthUser) {
    if (id === actor.id) {
      throw new ForbiddenException('You cannot change your own roles');
    }
    const roles = [...new Set(requested)];
    if (roles.length === 0) throw new BadRequestException('At least one role is required');

    const target = await this.find(id);
    const current = target.roles.map((r) => r.role.name);

    // Granting SUPER_ADMIN is limited to existing Super Admins, regardless of permission keys.
    if (roles.includes('SUPER_ADMIN') && !current.includes('SUPER_ADMIN') && !isSuperAdmin(actor)) {
      throw new ForbiddenException('Only a Super Admin can grant the SUPER_ADMIN role');
    }
    this.requireAdminAuthority(actor, [
      ...current,
      ...roles.filter((r) => !current.includes(r)),
    ]);

    if (current.includes('SUPER_ADMIN') && !roles.includes('SUPER_ADMIN')) {
      await this.assertNotLastSuperAdmin(id);
    }

    const roleRows = await this.prisma.role.findMany({ where: { name: { in: roles } } });
    if (roleRows.length !== roles.length) {
      throw new BadRequestException('One or more roles are not provisioned; run the seed');
    }

    await this.prisma.$transaction([
      this.prisma.userRole.deleteMany({ where: { userId: id } }),
      this.prisma.userRole.createMany({
        data: roleRows.map((r) => ({ userId: id, roleId: r.id })),
      }),
    ]);

    await writeAudit(this.prisma, {
      actor,
      modelLabel: 'User',
      eventType: 'user.roles_changed',
      objectId: id,
      objectRepr: target.email,
      details: { from: [...current].sort(), to: [...roles].sort() },
    });
    return this.get(id);
  }

  /** Anything touching ADMIN / SUPER_ADMIN requires `users.manage_admins` (Super Admin only). */
  private requireAdminAuthority(actor: AuthUser, involvedRoles: RoleName[]): void {
    const touchesPrivileged = involvedRoles.some((r) => PRIVILEGED_ROLES.includes(r));
    if (touchesPrivileged && !hasPermission(actor, PERMISSIONS.USERS_MANAGE_ADMINS)) {
      throw new ForbiddenException('Managing administrator accounts requires Super Admin');
    }
  }

  private async assertNotLastSuperAdmin(excludingId: string): Promise<void> {
    const others = await this.prisma.user.count({
      where: {
        id: { not: excludingId },
        isActive: true,
        roles: { some: { role: { name: 'SUPER_ADMIN' } } },
      },
    });
    if (others === 0) throw new ConflictException('Cannot remove the last active Super Admin');
  }

  private async find(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: userSelect });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly users: AdminUsersService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.USERS_MANAGE)
  list(@Query() query: AdminUserListQueryDto) {
    return this.users.list(query);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.USERS_MANAGE)
  get(@Param('id') id: string) {
    return this.users.get(id);
  }

  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.USERS_MANAGE)
  activate(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.users.setActive(id, true, user);
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.USERS_MANAGE)
  deactivate(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.users.setActive(id, false, user);
  }

  /** Replaces the full role set. ADMIN / SUPER_ADMIN changes require Super Admin. */
  @Put(':id/roles')
  @RequirePermissions(PERMISSIONS.USERS_MANAGE)
  setRoles(@Param('id') id: string, @Body() dto: SetUserRolesDto, @CurrentUser() user: AuthUser) {
    return this.users.setRoles(id, dto.roles, user);
  }
}
