import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    response.status(status).json({
      success: false,
      error: {
        code: this.getErrorCode(status),
        message: this.getErrorMessage(exception),
      },
      path: request.originalUrl,
      timestamp: new Date().toISOString(),
    });
  }

  private getErrorCode(status: number) {
    if (status === HttpStatus.BAD_REQUEST) {
      return 'BAD_REQUEST';
    }

    if (status === HttpStatus.UNAUTHORIZED) {
      return 'UNAUTHORIZED';
    }

    if (status === HttpStatus.NOT_FOUND) {
      return 'NOT_FOUND';
    }

    return 'INTERNAL_SERVER_ERROR';
  }

  private getErrorMessage(exception: unknown) {
    if (!(exception instanceof HttpException)) {
      return '服务器异常';
    }

    const exceptionResponse = exception.getResponse();

    if (typeof exceptionResponse === 'string') {
      return exceptionResponse;
    }

    if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null &&
      'message' in exceptionResponse
    ) {
      const message = (exceptionResponse as { message: string | string[] }).message;

      return Array.isArray(message) ? message.join('; ') : message;
    }

    return exception.message;
  }
}
