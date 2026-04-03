import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Minus, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '../../../lib/utils'
import { useEditorStore } from '../../../store/useEditorStore'
import {
  resolveEntityColor,
  resolveEntityPosition,
  resolveEntitySize,
  shapeLabelVi,
  toColorInputValue,
} from '../lib/entityView'

/**
 * Bảng màu Asset Module — đồng bộ `docs/02-backend/asset-module/readme.md`.
 */
export const ASSET_PALETTES = [
  {
    id: 'lavender',
    title: 'Lavender Palette',
    colors: ['#E6E6FA', '#F3E5F5', '#C8A2C8', '#B39DDB', '#9575CD'],
  },
  {
    id: 'mint',
    title: 'Mint Palette',
    colors: ['#98FF98', '#B8F2E6', '#A8E6CF', '#7FD8BE', '#4ECDC4'],
  },
  {
    id: 'peach',
    title: 'Peach Palette',
    colors: ['#FFDAB9', '#FFCBA4', '#FFB7A5', '#F8C8DC', '#F4A261'],
  },
  {
    id: 'sky',
    title: 'Sky Palette',
    colors: ['#87CEEB', '#BDE0FE', '#A2D2FF', '#90CAF9', '#64B5F6'],
  },
] as const

function normalizeHexCompare(a: string, b: string): boolean {
  return a.trim().toUpperCase() === b.trim().toUpperCase()
}

const ENTITY_TYPE_ICON: Record<string, string> = {
  player: '🎮',
  collectible: '⭐',
  enemy: '💀',
  platform: '▬',
  goal: '🏁',
  ground: '🟫',
  obstacle: '⬛',
  sprite: '🖼',
  decoration: '✨',
}

/** Đồng bộ với `GameRuntime` / layer — có thể nhập thêm type tùy ý. */
const ENTITY_TYPE_PRESETS: { value: string; label: string }[] = [
  { value: 'player', label: 'Player (điều khiển trong Play)' },
  { value: 'platform', label: 'Platform' },
  { value: 'goal', label: 'Goal (đích)' },
  { value: 'ground', label: 'Ground' },
  { value: 'obstacle', label: 'Obstacle' },
  { value: 'collectible', label: 'Collectible (+điểm khi chạm)' },
  { value: 'enemy', label: 'Enemy' },
  { value: 'sprite', label: 'Sprite (ảnh / kéo từ Assets)' },
  { value: 'decoration', label: 'Decoration' },
]

const ENTITY_TYPE_PRESET_VALUES = new Set(ENTITY_TYPE_PRESETS.map((o) => o.value))

function typeOptionDisplay(value: string, label: string): string {
  const icon = ENTITY_TYPE_ICON[value] ?? '◇'
  return `${icon} ${label}`
}

const panelEase = [0.22, 1, 0.36, 1] as const

type InspectorEntityFormProps = {
  entityId: string
}

function SectionCard({
  title,
  subtitle,
  children,
  className,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-white/50 bg-gradient-to-b from-white/45 to-white/25 p-3.5 shadow-sm backdrop-blur-sm',
        className,
      )}
    >
      <h3 className="font-display text-[11px] font-bold uppercase tracking-[0.12em] text-sky-dark/95">
        {title}
      </h3>
      {subtitle ? <p className="mt-1 text-[10px] leading-snug text-slate-500">{subtitle}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  )
}

function NumberFieldWithSteppers({
  label,
  valueStr,
  setValueStr,
  step,
  min,
  max,
  onStep,
  onCommit,
  suffix,
}: {
  label: string
  valueStr: string
  setValueStr: (v: string) => void
  step: number
  min?: number
  max?: number
  onStep: (dir: -1 | 1) => void
  onCommit: () => void
  suffix?: string
}) {
  return (
    <div className="space-y-1">
      <span className="text-[11px] font-medium text-slate-600">
        {label}
        {suffix ? <span className="text-slate-400"> {suffix}</span> : null}
      </span>
      <div className="flex items-stretch gap-1">
        <button
          type="button"
          aria-label={`Giảm ${label}`}
          className="flex w-8 shrink-0 items-center justify-center rounded-l-xl border border-white/60 bg-white/55 text-sky-dark shadow-inner transition hover:bg-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-dark/25"
          onClick={() => onStep(-1)}
        >
          <Minus className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
        </button>
        <input
          type="number"
          step={step}
          min={min}
          max={max}
          className="min-w-0 flex-1 border-y border-white/60 bg-white/60 px-2 py-2 text-center font-mono text-sm text-slate-800 shadow-inner [appearance:textfield] focus:border-sky-dark/35 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-sky-dark/15 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          value={valueStr}
          onChange={(e) => setValueStr(e.target.value)}
          onBlur={onCommit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              onCommit()
              ;(e.target as HTMLInputElement).blur()
            }
          }}
        />
        <button
          type="button"
          aria-label={`Tăng ${label}`}
          className="flex w-8 shrink-0 items-center justify-center rounded-r-xl border border-white/60 bg-white/55 text-sky-dark shadow-inner transition hover:bg-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-dark/25"
          onClick={() => onStep(1)}
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
        </button>
      </div>
    </div>
  )
}

