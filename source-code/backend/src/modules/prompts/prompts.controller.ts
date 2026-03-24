import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreatePromptDto } from './dto/create-prompt.dto';
import { PromptsService } from './prompts.service';

@ApiTags('prompts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('prompts')
export class PromptsController {
  constructor(private readonly promptsService: PromptsService) {}

  @Post()
  @ApiOperation({ summary: 'Log AI prompt / response' })
  create(@Body() dto: CreatePromptDto) {
    return this.promptsService.create(dto);
  }
}
