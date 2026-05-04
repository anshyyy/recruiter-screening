import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import type { SafeUser } from '../users/types/safe-user.type';
import { AuthService, type AuthTokensResponse } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiCreatedResponse({ description: 'Account created; returns JWT and profile' })
  @ApiConflictResponse({ description: 'Email already in use' })
  async register(@Body() dto: RegisterDto): Promise<AuthTokensResponse> {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('local'))
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ description: 'Returns JWT and profile' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  async login(@Req() req: Request & { user: SafeUser }): Promise<AuthTokensResponse> {
    const body = req.body as { role?: string };
    const expected = body.role;
    if (expected === 'user' || expected === 'admin') {
      const actual = req.user.role ?? 'user';
      if (actual !== expected) {
        throw new ForbiddenException('Selected role does not match this account');
      }
    }
    return this.authService.login(req.user);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Logout (invalidate current JWT and all others for this user)' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  async logout(@Req() req: Request & { user: SafeUser }): Promise<void> {
    await this.authService.logout(req.user.id);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Current user (JWT)' })
  @ApiOkResponse({ description: 'User from access token' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  getMe(@Req() req: Request & { user: SafeUser }): SafeUser {
    return req.user;
  }

  @Patch('me/profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update candidate profile (skills, résumé metadata)' })
  @ApiOkResponse({ description: 'Updated safe user' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  async patchMyProfile(
    @Req() req: Request & { user: SafeUser },
    @Body() dto: UpdateProfileDto,
  ): Promise<SafeUser> {
    return this.authService.updateMyProfile(req.user.id, {
      skills: dto.skills,
      resumeObjectKey: dto.resumeObjectKey,
      resumeFileName: dto.resumeFileName,
    });
  }
}
