import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

/**
 * Route handler parameter decorator that extracts the authenticated user
 * (or a specific field from it) from the incoming HTTP request.
 *
 * The user object is expected to be attached to the request by an auth guard
 * (e.g. `JwtAuthGuard`) that validates the JWT and populates `request.user`
 * with a {@link JwtPayload}.
 *
 * @example
 * // Inject the full user object
 * async getProfile(@CurrentUser() user: JwtPayload) { ... }
 *
 * @example
 * // Inject a single field from the user object
 * async getProfile(@CurrentUser('sub') userId: string) { ... }
 *
 * @param data - An optional key of {@link JwtPayload} to pluck from the user
 *               object. When omitted, the entire user object is returned.
 * @param context - The NestJS execution context used to access the HTTP request.
 * @returns The full {@link JwtPayload} when `data` is not provided, or the
 *          value of the specified field. Returns `undefined` if the user is
 *          not present on the request (e.g. on unprotected routes).
 */
export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const user = request.user;

    return data !== undefined ? user?.[data] : user;
  },
);
