import {
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { handleServiceError } from '../../common/utils/service-error';
import { PRESIGNED_URL_EXPIRES_SECONDS } from './upload.constants';
import type { PresignGetDto } from './dto/presign-get.dto';
import type { PresignPutDto } from './dto/presign-put.dto';

export type PresignPutResult = {
  /** HTTP PUT URL (time-limited). */
  uploadUrl: string;
  /** Persist this key to request a download URL later. */
  objectKey: string;
  expiresInSeconds: number;
  /** Headers the client must send on PUT (must match the signature). */
  requiredHeaders: Record<string, string>;
};

export type PresignGetResult = {
  downloadUrl: string;
  objectKey: string;
  expiresInSeconds: number;
};

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    const region = config.get<string>('AWS_REGION') ?? config.get<string>('S3_REGION');
    const accessKeyId = config.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = config.get<string>('AWS_SECRET_ACCESS_KEY');
    const endpoint = config.get<string>('S3_ENDPOINT')?.trim();
    const forcePathStyle = config.get<string>('S3_FORCE_PATH_STYLE') === 'true';

    const bucket = config.get<string>('S3_BUCKET')?.trim();
    if (!bucket) {
      this.logger.warn('S3_BUCKET is not set; upload APIs will return errors until configured.');
    }
    this.bucket = bucket ?? '';

    this.client = new S3Client({
      region: region ?? 'us-east-1',
      ...(accessKeyId && secretAccessKey
        ? { credentials: { accessKeyId, secretAccessKey } }
        : {}),
      ...(endpoint ? { endpoint, forcePathStyle: forcePathStyle || true } : {}),
    });
  }

  private assertBucketConfigured(): void {
    if (!this.bucket) {
      throw new InternalServerErrorException('File uploads are not configured (missing S3_BUCKET).');
    }
  }

  private userObjectPrefix(userId: string): string {
    return `uploads/${userId}/`;
  }

  private sanitizeExtension(fileName: string): string {
    const raw = extname(fileName).slice(0, 32);
    const safe = raw.replace(/[^a-zA-Z0-9.]/g, '');
    return safe.length > 0 ? safe : '';
  }

  private buildObjectKey(userId: string, fileName: string): string {
    const ext = this.sanitizeExtension(fileName);
    return `${this.userObjectPrefix(userId)}${randomUUID()}${ext}`;
  }

  private assertKeyOwnedByUser(userId: string, objectKey: string): void {
    const prefix = this.userObjectPrefix(userId);
    if (objectKey.includes('..') || objectKey.includes('\\') || !objectKey.startsWith(prefix)) {
      throw new ForbiddenException('You may only access objects under your own prefix.');
    }
  }

  async createPresignedPut(userId: string, dto: PresignPutDto): Promise<PresignPutResult> {
    try {
      this.assertBucketConfigured();
      const objectKey = this.buildObjectKey(userId, dto.fileName);
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
        ContentType: dto.contentType,
      });
      const uploadUrl = await getSignedUrl(this.client, command, {
        expiresIn: PRESIGNED_URL_EXPIRES_SECONDS,
      });
      return {
        uploadUrl,
        objectKey,
        expiresInSeconds: PRESIGNED_URL_EXPIRES_SECONDS,
        requiredHeaders: {
          'Content-Type': dto.contentType,
        },
      };
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      handleServiceError(this.logger, 'UploadService.createPresignedPut', error);
    }
  }

  async createPresignedGet(userId: string, dto: PresignGetDto): Promise<PresignGetResult> {
    try {
      this.assertBucketConfigured();
      this.assertKeyOwnedByUser(userId, dto.objectKey);
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: dto.objectKey,
      });
      const downloadUrl = await getSignedUrl(this.client, command, {
        expiresIn: PRESIGNED_URL_EXPIRES_SECONDS,
      });
      return {
        downloadUrl,
        objectKey: dto.objectKey,
        expiresInSeconds: PRESIGNED_URL_EXPIRES_SECONDS,
      };
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      handleServiceError(this.logger, 'UploadService.createPresignedGet', error);
    }
  }
}
