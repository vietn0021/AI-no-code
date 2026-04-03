import { AnimatePresence, motion } from 'framer-motion'
import { ImageIcon, Layers } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../../lib/utils'
import { AssetsPanel } from './AssetsPanel'
import { LayersPanel } from './LayersPanel'
import { InspectorPanel } from './InspectorPanel'

const panelEase = [0.22, 1, 0.36, 1] as const

type RightTab = 'layers' | 'assets'

export type EditorRightColumnProps = {
  projectId?: string
}

export function EditorRightColumn({ projectId }: EditorRightColumnProps) {
  const [tab, setTab] = useState<RightTab>('layers')

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        className="flex shrink-0 gap-1.5 border-b border-white/40 px-2 pb-2 pt-1.5"
        role="tablist"
        aria-label="Studio sidebar"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'layers'}
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-xs font-bold transition',
            tab === 'layers'
              ? 'bg-gradient-to-b from-white/75 to-white/50 text-sky-dark shadow-md ring-1 ring-sky-dark/20'
              : 'text-slate-600 hover:bg-white/40',
          )}
          onClick={() => setTab('layers')}
        >
          <Layers className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
          Layers
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'assets'}
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-xs font-bold transition',
            tab === 'assets'
              ? 'bg-gradient-to-b from-white/75 to-white/50 text-sky-dark shadow-md ring-1 ring-sky-dark/20'
              : 'text-slate-600 hover:bg-white/40',
          )}
          onClick={() => setTab('assets')}
        >
          <ImageIcon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
          Assets
        </button>
      </div>

      <div className="relative min-h-0 flex-1">
        <AnimatePresence mode="wait" initial={false}>
          {tab === 'layers' ? (
            <motion.div
              key="tab-layers"
              role="tabpanel"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.28, ease: panelEase }}
              className="absolute inset-0 flex min-h-0 flex-col"
            >
              <LayersPanel />
            </motion.div>
          ) : (
            <motion.div
              key="tab-assets"
              role="tabpanel"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.28, ease: panelEase }}
              className="absolute inset-0 flex min-h-0 flex-col"
            >
              <AssetsPanel projectId={projectId} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <InspectorPanel />
    </div>
  )
}
