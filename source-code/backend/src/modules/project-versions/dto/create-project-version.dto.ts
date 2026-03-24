import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsMongoId, IsNumber, IsObject, IsOptional, Min } from 'class-validator';
import { VersionChangeSource } from '../schemas/project-version.schema';

export class CreateProjectVersionDto {
  @ApiProperty()
  @IsMongoId()
  projectId!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  version!: number;

  @ApiProperty({ type: 'object', additionalProperties: true })
  @IsObject()
  snapshot!: Record<string, unknown>;

  @ApiProperty({ enum: VersionChangeSource })
  @IsEnum(VersionChangeSource)
  changeSource!: VersionChangeSource;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  createdBy?: string;
}
