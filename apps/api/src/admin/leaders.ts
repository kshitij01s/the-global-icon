import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, PartialType } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { CurrentUser, RequirePermissions } from '../auth/decorators';
import { JwtAuthGuard, PermissionsGuard } from '../auth/guards';
import { PERMISSIONS } from '../auth/permissions';
import { writeAudit } from '../common/audit';
import { PaginationQueryDto, paginated, resolvePaging } from '../common/pagination';
import { uniqueSlug } from '../common/slug';
import type { AuthUser } from '../common/types';
import { publicMediaUrl } from '../common/urls';
import { PrismaService } from '../prisma/prisma.service';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export const LEADER_PORTRAIT_KEY_PATTERN =
  /^leaders\/(?!.*\.\.)[\w\-. /]+\.(?:png|jpe?g|webp)$/i;

export class CreateLeaderDto {
  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(160)
  name!: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(160)
  designation?: string | null;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(160)
  organization?: string | null;

  @IsOptional() @IsString() @MaxLength(5000)
  introduction?: string | null;

  @IsOptional() @IsString() @Matches(LEADER_PORTRAIT_KEY_PATTERN, { message: 'portrait must be a storage key under leaders/' })
  portrait?: string | null;

  @IsOptional() @IsString()
  categoryId?: string | null;

  @IsOptional() @IsString()
  articleId?: string | null;

  @IsOptional() @IsString()
  magazineId?: string | null;

  /** ISO date, e.g. 2026-10-01 */
  @IsDateString({ strict: false })
  publicationDate!: string;

  @IsOptional() @IsBoolean()
  isPublished?: boolean;

  @IsOptional() @IsBoolean()
  isFeatured?: boolean;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(100_000)
  displayOrder?: number;
}

export class UpdateLeaderDto extends PartialType(CreateLeaderDto) {}

const leaderInclude = {
  category: { select: { id: true, name: true, slug: true } },
  article: { select: { id: true, slug: true, title: true, status: true } },
  magazine: { select: { id: true, slug: true, title: true, isPublished: true } },
} satisfies Prisma.LeaderInclude;

type LeaderRow = Prisma.LeaderGetPayload<{ include: typeof leaderInclude }>;

function toAdminLeader(l: LeaderRow) {
  const { portrait, publicationDate, ...rest } = l;
  return {
    ...rest,
    publicationDate: publicationDate.toISOString().slice(0, 10),
    portraitKey: portrait,
    portraitUrl: publicMediaUrl(portrait),
  };
}

@Injectable()
export class AdminLeadersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: PaginationQueryDto) {
    const { page, limit, skip, take } = resolvePaging(query, 20);
    const term = query.q?.trim();
    const where: Prisma.LeaderWhereInput = term
      ? {
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { organization: { contains: term, mode: 'insensitive' } },
          ],
        }
      : {};
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.leader.findMany({
        where,
        include: leaderInclude,
        orderBy: [{ displayOrder: 'asc' }, { publicationDate: 'desc' }],
        skip,
        take,
      }),
      this.prisma.leader.count({ where }),
    ]);
    return paginated(rows.map(toAdminLeader), total, page, limit);
  }

  async get(id: string) {
    return toAdminLeader(await this.find(id));
  }

  async create(dto: CreateLeaderDto, actor: AuthUser) {
    await this.assertRefs(dto);
    const slug = await uniqueSlug(dto.name, async (candidate) =>
      Boolean(await this.prisma.leader.findUnique({ where: { slug: candidate }, select: { id: true } })),
    );
    const { publicationDate, ...rest } = dto;
    const created = await this.prisma.leader.create({
      data: { ...rest, slug, publicationDate: new Date(publicationDate) },
      include: leaderInclude,
    });
    await writeAudit(this.prisma, {
      actor,
      modelLabel: 'Leader',
      eventType: 'leader.created',
      objectId: created.id,
      objectRepr: created.name,
    });
    return toAdminLeader(created);
  }

  async update(id: string, dto: UpdateLeaderDto, actor: AuthUser) {
    await this.find(id);
    await this.assertRefs(dto);
    const { publicationDate, ...rest } = dto;
    const updated = await this.prisma.leader.update({
      where: { id },
      data: { ...rest, ...(publicationDate ? { publicationDate: new Date(publicationDate) } : {}) },
      include: leaderInclude,
    });
    await writeAudit(this.prisma, {
      actor,
      modelLabel: 'Leader',
      eventType: 'leader.updated',
      objectId: id,
      objectRepr: updated.name,
      details: { fields: Object.keys(dto) },
    });
    return toAdminLeader(updated);
  }

  async remove(id: string, actor: AuthUser) {
    const leader = await this.find(id);
    await this.prisma.leader.delete({ where: { id } });
    await writeAudit(this.prisma, {
      actor,
      modelLabel: 'Leader',
      eventType: 'leader.deleted',
      objectId: id,
      objectRepr: leader.name,
    });
    return { deleted: true };
  }

  private async find(id: string) {
    const leader = await this.prisma.leader.findUnique({ where: { id }, include: leaderInclude });
    if (!leader) throw new NotFoundException('Leader not found');
    return leader;
  }

  private async assertRefs(dto: UpdateLeaderDto) {
    const checks: [string | null | undefined, string, () => Promise<unknown>][] = [
      [dto.categoryId, 'categoryId', () => this.prisma.category.findUnique({ where: { id: dto.categoryId! }, select: { id: true } })],
      [dto.articleId, 'articleId', () => this.prisma.article.findUnique({ where: { id: dto.articleId! }, select: { id: true } })],
      [dto.magazineId, 'magazineId', () => this.prisma.magazine.findUnique({ where: { id: dto.magazineId! }, select: { id: true } })],
    ];
    for (const [value, label, lookup] of checks) {
      if (value && !(await lookup())) throw new BadRequestException(`${label} does not exist`);
    }
  }
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/leaders')
export class AdminLeadersController {
  constructor(private readonly leaders: AdminLeadersService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.LEADERS_MANAGE)
  list(@Query() query: PaginationQueryDto) {
    return this.leaders.list(query);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.LEADERS_MANAGE)
  get(@Param('id') id: string) {
    return this.leaders.get(id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.LEADERS_MANAGE)
  create(@Body() dto: CreateLeaderDto, @CurrentUser() user: AuthUser) {
    return this.leaders.create(dto, user);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.LEADERS_MANAGE)
  update(@Param('id') id: string, @Body() dto: UpdateLeaderDto, @CurrentUser() user: AuthUser) {
    return this.leaders.update(id, dto, user);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.LEADERS_MANAGE)
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.leaders.remove(id, user);
  }
}
