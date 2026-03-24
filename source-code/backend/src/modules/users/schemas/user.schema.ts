import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export enum UserRole {
  User = 'user',
  Admin = 'admin',
}

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ required: true, unique: true, index: true, trim: true })
  username!: string;

  @Prop({ required: true, unique: true, index: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true, select: false })
  password!: string;

  @Prop({ trim: true })
  avatar?: string;

  @Prop({ enum: UserRole, default: UserRole.User })
  role!: UserRole;
}

export const UserSchema = SchemaFactory.createForClass(User);
