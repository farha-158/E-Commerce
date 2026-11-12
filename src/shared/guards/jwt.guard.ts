import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAccessGuard extends AuthGuard('jwt-access') {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any) {
    if (err || !user) {
      throw (
        err ||
        new UnauthorizedException('Access denied: invalid or missing token')
      );
    }
    return user;
  }
}

@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {}
