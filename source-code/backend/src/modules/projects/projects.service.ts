import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type { ClientSession } from 'mongoose';
import { Connection, Types } from 'mongoose';
import { AiEngineService } from '../ai-engine/ai-engine.service';
import { GAME_TEMPLATES } from '../templates/templates.service';
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

  /** gameConfig tối thiểu (1 player) + templateId + templateDefaults đã merge. */
  private buildTemplateGameConfig(
    templateId: string,
    configFromAi: Record<string, unknown>,
  ): Record<string, unknown> {
    const base = GAME_TEMPLATES.find((t) => t.id === templateId);
    const templateDefaults = base
      ? { ...base.defaultConfig }
      : ({} as Record<string, unknown>);
    const merged: Record<string, unknown> = {
      ...templateDefaults,
      ...configFromAi,
    };

    const bg =
      typeof merged.backgroundColor === 'string' &&
      merged.backgroundColor.trim().startsWith('#')
        ? merged.backgroundColor.trim()
        : '#F0F8FF';

    let primary = '#BDE0FE';
    for (const k of [
      'snakeColor',
      'birdColor',
      'ballColor',
      'paddleColor',
      'playerColor',
      'cardBackColor',
      'primary',
    ] as const) {
      const v = merged[k];
      if (typeof v === 'string' && /^#[0-9A-Fa-f]{3,8}$/i.test(v.trim())) {
        primary = v.trim().startsWith('#') ? v.trim() : `#${v.trim()}`;
        break;
      }
    }

    const playerHex = /^#[0-9A-Fa-f]{3,8}$/i.test(primary) ? primary : '#9575CD';

    return {
      source_color: 'prompt',
      theme: {
        primary,
        background: bg,
        vibe: `Template: ${templateId}`,
      },
      entities: [
        {
          id: 'tpl-player-1',
          type: 'player',
          shapeType: 'Square',
          colorHex: playerHex,
          position: { x: 50, y: 72 },
          width: 16,
          height: 16,
        },
      ],
      logic: [],
      templateId,
      templateDefaults: merged,
    };
  }

  async create(dto: CreateProjectDto, userId: string) {
    return this.projectsRepository.create({
      name: dto.name,
      userId: new Types.ObjectId(userId),
      description: dto.description,
      rawPrompt: dto.rawPrompt,
      gameConfig: dto.gameConfig,
      currentVersion: 1,
      status: dto.status ?? ProjectStatus.Draft,
    });
  }

  async listForUser(userId: string) {
    const oid = this.assertObjectId(userId);
    return this.projectsRepository.findByUserId(oid);
  }

  async delete(id: string) {
    const oid = this.assertObjectId(id);
    const project = await this.projectsRepository.findById(oid);
    if (!project) throw new NotFoundException('Project not found');
    await this.projectsRepository.deleteById(oid);
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

    const detection = await this.aiEngineService.detectGameTemplate(dto.prompt);

    const prevGc = project.gameConfig as Record<string, unknown> | undefined;
    const prevTemplateId =
      typeof prevGc?.templateId === 'string'
        ? prevGc.templateId.trim().toLowerCase()
        : '';
    let prevDefaults: Record<string, unknown> = {};
    if (
      prevGc?.templateDefaults != null &&
      typeof prevGc.templateDefaults === 'object' &&
      !Array.isArray(prevGc.templateDefaults)
    ) {
      prevDefaults = { ...(prevGc.templateDefaults as Record<string, unknown>) };
    }

    const isTemplateEditPrompt =
      dto.prompt.includes('Người dùng đang chỉnh sửa game template') ||
      dto.prompt.includes('Đang dùng template:') ||
      dto.prompt.includes('CHỈ update templateConfig');
    let effectiveConfidence = detection.confidence;
    if (
      isTemplateEditPrompt &&
      prevTemplateId &&
      detection.templateId === prevTemplateId &&
      Object.keys(detection.config).length > 0 &&
      effectiveConfidence <= 0.7
    ) {
      effectiveConfidence = 0.75;
    }

    const configPatch =
      prevTemplateId === detection.templateId
        ? { ...prevDefaults, ...detection.config }
        : { ...detection.config };

    const newGameConfig =
      effectiveConfidence > 0.7 && detection.templateId !== 'none'
        ? this.buildTemplateGameConfig(detection.templateId, configPatch)
        : ((await this.aiEngineService.generateGameConfig(
            dto.prompt,
            id,
          )) as unknown as Record<string, unknown>);

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
            gameConfig: newGameConfig,
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

    if (!target) {
      throw new NotFoundException('Target version not found for this project');
    }

    if (String(target.projectId) !== String(oid)) {
      throw new NotFoundException('Target version not found for this project');
    }

    // Đảm bảo TypeScript hiểu `target` chắc chắn không null
    // (đặc biệt khi tham chiếu trong callback async transaction).
    const targetSnapshot = target.snapshot;

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
            gameConfig: { ...(targetSnapshot as Record<string, unknown>) },
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
