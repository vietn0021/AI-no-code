import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsMongoId, IsString, MinLength } from 'class-validator';
import { PROMPT_ROLES, type PromptRole } from '../schemas/prompt.schema';

export class CreatePromptDto {
  @ApiProperty({ description: 'Project MongoDB id' })
  @IsMongoId()
  projectId!: string;

  @ApiProperty({ enum: PROMPT_ROLES })
  @IsIn(PROMPT_ROLES)
  role!: PromptRole;

  @ApiProperty({ description: 'Nội dung tin nhắn chat' })
  @IsString()
  @MinLength(1)
  content!: string;
}