function InspectorEntityForm({ entityId }: InspectorEntityFormProps) {
  const gameConfig = useEditorStore((s) => s.gameConfig)
  const updateEntity = useEditorStore((s) => s.updateEntity)

  const entity = useMemo(
    () => gameConfig.entities.find((e) => e.id === entityId),
    [gameConfig.entities, entityId],
  )

  const pos = entity ? resolveEntityPosition(entity) : { x: 0, y: 0 }
  const size = entity ? resolveEntitySize(entity) : { w: 0, h: 0 }
  const colorResolved = entity ? resolveEntityColor(entity) : '#94a3b8'

  const [hexDraft, setHexDraft] = useState(colorResolved)
  const [xStr, setXStr] = useState(String(pos.x))
  const [yStr, setYStr] = useState(String(pos.y))
  const [wStr, setWStr] = useState(String(size.w))
  const [hStr, setHStr] = useState(String(size.h))
  const rawEntityType = String(entity?.type ?? '').trim()
  const [typeCustomDraft, setTypeCustomDraft] = useState(rawEntityType)
  const [preferCustomTypeUi, setPreferCustomTypeUi] = useState(false)

  useEffect(() => {
    setHexDraft(colorResolved)
  }, [entityId, colorResolved])

  useEffect(() => {
    setTypeCustomDraft(rawEntityType)
  }, [entityId, rawEntityType])

  useEffect(() => {
    setPreferCustomTypeUi(false)
  }, [entityId])

  useEffect(() => {
    setXStr(String(pos.x))
  }, [entityId, pos.x])

  useEffect(() => {
    setYStr(String(pos.y))
  }, [entityId, pos.y])

  useEffect(() => {
    setWStr(String(size.w))
  }, [entityId, size.w])

  useEffect(() => {
    setHStr(String(size.h))
  }, [entityId, size.h])

  if (!entity) {
    return <p className="text-sm text-slate-500">Không tìm thấy entity.</p>
  }

  const ent = entity

  const selectClass =
    'mt-2 w-full cursor-pointer rounded-xl border border-white/60 bg-white/55 py-2.5 pl-3 pr-8 text-sm text-slate-800 shadow-inner focus:border-sky-dark/40 focus:outline-none focus:ring-2 focus:ring-sky-dark/20'

  const inputClassMono =
    'rounded-xl border border-white/60 bg-white/55 px-3 py-2 font-mono text-sm text-slate-800 shadow-inner focus:border-sky-dark/40 focus:outline-none focus:ring-2 focus:ring-sky-dark/20'

  function applyHex(hex: string) {
    const v = hex.trim().toUpperCase()
    updateEntity(ent.id, { colorHex: v })
    setHexDraft(v)
  }

  const currentHex = resolveEntityColor(ent)

  function commitX() {
    const n = parseFloat(xStr)
    if (!Number.isFinite(n)) {
      setXStr(String(pos.x))
      return
    }
    updateEntity(ent.id, {
      position: { x: n, y: resolveEntityPosition(ent).y },
    })
  }

  function commitY() {
    const n = parseFloat(yStr)
    if (!Number.isFinite(n)) {
      setYStr(String(pos.y))
      return
    }
    updateEntity(ent.id, {
      position: { x: resolveEntityPosition(ent).x, y: n },
    })
  }

  function commitWidth() {
    const n = parseFloat(wStr)
    if (!Number.isFinite(n) || n <= 0) {
      setWStr(String(size.w))
      return
    }
    updateEntity(ent.id, { width: n })
  }

  function commitHeight() {
    const n = parseFloat(hStr)
    if (!Number.isFinite(n) || n <= 0) {
      setHStr(String(size.h))
      return
    }
    updateEntity(ent.id, { height: n })
  }

  function clamp(n: number, lo?: number, hi?: number): number {
    let x = n
    if (lo != null) x = Math.max(lo, x)
    if (hi != null) x = Math.min(hi, x)
    return Math.round(x * 1000) / 1000
  }

  function stepX(dir: -1 | 1) {
    const n = parseFloat(xStr)
    const base = Number.isFinite(n) ? n : pos.x
    const next = clamp(base + dir * 0.5)
    updateEntity(ent.id, { position: { x: next, y: resolveEntityPosition(ent).y } })
    setXStr(String(next))
  }

  function stepY(dir: -1 | 1) {
    const n = parseFloat(yStr)
    const base = Number.isFinite(n) ? n : pos.y
    const next = clamp(base + dir * 0.5)
    updateEntity(ent.id, { position: { x: resolveEntityPosition(ent).x, y: next } })
    setYStr(String(next))
  }

  function stepW(dir: -1 | 1) {
    const n = parseFloat(wStr)
    const base = Number.isFinite(n) ? n : size.w
    const next = clamp(base + dir * 1, 1)
    updateEntity(ent.id, { width: next })
    setWStr(String(next))
  }

  function stepH(dir: -1 | 1) {
    const n = parseFloat(hStr)
    const base = Number.isFinite(n) ? n : size.h
    const next = clamp(base + dir * 1, 1)
    updateEntity(ent.id, { height: next })
    setHStr(String(next))
  }

  const hexForPicker = (() => {
    const t = hexDraft.trim()
    const withHash = t.startsWith('#') ? t : `#${t}`
    if (/^#[0-9A-Fa-f]{6}$/i.test(withHash)) {
      return toColorInputValue(withHash)
    }
    return toColorInputValue(currentHex)
  })()

  const typeSelectValue =
    preferCustomTypeUi || !ENTITY_TYPE_PRESET_VALUES.has(rawEntityType)
      ? '__custom__'
      : rawEntityType

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: panelEase }}
      className="space-y-4"
    >
      <SectionCard
        title="Vị trí & Kích thước"
        subtitle="Tọa độ % trong khung Preview; kích thước theo pixel."
      >
        <div className="grid grid-cols-2 gap-3">
          <NumberFieldWithSteppers
            label="X"
            suffix="(%)"
            valueStr={xStr}
            setValueStr={setXStr}
            step={0.5}
            onStep={stepX}
            onCommit={commitX}
          />
          <NumberFieldWithSteppers
            label="Y"
            suffix="(%)"
            valueStr={yStr}
            setValueStr={setYStr}
            step={0.5}
            onStep={stepY}
            onCommit={commitY}
          />
          <NumberFieldWithSteppers
            label="Rộng"
            suffix="(px)"
            valueStr={wStr}
            setValueStr={setWStr}
            step={1}
            min={1}
            onStep={stepW}
            onCommit={commitWidth}
          />
          <NumberFieldWithSteppers
            label="Cao"
            suffix="(px)"
            valueStr={hStr}
            setValueStr={setHStr}
            step={1}
            min={1}
            onStep={stepH}
            onCommit={commitHeight}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Màu sắc"
        subtitle="Chọn nhanh palette hoặc tinh chỉnh HEX."
      >
        <div className="flex items-stretch gap-3">
          <label className="group relative block shrink-0 cursor-pointer">
            <span className="sr-only">Chọn màu</span>
            <input
              type="color"
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              aria-label="Chọn màu — đồng bộ với HEX"
              value={hexForPicker}
              onChange={(e) => {
                applyHex(e.target.value.toUpperCase())
              }}
            />
            <span
              className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-white/80 shadow-inner ring-2 ring-sky-dark/10 transition group-hover:ring-sky-dark/25"
              style={{ backgroundColor: hexForPicker }}
            />
          </label>
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
            <span className="text-[11px] font-medium text-slate-600">Mã HEX</span>
            <input
              type="text"
              spellCheck={false}
              className={cn(inputClassMono, 'w-full uppercase')}
              value={hexDraft}
              onChange={(e) => {
                const v = e.target.value
                setHexDraft(v)
                const t = v.trim()
                const withHash = t.startsWith('#') ? t : `#${t}`
                const body = withHash.slice(1)
                if (/^[0-9A-Fa-f]{6}$/.test(body)) {
                  updateEntity(ent.id, { colorHex: `#${body.toUpperCase()}` })
                }
              }}
              onBlur={() => {
                const t = hexDraft.trim()
                if (/^#[0-9A-Fa-f]{6}$/i.test(t)) {
                  const norm = t.startsWith('#') ? t.toUpperCase() : `#${t.toUpperCase()}`
                  updateEntity(ent.id, { colorHex: norm })
                  setHexDraft(norm)
                } else {
                  setHexDraft(resolveEntityColor(ent))
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  ;(e.target as HTMLInputElement).blur()
                }
              }}
            />
          </div>
        </div>

        <div className="mt-4 space-y-3 border-t border-white/40 pt-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Asset palettes</p>
          {ASSET_PALETTES.map((palette) => (
            <div key={palette.id}>
              <p className="mb-2 text-[11px] font-medium text-slate-600">{palette.title}</p>
              <div className="flex flex-wrap gap-2">
                {palette.colors.map((hex) => {
                  const active = normalizeHexCompare(currentHex, hex)
                  return (
                    <button
                      key={hex}
                      type="button"
                      title={hex}
                      aria-label={`Chọn màu ${hex}`}
                      className={cn(
                        'h-7 w-7 shrink-0 rounded-full border border-white/70 shadow-sm transition',
                        'hover:scale-110 hover:border-sky-dark/55 hover:ring-2 hover:ring-sky-dark/20',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-dark/40',
                        active && 'border-sky-dark ring-2 ring-sky-dark/40',
                      )}
                      style={{ backgroundColor: hex }}
                      onClick={() => applyHex(hex)}
                    />
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Vai trò"
        subtitle="Ảnh hưởng logic chế độ Play (player, collectible, platform…)."
      >
        <label className="block text-[11px] font-medium text-slate-600">
          Loại entity
          <select
            className={selectClass}
            value={typeSelectValue}
            onChange={(e) => {
              const v = e.target.value
              if (v === '__custom__') {
                setPreferCustomTypeUi(true)
                setTypeCustomDraft(rawEntityType || '')
                return
              }
              setPreferCustomTypeUi(false)
              updateEntity(ent.id, { type: v })
            }}
          >
            {ENTITY_TYPE_PRESETS.map((o) => (
              <option key={o.value} value={o.value}>
                {typeOptionDisplay(o.value, o.label)}
              </option>
            ))}
            <option value="__custom__">✎ Khác (nhập tay)…</option>
          </select>
        </label>
        {typeSelectValue === '__custom__' ? (
          <label className="mt-3 block text-[11px] font-medium text-slate-600">
            Type tùy chỉnh
            <input
              type="text"
              spellCheck={false}
              className={cn(inputClassMono, 'mt-2 w-full text-xs')}
              value={typeCustomDraft}
              placeholder="ví dụ: boss, coin, …"
              onChange={(e) => setTypeCustomDraft(e.target.value)}
              onBlur={() => {
                const t = typeCustomDraft.trim()
                updateEntity(ent.id, { type: t.length > 0 ? t : 'decoration' })
                setPreferCustomTypeUi(false)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  ;(e.target as HTMLInputElement).blur()
                }
              }}
            />
          </label>
        ) : null}
      </SectionCard>
    </motion.div>
  )
}

/**
 * Inspector cột phải Studio: cuộn nội dung, palette Asset Module, đồng bộ HEX.
 */
export function InspectorPanel() {
  const gameConfig = useEditorStore((s) => s.gameConfig)
  const selectedEntityId = useEditorStore((s) => s.selectedEntityId)
  const setSelectedEntityId = useEditorStore((s) => s.setSelectedEntityId)
  const removeEntity = useEditorStore((s) => s.removeEntity)

  const entities = useMemo(
    () => (Array.isArray(gameConfig.entities) ? gameConfig.entities : []),
    [gameConfig.entities],
  )

  useEffect(() => {
    if (selectedEntityId && !entities.some((e) => e.id === selectedEntityId)) {
      setSelectedEntityId(null)
    }
  }, [entities, selectedEntityId, setSelectedEntityId])

  const selectedEntity = selectedEntityId
    ? entities.find((e) => e.id === selectedEntityId)
    : null

  const theme = gameConfig.theme
  const selectedPos = selectedEntity ? resolveEntityPosition(selectedEntity) : null
  const selectedSize = selectedEntity ? resolveEntitySize(selectedEntity) : null
  const selectedHex = selectedEntity ? resolveEntityColor(selectedEntity) : null

  return (
    <div className="glass-surface flex max-h-[min(52vh,28rem)] min-h-0 shrink-0 flex-col border-t border-white/50">
      <div className="shrink-0 border-b border-white/35 bg-white/20 px-3 py-2.5 backdrop-blur-sm">
        <p className="font-display text-xs font-bold uppercase tracking-[0.14em] text-sky-dark/95">
          Inspector
        </p>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {selectedEntity ? (
          <motion.div
            key={`insp-${selectedEntity.id}`}
            role="tabpanel"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.26, ease: panelEase }}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="shrink-0 space-y-1.5 border-b border-white/30 px-3 py-3">
              <p className="truncate font-mono text-xs text-slate-700" title={selectedEntity.id}>
                {selectedEntity.id}
              </p>
              <p className="text-[11px] text-slate-500">
                {shapeLabelVi(String(selectedEntity.shapeType ?? ''))}
                {selectedEntity.type ? ` · ${selectedEntity.type}` : ''}
              </p>
              {selectedPos && selectedSize && selectedHex ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="rounded-lg border border-white/50 bg-white/40 px-2 py-0.5 font-mono text-[10px] text-slate-700">
                    X {selectedPos.x.toFixed(1)}%
                  </span>
                  <span className="rounded-lg border border-white/50 bg-white/40 px-2 py-0.5 font-mono text-[10px] text-slate-700">
                    Y {selectedPos.y.toFixed(1)}%
                  </span>
                  <span className="rounded-lg border border-white/50 bg-white/40 px-2 py-0.5 font-mono text-[10px] text-slate-700">
                    W {selectedSize.w.toFixed(0)}px
                  </span>
                  <span className="rounded-lg border border-white/50 bg-white/40 px-2 py-0.5 font-mono text-[10px] text-slate-700">
                    H {selectedSize.h.toFixed(0)}px
                  </span>
                  <span className="rounded-lg border border-sky-dark/25 bg-sky-light/40 px-2 py-0.5 font-mono text-[10px] text-sky-dark">
                    {selectedHex}
                  </span>
                </div>
              ) : null}
              <button
                type="button"
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-red-200/90 bg-red-50/95 px-3 py-2 text-sm font-semibold text-red-700 shadow-sm transition hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50"
                title="Xóa vật thể đang chọn"
                aria-label={`Xóa vật thể ${selectedEntity.id}`}
                onClick={() => {
                  if (!selectedEntityId) return
                  const ok = window.confirm(
                    `Xóa vật thể "${selectedEntity.id}"? Hành động này không hoàn tác.`,
                  )
                  if (!ok) return
                  removeEntity(selectedEntityId)
                  toast.success('Đã xóa vật thể.')
                }}
              >
                <Trash2 className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                Xóa
              </button>
            </div>

            <div className="inspector-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-3">
              <InspectorEntityForm entityId={selectedEntity.id} />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="insp-empty"
            role="status"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.24, ease: panelEase }}
            className="inspector-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-4 text-sm text-slate-600"
          >
            <p className="leading-relaxed">Chọn một vật thể trên canvas hoặc trong danh sách Layers.</p>
            {theme ? (
              <div className="mt-4 rounded-2xl border border-white/45 bg-white/35 px-3 py-3 text-xs shadow-sm backdrop-blur-sm">
                <p className="font-display font-bold uppercase tracking-wide text-sky-dark/90">Theme scene</p>
                <p className="mt-2 text-slate-600">
                  Nền:{' '}
                  <span className="font-mono text-slate-800">
                    {typeof theme.background === 'string' ? theme.background : '—'}
                  </span>
                </p>
                <p className="mt-1 text-slate-600">
                  Primary:{' '}
                  <span className="font-mono text-slate-800">
                    {typeof theme.primary === 'string' ? theme.primary : '—'}
                  </span>
                </p>
                {typeof theme.vibe === 'string' ? (
                  <p className="mt-2 italic text-slate-500">{theme.vibe}</p>
                ) : null}
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
