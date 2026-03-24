import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';

@Injectable()
export class DatabaseLoggerService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseLoggerService.name);

  constructor(@InjectConnection() private readonly connection: Connection) {}

  onModuleInit(): void {
    const conn = this.connection;

    const logSuccess = () => {
      this.logger.log('🚀 Database connected successfully to MongoDB Atlas');
    };

    if (conn.readyState === 1) {
      logSuccess();
    } else {
      conn.once('open', logSuccess);
    }

    conn.on('error', (err: Error) => {
      this.logger.error(
        '❌ Database connection failed',
        err?.stack ?? err?.message ?? String(err),
      );
      process.exit(1);
    });
  }
}
