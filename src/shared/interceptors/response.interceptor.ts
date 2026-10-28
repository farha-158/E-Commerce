import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  HttpStatus,
} from '@nestjs/common';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

interface ControllerResponse {
  message?: string;
  data?: unknown;
  meta?: unknown;
}

interface UnifiedResponse {
  success: boolean;
  status: number;
  message: string | null;
  data: unknown;
  meta: unknown;
}

@Injectable()
export class ResponseInterceptor implements NestInterceptor<
  ControllerResponse,
  UnifiedResponse
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<ControllerResponse>,
  ): Observable<UnifiedResponse> {
    const response = context
      .switchToHttp()
      .getResponse<{ statusCode: number; headersSent: boolean }>();

    return next.handle().pipe(
      map((data): UnifiedResponse => {
        if (!data || response.headersSent)
          return data as unknown as UnifiedResponse;

        return {
          success: true,
          status: response.statusCode ?? HttpStatus.OK,
          message: data.message ?? null,
          data: data.data ?? null,
          meta: data.meta ?? null,
        };
      }),
    );
  }
}
