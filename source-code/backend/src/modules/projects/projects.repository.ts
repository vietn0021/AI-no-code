import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { ClientSession } from 'mongoose';
import { Model, Types } from 'mongoose';
import {
  ProjectVersion,
  ProjectVersionDocument,
  VersionChangeSource,
} from '../project-versions/schemas/project-version.schema';
import { Project, ProjectDocument } from './schemas/project.schema';

@Injectable()
export class ProjectsRepository {
  constructor(
    @InjectModel(Project.name) private readonly projectModel: Model<ProjectDocument>,
    @InjectModel(ProjectVersion.name)
    private readonly projectVersionModel: Model<ProjectVersionDocument>,
  ) {}

  findById(id: string | Types.ObjectId): Promise<ProjectDocument | null> {
    return this.projectModel.findById(id).exec();
  }

  create(
    data: Partial<Project> & { userId: Types.ObjectId },
    session?: ClientSession,
  ): Promise<ProjectDocument> {
    const doc = new this.projectModel(data);
    return doc.save({ session });
  }

  updateById(
    id: string | Types.ObjectId,
    update: Partial<Project>,
    session?: ClientSession,
  ): Promise<ProjectDocument | null> {
    return this.projectModel
      .findByIdAndUpdate(id, { $set: update }, { new: true, session })
      .exec();
  }

  insertSnapshot(
    params: {
      projectId: Types.ObjectId;
      version: number;
      snapshot: Record<string, unknown>;
      changeSource: VersionChangeSource;
      createdBy?: Types.ObjectId;
    },
    session?: ClientSession,
  ): Promise<ProjectVersionDocument> {
    const doc = new this.projectVersionModel({
      projectId: params.projectId,
      version: params.version,
      snapshot: params.snapshot,
      changeSource: params.changeSource,
      createdBy: params.createdBy,
    });
    return doc.save({ session });
  }

  listVersions(projectId: string | Types.ObjectId): Promise<ProjectVersionDocument[]> {
    return this.projectVersionModel.find({ projectId }).sort({ version: -1 }).exec();
  }

  findVersionById(versionDocId: string): Promise<ProjectVersionDocument | null> {
    return this.projectVersionModel.findById(versionDocId).exec();
  }

  findVersionByProjectAndVersion(
    projectId: Types.ObjectId,
    version: number,
  ): Promise<ProjectVersionDocument | null> {
    return this.projectVersionModel.findOne({ projectId, version }).exec();
  }
}
