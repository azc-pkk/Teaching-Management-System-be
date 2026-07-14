import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { ApiErrorResponse } from '../dto/api-response.dto';

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
    const body: ApiErrorResponse = {
      success: false,
      data: null,
      error: {
        code: this.getErrorCode(status, exception),
        message: this.getErrorMessage(exception),
        ...this.getErrorDetails(exception),
      },
    };

    console.error(
      `[HTTP_ERROR] ${request.method} ${request.originalUrl} ${status}`,
      exception,
    );
    response.status(status).json(body);
  }

  private getErrorCode(status: number, exception: unknown) {
    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();

      if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null &&
        'code' in exceptionResponse &&
        typeof exceptionResponse.code === 'string'
      ) {
        return exceptionResponse.code;
      }
    }

    const codes: Partial<Record<number, string>> = {
      [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
      [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
      [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
      [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
      [HttpStatus.METHOD_NOT_ALLOWED]: 'METHOD_NOT_ALLOWED',
      [HttpStatus.CONFLICT]: 'CONFLICT',
      [HttpStatus.UNPROCESSABLE_ENTITY]: 'UNPROCESSABLE_ENTITY',
      [HttpStatus.TOO_MANY_REQUESTS]: 'TOO_MANY_REQUESTS',
      [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_SERVER_ERROR',
    };

    return codes[status] ?? `HTTP_${status}`;
  }

  private getErrorMessage(exception: unknown) {
    if (!(exception instanceof HttpException)) {
      return '服务器内部错误';
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
      const message = (exceptionResponse as { message: string | string[] })
        .message;

      return Array.isArray(message) ? '请求参数校验失败' : message;
    }

    return exception.message;
  }

  private getErrorDetails(exception: unknown): { details?: string[] } {
    if (!(exception instanceof HttpException)) {
      return {};
    }

    const exceptionResponse = exception.getResponse();

    if (typeof exceptionResponse !== 'object' || exceptionResponse === null) {
      return {};
    }

    if ('details' in exceptionResponse) {
      const details = this.normalizeDetails(exceptionResponse.details);

      return details ? { details } : {};
    }

    if (
      'message' in exceptionResponse &&
      Array.isArray(exceptionResponse.message)
    ) {
      return { details: this.normalizeDetails(exceptionResponse.message) ?? [] };
    }

    return {};
  }

  private normalizeDetails(details: unknown): string[] | undefined {
    if (details === null || details === undefined) {
      return undefined;
    }

    if (Array.isArray(details)) {
      return details.map((detail) => String(detail));
    }

    return [String(details)];
  }
}
