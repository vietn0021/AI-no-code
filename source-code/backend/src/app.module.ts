import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AiEngineModule } from './modules/ai-engine/ai-engine.module';
import { AssetsModule } from './modules/assets/assets.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProjectVersionsModule } from './modules/project-versions/project-versions.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { PromptsModule } from './modules/prompts/prompts.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { UsersModule } from './modules/users/users.module';
import { DatabaseModule } from './providers/database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    ProjectsModule,
    ProjectVersionsModule,
    AssetsModule,
    PromptsModule,
    AiEngineModule,
    TemplatesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
