import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreatePromptDto } from './dto/create-prompt.dto';
import { Prompt, PromptDocument } from './schemas/prompt.schema';

@Injectable()
export class PromptsService {
  constructor(@InjectModel(Prompt.name) private readonly promptModel: Model<PromptDocument>) {}

  async create(dto: CreatePromptDto): Promise<PromptDocument> {
    const doc = new this.promptModel({
      ...dto,
      userId: new Types.ObjectId(dto.userId),
      projectId: new Types.ObjectId(dto.projectId),
    });
    return doc.save();
  }
}
