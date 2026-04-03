import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Project, ProjectDocument } from '../projects/schemas/project.schema';
import {
  ALL_PALETTE_HEX_COLORS,
  buildPaletteAndShapesPromptBlock,
} from './constants/asset-palettes';
import { LOGIC_ARRAY_EXAMPLE } from './constants/logic-prompt-example';
import { GameConfig, GameConfigSchema } from './schemas/game-config.schema';
import { normalizeHexOrRandom } from './utils/hex-color.util';

const SYSTEM_INSTRUCTION = `AI phải tuân thủ nghiêm ngặt các quy tắc:
- **No Markdown:** Trả về JSON string thô để \`JSON.parse\` không bị lỗi.
- **Màu sắc (Asset Module):** Hệ thống hỗ trợ mọi mã HEX hợp lệ (#RRGGBB). Nếu người dùng KHÔNG chỉ định màu trong prompt, hãy chọn ngẫu nhiên một palette mẫu (Lavender / Mint / Peach / Sky) và dùng màu từ palette đó cho theme. Nếu người dùng CÓ yêu cầu màu riêng (tên màu hoặc mã HEX), hãy ưu tiên màu của họ.
- **source_color (bắt buộc):** Luôn trả về trường top-level \`source_color\` với giá trị đúng một trong hai chuỗi: \`prompt\` (màu đến từ yêu cầu người dùng) hoặc \`palette_fallback\` (màu từ palette mẫu vì prompt không chỉ màu).
- **Hình dạng entity:** Mỗi phần tử trong \`entities\` phải có \`shapeType\` là một trong: Square, Circle, Triangle (không dùng giá trị khác).
- **Logic:** Luôn phải có 1 entity \`type: "player"\`.
- **Logic Format (bắt buộc):** Trường \`logic\` là một mảng (Array). Tuyệt đối KHÔNG trả về \`logic\` là mảng các chuỗi văn bản mô tả thuần (ví dụ \`["rule 1", "rule 2"]\` là SAI). KHÔNG dùng mô tả văn bản thay cho cấu trúc object.
- **Logic phần tử:** Mỗi phần tử trong \`logic\` PHẢI là một JSON Object với đúng các khóa: \`id\` (string), \`description\` (string), \`trigger\` (string), \`action\` (string).

CRITICAL RULES - PHẢI TUÂN THỦ:
1. Mảng entities LUÔN LUÔN phải có ít nhất 1 entity với type: 'player'
2. Entity player PHẢI là phần tử đầu tiên trong mảng entities
3. Nếu prompt người dùng không đề cập player, tự động thêm:
   { type: 'player', shapeType: 'Circle', position: { x: 50, y: 50 } }
4. KHÔNG được bỏ qua rule này dù prompt là gì

BEHAVIOR SYSTEM:
Mỗi entity có thể có mảng behaviors[].
Các behavior hợp lệ:

MOVEMENT behaviors:
- { type: 'move', speed: number } 
  → player di chuyển WASD/arrow
- { type: 'patrol', range: number, speed: number }
  → entity đi qua lại
- { type: 'follow', target: 'player', speed: number }
  → entity đuổi theo player
- { type: 'bounce', speed: number }
  → entity nảy lại khi chạm tường
- { type: 'circular', radius: number, speed: number }
  → entity bay vòng tròn

PHYSICS behaviors:
- { type: 'gravity', force: number }
  → entity bị kéo xuống
- { type: 'jump', force: number }
  → player nhảy khi on ground
- { type: 'float' }
  → entity lơ lửng, không gravity

INTERACTION behaviors:
- { type: 'shoot', cooldown: number, 
    bulletSpeed: number, bulletColor: string }
  → entity bắn đạn
- { type: 'onCollide', target: string, 
    action: string, value?: number }
  → xử lý va chạm
- { type: 'onCollect', action: string, value?: number }
  → xử lý khi được nhặt

SPAWN behaviors:
- { type: 'spawnRandom', count: number }
  → spawn nhiều bản sao random
- { type: 'spawnOnTimer', interval: number }
  → spawn theo thời gian

ACTIONS hợp lệ cho onCollide/onCollect:
- 'addScore': cộng value điểm
- 'loseLife': mất 1 mạng
- 'gameOver': kết thúc game
- 'winGame': thắng game
- 'nextLevel': lên level

GAME RULES (gameConfig.rules[]):
- { trigger: 'scoreReach', value: number, 
    action: 'nextLevel'|'winGame' }
- { trigger: 'livesZero', action: 'gameOver' }
- { trigger: 'allCollected', action: 'winGame' }
- { trigger: 'timerEnd', action: 'gameOver' }
- { trigger: 'timer', value: number }
  → đếm ngược seconds

VÍ DỤ gameConfig hoàn chỉnh:
{
  entities: [
    {
      id: 'player', type: 'player',
      shapeType: 'Circle', colorHex: '#00ff88',
      position: { x: 50, y: 80 },
      width: 40, height: 40,
      behaviors: [
        { type: 'move', speed: 200 },
        { type: 'jump', force: 500 },
        { type: 'gravity', force: 600 }
      ]
    },
    {
      id: 'enemy_1', type: 'enemy',
      shapeType: 'Square', colorHex: '#ff4444',
      position: { x: 30, y: 50 },
      width: 40, height: 40,
      behaviors: [
        { type: 'patrol', range: 150, speed: 100 },
        { type: 'onCollide', target: 'player', 
          action: 'loseLife' }
      ]
    },
    {
      id: 'coin_1', type: 'collectible',
      shapeType: 'Circle', colorHex: '#FFD700',
      position: { x: 20, y: 30 },
      width: 20, height: 20,
      behaviors: [
        { type: 'spawnRandom', count: 5 },
        { type: 'onCollect', action: 'addScore', value: 10 }
      ]
    },
    {
      id: 'platform_1', type: 'platform',
      shapeType: 'Square', colorHex: '#4ECDC4',
      position: { x: 50, y: 90 },
      width: 200, height: 20,
      behaviors: []
    }
  ],
  rules: [
    { trigger: 'livesZero', action: 'gameOver' },
    { trigger: 'allCollected', action: 'winGame' }
  ],
  theme: {
    background: '#1a1a2e'
  },
  lives: 3
}

QUAN TRỌNG:
- Không dùng templateId trong gameConfig sinh từ luồng entity-based (behaviors).
- Luôn có entity type 'player' với behavior 'move'
- Platform ở y: 85-95% để làm sàn
- Behaviors phải phù hợp với type entity
- Vẫn bắt buộc: source_color, theme.primary + theme.background (HEX) + theme.vibe, logic (mảng object như quy tắc cũ), entities có width/height khi cần.`;

