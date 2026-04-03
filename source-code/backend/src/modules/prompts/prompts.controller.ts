import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreatePromptDto } from './dto/create-prompt.dto';
import { PromptsService } from './prompts.service';

@ApiTags('prompts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('prompts')
export class PromptsController {
  constructor(private readonly promptsService: PromptsService) {}

  @Get()
  @ApiOperation({ summary: 'Lịch sử chat theo project (50 tin gần nhất, createdAt ASC)' })
  @ApiQuery({ name: 'projectId', required: true, description: 'MongoDB id của project' })
  findByProject(
    @Query('projectId') projectId: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.promptsService.findByProject(projectId, user.sub);
  }

  @Post()
  @ApiOperation({ summary: 'Lưu một tin chat (user / assistant)' })
  createMessage(
    @Body() dto: CreatePromptDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.promptsService.createMessage(dto, user.sub);
  }
}
