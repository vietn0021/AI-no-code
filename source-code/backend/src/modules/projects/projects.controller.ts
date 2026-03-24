import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateProjectDto } from './dto/create-project.dto';
import { GenerateProjectDto } from './dto/generate-project.dto';
import { RollbackProjectDto } from './dto/rollback-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsService } from './projects.service';

@ApiTags('projects')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @ApiOperation({ summary: 'Create project' })
  create(@Body() dto: CreateProjectDto) {
    return this.projectsService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project by id' })
  findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  @Get(':id/versions')
  @ApiOperation({ summary: 'List project version snapshots' })
  listVersions(@Param('id') id: string) {
    return this.projectsService.listVersions(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update project (snapshot if gameConfig changes)' })
  update(@Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.projectsService.update(id, dto);
  }

  @Post(':id/generate')
  @ApiOperation({
    summary: 'AI generate gameConfig, save snapshot, update project',
  })
  generate(@Param('id') id: string, @Body() dto: GenerateProjectDto) {
    return this.projectsService.generate(id, dto);
  }

  @Post(':id/rollback')
  @ApiOperation({ summary: 'Rollback project to a previous snapshot' })
  rollback(@Param('id') id: string, @Body() dto: RollbackProjectDto) {
    return this.projectsService.rollback(id, dto);
  }
}