function extractLikelyJson(text: string): string {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return text.trim();
  return text.slice(start, end + 1).trim();
}

/**
 * Sau JSON.parse, trước Zod: nếu logic là mảng string → ép thành object chuẩn.
 */
function preprocessLogicArray(
  parsed: Record<string, unknown>,
  logger: Logger,
): void {
  if (parsed.logic == null) return;
  if (!Array.isArray(parsed.logic)) return;

  const arr = parsed.logic as unknown[];
  const allStrings =
    arr.length > 0 && arr.every((x) => typeof x === 'string');
  if (allStrings) {
    parsed.logic = (arr as string[]).map((description, index) => ({
      id: String(index),
      description,
      trigger: 'auto',
      action: 'manual',
    }));
    logger.warn(
      'AI.generateGameConfig: logic was string[]; coerced to object[] (trigger=auto, action=manual)',
    );
    return;
  }

  const hasString = arr.some((x) => typeof x === 'string');
  if (hasString) {
    parsed.logic = arr.map((item, index) => {
      if (typeof item === 'string') {
        return {
          id: String(index),
          description: item,
          trigger: 'auto',
          action: 'manual',
        };
      }
      return item;
    });
    logger.warn(
      'AI.generateGameConfig: logic array contained strings; coerced those entries to objects',
    );
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

const TEMPLATE_DETECT_SYSTEM =
  'Bạn chỉ trả về MỘT JSON object thuần (không markdown, không code fence, không giải thích).';

export type GameTemplateDetection = {
  templateId: string;
  confidence: number;
  config: Record<string, unknown>;
};

const ALLOWED_TEMPLATE_IDS = new Set([
  'snake',
  'flappy',
  'breakout',
  'platformer',
  'shooter',
  'none',
]);

function clampEntityPositions(input: GameConfig): GameConfig {
  return {
    ...input,
    entities: input.entities.map((e) => ({
      ...e,
      position: e.position
        ? {
            x: clamp(e.position.x, 0, 100),
            y: clamp(e.position.y, 0, 100),
          }
        : undefined,
    })),
  };
}

@Injectable()
export class AiEngineService {
  private readonly logger = new Logger(AiEngineService.name);
  private readonly useGroq: boolean;
  private readonly groqModel: string;
  private readonly groqClient: Groq | null;

  constructor(
    private readonly config: ConfigService,
    @InjectModel(Project.name)
    private readonly projectModel: Model<ProjectDocument>,
  ) {
    const groqKey = this.config.get<string>('GROQ_API_KEY')?.trim();
    this.useGroq = Boolean(groqKey);
    this.groqModel =
      this.config.get<string>('GROQ_MODEL')?.trim() ||
      'llama-3.3-70b-versatile';
    this.groqClient = groqKey ? new Groq({ apiKey: groqKey }) : null;
    if (this.useGroq) {
      this.logger.log(
        `AiEngineService: using Groq (model=${this.groqModel}) for generateGameConfig`,
      );
    } else {
      this.logger.log(
        'AiEngineService: GROQ_API_KEY not set; using Gemini for generateGameConfig',
      );
    }
  }

  private getModel() {
    const apiKey = this.config.getOrThrow<string>('GEMINI_API_KEY');
    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview',
      systemInstruction: SYSTEM_INSTRUCTION,
      apiVersion: 'v1beta',
    } as any);
  }

  /** Gemini không kèm systemInstruction GameConfig — dùng cho detect template. */
  private getTemplateDetectModel() {
    const apiKey = this.config.getOrThrow<string>('GEMINI_API_KEY');
    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview',
      apiVersion: 'v1beta',
    } as any);
  }

  private async callGroq(
    fullPrompt: string,
    systemContent: string = SYSTEM_INSTRUCTION,
  ): Promise<string> {
    if (!this.groqClient) {
      throw new Error('callGroq: Groq client is not initialized');
    }
    const completion = await this.groqClient.chat.completions.create({
      model: this.groqModel,
      messages: [
        { role: 'system', content: systemContent },
        { role: 'user', content: fullPrompt },
      ],
    });
    const content = completion.choices[0]?.message?.content;
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      const parts = content as unknown[];
      return parts
        .map((part) =>
          typeof part === 'object' &&
          part !== null &&
          'text' in part &&
          typeof (part as { text?: unknown }).text === 'string'
            ? (part as { text: string }).text
            : '',
        )
        .join('');
    }
    return '';
  }

  /**
   * Ép theme.primary/background/accent và entity.colorHex về HEX hợp lệ;
   * nếu không hợp lệ -> mã ngẫu nhiên từ bộ palette chuẩn.
   */
  private normalizeThemeAndEntityHexColors(config: GameConfig): GameConfig {
    const pool = [...ALL_PALETTE_HEX_COLORS];
    const theme = { ...config.theme } as Record<string, unknown>;

    for (const key of ['primary', 'background', 'accent']) {
      const v = theme[key];
      if (typeof v === 'string') {
        const { hex, wasReplaced } = normalizeHexOrRandom(v, pool);
        theme[key] = hex;
        if (wasReplaced) {
          this.logger.warn(
            `AI.generateGameConfig: invalid HEX theme.${key}="${v}" -> ${hex} (palette pool)`,
          );
        }
      }
    }

    const entities = config.entities.map((e) => {
      const ex = { ...e } as Record<string, unknown>;
      if (typeof ex['colorHex'] === 'string') {
        const { hex, wasReplaced } = normalizeHexOrRandom(ex['colorHex'] as string, pool);
        ex['colorHex'] = hex;
        if (wasReplaced) {
          this.logger.warn(
            `AI.generateGameConfig: invalid HEX entity id=${String(e.id)} colorHex -> ${hex}`,
          );
        }
      }
      return ex;
    });

    return {
      ...config,
      theme: theme as GameConfig['theme'],
      entities: entities as GameConfig['entities'],
    };
  }

  async listModels(): Promise<string[]> {
    const apiKey = this.config.getOrThrow<string>('GEMINI_API_KEY');
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    this.logger.log('listModels: fetching available models...');

    try {
      const res = await fetch(url);
      const json = (await res.json()) as {
        models?: { name: string }[];
        error?: { message: string };
      };

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

  async generateGameConfig(
    prompt: string,
    projectId?: string,
  ): Promise<GameConfig> {
    this.logger.log('[AI_LOG] generateGameConfig: start');
    this.logger.log(`[AI_LOG] Prompt: ${prompt}`);
    this.logger.log(`[AI_LOG] Prompt length=${prompt.length}`);

    let previousRawPrompt: string | undefined;
    if (projectId) {
      this.logger.log(
        `AI.generateGameConfig: loading context for projectId=${projectId}`,
      );
      const proj = await this.projectModel
        .findById(new Types.ObjectId(projectId))
        .select({ rawPrompt: 1 })
        .lean<{ rawPrompt?: string } | null>()
        .exec();
      previousRawPrompt = proj?.rawPrompt;
    }

    const geminiModel = this.useGroq ? null : this.getModel();

    const userText = [
      'Bạn là AI tạo gameConfig cho AI No-code Studio.',
      'YÊU CẦU ĐẦU RA: chỉ trả về MỘT JSON object thuần (không markdown, không code fence, không giải thích).',
      previousRawPrompt ? `RAW_PROMPT_CU: ${previousRawPrompt}` : undefined,
      `PROMPT_MOI: ${prompt}`,
      '',
      buildPaletteAndShapesPromptBlock(),
      '',
      'Nhắc lại yêu cầu bắt buộc:',
      '- Có trường top-level "source_color": "prompt" hoặc "palette_fallback" (đúng chữ, lowercase).',
      '- Nếu prompt KHÔNG nói gì về màu -> dùng palette ngẫu nhiên và đặt source_color=palette_fallback.',
      '- Nếu prompt CÓ yêu cầu màu (tên hoặc HEX) -> ưu tiên màu đó và đặt source_color=prompt.',
      '- theme.primary, theme.background là chuỗi HEX #RRGGBB; có thể thêm theme.accent.',
      '- vibe gợi ý: lavender_pastel hoặc phù hợp palette đã chọn.',
      '- Mỗi entity bắt buộc có "shapeType": "Square" | "Circle" | "Triangle".',
      '- entities phải có ít nhất 1 entity type="player".',
      '- gameConfig có: source_color, theme, entities, logic (logic là Array các OBJECT, không phải array string).',
      '',
      'VÍ DỤ đúng — trường "logic" (bắt chước cấu trúc, có thể đổi nội dung):',
      LOGIC_ARRAY_EXAMPLE,
    ]
      .filter(Boolean)
      .join('\n');

    for (let attempt = 0; attempt < 2; attempt += 1) {
      let rawText: string;
      if (this.useGroq) {
        this.logger.log(
          `AI.generateGameConfig: calling Groq (attempt ${attempt + 1}/2)`,
        );
        try {
          rawText = await this.callGroq(userText);
        } catch (error) {
          const err = error as Error;
          this.logger.error(
            `AI.generateGameConfig: callGroq failed (attempt ${attempt + 1}/2): ${err.message}`,
            err.stack,
          );
          throw error;
        }
        this.logger.log(`[AI_LOG] Response Raw: ${rawText}`);
        this.logger.log(
          `AI.generateGameConfig: Groq raw response length=${rawText.length}`,
        );
      } else {
        this.logger.log(
          `AI.generateGameConfig: calling Gemini (attempt ${attempt + 1}/2)`,
        );
        let result;
        try {
          result = await geminiModel!.generateContent(userText);
        } catch (error) {
          const err = error as Error;
          this.logger.error(
            `AI.generateGameConfig: generateContent failed (attempt ${attempt + 1}/2): ${err.message}`,
            err.stack,
          );
          throw error;
        }
        rawText = result.response.text();
        const usage = (result.response as unknown as { usageMetadata?: unknown })
          ?.usageMetadata;
        this.logger.log(`[AI_LOG] Response Raw: ${rawText}`);
        this.logger.log(`[AI_LOG] Tokens: ${JSON.stringify(usage ?? null)}`);
        this.logger.log(
          `AI.generateGameConfig: Gemini raw response length=${rawText.length}`,
        );
      }

      const jsonText = extractLikelyJson(rawText);
      this.logger.log(
        `AI.generateGameConfig: extracted JSON length=${jsonText.length}`,
      );

      try {
        const parsed = JSON.parse(jsonText) as Record<string, unknown>;
        this.logger.log('AI.generateGameConfig: JSON.parse OK');
        this.logger.log(
          `AI.generateGameConfig: parsed JSON = ${JSON.stringify(parsed, null, 2)}`,
        );

        if (
          parsed.logic != null &&
          !Array.isArray(parsed.logic) &&
          typeof parsed.logic === 'object'
        ) {
          parsed.logic = [parsed.logic];
          this.logger.warn(
            'AI.generateGameConfig: logic object detected, wrapped into array',
          );
        }

        preprocessLogicArray(parsed, this.logger);

        const validated = GameConfigSchema.parse(parsed);
        this.logger.log('AI.generateGameConfig: Zod validate OK');
        this.logger.log(
          `AI.generateGameConfig: source_color (from AI) = ${validated.source_color}`,
        );

        let out = clampEntityPositions(validated);
        out = this.normalizeThemeAndEntityHexColors(out);
        this.logger.log(
          `AI.generateGameConfig: source_color (after pipeline) = ${out.source_color}`,
        );

        return out;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(
          `AI.generateGameConfig: parse/validate failed (attempt ${attempt + 1}/2): ${message}`,
        );

        if (attempt === 0) {
          this.logger.log('AI.generateGameConfig: retrying once...');
          continue;
        }
        throw err;
      }
    }

    throw new Error('AI.generateGameConfig: unexpected failure');
  }

  /**
   * Phân loại prompt → templateId + confidence + config tùy chỉnh (không sinh full gameConfig).
   */
  async detectGameTemplate(prompt: string): Promise<GameTemplateDetection> {
    const userBlock = [
      'Phân tích prompt sau và trả về JSON:',
      '{',
      `  "templateId": "snake" | "flappy" | "breakout" | "platformer" | "shooter" | "none",`,
      '  "confidence": <số 0 đến 1>,',
      '  "config": { <các tham số tùy chỉnh, object> }',
      '}',
      '',
      'Mapping:',
      "- rắn săn mồi / snake → templateId: 'snake'",
      "- flappy / chim bay → templateId: 'flappy'",
      "- breakout / phá gạch / bóng → templateId: 'breakout'",
      "- platformer / nhảy platform → templateId: 'platformer'",
      "- bắn súng / shooter / space → templateId: 'shooter'",
      '- không rõ / custom → templateId: "none"',
      '',
      'Config extract từ prompt:',
      '- màu sắc → snakeColor / birdColor / ballColor / paddleColor / foodColor / pipeColor / backgroundColor (HEX khi có)',
      '- tốc độ nhanh/chậm → speed: 250 hoặc 150 (số)',
      '- khó/dễ → difficulty: "hard" hoặc "easy"',
      '',
      `Prompt: ${prompt}`,
    ].join('\n');

    const fallback: GameTemplateDetection = {
      templateId: 'none',
      confidence: 0,
      config: {},
    };

    try {
      let rawText: string;
      if (this.useGroq) {
        rawText = await this.callGroq(userBlock, TEMPLATE_DETECT_SYSTEM);
      } else {
        const model = this.getTemplateDetectModel();
        const result = await model.generateContent([
          { text: `${TEMPLATE_DETECT_SYSTEM}\n\n${userBlock}` },
        ]);
        rawText = result.response.text();
      }

      const jsonText = extractLikelyJson(rawText);
      const parsed = JSON.parse(jsonText) as Record<string, unknown>;
      let templateId =
        typeof parsed.templateId === 'string'
          ? parsed.templateId.trim().toLowerCase()
          : 'none';
      if (!ALLOWED_TEMPLATE_IDS.has(templateId)) {
        templateId = 'none';
      }

      let confidence = 0;
      if (typeof parsed.confidence === 'number' && Number.isFinite(parsed.confidence)) {
        confidence = clamp(parsed.confidence, 0, 1);
      }

      let config: Record<string, unknown> = {};
      if (
        parsed.config != null &&
        typeof parsed.config === 'object' &&
        !Array.isArray(parsed.config)
      ) {
        config = { ...(parsed.config as Record<string, unknown>) };
      }
      if (
        parsed.templateConfig != null &&
        typeof parsed.templateConfig === 'object' &&
        !Array.isArray(parsed.templateConfig)
      ) {
        config = {
          ...config,
          ...(parsed.templateConfig as Record<string, unknown>),
        };
      }

      this.logger.log(
        `AI.detectGameTemplate: templateId=${templateId} confidence=${confidence}`,
      );
      return { templateId, confidence, config };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`AI.detectGameTemplate failed: ${msg}`);
      return fallback;
    }
  }
}
