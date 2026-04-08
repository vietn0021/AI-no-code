import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export enum ProjectStatus {
  Draft = 'draft',
  Published = 'published',
  Archived = 'archived',
}

export type ProjectDocument = HydratedDocument<Project>;

@Schema({ timestamps: true, collection: 'projects' })
export class Project {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ trim: true })
  description?: string;

  @Prop({ trim: true })
  rawPrompt?: string;

  @Prop({ type: mongoose.Schema.Types.Mixed })
  gameConfig?: Record<string, unknown>;

  /** Số phiên bản hiện tại (theo docs/project-module). */
  @Prop({ default: 1 })
  currentVersion!: number;

  @Prop({ enum: ProjectStatus, default: ProjectStatus.Draft, index: true })
  status!: ProjectStatus;

  @Prop({ default: false, index: true })
  isPublished!: boolean;

  @Prop({ type: Date })
  publishedAt?: Date;

  /** URL-friendly, unique khi đã gán (sparse index). */
  @Prop({ trim: true })
  slug?: string;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);

ProjectSchema.index({ userId: 1, status: 1 });
ProjectSchema.index({ userId: 1, createdAt: -1 });
ProjectSchema.index({ slug: 1 }, { unique: true, sparse: true });
