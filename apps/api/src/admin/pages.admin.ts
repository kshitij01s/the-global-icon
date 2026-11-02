import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import type { Prisma } from '@prisma/client';
import { CurrentUser, RequirePermissions } from '../auth/decorators';
import { JwtAuthGuard, PermissionsGuard } from '../auth/guards';
import { PERMISSIONS } from '../auth/permissions';
import { writeAudit } from '../common/audit';
import type { AuthUser } from '../common/types';
import { PrismaService } from '../prisma/prisma.service';

class PageUpdateDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsObject()
  content?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  pageThemeSlug?: string | null;
}

const DEFAULT_PAGES: {
  slug: string;
  title: string;
  description: string;
  content: Record<string, unknown>;
}[] = [
  {
    slug: 'home',
    title: 'Homepage',
    description: 'Hero and editorial homepage content.',
    content: {
      heroEyebrow: 'An international editorial house',
      heroTitle: 'THE GLOBAL ICON',
      heroTagline: 'Stories That Shape Tomorrow.',
      turnPagesHeadline: 'Turn the pages of the moment',
      turnPagesCopy:
        'Discover global stories, influential people, ideas, and publications shaping international business, leadership, and culture.',
      ctaMagazines: 'Explore Magazines',
      ctaStories: 'Discover Stories',
      sectionsVisible: { featured: true, latest: true, stories: true, leaders: true },
    },
  },
  {
    slug: 'about',
    title: 'About Us',
    description: 'Brand story and mission.',
    content: {
      eyebrow: 'About',
      headline: 'Stories That Shape Tomorrow.',
      body: 'THE GLOBAL ICON is an international digital magazine platform covering leadership, innovation, and culture.',
    },
  },
  {
    slug: 'advertise',
    title: 'Advertise',
    description: 'Advertising and partnerships page.',
    content: {
      eyebrow: 'Advertising & partnerships',
      headline: 'Advertise with THE GLOBAL ICON',
      body: 'Partner with an international digital magazine. Exact metrics are shared privately during proposals.',
    },
  },
  {
    slug: 'contact',
    title: 'Contact',
    description: 'Contact and enquiry introduction.',
    content: {
      eyebrow: 'Contact',
      headline: 'Start a conversation.',
      body: 'Editorial, advertising, and partnership enquiries are welcome.',
    },
  },
];

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/pages')
export class AdminPagesController {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureDefaults() {
    for (const p of DEFAULT_PAGES) {
      await this.prisma.managedPage.upsert({
        where: { slug: p.slug },
        create: {
          slug: p.slug,
          title: p.title,
          description: p.description,
          content: p.content as Prisma.InputJsonValue,
          status: 'PUBLISHED',
          publishedAt: new Date(),
        },
        update: {},
      });
    }
  }

  @Get()
  @RequirePermissions(PERMISSIONS.PAGES_VIEW)
  async list() {
    await this.ensureDefaults();
    return this.prisma.managedPage.findMany({ orderBy: { slug: 'asc' } });
  }

  @Get(':slug')
  @RequirePermissions(PERMISSIONS.PAGES_VIEW)
  async get(@Param('slug') slug: string) {
    await this.ensureDefaults();
    const page = await this.prisma.managedPage.findUnique({
      where: { slug },
      include: { versions: { orderBy: { createdAt: 'desc' }, take: 10 } },
    });
    if (!page) throw new NotFoundException('Page not found');
    return page;
  }

  @Patch(':slug')
  @RequirePermissions(PERMISSIONS.PAGES_EDIT)
  async saveDraft(@CurrentUser() user: AuthUser, @Param('slug') slug: string, @Body() body: PageUpdateDto) {
    await this.ensureDefaults();
    const existing = await this.prisma.managedPage.findUnique({ where: { slug } });
    if (!existing) throw new NotFoundException('Page not found');

    await this.prisma.managedPageVersion.create({
      data: {
        pageId: existing.id,
        title: existing.title,
        description: existing.description,
        content: existing.content as Prisma.InputJsonValue,
        pageThemeSlug: existing.pageThemeSlug,
        note: 'auto-snapshot before draft save',
        createdById: user.id,
      },
    });

    const updated = await this.prisma.managedPage.update({
      where: { slug },
      data: {
        title: body.title ?? existing.title,
        description: body.description ?? existing.description,
        content: (body.content ?? existing.content) as Prisma.InputJsonValue,
        pageThemeSlug:
          body.pageThemeSlug === undefined ? existing.pageThemeSlug : body.pageThemeSlug,
        status: 'DRAFT',
        updatedById: user.id,
      },
    });

    await writeAudit(this.prisma, {
      actor: user,
      modelLabel: 'ManagedPage',
      eventType: 'page.draft_save',
      objectId: updated.id,
      objectRepr: slug,
    });
    return updated;
  }

  @Post(':slug/publish')
  @RequirePermissions(PERMISSIONS.PAGES_PUBLISH)
  async publish(@CurrentUser() user: AuthUser, @Param('slug') slug: string) {
    const existing = await this.prisma.managedPage.findUnique({ where: { slug } });
    if (!existing) throw new NotFoundException('Page not found');
    const updated = await this.prisma.managedPage.update({
      where: { slug },
      data: { status: 'PUBLISHED', publishedAt: new Date(), updatedById: user.id },
    });
    await writeAudit(this.prisma, {
      actor: user,
      modelLabel: 'ManagedPage',
      eventType: 'page.publish',
      objectId: updated.id,
      objectRepr: slug,
    });
    return updated;
  }

  @Post(':slug/restore/:versionId')
  @RequirePermissions(PERMISSIONS.PAGES_EDIT)
  async restore(
    @CurrentUser() user: AuthUser,
    @Param('slug') slug: string,
    @Param('versionId') versionId: string,
  ) {
    const page = await this.prisma.managedPage.findUnique({ where: { slug } });
    if (!page) throw new NotFoundException('Page not found');
    const version = await this.prisma.managedPageVersion.findFirst({
      where: { id: versionId, pageId: page.id },
    });
    if (!version) throw new BadRequestException('Version not found for this page');
    return this.prisma.managedPage.update({
      where: { slug },
      data: {
        title: version.title,
        description: version.description,
        content: version.content as Prisma.InputJsonValue,
        pageThemeSlug: version.pageThemeSlug,
        status: 'DRAFT',
        updatedById: user.id,
      },
    });
  }
}

/** Public published page content. */
@Controller('pages')
export class PublicPagesController {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureDefaults() {
    for (const p of DEFAULT_PAGES) {
      await this.prisma.managedPage.upsert({
        where: { slug: p.slug },
        create: {
          slug: p.slug,
          title: p.title,
          description: p.description,
          content: p.content as Prisma.InputJsonValue,
          status: 'PUBLISHED',
          publishedAt: new Date(),
        },
        update: {},
      });
    }
  }

  @Get(':slug')
  async get(@Param('slug') slug: string) {
    await this.ensureDefaults();
    const page = await this.prisma.managedPage.findFirst({
      where: { slug, status: 'PUBLISHED' },
    });
    if (!page) throw new NotFoundException('Page not found');
    return {
      slug: page.slug,
      title: page.title,
      description: page.description,
      content: page.content,
      pageThemeSlug: page.pageThemeSlug,
      publishedAt: page.publishedAt,
      updatedAt: page.updatedAt,
    };
  }
}
