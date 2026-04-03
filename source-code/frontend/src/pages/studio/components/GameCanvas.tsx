import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useCallback } from 'react'
import { cn } from '../../../lib/utils'
import { useEditorStore, type GameEntity } from '../../../store/useEditorStore'
import {
  normalizeShape,
  resolveEntityColor,
  resolveEntityPosition,
  resolveEntitySize,
} from '../lib/entityView'
import { STUDIO_ASSET_DRAG_MIME } from '../lib/studioSampleAssets'

function resolveAssetUrl(entity: GameEntity): string {
  const u = entity.assetUrl
  return typeof u === 'string' ? u.trim() : ''
}

function roundCoord(n: number): number {
  return Math.round(n * 100) / 100
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

type GameCanvasProps = {
  className?: string
}

/**
 * Canvas preview: đọc `gameConfig` từ `useEditorStore`, render `entities` với motion layout mượt.
 * Drag được xử lý bằng pointer events thuần — không dùng Framer drag để tránh double-transform bug.
 */
export function GameCanvas({ className }: GameCanvasProps) {
  const gameConfig = useEditorStore((s) => s.gameConfig)
  const selectedEntityId = useEditorStore((s) => s.selectedEntityId)
  const setSelectedEntityId = useEditorStore((s) => s.setSelectedEntityId)
  const updateEntity = useEditorStore((s) => s.updateEntity)
  const addEntity = useEditorStore((s) => s.addEntity)

  const containerRef = useRef<HTMLDivElement | null>(null)

  // Lưu trạng thái drag hiện tại
  const dragStateRef = useRef<{
    entityId: string
    startPointerX: number
    startPointerY: number
    startEntityXPct: number
    startEntityYPct: number
    isDragging: boolean
  } | null>(null)

  // State tạm trong lúc kéo — lưu vào ref để tránh re-render liên tục
  const livePositionRef = useRef<Record<string, { x: number; y: number }>>({})

  const { entities, background } = useMemo(() => {
    const list = Array.isArray(gameConfig.entities) ? gameConfig.entities : []
    const bg =
      typeof gameConfig.theme?.background === 'string'
        ? gameConfig.theme.background
        : '#F0F8FF'
    return { entities: list, background: bg }
  }, [gameConfig])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedEntityId(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setSelectedEntityId])

  // Xử lý pointermove và pointerup ở window level để drag không bị ngắt khi ra ngoài canvas
  useEffect(() => {
    function onPointerMove(e: PointerEvent) {
      const state = dragStateRef.current
      if (!state || !state.isDragging) return

      const container = containerRef.current
      if (!container) return
      const cr = container.getBoundingClientRect()
      if (cr.width <= 0 || cr.height <= 0) return

      // Tính delta pixels từ lúc bắt đầu drag
      const deltaX = e.clientX - state.startPointerX
      const deltaY = e.clientY - state.startPointerY

      // Chuyển delta sang %
      const deltaXPct = (deltaX / cr.width) * 100
      const deltaYPct = (deltaY / cr.height) * 100

      const nextX = roundCoord(clamp(state.startEntityXPct + deltaXPct, 0, 100))
      const nextY = roundCoord(clamp(state.startEntityYPct + deltaYPct, 0, 100))

      // Cập nhật live position ref để entity DOM element di chuyển ngay lập tức
      livePositionRef.current[state.entityId] = { x: nextX, y: nextY }

      // Cập nhật style trực tiếp lên DOM — không qua React state để tránh re-render lag
      const el = document.getElementById(`entity-${state.entityId}`)
      if (el) {
        el.style.left = `${nextX}%`
        el.style.top = `${nextY}%`
      }
    }

    function onPointerUp(_e: PointerEvent) {
      const state = dragStateRef.current
      if (!state) return

      if (state.isDragging) {
        const live = livePositionRef.current[state.entityId]
        if (live) {
          // Commit vị trí cuối cùng vào store
          updateEntity(state.entityId, {
            position: { x: live.x, y: live.y },
          })
          delete livePositionRef.current[state.entityId]
        }
        setSelectedEntityId(state.entityId)
      }

      dragStateRef.current = null
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [updateEntity, setSelectedEntityId])

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      const raw = e.dataTransfer.getData(STUDIO_ASSET_DRAG_MIME)
      if (!raw) return
      let parsed: { assetUrl?: string; label?: string }
      try {
        parsed = JSON.parse(raw) as { assetUrl?: string; label?: string }
      } catch {
        return
      }
      const url = typeof parsed.assetUrl === 'string' ? parsed.assetUrl.trim() : ''
      if (!url) return

      const container = containerRef.current
      if (!container) return
      const cr = container.getBoundingClientRect()
      if (cr.width <= 0 || cr.height <= 0) return

      const x = ((e.clientX - cr.left) / cr.width) * 100
      const y = ((e.clientY - cr.top) / cr.height) * 100
      const nextX = roundCoord(clamp(x, 0, 100))
      const nextY = roundCoord(clamp(y, 0, 100))

      const label = typeof parsed.label === 'string' ? parsed.label : undefined
      const id = `sprite-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      const newEntity: GameEntity = {
        id,
        type: 'sprite',
        shapeType: 'Square',
        assetUrl: url,
        position: { x: nextX, y: nextY },
        width: 64,
        height: 64,
        settings: {
          ...(label ? { studioLabel: label } : {}),
        },
      }
      addEntity(newEntity)
    },
    [addEntity],
  )

  const handleEntityPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, entityId: string, xPct: number, yPct: number) => {
      e.stopPropagation()
      e.currentTarget.setPointerCapture(e.pointerId)

      dragStateRef.current = {
        entityId,
        startPointerX: e.clientX,
        startPointerY: e.clientY,
        startEntityXPct: xPct,
        startEntityYPct: yPct,
        isDragging: true,
      }
    },
    [],
  )

  return (
    <div
      className={cn('relative h-full w-full overflow-hidden rounded-3xl', className)}
      style={{ background: background }}
      onClick={() => setSelectedEntityId(null)}
      ref={containerRef}
      onDragOver={(e) => {
        if ([...e.dataTransfer.types].includes(STUDIO_ASSET_DRAG_MIME)) {
          e.preventDefault()
          e.dataTransfer.dropEffect = 'copy'
        }
      }}
      onDrop={handleDrop}
    >
      <div className="relative h-full w-full">
        <AnimatePresence initial={false}>
          {entities.map((entity) => {
            const { x, y } = resolveEntityPosition(entity)
            const { w, h } = resolveEntitySize(entity)
            const fill = resolveEntityColor(entity, '#94a3b8')
            const assetUrl = resolveAssetUrl(entity)
            const hasAssetUrl = assetUrl.length > 0
            const shape = hasAssetUrl ? 'square' : normalizeShape(String(entity.shapeType ?? 'Square'))
            const selected = selectedEntityId === entity.id

            const baseClass = cn(
              'absolute cursor-grab active:cursor-grabbing transition-[box-shadow,ring] duration-200',
              shape === 'square' && 'rounded-md',
              shape === 'circle' && 'rounded-full',
              selected
                ? 'z-10 shadow-md ring-2 ring-sky-dark/95 ring-offset-2 ring-offset-transparent [box-shadow:0_0_0_2px_rgba(135,206,235,0.35),0_8px_28px_rgba(135,206,235,0.45)]'
                : 'shadow-md ring-1 ring-slate-900/10 hover:ring-2 hover:ring-sky-dark/35',
            )

            const triangleStyle =
              !hasAssetUrl && shape === 'triangle'
                ? ({ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' } as const)
                : undefined

            return (
              <motion.div
                key={entity.id}
                id={`entity-${entity.id}`}
                role="button"
                tabIndex={0}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{
                  opacity: { duration: 0.2 },
                  scale: { duration: 0.2 },
                }}
                className={baseClass}
                style={{
                  // Dùng margin âm thay cho translate để tránh xung đột với Framer transform
                  left: `${x}%`,
                  top: `${y}%`,
                  marginLeft: `-${w / 2}px`,
                  marginTop: `-${h / 2}px`,
                  width: `${w}px`,
                  height: `${h}px`,
                  backgroundColor: hasAssetUrl ? 'transparent' : fill,
                  overflow: hasAssetUrl ? 'hidden' : undefined,
                  ...triangleStyle,
                }}
                title={entity.id}
                aria-pressed={selected}
                aria-label={`Entity ${entity.id}`}
                onClick={(e) => {
                  e.stopPropagation()
                  // Chỉ select nếu không vừa kéo
                  if (!dragStateRef.current) {
                    setSelectedEntityId(entity.id)
                  }
                }}
                onPointerDown={(e) => {
                  handleEntityPointerDown(e, entity.id, x, y)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    e.stopPropagation()
                    setSelectedEntityId(entity.id)
                  }
                }}
              >
                {hasAssetUrl ? (
                  <img
                    src={assetUrl}
                    alt=""
                    className={cn(baseClass, 'relative pointer-events-none select-none')}
                    style={{ width: w, height: h, objectFit: 'contain' }}
                    draggable={false}
                  />
                ) : null}
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {entities.length === 0 ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
          <p className="text-center text-sm text-slate-500">Chưa có entity trong scene.</p>
        </div>
      ) : null}
    </div>
  )
}