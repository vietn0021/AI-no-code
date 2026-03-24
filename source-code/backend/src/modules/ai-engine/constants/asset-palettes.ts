/**
 * Theo docs/02-backend/asset-module/readme.md
 */
export const PALETTES = {
  lavender: ['#E6E6FA', '#F3E5F5', '#C8A2C8', '#B39DDB', '#9575CD'],
  mint: ['#98FF98', '#B8F2E6', '#A8E6CF', '#7FD8BE', '#4ECDC4'],
  peach: ['#FFDAB9', '#FFCBA4', '#FFB7A5', '#F8C8DC', '#F4A261'],
  sky: ['#87CEEB', '#BDE0FE', '#A2D2FF', '#90CAF9', '#64B5F6'],
} as const;

export const ALL_PALETTE_HEX_COLORS: readonly string[] = [
  ...PALETTES.lavender,
  ...PALETTES.mint,
  ...PALETTES.peach,
  ...PALETTES.sky,
];

export const ALLOWED_SHAPE_TYPES = ['Square', 'Circle', 'Triangle'] as const;

export type AllowedShapeType = (typeof ALLOWED_SHAPE_TYPES)[number];

/** Chuỗi mô tả palettes + shapes cho SYSTEM_PROMPT / user prompt. */
export function buildPaletteAndShapesPromptBlock(): string {
  const lines: string[] = [
    'PALETTES_MAU_MAU (chọn ngẫu nhiên 1 palette khi user KHÔNG chỉ định màu):',
    `- Lavender: ${PALETTES.lavender.join(', ')}`,
    `- Mint: ${PALETTES.mint.join(', ')}`,
    `- Peach: ${PALETTES.peach.join(', ')}`,
    `- Sky: ${PALETTES.sky.join(', ')}`,
    '',
    'SHAPES_HOP_LE (mỗi entity PHẢI có shapeType là một trong):',
    `- ${ALLOWED_SHAPE_TYPES.join(', ')}`,
  ];
  return lines.join('\n');
}
