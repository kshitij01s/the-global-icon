import { Global, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ApiInboxController, ApiInboxDevController } from './api-inbox.controller';
import { ApiInboxExceptionFilter } from './api-inbox.exception-filter';
import { ApiInboxService } from './api-inbox.service';

@Global()
@Module({
  controllers: [ApiInboxController, ApiInboxDevController],
  providers: [
    ApiInboxService,
    { provide: APP_FILTER, useClass: ApiInboxExceptionFilter },
  ],
  exports: [ApiInboxService],
})
export class ApiInboxModule {}
