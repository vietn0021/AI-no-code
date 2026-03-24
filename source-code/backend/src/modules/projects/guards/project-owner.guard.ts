import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ProjectsService } from '../projects.service';

@Injectable()
export class ProjectOwnerGuard implements CanActivate {
  constructor(private readonly projectsService: ProjectsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      params: { id: string };
      user?: { userId: string };
    }>();

    const projectId = request.params?.id;
    const userId = request.user?.userId;

    if (!projectId || !userId) {
      throw new ForbiddenException('Missing project/user context');
    }

    const project = await this.projectsService.findOne(projectId);
    if (String(project.userId) !== String(userId)) {
      throw new ForbiddenException('Only project owner can modify this project');
    }

    return true;
  }
}
