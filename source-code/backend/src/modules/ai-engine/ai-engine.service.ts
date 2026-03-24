import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Project, ProjectDocument } from '../projects/schemas/project.schema';
import { GameConfig, GameConfigSchema } from './schemas/game-config.schema';

const SYSTEM_INSTRUCTION = `AI phải tuân thủ nghiêm ngặt các quy tắc:
- **No Markdown:** Trả về JSON string thô để \`JSON.parse\` không bị lỗi.
- **Vibe Studio Colors:** - Primary: \`#E6E6FA\` (Lavender)
    - Background: \`#F3E5F5\`
- **Logic:** Luôn phải có 1 entity \`type: "player"\`.
- **Logic Format:** Trường \`logic\` luôn phải là một mảng (Array), kể cả khi chỉ có 1 rule.`;

function extractLikelyJson(text: string): string {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return text.trim();
  return text.slice(start, end + 1).trim();
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function normalizeGameConfig(input: GameConfig): GameConfig {
  const normalized: GameConfig = {
    ...input,
    theme: {
      ...input.theme,
      primary: '#E6E6FA',
      background: '#F3E5F5',
      vibe: input.theme?.vibe ?? 'lavender_pastel',
    },
    entities: input.entities.map((e) => {
      const pos = e.position
        ? {
            x: clamp(e.position.x, 0, 100),
            y: clamp(e.position.y, 0, 100),
          }
        : undefined;
      return { ...e, position: pos };
    }),
  };
  return normalized;
}

@Injectable()
export class AiEngineService {
  private readonly logger = new Logger(AiEngineService.name);

  constructor(
    private readonly config: ConfigService,
    @InjectModel(Project.name) private readonly projectModel: Model<ProjectDocument>,
  ) {}

  private getModel() {
    const apiKey = this.config.getOrThrow<string>('GEMINI_API_KEY');
    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel(
      {
        model: 'gemini-3-flash-preview',
        systemInstruction: SYSTEM_INSTRUCTION,
        // Preview models chạy trên v1beta.
        apiVersion: 'v1beta',
      } as any,
    );
  }

  /**
   * In danh sách model khả dụng ra console (debug khi 404).
   * Gọi qua GET /api/ai/models hoặc từ đâu đó khi cần.
   */
  async listModels(): Promise<string[]> {
    const apiKey = this.config.getOrThrow<string>('GEMINI_API_KEY');
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    this.logger.log('listModels: fetching available models...');

    try {
      const res = await fetch(url);
      const json = (await res.json()) as { models?: { name: string }[]; error?: { message: string } };

      if (!res.ok) {
        this.logger.error(
          `listModels: API error ${res.status}: ${json.error?.message ?? res.statusText}`,
        );
        return [];
      }

      const models = json.models ?? [];
      const names = models.map((m) => m.name);
      this.logger.log(`listModels: found ${names.length} models`);
      names.forEach((name) => this.logger.log(`  - ${name}`));
      return names;
    } catch (err) {
      const e = err as Error;
      this.logger.error(`listModels: ${e.message}`, e.stack);
      return [];
    }
  }

  async generateGameConfig(prompt: string, projectId?: string): Promise<GameConfig> {
    this.logger.log('AI.generateGameConfig: start');
    this.logger.log(`AI.generateGameConfig: prompt length=${prompt.length}`);

    let previousRawPrompt: string | undefined;
    if (projectId) {
      this.logger.log(`AI.generateGameConfig: loading context for projectId=${projectId}`);
      const proj = await this.projectModel
        .findById(new Types.ObjectId(projectId))
        .select({ rawPrompt: 1 })
        .lean<{ rawPrompt?: string } | null>()
        .exec();
      previousRawPrompt = proj?.rawPrompt;
    }

    const model = this.getModel();

    const userText = [
      'Bạn là AI tạo gameConfig cho AI No-code Studio.',
      'YÊU CẦU ĐẦU RA: chỉ trả về MỘT JSON object thuần (không markdown, không code fence, không giải thích).',
      previousRawPrompt ? `RAW_PROMPT_CU: ${previousRawPrompt}` : undefined,
      `PROMPT_MOI: ${prompt}`,
      '',
      'Nhắc lại yêu cầu bắt buộc:',
      '- theme.primary phải là #E6E6FA, theme.background phải là #F3E5F5, vibe = lavender_pastel.',
      '- entities phải có ít nhất 1 entity type="player".',
      '- gameConfig theo cấu trúc: theme, entities, logic.',
      '- logic PHẢI là Array. Nếu chỉ có 1 rule vẫn phải trả về dạng [ { ... } ].',
    ]
      .filter(Boolean)
      .join('\n');

    for (let attempt = 0; attempt < 2; attempt += 1) {
      this.logger.log(`AI.generateGameConfig: calling Gemini (attempt ${attempt + 1}/2)`);
      let result;
      try {
        result = await model.generateContent(userText);
      } catch (error) {
        const err = error as Error;
        this.logger.error(
          `AI.generateGameConfig: generateContent failed (attempt ${attempt + 1}/2): ${err.message}`,
          err.stack,
        );
        throw error;
      }
      const rawText = result.response.text();
      this.logger.log(`AI.generateGameConfig: Gemini raw response length=${rawText.length}`);

      const jsonText = extractLikelyJson(rawText);
      this.logger.log(`AI.generateGameConfig: extracted JSON length=${jsonText.length}`);

      try {
        const parsed = JSON.parse(jsonText) as Record<string, unknown>;
        this.logger.log('AI.generateGameConfig: JSON.parse OK');
        this.logger.log(
          `AI.generateGameConfig: parsed JSON = ${JSON.stringify(parsed, null, 2)}`,
        );

        // Một số phản hồi AI trả logic là object đơn lẻ -> tự bọc thành array.
        if (
          parsed.logic != null &&
          !Array.isArray(parsed.logic) &&
          typeof parsed.logic === 'object'
        ) {
          parsed.logic = [parsed.logic];
          this.logger.warn('AI.generateGameConfig: logic object detected, wrapped into array');
        }

        const validated = GameConfigSchema.parse(parsed);
        this.logger.log('AI.generateGameConfig: Zod validate OK');

        const normalized = normalizeGameConfig(validated);
        this.logger.log('AI.generateGameConfig: normalized OK');

        return normalized;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(
          `AI.generateGameConfig: parse/validate failed (attempt ${attempt + 1}/2): ${message}`,
        );

        // Theo tài liệu: retry 1 lần nếu JSON parse thất bại.
        if (attempt === 0) {
          this.logger.log('AI.generateGameConfig: retrying once...');
          continue;
        }
        throw err;
      }
    }

    // Unreachable
    throw new Error('AI.generateGameConfig: unexpected failure');
  }
}
