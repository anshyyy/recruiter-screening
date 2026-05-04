import type { User } from '../entities/user.entity';

/** User fields safe to return to clients (no credential material). */
export type SafeUser = Pick<
  User,
  | 'id'
  | 'email'
  | 'fullName'
  | 'role'
  | 'skills'
  | 'resumeObjectKey'
  | 'resumeFileName'
  | 'createdAt'
  | 'updatedAt'
>;
