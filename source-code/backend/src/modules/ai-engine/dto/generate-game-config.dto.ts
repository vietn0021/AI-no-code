import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsOptional, IsString, MinLength } from 'class-validator';

export class GenerateGameConfigDto {
  @ApiProperty({ description: 'Prompt người dùng nhập để tạo/cập nhật game config' })
  @IsString()
  @MinLength(3)
  prompt!: string;

  @ApiPropertyOptional({ description: 'ProjectId (nếu đã có project) để lấy context rawPrompt cũ' })
  @IsOptional()
  @IsMongoId()
  projectId?: string;
}
