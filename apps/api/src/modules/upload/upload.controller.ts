import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { memoryStorage } from 'multer';
import type { SafeUser } from '../users/types/safe-user.type';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReadUrlDto } from './dto';
import { ALLOWED_UPLOAD_CONTENT_TYPES, isAllowedUploadContentType, MAX_UPLOAD_BYTES } from './upload.constants';
import type { FileUploadResult, UploadReadUrlResult } from './upload.service';
import { UploadService } from './upload.service';

/**
 * Generic authenticated file upload to S3 (public-read objects). Profile PATCH is separate:
 * client sends `resumeObjectKey` / `resumeFileName` after upload when attaching a résumé.
 */
@ApiTags('uploads')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('uploads')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('file')
  @HttpCode(HttpStatus.OK)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: `Allowed types: ${ALLOWED_UPLOAD_CONTENT_TYPES.join(', ')}`,
        },
      },
    },
  })
  @ApiOperation({ summary: 'Upload a file — returns public fileUrl and objectKey for client-side follow-up (e.g. PATCH profile)' })
  @ApiOkResponse({ description: 'fileUrl and objectKey' })
  @ApiUnauthorizedResponse()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_UPLOAD_BYTES },
    }),
  )
  async uploadFile(
    @Req() req: Request & { user: SafeUser },
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<FileUploadResult> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('file is required');
    }
    if (!isAllowedUploadContentType(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported file type. Allowed: ${ALLOWED_UPLOAD_CONTENT_TYPES.join(', ')}`,
      );
    }
    return this.uploadService.uploadPublicFile(req.user.id, file.buffer, file.originalname, file.mimetype);
  }

  @Post('read-url')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Public HTTPS URL for a key that matches your profile resumeObjectKey' })
  @ApiOkResponse({ description: 'downloadUrl and objectKey' })
  @ApiUnauthorizedResponse()
  readUrl(@Req() req: Request & { user: SafeUser }, @Body() dto: ReadUrlDto): UploadReadUrlResult {
    return this.uploadService.getPublicDownloadUrl(req.user, dto);
  }

  @Post('delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete S3 object whose key matches your profile resumeObjectKey' })
  @ApiOkResponse({ description: 'Object removed (envelope data may be null)' })
  @ApiUnauthorizedResponse()
  async deleteObject(@Req() req: Request & { user: SafeUser }, @Body() dto: ReadUrlDto): Promise<void> {
    await this.uploadService.deleteOwnedObject(req.user, dto);
  }
}
