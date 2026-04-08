import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { GripVertical, ImageIcon, Loader2, Search, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../../hooks/useAuth'
import { getApiErrorMessage } from '../../../lib/api'
import { cn } from '../../../lib/utils'
import {
  SPRITE_CATEGORIES,
  SPRITE_LIBRARY_ALL,
  type SpriteItem,
} from '../../../lib/spriteLibrary'
import { fetchProjectAssets, resolveAssetFileUrl, uploadAsset } from '../../../services/assets.api'
import { STUDIO_ASSET_DRAG_MIME, STUDIO_SAMPLE_ASSETS } from '../lib/studioSampleAssets'

const panelEase = [0.22, 1, 0.36, 1] as const

type AssetsTabId = 'yours' | 'library' | 'samples'

type UploadedItem = {
  id: string
  /** URL tuyệt đối cho `<img>` và drag `assetUrl`. */
  assetUrl: string
  label: string
}

export type AssetsPanelProps = {
  projectId?: string
}

function DraggableAssetTile({ item }: { item: { assetUrl: string; label: string } }) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.22, ease: panelEase }}
      className="list-none"
    >
      <div
        role="listitem"
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData(
            STUDIO_ASSET_DRAG_MIME,
            JSON.stringify({ assetUrl: item.assetUrl, label: item.label }),
          )
          e.dataTransfer.effectAllowed = 'copy'
        }}
        className="group relative cursor-grab overflow-hidden rounded-2xl border border-white/55 bg-white/40 shadow-md backdrop-blur-sm transition active:cursor-grabbing hover:border-sky-dark/40 hover:shadow-lg"
      >
        <div className="relative aspect-square w-full overflow-hidden bg-gradient-to-b from-white/80 to-slate-100/90">
          <img
            src={item.assetUrl}
            alt=""
            className="h-full w-full object-contain p-2"
            draggable={false}
          />
          <div
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 bg-gradient-to-t from-sky-dark/85 via-sky-dark/45 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100"
            aria-hidden
          >
            <GripVertical className="h-5 w-5 text-white drop-shadow-md" strokeWidth={2} />
            <span className="px-2 text-center text-[10px] font-bold uppercase tracking-wide text-white drop-shadow">
              Kéo vào canvas
            </span>
          </div>
        </div>
        <div className="border-t border-white/40 bg-white/50 px-2 py-2">
          <p
            className="truncate text-center text-[11px] font-semibold leading-tight text-slate-800"
            title={item.label}
          >
            {item.label}
          </p>
        </div>
      </div>
    </motion.li>
  )
}

function shortSpriteLabel(name: string): string {
  const s = name.replace(/^platformIndustrial_/, '')
  return s.length > 14 ? `${s.slice(0, 12)}…` : s
}

function LibrarySpriteTile({ sprite }: { sprite: SpriteItem }) {
  const [loaded, setLoaded] = useState(false)

  return (
    <li className="list-none">
      <div
        role="listitem"
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData(
            STUDIO_ASSET_DRAG_MIME,
            JSON.stringify({ assetUrl: sprite.url, label: sprite.name }),
          )
          e.dataTransfer.effectAllowed = 'copy'
        }}
        className="group relative cursor-grab overflow-hidden rounded-xl border border-white/55 bg-white/45 shadow-sm backdrop-blur-sm transition active:cursor-grabbing hover:border-emerald-500/40 hover:shadow-md"
      >
        <div className="relative mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-b from-slate-100/95 to-white/80">
          {!loaded ? (
            <div
              className="absolute inset-1 animate-pulse rounded-md bg-gradient-to-br from-slate-200/90 via-slate-100/80 to-sky-100/60"
              aria-hidden
            />
          ) : null}
          <img
            src={sprite.url}
            alt=""
            loading="lazy"
            decoding="async"
            draggable={false}
            onLoad={() => setLoaded(true)}
            onError={() => setLoaded(true)}
            className={cn(
              'relative z-[1] max-h-[56px] max-w-[56px] object-contain transition-opacity duration-300',
              loaded ? 'opacity-100' : 'opacity-0',
            )}
          />
          <div
            className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center bg-gradient-to-t from-sky-dark/90 via-sky-dark/35 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100"
            aria-hidden
          >
            <span className="px-1 text-center text-[9px] font-bold uppercase leading-tight tracking-wide text-white drop-shadow">
              Kéo vào canvas
            </span>
          </div>
        </div>
        <div className="border-t border-white/35 bg-white/40 px-1 py-1.5">
          <p
            className="truncate text-center text-[10px] font-semibold leading-tight text-slate-800"
            title={sprite.name}
          >
            {shortSpriteLabel(sprite.name)}
          </p>
        </div>
      </div>
    </li>
  )
}

