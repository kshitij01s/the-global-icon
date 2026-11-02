import { Module } from '@nestjs/common';
import { EditionsController, MagazinesController } from './magazines.controller';
import { MagazinesService } from './magazines.service';

@Module({
  controllers: [MagazinesController, EditionsController],
  providers: [MagazinesService],
  exports: [MagazinesService],
})
export class MagazinesModule {}
