/** Đọc số từ templateDefaults (API / editor). */
export function cfgNum(v: unknown, fallback: number): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = parseFloat(v)
    if (Number.isFinite(n)) return n
  }
  return fallback
}

export function hexToPhaserColor(hex: string | undefined, fallback: number): number {
  const raw = (hex && String(hex).trim()) || ''
  let t = raw.startsWith('#') ? raw.slice(1) : raw
  if (t.length === 3) {
    t = t[0]! + t[0]! + t[1]! + t[1]! + t[2]! + t[2]!
  }
  if (!/^[0-9A-Fa-f]{6}$/.test(t)) return fallback
  return parseInt(t, 16)
}

export function cfgHex(v: unknown, fallback: string): string {
  if (typeof v === 'string' && v.trim().startsWith('#')) return v.trim()
  return fallback
}

export type TemplateRuntimePayload = {
  width: number
  height: number
  templateConfig: Record<string, unknown>
}
