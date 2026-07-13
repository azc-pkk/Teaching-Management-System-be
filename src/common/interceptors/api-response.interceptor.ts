import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import type { ApiSuccessResponse } from '../dto/api-response.dto';

@Injectable()
export class ApiResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiSuccessResponse<T | null>
> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiSuccessResponse<T | null>> {
    return next.handle().pipe(
      map((data) => ({
        success: true,
        data: data ?? null,
        error: null,
      })),
    );
  }
}
