import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ReadUrlDto {
  @ApiProperty({ example: 'a1b2c3d4-My_Resume.pdf', description: 'S3 object key stored on your profile' })
  @IsString()
  @MinLength(1)
  @MaxLength(1024)
  objectKey!: string;
}
