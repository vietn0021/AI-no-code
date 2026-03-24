import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateProjectVersionDto } from './dto/create-project-version.dto';
import { ProjectVersionsService } from './project-versions.service';

@ApiTags('project-versions')
@Controller('project-versions')
export class ProjectVersionsController {
  constructor(private readonly projectVersionsService: ProjectVersionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create project version snapshot' })
  create(@Body() dto: CreateProjectVersionDto) {
    return this.projectVersionsService.create(dto);
  }
}
