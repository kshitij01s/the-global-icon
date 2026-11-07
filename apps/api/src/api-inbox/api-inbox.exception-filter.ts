import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiInboxService } from './api-inbox.service';

/**
 * Reports unexpected unhandled errors to API Inbox once.
 * Intentional HttpExceptions (validation, 401/403/404, ServiceUnavailable from
 * integration catch blocks) are not re-reported here.
 */
@Injectable()
@Catch()
export class ApiInboxExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiInboxExceptionFilter.name);

  constructor(private readonly inbox: ApiInboxService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request & { user?: { id?: string }; apiInboxReported?: boolean }>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const already =
      req.apiInboxReported ||
      (exception !== null &&
        typeof exception === 'object' &&
        (exception as { __apiInboxReported?: boolean }).__apiInboxReported === true);

    const unexpected =
      !(exception instanceof HttpException) || status === HttpStatus.INTERNAL_SERVER_ERROR;

    if (unexpected && status >= 500 && !already) {
      req.apiInboxReported = true;
      const message =
        exception instanceof Error ? exception.message : 'Unexpected server error';
      void this.inbox.reportSafe({
        category: 'system',
        source: `${req.method} ${req.path}`,
        technicalError: exception instanceof Error ? exception : message,
        userId: req.user?.id,
        metadata: { statusCode: status },
      });
    }

    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      res.status(status).json(typeof body === 'string' ? { statusCode: status, message: body } : body);
      return;
    }

    this.logger.error(exception);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'We are unable to process your request right now. Please try again shortly.',
    });
  }
}
