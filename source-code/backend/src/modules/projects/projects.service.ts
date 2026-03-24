import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type { ClientSession } from 'mongoose';
import { Connection, Types } from 'mongoose';
import { AiEngineService } from '../ai-engine/ai-engine.service';
import { VersionChangeSource } from '../project-versions/schemas/project-version.schema';
import { CreateProjectDto } from './dto/create-project.dto';
import { GenerateProjectDto } from './dto/generate-project.dto';
import { RollbackProjectDto } from './dto/rollback-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsRepository } from './projects.repository';
import { Project, ProjectStatus } from './schemas/project.schema';

function gameConfigChanged(
  prev: Record<string, unknown> | undefined,
  next: Record<string, unknown> | undefined,
): boolean {
  return JSON.stringify(prev ?? {}) !== JSON.stringify(next ?? {});
}

@Injectable()
export class ProjectsService {
  private buildUpdatePatch(dto: UpdateProjectDto): Partial<Project> {
    const p: Partial<Project> = {};
    if (dto.name !== undefined) p.name = dto.name;
    if (dto.description !== undefined) p.description = dto.description;
    if (dto.rawPrompt !== undefined) p.rawPrompt = dto.rawPrompt;
    if (dto.gameConfig !== undefined) p.gameConfig = dto.gameConfig;
    if (dto.status !== undefined) p.status = dto.status;
    return p;
  }

  constructor(
    private readonly projectsRepository: ProjectsRepository,
    private readonly aiEngineService: AiEngineService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  private assertObjectId(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid project id');
    }
    return new Types.ObjectId(id);
  }

  async create(dto: CreateProjectDto) {
    return this.projectsRepository.create({
      name: dto.name,
      userId: new Types.ObjectId(dto.userId),
      description: dto.description,
      rawPrompt: dto.rawPrompt,
      gameConfig: dto.gameConfig,
      currentVersion: 1,
      status: dto.status ?? ProjectStatus.Draft,
    });
  }

  async findOne(id: string) {
    const oid = this.assertObjectId(id);
    const project = await this.projectsRepository.findById(oid);
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async listVersions(id: string) {
    const oid = this.assertObjectId(id);
    const project = await this.projectsRepository.findById(oid);
    if (!project) throw new NotFoundException('Project not found');
    return this.projectsRepository.listVersions(oid);
  }

  async update(id: string, dto: UpdateProjectDto) {
    const oid = this.assertObjectId(id);
    const project = await this.projectsRepository.findById(oid);
    if (!project) throw new NotFoundException('Project not found');

    const shouldSnapshot =
      dto.gameConfig !== undefined &&
      gameConfigChanged(project.gameConfig, dto.gameConfig);

    if (!shouldSnapshot) {
      const patch = this.buildUpdatePatch(dto);
      if (Object.keys(patch).length === 0) return project;
      return this.projectsRepository.updateById(oid, patch);
    }

    const session = await this.connection.startSession();
    try {
      await session.withTransaction(async (s: ClientSession) => {
        await this.projectsRepository.insertSnapshot(
          {
            projectId: oid,
            version: project.currentVersion,
            snapshot: { ...(project.gameConfig ?? {}) },
            changeSource: VersionChangeSource.Manual,
          },
          s,
        );
        const patch = this.buildUpdatePatch(dto);
        await this.projectsRepository.updateById(
          oid,
          {
            ...patch,
            gameConfig: dto.gameConfig,
            currentVersion: project.currentVersion + 1,
          },
          s,
        );
      });
    } finally {
      await session.endSession();
    }

    return this.projectsRepository.findById(oid);
  }

  async generate(id: string, dto: GenerateProjectDto) {
    const oid = this.assertObjectId(id);
    const project = await this.projectsRepository.findById(oid);
    if (!project) throw new NotFoundException('Project not found');

    const newGameConfig = await this.aiEngineService.generateGameConfig(
      dto.prompt,
      id,
    );

    const session = await this.connection.startSession();
    try {
      await session.withTransaction(async (s: ClientSession) => {
        await this.projectsRepository.insertSnapshot(
          {
            projectId: oid,
            version: project.currentVersion,
            snapshot: { ...(project.gameConfig ?? {}) },
            changeSource: VersionChangeSource.Ai,
          },
          s,
        );
        await this.projectsRepository.updateById(
          oid,
          {
            gameConfig: newGameConfig as Record<string, unknown>,
            currentVersion: project.currentVersion + 1,
            rawPrompt: dto.prompt,
          },
          s,
        );
      });
    } finally {
      await session.endSession();
    }

    return this.projectsRepository.findById(oid);
  }

  async rollback(id: string, dto: RollbackProjectDto) {
    if (dto.targetVersion == null && !dto.projectVersionId) {
      throw new BadRequestException(
        'Provide either targetVersion or projectVersionId',
      );
    }

    const oid = this.assertObjectId(id);
    const project = await this.projectsRepository.findById(oid);
    if (!project) throw new NotFoundException('Project not found');

    let target = dto.projectVersionId
      ? await this.projectsRepository.findVersionById(dto.projectVersionId)
      : await this.projectsRepository.findVersionByProjectAndVersion(
          oid,
          dto.targetVersion!,
        );

    if (!target || String(target.projectId) !== String(oid)) {
      throw new NotFoundException('Target version not found for this project');
    }

    const session = await this.connection.startSession();
    try {
      await session.withTransaction(async (s: ClientSession) => {
        await this.projectsRepository.insertSnapshot(
          {
            projectId: oid,
            version: project.currentVersion,
            snapshot: { ...(project.gameConfig ?? {}) },
            changeSource: VersionChangeSource.Rollback,
          },
          s,
        );
        await this.projectsRepository.updateById(
          oid,
          {
            gameConfig: { ...target.snapshot },
            currentVersion: project.currentVersion + 1,
          },
          s,
        );
      });
    } finally {
      await session.endSession();
    }

    return this.projectsRepository.findById(oid);
  }
}
