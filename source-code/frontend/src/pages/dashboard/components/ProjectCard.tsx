import { useState } from 'react'
import { motion } from 'framer-motion'
import { ExternalLink, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { PastelButton } from '../../../components/shared'
import { getApiErrorMessage } from '../../../lib/api'
import { deleteProject, type Project } from '../../../services/projects.api'
import { cn } from '../../../lib/utils'
import { ProjectThumbnailPreview } from './ProjectThumbnailPreview'

function formatUpdatedAt(iso?: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('vi-VN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

const cardVariants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 },
}

type ProjectCardProps = {
  project: Project
  onDeleted?: () => void
}

export function ProjectCard({ project, onDeleted }: ProjectCardProps) {
  const navigate = useNavigate()
  const [deleting, setDeleting] = useState(false)

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    const ok = window.confirm(`Xóa game "${project.name}"? Hành động không hoàn tác.`)
    if (!ok) return
    setDeleting(true)
    try {
      await deleteProject(project.id)
      toast.success('Đã xóa game.')
      onDeleted?.()
    } catch (err) {
      toast.error(getApiErrorMessage(err))
    } finally {
      setDeleting(false)
    }
  }

  function openStudio(e: React.MouseEvent) {
    e.stopPropagation()
    navigate(`/studio/${project.id}`)
  }

  return (
    <motion.article
      variants={cardVariants}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6, transition: { type: 'spring', stiffness: 420, damping: 22 } }}
      className={cn(
        'group flex flex-col overflow-hidden rounded-glass border border-white/50 bg-white/40 shadow-soft backdrop-blur-md',
        'ring-1 ring-white/30 transition-shadow duration-300 hover:border-sky-dark/20 hover:shadow-soft-hover',
      )}
    >
      <div className="relative aspect-video w-full overflow-hidden border-b border-white/40 bg-white/20">
        <ProjectThumbnailPreview
          gameConfig={project.gameConfig}
          className="h-full min-h-0 w-full rounded-none"
        />
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-display line-clamp-2 text-base font-bold leading-snug text-slate-800">
          {project.name}
        </h3>
        {project.description?.trim() ? (
          <p className="mt-1 line-clamp-2 text-sm text-slate-600">{project.description.trim()}</p>
        ) : (
          <p className="mt-1 text-sm italic text-slate-400">Chưa có mô tả</p>
        )}
        <p className="mt-3 text-xs font-medium text-slate-500">
          Sửa lần cuối:{' '}
          <span className="text-slate-700">{formatUpdatedAt(project.updatedAt)}</span>
        </p>

        <div className="mt-4 flex items-center gap-2">
          <PastelButton
            variant="secondary"
            type="button"
            size="sm"
            className="min-w-0 flex-1 gap-1.5 font-semibold"
            onClick={openStudio}
          >
            <ExternalLink className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            Mở studio
          </PastelButton>
          <button
            type="button"
            title="Xóa game"
            aria-label={`Xóa ${project.name}`}
            disabled={deleting}
            onClick={handleDelete}
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-red-200/80 bg-red-50/90 text-red-600 shadow-sm transition',
              'hover:bg-red-100 disabled:pointer-events-none disabled:opacity-50',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40',
            )}
          >
            <Trash2 className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      </div>
    </motion.article>
  )
}
