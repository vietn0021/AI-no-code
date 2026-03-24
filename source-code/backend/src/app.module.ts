import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './providers/database/database.module';
import { AssetsModule } from './modules/assets/assets.module';
import { AiEngineModule } from './modules/ai-engine/ai-engine.module';
import { ProjectVersionsModule } from './modules/project-versions/project-versions.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { PromptsModule } from './modules/prompts/prompts.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    DatabaseModule,
    UsersModule,
    ProjectsModule,
    ProjectVersionsModule,
    AssetsModule,
    PromptsModule,
    AiEngineModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
