import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsMongoId, IsNumber, IsOptional, Min, ValidateIf } from 'class-validator';

export class RollbackProjectDto {
  @ApiPropertyOptional({ description: 'Số phiên bản snapshot cần khôi phục' })
  @ValidateIf((o: RollbackProjectDto) => !o.projectVersionId)
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  targetVersion?: number;

  @ApiPropertyOptional({ description: '_id của document ProjectVersion' })
  @ValidateIf((o: RollbackProjectDto) => o.targetVersion == null)
  @IsMongoId()
  projectVersionId?: string;
}
