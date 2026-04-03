import { useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { GlassCard, PastelButton, SmartInput } from '../../../components/shared'
import { getApiErrorMessage } from '../../../lib/api'
import { createProject } from '../../../services/projects.api'

type CreateProjectModalProps = {
  onClose: () => void
  onCreated: () => void
}

export function CreateProjectModal({ onClose, onCreated }: CreateProjectModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await createProject({
        name: name.trim(),
        description: description.trim() || undefined,
      })
      setName('')
      setDescription('')
      onClose()
      onCreated()
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    if (!loading) {
      setError(null)
      onClose()
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/25 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      role="presentation"
      onClick={handleClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="w-full max-w-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-project-title"
        onClick={(e) => e.stopPropagation()}
      >
        <GlassCard className="relative border-white/50 bg-white/45 shadow-soft-hover">
          <button
            type="button"
            className="absolute right-3 top-3 rounded-lg p-1 text-slate-500 transition hover:bg-white/40 hover:text-slate-800"
            onClick={handleClose}
            disabled={loading}
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>

          <h2 id="create-project-title" className="pr-10 text-xl font-semibold text-sky-dark">
            Tạo dự án mới
          </h2>
          <p className="mt-1 text-sm text-slate-600">Đặt tên cho dự án game của bạn.</p>

          {error ? (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          ) : null}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <SmartInput
              placeholder="Tên dự án"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
            <SmartInput
              placeholder="Mô tả ngắn (tùy chọn)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <div className="flex flex-wrap gap-3 pt-2">
              <PastelButton variant="ghost" type="button" onClick={handleClose} disabled={loading}>
                Hủy
              </PastelButton>
              <PastelButton variant="secondary" type="submit" loading={loading} className="min-w-[120px]">
                Tạo dự án
              </PastelButton>
            </div>
          </form>
        </GlassCard>
      </motion.div>
    </motion.div>
  )
}
