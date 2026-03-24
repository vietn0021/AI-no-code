import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';
import { Project } from '../../projects/schemas/project.schema';
import { User } from '../../users/schemas/user.schema';

export type PromptDocument = HydratedDocument<Prompt>;

@Schema({ timestamps: true, collection: 'prompts' })
export class Prompt {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Project.name, required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  prompt!: string;

  @Prop({ type: mongoose.Schema.Types.Mixed })
  response?: Record<string, unknown>;
}

export const PromptSchema = SchemaFactory.createForClass(Prompt);
