import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { resolveAssetFileUrl } from '../../../services/assets.api'
import { normalizeGameConfigForEditor } from '../../../services/projects.api'
import type { GameEntity } from '../../../store/useEditorStore'
import { cn } from '../../../lib/utils'
import {
  normalizeShape,
  resolveEntityColor,
  resolveEntityPosition,
  resolveEntitySize,
} from '../../studio/lib/entityView'

const LOGICAL_W = 320
const LOGICAL_H = 180

function resolveAssetUrl(entity: GameEntity): string {
  const u = entity.assetUrl
  if (typeof u !== 'string') return ''
  const t = u.trim()
  if (!t) return ''
  return resolveAssetFileUrl(t)
}

type ProjectThumbnailPreviewProps = {
  gameConfig?: unknown
  className?: string
}

export function ProjectThumbnailPlaceholder({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex h-full min-h-[7rem] w-full flex-col items-center justify-center bg-gradient-to-br from-sky-light/35 via-white/70 to-[#e8f4ff]',
        className,
      )}
    >
      <div className="relative">
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-sky-dark/20 to-transparent blur-md" />
        <div className="relative rounded-2xl border border-white/70 bg-white/55 p-3 shadow-soft backdrop-blur-sm">
          <Sparkles className="h-7 w-7 text-sky-dark/60" strokeWidth={1.75} />
        </div>
      </div>
      <p className="mt-2.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
        Chưa có scene
      </p>
    </div>
  )
}

/**
 * Canvas thu nhỏ từ `gameConfig` — cùng logic vị trí/kích thước như Studio Preview.
 */
export function ProjectThumbnailPreview({ gameConfig, className }: ProjectThumbnailPreviewProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  const config = useMemo(() => normalizeGameConfigForEditor(gameConfig), [gameConfig])
  const entities = Array.isArray(config.entities) ? config.entities : []
  const bg =
    typeof config.theme?.background === 'string' ? config.theme.background : '#F0F8FF'

  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const cw = el.clientWidth
      const ch = el.clientHeight
      if (cw <= 0 || ch <= 0) return
      setScale(Math.min(cw / LOGICAL_W, ch / LOGICAL_H))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  if (entities.length === 0) {
    return (
      <div className={cn('h-full w-full overflow-hidden rounded-xl', className)}>
        <ProjectThumbnailPlaceholder className="min-h-[7rem] rounded-xl" />
      </div>
    )
  }

  return (
    <div
      ref={wrapRef}
      className={cn('relative h-full min-h-[7rem] w-full overflow-hidden rounded-xl bg-slate-200/40', className)}
    >
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width: LOGICAL_W,
          height: LOGICAL_H,
          backgroundColor: bg,
          transform: `translate(-50%, -50%) scale(${scale})`,
        }}
      >
        <div className="relative h-full w-full">
          {entities.map((entity) => {
            const { x, y } = resolveEntityPosition(entity)
            const { w, h } = resolveEntitySize(entity)
            const fill = resolveEntityColor(entity, '#94a3b8')
            const assetUrl = resolveAssetUrl(entity)
            const hasAssetUrl = assetUrl.length > 0
            const shape = hasAssetUrl ? 'square' : normalizeShape(String(entity.shapeType ?? 'Square'))
            const triangleStyle =
              !hasAssetUrl && shape === 'triangle'
                ? ({ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' } as const)
                : undefined

            return (
              <div
                key={entity.id}
                className={cn(
                  'absolute shadow-sm ring-1 ring-black/10',
                  shape === 'square' && 'rounded-md',
                  shape === 'circle' && 'rounded-full',
                )}
                style={{
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
              >
                {hasAssetUrl ? (
                  <img
                    src={assetUrl}
                    alt=""
                    className="pointer-events-none h-full w-full object-contain"
                    draggable={false}
                  />
                ) : null}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
