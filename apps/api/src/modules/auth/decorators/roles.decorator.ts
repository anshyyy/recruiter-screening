import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/** Restrict a route to users whose `role` matches one of the given values (after JWT auth). */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
