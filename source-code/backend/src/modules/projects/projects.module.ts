import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AiEngineModule } from '../ai-engine/ai-engine.module';
import { ProjectVersion, ProjectVersionSchema } from '../project-versions/schemas/project-version.schema';
import { Project, ProjectSchema } from './schemas/project.schema';
import { ProjectsController } from './projects.controller';
import { ProjectOwnerGuard } from './guards/project-owner.guard';
import { ProjectsRepository } from './projects.repository';
import { ProjectsService } from './projects.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Project.name, schema: ProjectSchema },
      { name: ProjectVersion.name, schema: ProjectVersionSchema },
    ]),
    AiEngineModule,
  ],
  controllers: [ProjectsController],
  providers: [ProjectsRepository, ProjectsService, ProjectOwnerGuard],
  exports: [MongooseModule, ProjectsService, ProjectsRepository],
})
export class ProjectsModule {}
