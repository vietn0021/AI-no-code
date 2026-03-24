import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { DatabaseLoggerService } from './database-logger.service';

/**
 * Cấu hình mặc định JSON cho mọi schema (theo database-setup.md §5).
 * timestamps: true khai báo trên từng @Schema({ timestamps: true }).
 */
function applyMongooseGlobalSchemaDefaults(): void {
  mongoose.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: (_doc, ret: Record<string, unknown>) => {
      if (ret._id != null) {
        ret.id = String(ret._id);
        delete ret._id;
      }
      delete ret.__v;
      return ret;
    },
  });
}

applyMongooseGlobalSchemaDefaults();

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGODB_URI'),
        dbName: config.get<string>('DB_NAME', 'ai-nocode-studio'),
        autoIndex: process.env.NODE_ENV !== 'production',
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [DatabaseLoggerService],
  exports: [MongooseModule],
})
export class DatabaseModule {}
