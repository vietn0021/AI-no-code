import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateProjectVersionDto } from './dto/create-project-version.dto';
import { ProjectVersionsService } from './project-versions.service';

@ApiTags('project-versions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('project-versions')
export class ProjectVersionsController {
  constructor(private readonly projectVersionsService: ProjectVersionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create project version snapshot' })
  create(@Body() dto: CreateProjectVersionDto) {
    return this.projectVersionsService.create(dto);
  }
}
