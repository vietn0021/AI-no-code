import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreatePromptDto } from './dto/create-prompt.dto';
import { PromptsService } from './prompts.service';

@ApiTags('prompts')
@Controller('prompts')
export class PromptsController {
  constructor(private readonly promptsService: PromptsService) {}

  @Post()
  @ApiOperation({ summary: 'Log AI prompt / response' })
  create(@Body() dto: CreatePromptDto) {
    return this.promptsService.create(dto);
  }
}
