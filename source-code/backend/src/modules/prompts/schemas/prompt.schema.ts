import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Project } from '../../projects/schemas/project.schema';
import { User } from '../../users/schemas/user.schema';

export type PromptDocument = HydratedDocument<Prompt>;

export const PROMPT_ROLES = ['user', 'assistant'] as const;
export type PromptRole = (typeof PROMPT_ROLES)[number];

@Schema({ timestamps: true, collection: 'prompts' })
export class Prompt {
  @Prop({ type: Types.ObjectId, ref: Project.name, required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: String, enum: PROMPT_ROLES, required: true })
  role!: PromptRole;

  @Prop({ required: true, trim: true })
  content!: string;
}

export const PromptSchema = SchemaFactory.createForClass(Prompt);

PromptSchema.index({ projectId: 1, userId: 1, createdAt: 1 });
