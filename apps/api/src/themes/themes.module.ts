import { Module } from '@nestjs/common';
import { FestivalStudioService } from './festival-studio.service';
import { ThemesController } from './themes.controller';
import { ThemesService } from './themes.service';

@Module({
  controllers: [ThemesController],
  providers: [ThemesService, FestivalStudioService],
  exports: [ThemesService, FestivalStudioService],
})
export class ThemesModule {}
