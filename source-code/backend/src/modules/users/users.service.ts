import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateUserDto } from './dto/create-user.dto';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  async create(dto: CreateUserDto): Promise<UserDocument> {
    const doc = new this.userModel(dto);
    return doc.save();
  }

  findByEmail(email: string, includePassword = false): Promise<UserDocument | null> {
    const normalized = email.toLowerCase().trim();
    const query = this.userModel.findOne({ email: normalized }).read('primary');
    if (includePassword) query.select('+password');
    return query.exec();
  }

  findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  /** Includes password + reset fields for completing password reset. */
  findForPasswordReset(email: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email: email.toLowerCase().trim() })
      .read('primary')
      .select('+password +passwordResetTokenHash +passwordResetExpires')
      .exec();
  }

  async setPasswordResetToken(
    email: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.userModel
      .updateOne(
        { email: email.toLowerCase().trim() },
        {
          $set: {
            passwordResetTokenHash: tokenHash,
            passwordResetExpires: expiresAt,
          },
        },
      )
      .exec();
  }

  async clearPasswordResetToken(email: string): Promise<void> {
    await this.userModel
      .updateOne(
        { email: email.toLowerCase().trim() },
        { $unset: { passwordResetTokenHash: '', passwordResetExpires: '' } },
      )
      .exec();
  }

  async updateProfile(
    userId: string,
    patch: { fullName?: string },
  ): Promise<UserDocument | null> {
    const set: Record<string, string> = {};
    if (patch.fullName !== undefined) {
      set.fullName = patch.fullName.trim();
    }
    if (Object.keys(set).length === 0) {
      return this.findById(userId);
    }
    return this.userModel
      .findByIdAndUpdate(userId, { $set: set }, { new: true })
      .exec();
  }
}
