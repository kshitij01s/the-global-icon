import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ThemesService } from './themes.service';

@ApiTags('themes')
@Controller('themes')
export class ThemesController {
  constructor(private readonly themes: ThemesService) {}

  /** Public: resolved active theme (server clock; optional region). */
  @Get('active')
  active(
    @Query('country') countryCode?: string,
    @Query('region') regionCode?: string,
  ) {
    return this.themes.resolveActive(new Date(), {
      countryCode: countryCode?.toUpperCase(),
      regionCode: regionCode?.toUpperCase(),
    });
  }

  @Get()
  list() {
    return this.themes.listLibrary();
  }
}
