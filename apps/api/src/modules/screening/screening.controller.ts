import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import type { SafeUser } from '../users/types/safe-user.type';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ScreeningSessionView } from './dto/screening-session.dto';
import { StartScreeningDto } from './dto/start-screening.dto';
import { ScreeningService } from './screening.service';

@ApiTags('screening')
@Controller('screening')
export class ScreeningController {
  constructor(private readonly screeningService: ScreeningService) {}

  @Get('sessions/by-application/:applicationId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get (or lazily create) the screening session for one of my applications' })
  @ApiOkResponse({ type: ScreeningSessionView })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  async getByApplication(
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Req() req: Request & { user: SafeUser },
  ): Promise<ScreeningSessionView> {
    return this.screeningService.getOrCreateSessionForApplication(req.user.id, applicationId);
  }

  @Post('sessions')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Start (or retry) the AI screening call for one of my applications' })
  @ApiCreatedResponse({ type: ScreeningSessionView })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  async start(
    @Body() dto: StartScreeningDto,
    @Req() req: Request & { user: SafeUser },
  ): Promise<ScreeningSessionView> {
    return this.screeningService.startScreening(req.user.id, dto.applicationId);
  }

  /**
   * Public webhook for Bolna call events.
   * Bolna does not sign requests — restrict access at infra level by allow-listing
   * Bolna's source IP (13.203.39.153) on your firewall / reverse proxy.
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bolna webhook receiver. Not for browser callers.' })
  async webhook(@Body() payload: unknown): Promise<{ received: true }> {
    await this.screeningService.handleWebhook(payload);
    return { received: true };
  }
}