/**
 * Thư viện Assets: upload ảnh thật + mẫu có sẵn — kéo vào Preview để tạo sprite.
 */
export function AssetsPanel({ projectId }: AssetsPanelProps) {
  const { token } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [loadingUploaded, setLoadingUploaded] = useState(false)
  const [uploaded, setUploaded] = useState<UploadedItem[]>([])
  const [tab, setTab] = useState<AssetsTabId>('yours')
  const [libraryQuery, setLibraryQuery] = useState('')

  useEffect(() => {
    if (!projectId || !token) {
      setUploaded([])
      setLoadingUploaded(false)
      return
    }

    let cancelled = false
    setLoadingUploaded(true)
    void (async () => {
      try {
        const list = await fetchProjectAssets(projectId)
        if (cancelled) return
        setUploaded(
          list.map((a) => ({
            id: a.id,
            assetUrl: resolveAssetFileUrl(a.fileUrl),
            label: a.fileName,
          })),
        )
      } catch (err) {
        if (!cancelled) {
          toast.error(getApiErrorMessage(err))
          setUploaded([])
        }
      } finally {
        if (!cancelled) setLoadingUploaded(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [projectId, token])

  const filteredLibrary = useMemo(() => {
    const q = libraryQuery.trim().toLowerCase()
    if (!q) return SPRITE_LIBRARY_ALL
    return SPRITE_LIBRARY_ALL.filter((s) => s.name.toLowerCase().includes(q))
  }, [libraryQuery])

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const onFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      e.target.value = ''
      if (!file) return
      if (!projectId) {
        toast.error('Thiếu projectId.')
        return
      }
      if (!token) {
        toast.error('Vui lòng đăng nhập để tải ảnh.')
        return
      }
      if (!file.type.startsWith('image/')) {
        toast.error('Chỉ chọn file ảnh.')
        return
      }

      setUploading(true)
      try {
        const { url, originalName, assetId } = await uploadAsset(projectId, file)
        const assetUrl = resolveAssetFileUrl(url)
        setUploaded((prev) => [
          {
            id: assetId ?? `up-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            assetUrl,
            label: originalName || file.name,
          },
          ...prev,
        ])
        toast.success('Đã tải ảnh lên.')
      } catch (err) {
        toast.error(getApiErrorMessage(err))
      } finally {
        setUploading(false)
      }
    },
    [projectId, token],
  )

  const tabs: { id: AssetsTabId; label: string }[] = [
    { id: 'yours', label: 'Ảnh của bạn' },
    { id: 'library', label: 'Thư viện' },
    { id: 'samples', label: 'Mẫu có sẵn' },
  ]

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-2.5 py-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        aria-hidden
        onChange={(e) => void onFileChange(e)}
      />

      <div
        className="mb-3 flex gap-1 rounded-2xl border border-white/50 bg-white/30 p-1 shadow-inner backdrop-blur-sm"
        role="tablist"
        aria-label="Nguồn assets"
      >
        {tabs.map((t) => {
          const active = tab === t.id
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={cn(
                'relative flex-1 rounded-xl px-1.5 py-2 text-center font-display text-[10px] font-bold uppercase tracking-wide transition md:text-[11px]',
                active ? 'text-sky-dark' : 'text-slate-500 hover:text-slate-700',
              )}
            >
              {active ? (
                <motion.span
                  layoutId="assets-tab-pill"
                  className="absolute inset-0 rounded-xl border border-white/60 bg-white/85 shadow-sm"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              ) : null}
              <span className="relative z-[1] leading-tight">{t.label}</span>
            </button>
          )
        })}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {tab === 'yours' ? (
          <motion.div
            key="tab-yours"
            role="tabpanel"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.28, ease: panelEase }}
          >
            <motion.button
              type="button"
              disabled={uploading || !projectId || !token}
              onClick={openFilePicker}
              whileHover={{ scale: uploading ? 1 : 1.02 }}
              whileTap={{ scale: uploading ? 1 : 0.98 }}
              className="mb-3 flex w-full items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed border-sky-dark/35 bg-gradient-to-r from-sky-light/90 via-white/70 to-sky-light/80 px-4 py-3.5 font-display text-sm font-bold uppercase tracking-wide text-sky-dark shadow-[0_8px_28px_-6px_rgba(14,116,144,0.35)] backdrop-blur-sm transition hover:border-sky-dark/55 hover:brightness-[1.02] disabled:pointer-events-none disabled:opacity-45"
            >
              {uploading ? (
                <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden />
              ) : (
                <Upload className="h-5 w-5 shrink-0" strokeWidth={2.25} aria-hidden />
              )}
              {uploading ? 'Đang tải…' : 'Tải ảnh lên'}
            </motion.button>

            <p className="mb-4 rounded-xl border border-white/40 bg-white/25 px-3 py-2.5 text-[11px] leading-relaxed text-slate-600 backdrop-blur-sm">
              Kéo ảnh vào khung <span className="font-semibold text-sky-dark">Preview</span> để đặt sprite tại
              vị trí thả.
            </p>

            <section className="mb-5">
              <h3 className="mb-2.5 flex items-center gap-2 px-0.5 font-display text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                <ImageIcon className="h-3.5 w-3.5 text-sky-dark" strokeWidth={2} aria-hidden />
                Ảnh của bạn
              </h3>
              <AnimatePresence mode="wait" initial={false}>
                {loadingUploaded ? (
                  <motion.div
                    key="assets-loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center justify-center gap-2 rounded-2xl border border-white/40 bg-white/20 py-10 text-xs text-slate-600 backdrop-blur-sm"
                  >
                    <Loader2 className="h-6 w-6 shrink-0 animate-spin text-sky-dark" aria-hidden />
                    <span>Đang tải danh sách…</span>
                  </motion.div>
                ) : uploaded.length === 0 ? (
                  <motion.p
                    key="assets-empty"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2, ease: panelEase }}
                    className="rounded-2xl border border-dashed border-white/50 bg-white/15 px-3 py-8 text-center text-xs text-slate-500 backdrop-blur-sm"
                  >
                    Chưa có ảnh tải lên.
                  </motion.p>
                ) : (
                  <motion.ul
                    key="assets-grid"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="grid grid-cols-2 gap-2.5"
                  >
                    {uploaded.map((u) => (
                      <DraggableAssetTile key={u.id} item={u} />
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </section>
          </motion.div>
        ) : null}

        {tab === 'library' ? (
          <motion.div
            key="tab-library"
            role="tabpanel"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.28, ease: panelEase }}
          >
            <div className="mb-3 flex items-center gap-2 rounded-xl border border-white/45 bg-white/35 px-2.5 py-2 shadow-inner backdrop-blur-sm">
              <Search className="h-4 w-4 shrink-0 text-sky-dark/70" strokeWidth={2} aria-hidden />
              <input
                type="search"
                value={libraryQuery}
                onChange={(e) => setLibraryQuery(e.target.value)}
                placeholder="Lọc theo tên…"
                className="min-w-0 flex-1 bg-transparent text-xs font-medium text-slate-800 outline-none placeholder:text-slate-400"
                aria-label="Tìm sprite trong thư viện"
              />
            </div>
            <p className="mb-2.5 px-0.5 font-display text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
              Kenney — {SPRITE_CATEGORIES.platformer.label}
            </p>
            {filteredLibrary.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-white/50 bg-white/15 px-3 py-8 text-center text-xs text-slate-500 backdrop-blur-sm">
                Không có sprite khớp tìm kiếm.
              </p>
            ) : (
              <ul className="grid grid-cols-4 gap-2">
                {filteredLibrary.map((sprite) => (
                  <LibrarySpriteTile key={sprite.id} sprite={sprite} />
                ))}
              </ul>
            )}
          </motion.div>
        ) : null}

        {tab === 'samples' ? (
          <motion.div
            key="tab-samples"
            role="tabpanel"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.28, ease: panelEase }}
          >
            <section>
              <h3 className="mb-2.5 px-0.5 font-display text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                Mẫu có sẵn
              </h3>
              <ul className="grid grid-cols-2 gap-2.5">
                {STUDIO_SAMPLE_ASSETS.map((asset) => (
                  <DraggableAssetTile
                    key={`sample-${asset.id}`}
                    item={{ assetUrl: asset.assetUrl, label: asset.label }}
                  />
                ))}
              </ul>
            </section>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
