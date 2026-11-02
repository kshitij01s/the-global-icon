import { Module } from '@nestjs/common';
import { LeadersController } from './leaders.controller';
import { LeadersService } from './leaders.service';

@Module({
  controllers: [LeadersController],
  providers: [LeadersService],
  exports: [LeadersService],
})
export class LeadersModule {}
