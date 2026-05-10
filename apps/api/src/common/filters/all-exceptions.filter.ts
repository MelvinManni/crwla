import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: string | object = 'internal server error';
    let code: string | undefined;
    if (exception instanceof HttpException) {
      const r = exception.getResponse();
      if (typeof r === 'string') {
        message = r;
      } else {
        const obj = r as { message?: string; error?: string; code?: string };
        message = obj.message ?? obj.error ?? r;
        code = obj.code;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    if (status >= 500) {
      this.logger.error(
        `[${req.method} ${req.url}] ${status} ${String(message)}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    res.status(status).json({
      error: message,
      ...(code ? { code } : {}),
      statusCode: status,
      path: req.url,
    });
  }
}
