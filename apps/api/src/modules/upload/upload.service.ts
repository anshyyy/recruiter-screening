import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeleteObjectCommand, ObjectCannedACL, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createHash, randomUUID } from 'node:crypto';
import { basename, extname } from 'node:path';
import type { ReadUrlDto } from './dto';
import type { SafeUser } from '../users/types/safe-user.type';
import { ALLOWED_UPLOAD_CONTENT_TYPES, isAllowedUploadContentType } from './upload.constants';

/** Response after `POST /uploads/file` — plain public HTTPS URL (no query string) and S3 key. */
export type FileUploadResult = {
  fileUrl: string;
  objectKey: string;
};

/** Response for `POST /uploads/read-url`. */
export type UploadReadUrlResult = {
  downloadUrl: string;
  objectKey: string;
};

@Injectable()
export class UploadService implements OnModuleInit {
  private readonly logger = new Logger(UploadService.name);

  private s3Client!: S3Client;
  private bucket = '';
  private region = '';
  private endpoint: string | undefined;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    this.bucket =
      this.config.get<string>('S3_BUCKET')?.trim() ?? this.config.get<string>('AWS_S3_BUCKET')?.trim() ?? '';
    this.region =
      this.config.get<string>('AWS_REGION')?.trim() ??
      this.config.get<string>('S3_REGION')?.trim() ??
      'us-east-1';
    this.endpoint = this.config.get<string>('S3_ENDPOINT')?.trim() || undefined;

    const accessKeyId =
      this.config.get<string>('AWS_ACCESS_KEY_ID')?.trim() ??
      this.config.get<string>('AWS_ACCESS_KEY')?.trim();
    const secretAccessKey =
      this.config.get<string>('AWS_SECRET_ACCESS_KEY')?.trim() ??
      this.config.get<string>('AWS_SECRET_KEY')?.trim();

    if ((accessKeyId && !secretAccessKey) || (!accessKeyId && secretAccessKey)) {
      throw new BadRequestException(
        'AWS S3 configuration error: provide both access key id and secret access key, or omit both to use the default credential chain (e.g. IAM role).',
      );
    }

    if (!this.bucket) {
      this.logger.warn('S3_BUCKET or AWS_S3_BUCKET is not set; upload APIs will fail until configured.');
    }

    this.s3Client = new S3Client({
      region: this.region,
      endpoint: this.endpoint,
      forcePathStyle: Boolean(this.endpoint),
      credentials:
        accessKeyId && secretAccessKey
          ? { accessKeyId, secretAccessKey }
          : undefined,
    });

