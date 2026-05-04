import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class StartScreeningDto {
  @ApiProperty({ description: 'Application id to screen' })
  @IsUUID()
  applicationId!: string;
}
