import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';
import { Project } from '../../projects/schemas/project.schema';
import { User } from '../../users/schemas/user.schema';

export enum VersionChangeSource {
  Ai = 'ai',
  Manual = 'manual',
  Rollback = 'rollback',
}

export type ProjectVersionDocument = HydratedDocument<ProjectVersion>;

@Schema({ timestamps: true, collection: 'project_versions' })
export class ProjectVersion {
  @Prop({ type: Types.ObjectId, ref: Project.name, required: true, index: true })
  projectId!: Types.ObjectId;

  /** Số phiên bản tại thời điểm snapshot (thường = Project.currentVersion trước khi cập nhật). */
  @Prop({ required: true })
  version!: number;

  @Prop({ type: mongoose.Schema.Types.Mixed, required: true })
  snapshot!: Record<string, unknown>;

  @Prop({ enum: VersionChangeSource, required: true })
  changeSource!: VersionChangeSource;

  @Prop({ type: Types.ObjectId, ref: User.name })
  createdBy?: Types.ObjectId;
}

export const ProjectVersionSchema = SchemaFactory.createForClass(ProjectVersion);

ProjectVersionSchema.index({ projectId: 1, version: -1 });
