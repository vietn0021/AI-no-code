const HEX_6 = /^#([0-9A-Fa-f]{6})$/;

export function isValidHex6(value: string): boolean {
  return typeof value === 'string' && HEX_6.test(value.trim());
}

/** Chuẩn hóa #RRGGBB (uppercase). */
export function normalizeHex6(value: string): string {
  return `#${value.trim().slice(1).toUpperCase()}`;
}

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

/**
 * Nếu không hợp lệ hoặc thiếu, trả về mã ngẫu nhiên từ bộ palette chuẩn.
 */
export function normalizeHexOrRandom(
  value: string | undefined,
  palettePool: readonly string[],
): { hex: string; wasReplaced: boolean } {
  if (value != null && isValidHex6(value)) {
    return { hex: normalizeHex6(value), wasReplaced: false };
  }
  return { hex: normalizeHex6(pickRandom(palettePool)), wasReplaced: true };
}
