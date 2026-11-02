import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { LeaderListQueryDto, LeadersService } from './leaders.service';

@ApiTags('leaders')
@Controller('leaders')
export class LeadersController {
  constructor(private readonly leaders: LeadersService) {}

  @Get()
  list(@Query() query: LeaderListQueryDto) {
    return this.leaders.list(query);
  }

  @Get(':slug')
  detail(@Param('slug') slug: string) {
    return this.leaders.detail(slug);
  }
}
