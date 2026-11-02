import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, RequirePermissions } from '../auth/decorators';
import { JwtAuthGuard, PermissionsGuard } from '../auth/guards';
import { PERMISSIONS } from '../auth/permissions';
import type { AuthUser } from '../common/types';
import { AdminArticleListQueryDto, CreateArticleDto, UpdateArticleDto } from './articles.dto';
import { AdminArticlesService } from './articles.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/articles')
export class AdminArticlesController {
  constructor(private readonly articles: AdminArticlesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.ARTICLES_READ_ADMIN)
  list(@Query() query: AdminArticleListQueryDto) {
    return this.articles.list(query);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.ARTICLES_READ_ADMIN)
  get(@Param('id') id: string) {
    return this.articles.get(id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.ARTICLES_CREATE)
  create(@Body() dto: CreateArticleDto, @CurrentUser() user: AuthUser) {
    return this.articles.create(dto, user);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.ARTICLES_UPDATE)
  update(@Param('id') id: string, @Body() dto: UpdateArticleDto, @CurrentUser() user: AuthUser) {
    return this.articles.update(id, dto, user);
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.ARTICLES_PUBLISH)
  publish(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.articles.publish(id, user);
  }

  @Post(':id/unpublish')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.ARTICLES_PUBLISH)
  unpublish(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.articles.unpublish(id, user);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.ARTICLES_DELETE)
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.articles.remove(id, user);
  }
}
