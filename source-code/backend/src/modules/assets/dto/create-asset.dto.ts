import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsMongoId, IsNumber, IsString, Min } from 'class-validator';
import { AssetFileType } from '../schemas/asset.schema';

export class CreateAssetDto {
  @ApiProperty()
  @IsMongoId()
  projectId!: string;

  @ApiProperty()
  @IsMongoId()
  uploadedBy!: string;

  @ApiProperty()
  @IsString()
  fileName!: string;

  @ApiProperty()
  @IsString()
  fileUrl!: string;

  @ApiProperty({ enum: AssetFileType })
  @IsEnum(AssetFileType)
  fileType!: AssetFileType;

  @ApiProperty({ description: 'Kích thước file (bytes)' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  fileSize!: number;
}
