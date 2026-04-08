import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateProjectDto } from './dto/create-project.dto';
import { GenerateProjectDto } from './dto/generate-project.dto';
import { RollbackProjectDto } from './dto/rollback-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectOwnerGuard } from './guards/project-owner.guard';
import { ProjectsService } from './projects.service';

@ApiTags('projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @ApiOperation({ summary: 'Create project' })
  create(
    @Body() dto: CreateProjectDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.projectsService.create(dto, user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'List projects for current user' })
  list(@CurrentUser() user: { sub: string }) {
    return this.projectsService.listForUser(user.sub);
  }

  @Get(':id')
  @UseGuards(ProjectOwnerGuard)
  @ApiOperation({ summary: 'Get project by id' })
  findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  @Get(':id/versions')
  @UseGuards(ProjectOwnerGuard)
  @ApiOperation({ summary: 'List project version snapshots' })
  listVersions(@Param('id') id: string) {
    return this.projectsService.listVersions(id);
  }

  @Patch(':id')
  @UseGuards(ProjectOwnerGuard)
  @ApiOperation({ summary: 'Update project (snapshot if gameConfig changes)' })
  update(@Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.projectsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(ProjectOwnerGuard)
  @ApiOperation({ summary: 'Delete project and its version history' })
  remove(@Param('id') id: string) {
    return this.projectsService.delete(id);
  }

  @Post(':id/generate')
  @UseGuards(ProjectOwnerGuard)
  @ApiOperation({
    summary: 'AI generate gameConfig, save snapshot, update project',
  })
  generate(@Param('id') id: string, @Body() dto: GenerateProjectDto) {
    return this.projectsService.generate(id, dto);
  }

  @Post(':id/rollback')
  @UseGuards(ProjectOwnerGuard)
  @ApiOperation({ summary: 'Rollback project to a previous snapshot' })
  rollback(@Param('id') id: string, @Body() dto: RollbackProjectDto) {
    return this.projectsService.rollback(id, dto);
  }

  @Post(':id/publish')
  @UseGuards(ProjectOwnerGuard)
  @ApiOperation({ summary: 'Publish project (slug + public play URL)' })
  publish(@Param('id') id: string) {
    return this.projectsService.publish(id);
  }

  @Post(':id/unpublish')
  @UseGuards(ProjectOwnerGuard)
  @ApiOperation({ summary: 'Unpublish project' })
  unpublish(@Param('id') id: string) {
    return this.projectsService.unpublish(id);
  }
}
