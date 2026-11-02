import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, RoleName } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID } from 'node:crypto';
import type { AuthUser } from '../common/types';
import { ttlToSeconds } from '../common/ttl';
import { PrismaService } from '../prisma/prisma.service';
import type { LoginDto, RegisterDto } from './dto';
import { ROLE_DESCRIPTIONS } from './permissions';

const BCRYPT_ROUNDS = 12;
const RESERVED_USERNAMES = new Set([
  'admin',
  'administrator',
  'root',
  'superadmin',
  'super_admin',
  'system',
  'support',
  'moderator',
]);

const userWithAccess = Prisma.validator<Prisma.UserDefaultArgs>()({
  include: {
    roles: {
      include: {
        role: { include: { permissions: { include: { permission: true } } } },
      },
    },
  },
});
type UserWithAccess = Prisma.UserGetPayload<typeof userWithAccess>;

export interface IssuedSession {
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
  refreshTokenMaxAgeMs: number;
  user: AuthUser;
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

@Injectable()
export class AuthService {
  /** Used to equalise timing when the account does not exist. */
  private readonly dummyHash = bcrypt.hashSync('timing-equaliser', BCRYPT_ROUNDS);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /** Public registration. Always and only creates a READER. */
  async register(dto: RegisterDto): Promise<IssuedSession> {
    const email = dto.email.toLowerCase();
    if (RESERVED_USERNAMES.has(dto.username.toLowerCase())) {
      throw new ConflictException('That username is not available');
    }

    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username: { equals: dto.username, mode: 'insensitive' } },
        ],
      },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Email or username is already registered');
    }

    const readerRole = await this.prisma.role.upsert({
      where: { name: RoleName.READER },
      create: {
        name: RoleName.READER,
        description: ROLE_DESCRIPTIONS.READER,
      },
      update: {},
    });

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    let created: UserWithAccess;
    try {
      created = await this.prisma.user.create({
        data: {
          email,
          username: dto.username,
          passwordHash,
          firstName: dto.firstName || null,
          lastName: dto.lastName || null,
          roles: { create: [{ roleId: readerRole.id }] },
        },
        ...userWithAccess,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email or username is already registered');
      }
      throw error;
    }

    return this.issueSession(this.toAuthUser(created));
  }

  async login(dto: LoginDto): Promise<IssuedSession> {
    const identifier = dto.identifier.trim();
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase() },
          { username: { equals: identifier, mode: 'insensitive' } },
        ],
      },
      ...userWithAccess,
    });

    const hash = user?.passwordHash ?? this.dummyHash;
    const valid = await bcrypt.compare(dto.password, hash);
    if (!user || !valid || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.issueSession(this.toAuthUser(user));
  }

  /** Rotates the refresh token. Reuse of a revoked token revokes the whole family. */
  async refresh(refreshToken: string | undefined): Promise<IssuedSession> {
    if (!refreshToken) throw new UnauthorizedException('Missing refresh token');

    let payload: { sub: string; jti: string };
    try {
      payload = await this.jwt.verifyAsync<{ sub: string; jti: string }>(
        refreshToken,
        { secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET') },
      );
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const stored = await this.prisma.refreshToken.findUnique({
      where: { id: payload.jti },
    });
    if (
      !stored ||
      stored.userId !== payload.sub ||
      stored.tokenHash !== sha256(refreshToken)
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (stored.revokedAt) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Refresh token reuse detected');
    }
    if (stored.expiresAt <= new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const authUser = await this.loadAuthUser(stored.userId);
    if (!authUser) throw new UnauthorizedException();

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    return this.issueSession(authUser);
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: sha256(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async loadAuthUser(userId: string): Promise<AuthUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      ...userWithAccess,
    });
    if (!user || !user.isActive) return null;
    return this.toAuthUser(user);
  }

  private toAuthUser(user: UserWithAccess): AuthUser {
    const permissions = new Set<string>();
    for (const userRole of user.roles) {
      for (const rp of userRole.role.permissions) {
        permissions.add(rp.permission.key);
      }
    }
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.roles.map((ur) => ur.role.name),
      permissions: [...permissions].sort(),
    };
  }

  private async issueSession(user: AuthUser): Promise<IssuedSession> {
    const accessTtl = ttlToSeconds(this.config.getOrThrow<string>('JWT_ACCESS_TTL'));
    const refreshTtl = ttlToSeconds(this.config.getOrThrow<string>('JWT_REFRESH_TTL'));

    const accessToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email },
      {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: accessTtl,
      },
    );

    const tokenId = randomUUID();
    const refreshToken = await this.jwt.signAsync(
      { sub: user.id, jti: tokenId },
      {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: refreshTtl,
      },
    );
    await this.prisma.refreshToken.create({
      data: {
        id: tokenId,
        userId: user.id,
        tokenHash: sha256(refreshToken),
        expiresAt: new Date(Date.now() + refreshTtl * 1000),
      },
    });

    return {
      accessToken,
      accessTokenExpiresIn: accessTtl,
      refreshToken,
      refreshTokenMaxAgeMs: refreshTtl * 1000,
      user,
    };
  }
}
