import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProjectVersionsController } from './project-versions.controller';
import { ProjectVersionsService } from './project-versions.service';
import {
  ProjectVersion,
  ProjectVersionSchema,
} from './schemas/project-version.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProjectVersion.name, schema: ProjectVersionSchema },
    ]),
  ],
  controllers: [ProjectVersionsController],
  providers: [ProjectVersionsService],
  exports: [MongooseModule, ProjectVersionsService],
})
export class ProjectVersionsModule {}
