import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Validates `Authorization: Bearer <jwt>` using `JwtStrategy`. */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
