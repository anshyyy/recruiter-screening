import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
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
import { PresignGetDto } from './dto/presign-get.dto';
import { PresignPutDto } from './dto/presign-put.dto';
import type { PresignGetResult, PresignPutResult } from './upload.service';
import { UploadService } from './upload.service';

/**
 * All routes require a valid JWT. Clients upload/download directly to S3 using presigned URLs.
 */
@ApiTags('uploads')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('uploads')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('presign-put')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Presigned PUT — upload bytes directly to S3' })
  @ApiOkResponse({ description: 'Time-limited PUT URL and object key' })
  @ApiUnauthorizedResponse()
  async presignPut(
    @Req() req: Request & { user: SafeUser },
    @Body() dto: PresignPutDto,
  ): Promise<PresignPutResult> {
    return this.uploadService.createPresignedPut(req.user.id, dto);
  }

  @Post('presign-get')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Presigned GET — download an object you own' })
  @ApiOkResponse({ description: 'Time-limited GET URL' })
  @ApiUnauthorizedResponse()
  async presignGet(
    @Req() req: Request & { user: SafeUser },
    @Body() dto: PresignGetDto,
  ): Promise<PresignGetResult> {
    return this.uploadService.createPresignedGet(req.user.id, dto);
  }
}
