import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ type: [String], description: 'Skill tags shown to recruiters when you apply' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(40)
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  skills?: string[];

  @ApiPropertyOptional({ description: 'S3 key from POST /uploads/file; pair with resumeFileName' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  resumeObjectKey?: string | null;

  @ApiPropertyOptional({ description: 'Original file name of the uploaded résumé' })
  @IsOptional()
  @IsString()
  @MaxLength(260)
  resumeFileName?: string | null;

  @ApiPropertyOptional({
    description: 'E.164 phone number used by the AI screening agent (e.g. +14155550100)',
    example: '+14155550100',
  })
  @IsOptional()
  @ValidateIf((_o, value) => value !== null && value !== '')
  @IsString()
  @MaxLength(24)
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'phoneNumber must be in E.164 format (e.g. +14155550100)',
  })
  phoneNumber?: string | null;
}
