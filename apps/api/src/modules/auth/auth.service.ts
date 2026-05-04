import { ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { handleServiceError } from '../../common/utils/service-error';
import type { SafeUser } from '../users/types/safe-user.type';
import { UsersService } from '../users/users.service';
import type { RegisterDto } from './dto/register.dto';
import type { JwtPayload } from './types/jwt-payload.type';

export type AuthTokensResponse = {
  accessToken: string;
  user: SafeUser;
};

@Injectable()
export class AuthService {
  private static readonly BCRYPT_ROUNDS = 10;

  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUserCredentials(email: string, password: string): Promise<SafeUser | null> {
    try {
      const user = await this.usersService.findByEmailWithPasswordHash(email);
      if (!user?.passwordHash) {
        return null;
      }
      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) {
        return null;
      }
      return this.usersService.toSafeUser(user);
    } catch (error: unknown) {
      handleServiceError(this.logger, 'AuthService.validateUserCredentials', error);
    }
  }

  async register(dto: RegisterDto): Promise<AuthTokensResponse> {
    try {
      const existing = await this.usersService.findByEmail(dto.email);
      if (existing) {
        throw new ConflictException('Email already registered');
      }
      const passwordHash = await bcrypt.hash(dto.password, AuthService.BCRYPT_ROUNDS);
      const role = dto.role ?? 'user';
      const user = await this.usersService.createUser({
        email: dto.email,
        passwordHash,
        fullName: dto.fullName ?? null,
        role,
      });
      this.logger.log(`register: new account userId=${user.id} role=${role}`);
      return await this.login(this.usersService.toSafeUser(user));
    } catch (error: unknown) {
      handleServiceError(this.logger, 'AuthService.register', error);
    }
  }

  async login(user: SafeUser): Promise<AuthTokensResponse> {
    try {
      const fresh = await this.usersService.findById(user.id);
      if (!fresh) {
        throw new UnauthorizedException();
      }
      const payload: JwtPayload = {
        sub: fresh.id,
        email: fresh.email,
        role: fresh.role,
        tv: fresh.tokenVersion,
      };
      const accessToken = await this.jwtService.signAsync(payload);
      this.logger.log(`login: access token issued userId=${fresh.id}`);
      return { accessToken, user: this.usersService.toSafeUser(fresh) };
    } catch (error: unknown) {
      handleServiceError(this.logger, 'AuthService.login', error);
    }
  }

  async updateMyProfile(
    userId: string,
    updates: {
      skills?: string[];
      resumeObjectKey?: string | null;
      resumeFileName?: string | null;
      phoneNumber?: string | null;
    },
  ): Promise<SafeUser> {
    try {
      const updated = await this.usersService.updateCandidateProfile(userId, updates);
      this.logger.log(`updateMyProfile: userId=${userId}`);
      return this.usersService.toSafeUser(updated);
    } catch (error: unknown) {
      handleServiceError(this.logger, 'AuthService.updateMyProfile', error);
    }
  }

  /** Revokes all access tokens for this user until they sign in again. */
  async logout(userId: string): Promise<void> {
    try {
      await this.usersService.incrementTokenVersion(userId);
      this.logger.log(`logout: token version bumped userId=${userId}`);
    } catch (error: unknown) {
      handleServiceError(this.logger, 'AuthService.logout', error);
    }
  }
}
