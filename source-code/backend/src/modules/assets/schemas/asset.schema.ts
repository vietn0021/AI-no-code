import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Project } from '../../projects/schemas/project.schema';
import { User } from '../../users/schemas/user.schema';

export enum AssetFileType {
  Image = 'image',
  Audio = 'audio',
  Json = 'json',
}

export type AssetDocument = HydratedDocument<Asset>;

@Schema({ timestamps: true, collection: 'assets' })
export class Asset {
  @Prop({ type: Types.ObjectId, ref: Project.name, required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  uploadedBy!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  fileName!: string;

  @Prop({ required: true, trim: true })
  fileUrl!: string;

  @Prop({ enum: AssetFileType, required: true })
  fileType!: AssetFileType;

  @Prop({ required: true, min: 0 })
  fileSize!: number;
}

export const AssetSchema = SchemaFactory.createForClass(Asset);
