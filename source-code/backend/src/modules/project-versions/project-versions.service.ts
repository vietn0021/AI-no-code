import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateProjectVersionDto } from './dto/create-project-version.dto';
import {
  ProjectVersion,
  ProjectVersionDocument,
} from './schemas/project-version.schema';

@Injectable()
export class ProjectVersionsService {
  constructor(
    @InjectModel(ProjectVersion.name)
    private readonly projectVersionModel: Model<ProjectVersionDocument>,
  ) {}

  async create(dto: CreateProjectVersionDto): Promise<ProjectVersionDocument> {
    const doc = new this.projectVersionModel({
      projectId: new Types.ObjectId(dto.projectId),
      version: dto.version,
      snapshot: dto.snapshot,
      changeSource: dto.changeSource,
      createdBy: dto.createdBy ? new Types.ObjectId(dto.createdBy) : undefined,
    });
    return doc.save();
  }
}
