import type { GameEntity } from '../../../store/useEditorStore'

export function toNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const n = parseFloat(value)
    if (Number.isFinite(n)) return n
  }
  return fallback
}

export function resolveEntityColor(entity: GameEntity, fallback = '#94a3b8'): string {
  const hex = entity.colorHex ?? entity.color
  if (typeof hex === 'string' && hex.trim().length > 0) return hex.trim()
  return fallback
}

export function resolveEntitySize(entity: GameEntity): { w: number; h: number } {
  // Frontend engine render theo px cho kích thước.
  // backend (AI) đôi khi chỉ trả `settings.width/height` dưới dạng số (px),
  // nên mặc định phải là 60px để tránh render tràn màn hình khi thiếu size.
  const w = toNumber(entity.width, NaN)
  const h = toNumber(entity.height, NaN)
  const ws = entity.settings?.width
  const hs = entity.settings?.height

  const wFromSettings = toNumber(ws, NaN)
  const hFromSettings = toNumber(hs, NaN)

  const wFinal = Number.isFinite(w)
    ? w
    : Number.isFinite(wFromSettings)
      ? wFromSettings
      : 60
  const hFinal = Number.isFinite(h)
    ? h
    : Number.isFinite(hFromSettings)
      ? hFromSettings
      : wFinal

  return { w: wFinal, h: hFinal }
}

export function resolveEntityPosition(entity: GameEntity): { x: number; y: number } {
  return {
    x: toNumber(entity.position?.x, 50),
    y: toNumber(entity.position?.y, 50),
  }
}

export function normalizeShape(shapeType: string): 'square' | 'circle' | 'triangle' {
  const s = shapeType.trim().toLowerCase()
  if (s === 'circle') return 'circle'
  if (s === 'triangle') return 'triangle'
  return 'square'
}

const SHAPE_VI: Record<string, string> = {
  square: 'Khối vuông',
  circle: 'Hình tròn',
  triangle: 'Tam giác',
}

export function shapeLabelVi(shapeType: string): string {
  const key = String(shapeType ?? '').trim().toLowerCase()
  return SHAPE_VI[key] ?? String(shapeType || 'Entity')
}

/** Chuẩn hoá hex cho `<input type="color">` (6 ký tự). */
export function toColorInputValue(hex: string | undefined, fallback = '#94a3b8'): string {
  const raw = (hex && hex.trim()) || fallback
  let t = raw.trim()
  if (!t.startsWith('#')) t = `#${t}`
  if (/^#[0-9A-Fa-f]{6}$/i.test(t)) return t.toUpperCase()
  if (/^#[0-9A-Fa-f]{3}$/i.test(t) && t.length === 4) {
    const r = t[1]!
    const g = t[2]!
    const b = t[3]!
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase()
  }
  return fallback.toUpperCase()
}
