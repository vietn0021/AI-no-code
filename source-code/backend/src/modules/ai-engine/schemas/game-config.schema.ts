import { z } from 'zod';

const PositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

const EntitySchema = z
  .object({
    id: z.string(),
    type: z.string(),
    position: PositionSchema.optional(),
    settings: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

const LogicRuleSchema = z
  .object({
    trigger: z.string(),
    action: z.string(),
  })
  .passthrough();

export const GameConfigSchema = z
  .object({
    theme: z
      .object({
        primary: z.string(),
        background: z.string(),
        vibe: z.string(),
      })
      .passthrough(),
    entities: z.array(EntitySchema),
    logic: z.array(LogicRuleSchema).optional(),
  })
  .passthrough()
  .superRefine((val, ctx) => {
    const hasPlayer = val.entities.some((e) => e.type === 'player');
    if (!hasPlayer) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'GameConfig must contain an entity with type: \"player\"',
        path: ['entities'],
      });
    }
  });

export type GameConfig = z.infer<typeof GameConfigSchema>;
