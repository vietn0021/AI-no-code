import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ required: true, unique: true, index: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true, select: false })
  password!: string;

  @Prop({ required: true, trim: true })
  fullName!: string;

  createdAt?: Date;
  updatedAt?: Date;

  /** SHA-256 hex of the raw reset token (never store plain token). */
  @Prop({ type: String, select: false })
  passwordResetTokenHash?: string;

  @Prop({ type: Date, select: false })
  passwordResetExpires?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.pre('save', async function preSave() {
  const doc = this as UserDocument;
  if (!doc.isModified('password')) return;
  doc.password = await bcrypt.hash(doc.password, 10);
});

