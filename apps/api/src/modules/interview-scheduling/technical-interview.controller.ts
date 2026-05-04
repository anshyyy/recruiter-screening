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
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import type { SafeUser } from '../users/types/safe-user.type';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ConfirmTechnicalInterviewDto,
  ConfirmTechnicalInterviewResponseDto,
  TechnicalInterviewStateDto,
} from './dto/technical-interview.dto';
import { TechnicalInterviewSchedulingService } from './technical-interview-scheduling.service';

@ApiTags('technical-interviews')
@Controller('technical-interviews')
export class TechnicalInterviewController {
  constructor(private readonly scheduling: TechnicalInterviewSchedulingService) {}

  @Get('applications/:applicationId/state')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary:
      'Eligibility (screening score vs threshold), recruiter-configured slots, and existing booking',
  })
  @ApiOkResponse({ type: TechnicalInterviewStateDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  async getStateForApplication(
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Req() req: Request & { user: SafeUser },
  ): Promise<TechnicalInterviewStateDto> {
    return this.scheduling.getStateForCandidate(req.user.id, applicationId);
  }

  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary:
      'Confirm account email, one offered UTC slot, and IANA timezone after passing screening',
  })
  @ApiOkResponse({ type: ConfirmTechnicalInterviewResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  async confirm(
    @Body() dto: ConfirmTechnicalInterviewDto,
    @Req() req: Request & { user: SafeUser },
  ): Promise<ConfirmTechnicalInterviewResponseDto> {
    return this.scheduling.confirmForCandidate(req.user.id, req.user.email, dto);
  }
}
