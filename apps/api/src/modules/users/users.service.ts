import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { handleServiceError } from '../../common/utils/service-error';
import { User } from './entities/user.entity';
import type { SafeUser } from './types/safe-user.type';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  toSafeUser(user: User): SafeUser {
    try {
      return {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        skills: Array.isArray(user.skills) ? [...user.skills] : ([] as string[]),
        resumeObjectKey: user.resumeObjectKey,
        resumeFileName: user.resumeFileName,
        phoneNumber: user.phoneNumber,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    } catch (error: unknown) {
      handleServiceError(this.logger, 'UsersService.toSafeUser', error);
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      return await this.usersRepo.findOne({ where: { email: email.toLowerCase() } });
    } catch (error: unknown) {
      handleServiceError(this.logger, 'UsersService.findByEmail', error);
    }
  }

  /** Loads the password hash for credential checks. */
  async findByEmailWithPasswordHash(email: string): Promise<User | null> {
    try {
      const normalized = email.toLowerCase();
      return await this.usersRepo
        .createQueryBuilder('user')
        .where('user.email = :email', { email: normalized })
        .addSelect('user.passwordHash')
        .getOne();
    } catch (error: unknown) {
      handleServiceError(this.logger, 'UsersService.findByEmailWithPasswordHash', error);
    }
  }

  async findById(id: string): Promise<User | null> {
    try {
      return await this.usersRepo.findOne({ where: { id } });
    } catch (error: unknown) {
      handleServiceError(this.logger, 'UsersService.findById', error);
    }
  }

  /** Atomically bumps the version so existing JWTs for this user stop validating. */
  async incrementTokenVersion(userId: string): Promise<void> {
    try {
      const result = await this.usersRepo.increment({ id: userId }, 'tokenVersion', 1);
      if (result.affected === 0) {
        this.logger.warn(`incrementTokenVersion: no user row for id=${userId}`);
      }
    } catch (error: unknown) {
      handleServiceError(this.logger, 'UsersService.incrementTokenVersion', error);
    }
  }

  async createUser(params: {
    email: string;
    passwordHash: string;
    fullName?: string | null;
    role: string;
  }): Promise<User> {
    try {
      const entity = this.usersRepo.create({
        email: params.email.toLowerCase(),
        passwordHash: params.passwordHash,
        fullName: params.fullName ?? null,
        role: params.role,
        skills: [],
        resumeObjectKey: null,
        resumeFileName: null,
        phoneNumber: null,
      });
      return await this.usersRepo.save(entity);
    } catch (error: unknown) {
      handleServiceError(this.logger, 'UsersService.createUser', error);
    }
  }

  /**
   * Normalizes skill strings: trim, drop empties, dedupe case-insensitively, cap count/length.
   */
  normalizeSkills(input: string[]): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of input) {
      const t = typeof raw === 'string' ? raw.trim() : '';
      if (t.length === 0 || t.length > 64) {
        continue;
      }
      const key = t.toLowerCase();
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      out.push(t);
      if (out.length >= 40) {
        break;
      }
    }
    return out;
  }

  async updateCandidateProfile(
    userId: string,
    updates: {
      skills?: string[];
      resumeObjectKey?: string | null;
      resumeFileName?: string | null;
      phoneNumber?: string | null;
    },
  ): Promise<User> {
    try {
      const user = await this.usersRepo.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException('User not found');
      }
      if (updates.skills !== undefined) {
        user.skills = this.normalizeSkills(updates.skills);
      }
      if (updates.resumeObjectKey !== undefined) {
        user.resumeObjectKey = updates.resumeObjectKey;
      }
      if (updates.resumeFileName !== undefined) {
        user.resumeFileName = updates.resumeFileName;
      }
      if (updates.phoneNumber !== undefined) {
        user.phoneNumber = normalizeE164OrNull(updates.phoneNumber);
      }
      if (user.resumeObjectKey && !user.resumeFileName) {
        throw new BadRequestException('resumeFileName is required when resumeObjectKey is set');
      }
      if (!user.resumeObjectKey && user.resumeFileName) {
        user.resumeFileName = null;
      }
      return await this.usersRepo.save(user);
    } catch (error: unknown) {
      handleServiceError(this.logger, 'UsersService.updateCandidateProfile', error);
    }
  }
}

/** Validates E.164 ("+" then 1–15 digits, first digit non-zero). Returns null for empty input. */
function normalizeE164OrNull(input: string | null | undefined): string | null {
  if (input === null || input === undefined) {
    return null;
  }
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (!/^\+[1-9]\d{1,14}$/.test(trimmed)) {
    throw new BadRequestException(
      'Phone number must be in E.164 format (e.g. +14155550100).',
    );
  }
  return trimmed;
}
