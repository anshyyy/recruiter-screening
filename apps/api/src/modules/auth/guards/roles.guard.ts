import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { SafeUser } from '../../users/types/safe-user.type';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Authorizes requests where `req.user.role` is listed on the handler via `@Roles(...)`.
 * Must run after `JwtAuthGuard` so `req.user` is populated.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) {
      return true;
    }
    const req = context.switchToHttp().getRequest<{ user?: SafeUser }>();
    const user = req.user;
    const role = user?.role ?? 'user';
    if (!required.includes(role)) {
      throw new ForbiddenException('Administrator access required');
    }
    return true;
  }
}
