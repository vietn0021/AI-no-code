import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class GenerateProjectDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  prompt!: string;
}
