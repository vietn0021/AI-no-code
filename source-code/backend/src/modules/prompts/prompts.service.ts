import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ProjectsService } from '../projects/projects.service';
import { CreatePromptDto } from './dto/create-prompt.dto';
import { Prompt, PromptDocument } from './schemas/prompt.schema';

const CHAT_HISTORY_LIMIT = 50;

@Injectable()
export class PromptsService {
  constructor(
    @InjectModel(Prompt.name) private readonly promptModel: Model<PromptDocument>,
    private readonly projectsService: ProjectsService,
  ) {}

  private assertValidObjectId(id: string, label: string): Types.ObjectId {
    if (!id?.trim() || !Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ${label}`);
    }
    return new Types.ObjectId(id);
  }

  private async assertProjectOwner(projectId: string, userId: string) {
    const project = await this.projectsService.findOne(projectId);
    if (String(project.userId) !== String(userId)) {
      throw new ForbiddenException('Only project owner can access this chat history');
    }
    return project;
  }

  async findByProject(projectId: string, userId: string): Promise<PromptDocument[]> {
    await this.assertProjectOwner(projectId, userId);
    const pid = this.assertValidObjectId(projectId, 'projectId');
    const uid = this.assertValidObjectId(userId, 'userId');

    const batch = await this.promptModel
      .find({ projectId: pid, userId: uid })
      .sort({ createdAt: -1 })
      .limit(CHAT_HISTORY_LIMIT)
      .exec();

    return batch.reverse();
  }

  async createMessage(dto: CreatePromptDto, userId: string): Promise<PromptDocument> {
    await this.assertProjectOwner(dto.projectId, userId);
    const pid = this.assertValidObjectId(dto.projectId, 'projectId');
    const uid = this.assertValidObjectId(userId, 'userId');

    const doc = new this.promptModel({
      projectId: pid,
      userId: uid,
      role: dto.role,
      content: dto.content.trim(),
    });
    return doc.save();
  }
}
