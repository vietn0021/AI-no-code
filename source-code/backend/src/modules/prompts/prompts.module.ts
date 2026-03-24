import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Prompt, PromptSchema } from './schemas/prompt.schema';
import { PromptsController } from './prompts.controller';
import { PromptsService } from './prompts.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Prompt.name, schema: PromptSchema }])],
  controllers: [PromptsController],
  providers: [PromptsService],
  exports: [MongooseModule, PromptsService],
})
export class PromptsModule {}
