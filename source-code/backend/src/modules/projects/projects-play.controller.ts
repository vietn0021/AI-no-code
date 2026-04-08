import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';

@ApiTags('projects')
@Controller('projects')
export class ProjectsPlayController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get('play/:slug')
  @ApiOperation({ summary: 'Public: published game config by slug' })
  playBySlug(@Param('slug') slug: string) {
    return this.projectsService.findPublishedGameConfigBySlug(slug);
  }
}
