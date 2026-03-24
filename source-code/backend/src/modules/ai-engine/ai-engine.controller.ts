import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GenerateGameConfigDto } from './dto/generate-game-config.dto';
import { AiEngineService } from './ai-engine.service';

@ApiTags('ai')
@Controller('ai')
export class AiEngineController {
  constructor(private readonly aiEngineService: AiEngineService) {}

  @Get('models')
  @ApiOperation({ summary: 'List available Gemini models (log ra console, debug 404)' })
  async listModels() {
    const models = await this.aiEngineService.listModels();
    return { models };
  }

  @Post('generate')
  @ApiOperation({ summary: 'Generate gameConfig using Gemini' })
  async generate(@Body() dto: GenerateGameConfigDto) {
    return this.aiEngineService.generateGameConfig(dto.prompt, dto.projectId);
  }
}