    this.logger.log(`S3 initialized: bucket=${this.bucket || '(unset)'}, region=${this.region}`);
  }

  private assertBucketConfigured(): void {
    if (!this.bucket) {
      throw new InternalServerErrorException(
        'File uploads are not configured (set S3_BUCKET or AWS_S3_BUCKET).',
      );
    }
  }

  /**
   * Plain HTTPS URL for the object. Anonymous GET works when the object (or bucket) is publicly readable.
   */
  getPublicObjectUrl(objectKey: string): string {
    const encodedKey = objectKey
      .split('/')
      .filter((segment) => segment.length > 0)
      .map((segment) => encodeURIComponent(segment))
      .join('/');
    const ep = this.endpoint?.replace(/\/+$/, '');
    if (ep) {
      return `${ep}/${this.bucket}/${encodedKey}`;
    }
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${encodedKey}`;
  }

  private sanitizeExtension(fileName: string): string {
    const raw = extname(fileName).slice(0, 32);
    const safe = raw.replace(/[^a-zA-Z0-9.]/g, '');
    return safe.length > 0 ? safe : '';
  }

  private sanitizeFileBaseName(fileName: string): string {
    const base = basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
    return base.length > 0 ? base.slice(0, 200) : 'file';
  }

  /** Root object key: `{8-char-hex}-{safeFileName}`. */
  private generatePublicRootObjectKey(userId: string, fileName: string): string {
    const hash = createHash('sha256')
      .update(`${userId}:${fileName}:${Date.now()}:${randomUUID()}`)
      .digest('hex')
      .substring(0, 8);
    const safeName = this.sanitizeFileBaseName(fileName);
    const ext = this.sanitizeExtension(fileName);
    const hasExtInName = ext.length > 0 && safeName.toLowerCase().endsWith(ext.toLowerCase());
    const suffix = hasExtInName ? '' : ext;
    return `${hash}-${safeName}${suffix}`;
  }

  /** Only the S3 key currently stored on the user profile (`resumeObjectKey`) may be read or deleted here. */
  private assertObjectKeyMatchesProfile(user: SafeUser, objectKey: string): void {
    if (!objectKey || objectKey.includes('..') || objectKey.includes('\\')) {
      throw new BadRequestException('Invalid object key');
    }
    if (user.resumeObjectKey !== objectKey) {
      throw new ForbiddenException('That object key does not match your profile.');
    }
  }

  private assertMimeAllowed(contentType: string): void {
    if (!isAllowedUploadContentType(contentType)) {
      throw new BadRequestException(
        `Content type not allowed. Use one of: ${ALLOWED_UPLOAD_CONTENT_TYPES.join(', ')}`,
      );
    }
  }

  private mapAwsConfigError(err: unknown): void {
    if (!(err instanceof Error)) {
      return;
    }
    if (err.message.includes('Region is missing')) {
      throw new BadRequestException('AWS S3 configuration error: Region is missing');
    }
    if (err.message.includes('InvalidAccessKeyId')) {
      throw new BadRequestException('AWS S3 configuration error: Invalid access key');
    }
    if (err.message.includes('SignatureDoesNotMatch')) {
      throw new BadRequestException('AWS S3 configuration error: Invalid secret key');
    }
  }

  /**
   * Stores bytes in S3 with ACL **public-read** and returns the stable public URL + key.
   * Caller (e.g. frontend) then PATCHes profile with `resumeObjectKey` / `resumeFileName` as needed.
   */
  async uploadPublicFile(
    userId: string,
    buffer: Buffer,
    originalName: string,
    contentType: string,
  ): Promise<FileUploadResult> {
    this.assertBucketConfigured();
    this.assertMimeAllowed(contentType);
    const objectKey = this.generatePublicRootObjectKey(userId, originalName);
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
        Body: buffer,
        ContentType: contentType,
        ACL: ObjectCannedACL.public_read,
      });
      await this.s3Client.send(command);
      const fileUrl = this.getPublicObjectUrl(objectKey);
      this.logger.log(`uploadPublicFile: userId=${userId} objectKey=${objectKey} contentType=${contentType}`);
      return { objectKey, fileUrl };
    } catch (err) {
      this.mapAwsConfigError(err);
      if (this.isAclRejectedByBucket(err)) {
        throw new BadRequestException(
          'S3 rejected public-read ACL (often Object Ownership = Bucket owner enforced, or Block Public ACLs). In the S3 console: bucket → Permissions → Object Ownership → edit to allow ACLs, and adjust Block public access so new objects can be public-read; or use a bucket policy for public GetObject instead.',
        );
      }
      this.logger.error('uploadPublicFile failed', err instanceof Error ? err.stack : err);
      throw new InternalServerErrorException('File upload failed: Unable to upload file to S3 storage');
    }
  }

  private isAclRejectedByBucket(err: unknown): boolean {
    const name = err && typeof err === 'object' && 'name' in err ? String((err as { name: string }).name) : '';
    const msg = err instanceof Error ? err.message : '';
    return (
      name === 'AccessControlListNotSupported' ||
      msg.includes('AccessControlListNotSupported') ||
      msg.includes('does not allow ACLs') ||
      msg.includes('InvalidBucketAclWithObjectOwnership')
    );
  }

  /** Public URL for a key that matches `resumeObjectKey` on the JWT user. */
  getPublicDownloadUrl(user: SafeUser, dto: ReadUrlDto): UploadReadUrlResult {
    this.assertBucketConfigured();
    this.assertObjectKeyMatchesProfile(user, dto.objectKey);
    return {
      downloadUrl: this.getPublicObjectUrl(dto.objectKey),
      objectKey: dto.objectKey,
    };
  }

  /** Deletes an object if its key matches `resumeObjectKey` on the JWT user. */
  async deleteOwnedObject(user: SafeUser, dto: ReadUrlDto): Promise<void> {
    this.assertBucketConfigured();
    this.assertObjectKeyMatchesProfile(user, dto.objectKey);
    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: dto.objectKey,
        }),
      );
      this.logger.log(`deleteOwnedObject: userId=${user.id} objectKey=${dto.objectKey}`);
    } catch (err) {
      this.mapAwsConfigError(err);
      this.logger.error('deleteOwnedObject failed', err instanceof Error ? err.stack : err);
      throw new InternalServerErrorException('File deletion failed: Unable to remove file from storage');
    }
  }
}
