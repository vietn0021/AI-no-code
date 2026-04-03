import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { KeyRound, Lock, Mail } from 'lucide-react'
import { GlassCard, PastelButton, SmartInput } from '../../components/shared'
import { resetPasswordApi } from '../../services/auth.api'

function decodeEmailParam(raw: string | null): string {
  if (!raw) return ''
  try {
    return decodeURIComponent(raw.replace(/\+/g, ' '))
  } catch {
    return raw
  }
}

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const qToken = searchParams.get('token')?.trim() ?? ''
    const qEmail = decodeEmailParam(searchParams.get('email'))
    setToken(qToken)
    setEmail(qEmail)
    setError(null)
    setSuccess(null)
  }, [searchParams])

  const missingFromLink = !token.trim() || !email.trim()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)

    try {
      const message = await resetPasswordApi({
        email: email.toLowerCase().trim(),
        token: token.trim(),
        password,
      })
      setSuccess(message)
      setPassword('')
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
          <h1 className="text-2xl font-semibold text-sky-dark">Reset password</h1>
          <p className="mt-1 text-sm text-slate-600">
            Choose a new password for your account
          </p>
        </div>

        {missingFromLink ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
          >
            Open the link from your email to pre-fill this form, or paste the token here.{' '}
            <Link className="font-medium text-sky-dark underline" to="/auth/forgot-password">
              Request a new reset link
            </Link>
            .
          </motion.div>
        ) : null}

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
            className="mb-4 space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
          >
            <p>{success}</p>
            <PastelButton
              variant="secondary"
              className="w-full"
              type="button"
              onClick={() => navigate('/auth/login', { replace: true })}
            >
              Sign in
            </PastelButton>
          </motion.div>
        ) : null}

        {!success ? (
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

            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <SmartInput
                className="pl-10 font-mono text-sm"
                type="text"
                placeholder="Reset token"
                autoComplete="off"
                spellCheck={false}
                value={token}
                onChange={(event) => setToken(event.target.value)}
                required
              />
            </div>

            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <SmartInput
                className="pl-10"
                type="password"
                placeholder="New password (min. 8 characters)"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
              />
            </div>

            <PastelButton
              variant="secondary"
              loading={loading}
              className="w-full"
              type="submit"
            >
              Update password
            </PastelButton>
          </form>
        ) : null}

        <p className="mt-5 text-center text-sm text-slate-600">
          <Link className="font-medium text-sky-dark hover:underline" to="/auth/login">
            Back to sign in
          </Link>
        </p>
      </GlassCard>
    </motion.main>
  )
}
