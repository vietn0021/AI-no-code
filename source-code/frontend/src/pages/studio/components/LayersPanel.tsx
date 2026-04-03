import { Trash2 } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useMemo } from 'react'
import toast from 'react-hot-toast'
import { cn } from '../../../lib/utils'
import { useEditorStore, type GameEntity } from '../../../store/useEditorStore'
import { confirmEntityDelete } from '../lib/confirmEntityDelete'
import { normalizeShape, resolveEntityColor, shapeLabelVi } from '../lib/entityView'

/** SVG hình học nhỏ — không tô màu (màu riêng ở dot). */
function ShapeMicroIcon({ shapeType }: { shapeType: string }) {
  const s = normalizeShape(shapeType)
  const stroke = 'currentColor'
  const sw = 1.6
  if (s === 'circle') {
    return (
      <svg className="h-4 w-4 shrink-0 text-slate-500" viewBox="0 0 16 16" aria-hidden>
        <circle cx="8" cy="8" r="5" fill="none" stroke={stroke} strokeWidth={sw} />
      </svg>
    )
  }
  if (s === 'triangle') {
    return (
      <svg className="h-4 w-4 shrink-0 text-slate-500" viewBox="0 0 16 16" aria-hidden>
        <path d="M8 2.5 L13.5 12.5 H2.5 Z" fill="none" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
      </svg>
    )
  }
  return (
    <svg className="h-4 w-4 shrink-0 text-slate-500" viewBox="0 0 16 16" aria-hidden>
      <rect x="3" y="3" width="10" height="10" rx="1.2" fill="none" stroke={stroke} strokeWidth={sw} />
    </svg>
  )
}

function layerDisplayTitle(entity: GameEntity, index1Based: number): string {
  if (entity.type === 'sprite') {
    const lab =
      typeof entity.settings?.studioLabel === 'string' ? entity.settings.studioLabel.trim() : ''
    return lab ? `${lab} · Sprite` : `Sprite #${index1Based}`
  }
  return `${shapeLabelVi(String(entity.shapeType ?? ''))} #${index1Based}`
}

/**
 * Danh sách layer từ `gameConfig.entities` — click để `setSelectedEntityId`.
 */
export function LayersPanel() {
  const gameConfig = useEditorStore((s) => s.gameConfig)
  const selectedEntityId = useEditorStore((s) => s.selectedEntityId)
  const setSelectedEntityId = useEditorStore((s) => s.setSelectedEntityId)
  const removeEntity = useEditorStore((s) => s.removeEntity)

  const entities = useMemo(
    () => (Array.isArray(gameConfig.entities) ? gameConfig.entities : []),
    [gameConfig.entities],
  )

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-2.5 py-2.5">
      <AnimatePresence mode="wait" initial={false}>
        {entities.length === 0 ? (
          <motion.div
            key="layers-empty"
            role="status"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-2xl border border-dashed border-sky-dark/25 bg-gradient-to-b from-white/40 to-white/20 px-4 py-8 text-center backdrop-blur-sm"
          >
            <p className="font-display text-sm font-semibold text-slate-600">Chưa có entity nào</p>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
              Nhắn AI hoặc kéo asset vào canvas để bắt đầu.
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="layers-list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-1.5"
          >
            {[...entities].reverse().map((entity) => {
              const active = selectedEntityId === entity.id
              const hex = resolveEntityColor(entity)
              const index1Based = entities.findIndex((e) => e.id === entity.id) + 1
              const title = layerDisplayTitle(entity, index1Based)
              const isSprite =
                entity.type === 'sprite' &&
                typeof entity.assetUrl === 'string' &&
                entity.assetUrl.trim().length > 0

              return (
                <motion.div
                  layout
                  key={entity.id}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className={cn(
                    'group relative flex items-stretch overflow-hidden rounded-2xl border border-white/50 bg-white/35 shadow-sm backdrop-blur-sm transition-[border-color,box-shadow,background]',
                    active
                      ? 'border-sky-dark/40 border-l-4 border-l-sky-dark bg-white/60 shadow-md ring-1 ring-sky-dark/12'
                      : 'border-l-4 border-l-transparent hover:border-white/70 hover:bg-white/45',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedEntityId(entity.id)}
                    className="flex min-w-0 flex-1 items-center gap-2.5 py-2.5 pl-2.5 pr-1 text-left transition"
                  >
                    <div
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/65 bg-white/50 shadow-inner',
                        active && 'border-sky-dark/35 ring-1 ring-sky-dark/10',
                      )}
                    >
                      {isSprite ? (
                        <img
                          src={entity.assetUrl as string}
                          alt=""
                          className="max-h-full max-w-full object-contain"
                          draggable={false}
                        />
                      ) : (
                        <ShapeMicroIcon shapeType={String(entity.shapeType ?? 'Square')} />
                      )}
                    </div>
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full border border-white/80 shadow-sm ring-1 ring-black/5"
                      style={{ backgroundColor: hex }}
                      title={hex}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate font-medium text-slate-800">{title}</span>
                  </button>
                  <button
                    type="button"
                    title="Xóa layer — sẽ hỏi xác nhận"
                    aria-label={`Xóa ${title}`}
                    className={cn(
                      'flex shrink-0 items-center justify-center rounded-r-[0.9rem] border-l border-white/35 px-2.5 text-slate-400 transition',
                      'hover:bg-red-50/90 hover:text-red-600',
                      'focus-visible:z-10 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/60',
                      'opacity-0 pointer-events-none group-hover:pointer-events-auto group-hover:opacity-100',
                      'max-md:pointer-events-auto max-md:opacity-100',
                    )}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!confirmEntityDelete(entity.id)) return
                      removeEntity(entity.id)
                      toast.success('Đã xóa vật thể.')
                    }}
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={2} />
                  </button>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
