import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message = 'Internal server error';
    if (exception instanceof HttpException) {
      const payload = exception.getResponse() as
        | string
        | { message?: string | string[] };
      if (typeof payload === 'string') {
        message = payload;
      } else if (Array.isArray(payload?.message)) {
        message = payload.message.join(', ');
      } else if (typeof payload?.message === 'string') {
        message = payload.message;
      } else {
        message = exception.message;
      }
    }

    response.status(statusCode).json({
      success: false,
      message,
      statusCode,
    });
  }
}
