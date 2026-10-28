import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '../../../generated/prisma/client';

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  message: string;
  errors?: string[];
  timestamp: string;
  path: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const { statusCode, message, errors } = this.normalize(exception, req);

    if (statusCode >= 500) {
      this.logger.error(
        `${req.method} ${req.originalUrl} -> ${statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ApiErrorResponse = {
      success: false,
      statusCode,
      message,
      ...(errors && { errors }),
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
    };
    res.status(statusCode).json(body);
  }

  private normalize(
    exception: unknown,
    req: Request,
  ): { statusCode: number; message: string; errors?: string[] } {
    // 1) أخطاء Nest (BadRequest, Unauthorized, Throttler 429, ValidationPipe ...)
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const response = exception.getResponse();

      if (typeof response === 'string')
        return { statusCode, message: response };

      const raw = (response as { message?: string | string[]; error?: string })
        .message;
      if (Array.isArray(raw)) {
        // أخطاء الـ ValidationPipe
        return { statusCode, message: 'Validation failed', errors: raw };
      }

      // route مش موجود: Nest بيرجّع "Cannot GET /xyz"، فنخليها رسالة أوضح
      if (
        statusCode === HttpStatus.NOT_FOUND &&
        typeof raw === 'string' &&
        raw.startsWith('Cannot ')
      ) {
        return {
          statusCode,
          message: `Endpoint not found: ${req.method} ${req.path}`,
        };
      }

      return {
        statusCode,
        message: raw ?? (response as any).error ?? exception.message,
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002': {
          const t = exception.meta?.target;
          const fields = Array.isArray(t)
            ? t.join(', ')
            : typeof t === 'string'
              ? t
              : undefined;
          return {
            statusCode: HttpStatus.CONFLICT,
            message: fields ? `${fields} already exists` : 'Duplicate value',
          };
        }
        case 'P2025':
          return {
            statusCode: HttpStatus.NOT_FOUND,
            message: 'Record not found',
          };
        case 'P2003':
          return {
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'Invalid reference',
          };
      }
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return { statusCode: HttpStatus.BAD_REQUEST, message: 'Invalid data' };
    }

    // 3) أي حاجة تانية
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    };
  }
}
