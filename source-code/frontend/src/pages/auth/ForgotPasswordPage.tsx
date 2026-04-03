import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail } from 'lucide-react'
import { GlassCard, PastelButton, SmartInput } from '../../components/shared'
import { forgotPasswordApi } from '../../services/auth.api'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      await forgotPasswordApi(email)
      setSuccess('If your email exists, a reset link has been sent.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Request failed'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.main
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="flex min-h-screen items-center justify-center bg-bg-alice-blue p-4"
    >
      <GlassCard className="w-full max-w-md border-white/50 bg-white/40">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-sky-dark">Forgot Password</h1>
          <p className="mt-1 text-sm text-slate-600">
            Enter your email to receive password reset instructions
          </p>
        </div>

        {error ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600"
          >
            {error}
          </motion.div>
        ) : null}

        {success ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
          >
            {success}
          </motion.div>
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <SmartInput
              className="pl-10"
              type="email"
              placeholder="Email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <PastelButton
            variant="secondary"
            loading={loading}
            className="w-full"
            type="submit"
          >
            Send Reset Link
          </PastelButton>
        </form>

        <p className="mt-5 text-center text-sm text-slate-600">
          Back to{' '}
          <Link className="font-medium text-sky-dark hover:underline" to="/auth/login">
            Sign in
          </Link>
        </p>
      </GlassCard>
    </motion.main>
  )
}
