import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { ALLOWED_UPLOAD_CONTENT_TYPES, MAX_UPLOAD_BYTES } from '../upload.constants';

export class PresignPutDto {
  @ApiProperty({ example: 'resume.pdf', description: 'Original file name (used for extension only)' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  fileName!: string;

  @ApiProperty({ example: 'application/pdf', enum: ALLOWED_UPLOAD_CONTENT_TYPES })
  @IsString()
  @IsIn([...ALLOWED_UPLOAD_CONTENT_TYPES])
  contentType!: string;

  @ApiProperty({ required: false, description: 'Declared size in bytes (validated against max)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_UPLOAD_BYTES)
  byteSize?: number;
}
