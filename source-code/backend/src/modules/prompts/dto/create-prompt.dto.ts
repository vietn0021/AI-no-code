import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsObject, IsOptional, IsString } from 'class-validator';

export class CreatePromptDto {
  @ApiProperty()
  @IsMongoId()
  userId!: string;

  @ApiProperty()
  @IsMongoId()
  projectId!: string;

  @ApiProperty()
  @IsString()
  prompt!: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  response?: Record<string, unknown>;
}
