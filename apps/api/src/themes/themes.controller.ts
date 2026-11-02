import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ThemesService } from './themes.service';

@ApiTags('themes')
@Controller('themes')
export class ThemesController {
  constructor(private readonly themes: ThemesService) {}

  /** Public: resolved active theme for the whole site (server clock). */
  @Get('active')
  active() {
    return this.themes.resolveActive();
  }

  @Get()
  list() {
    return this.themes.listLibrary();
  }
}
