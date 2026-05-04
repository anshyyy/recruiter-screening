import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ type: [String], description: 'Skill tags shown to recruiters when you apply' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(40)
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  skills?: string[];

  @ApiPropertyOptional({ description: 'S3 key from presign-put; pair with resumeFileName' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  resumeObjectKey?: string | null;

  @ApiPropertyOptional({ description: 'Original file name of the uploaded résumé' })
  @IsOptional()
  @IsString()
  @MaxLength(260)
  resumeFileName?: string | null;
}
