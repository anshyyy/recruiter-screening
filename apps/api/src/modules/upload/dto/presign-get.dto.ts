import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class PresignGetDto {
  @ApiProperty({ example: 'uploads/<user-uuid>/<object>.pdf', description: 'S3 object key you own' })
  @IsString()
  @MinLength(1)
  @MaxLength(1024)
  objectKey!: string;
}
