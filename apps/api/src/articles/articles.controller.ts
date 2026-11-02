import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { OptionalUser } from '../auth/decorators';
import { OptionalJwtAuthGuard } from '../auth/guards';
import type { AuthUser } from '../common/types';
import { ArticleListQueryDto, ArticlesService } from './articles.service';

@ApiTags('articles')
@Controller('articles')
export class ArticlesController {
  constructor(private readonly articles: ArticlesService) {}

  @Get()
  list(@Query() query: ArticleListQueryDto) {
    return this.articles.list(query);
  }

  @Get(':slug')
  @UseGuards(OptionalJwtAuthGuard)
  detail(@Param('slug') slug: string, @OptionalUser() user: AuthUser | null) {
    return this.articles.detail(slug, user);
  }
}
