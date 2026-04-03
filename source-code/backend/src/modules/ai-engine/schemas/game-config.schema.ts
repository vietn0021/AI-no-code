import { z } from 'zod';

const PositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

/** Đồng bộ với docs/02-backend/asset-module (Square, Circle, Triangle). */
const ShapeTypeSchema = z.enum(['Square', 'Circle', 'Triangle']);

const BehaviorSchema = z
  .object({
    type: z.string(),
    speed: z.number().optional(),
    force: z.number().optional(),
    range: z.number().optional(),
    target: z.string().optional(),
    action: z.string().optional(),
    value: z.number().optional(),
    count: z.number().optional(),
    interval: z.number().optional(),
    cooldown: z.number().optional(),
    bulletSpeed: z.number().optional(),
    bulletColor: z.string().optional(),
  })
  .passthrough();

const GameRulesEntrySchema = z.object({
  trigger: z.string(),
  value: z.number().optional(),
  action: z.string(),
});

const EntitySchema = z
  .object({
    id: z.string(),
    type: z.string(),
    shapeType: ShapeTypeSchema,
    colorHex: z.string().optional(),
    position: PositionSchema.optional(),
    settings: z.record(z.string(), z.unknown()).optional(),
    behaviors: z.array(BehaviorSchema).optional().default([]),
  })
  .passthrough();

/** Mỗi rule: object có đủ id + description + trigger + action (không phải chuỗi thuần). */
const LogicRuleSchema = z
  .object({
    id: z.string(),
    description: z.string(),
    trigger: z.string(),
    action: z.string(),
  })
  .passthrough();

const SourceColorSchema = z.enum(['prompt', 'palette_fallback']);

export const GameConfigSchema = z
  .object({
    source_color: SourceColorSchema,
    theme: z
      .object({
        primary: z.string(),
        background: z.string(),
        vibe: z.string(),
      })
      .passthrough(),
    entities: z.array(EntitySchema),
    logic: z.array(LogicRuleSchema).optional(),
    rules: z.array(GameRulesEntrySchema).optional().default([]),
    lives: z.number().optional().default(3),
  })
  .passthrough()
  .superRefine((val, ctx) => {
    const hasPlayer = val.entities.some((e) => e.type === 'player');
    if (!hasPlayer) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'GameConfig must contain an entity with type: "player"',
        path: ['entities'],
      });
    }
  });

export type GameConfig = z.infer<typeof GameConfigSchema>;
