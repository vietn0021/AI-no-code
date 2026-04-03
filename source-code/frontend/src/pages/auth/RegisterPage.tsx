import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Lock, Mail, User } from 'lucide-react'
import { PastelButton, SmartInput } from '../../components/shared'
import { useAuth } from '../../hooks/useAuth'
import { loginApi, registerApi } from '../../services/auth.api'
import { cn } from '../../lib/utils'
import { AuthSplitLayout } from './components/AuthSplitLayout'

const formContainerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.075, delayChildren: 0.12 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] as const },
  },
}

const inputIconClass =
  'pointer-events-none absolute left-3.5 top-1/2 h-[1.125rem] w-[1.125rem] -translate-y-1/2 text-sky-dark/45'

const inputClass =
  'border-white/55 bg-white/75 py-3 pl-11 text-base shadow-inner backdrop-blur-sm placeholder:text-slate-400'

export function RegisterPage() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await registerApi({ fullName, email, password })
      const token = await loginApi(email, password)
      login(token)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Register failed'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthSplitLayout>
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] as const }}
        className="rounded-[1.35rem] border border-white/55 bg-white/45 p-6 shadow-soft backdrop-blur-xl sm:p-8"
      >
        {error ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 rounded-xl border border-red-200/90 bg-red-50/95 px-3.5 py-2.5 text-sm text-red-700"
          >
            {error}
          </motion.div>
        ) : null}

        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">
            Đăng ký
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
            Tạo tài khoản và bắt đầu làm game với AI Game Studio.
          </p>
        </div>

        <motion.form
          className="space-y-5"
          onSubmit={handleSubmit}
          variants={formContainerVariants}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={itemVariants} className="relative">
            <User className={inputIconClass} strokeWidth={2} aria-hidden />
            <SmartInput
              className={cn(inputClass)}
              type="text"
              placeholder="Họ và tên"
              autoComplete="name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
            />
          </motion.div>

          <motion.div variants={itemVariants} className="relative">
            <Mail className={inputIconClass} strokeWidth={2} aria-hidden />
            <SmartInput
              className={cn(inputClass)}
              type="email"
              placeholder="Email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </motion.div>

          <motion.div variants={itemVariants} className="relative">
            <Lock className={inputIconClass} strokeWidth={2} aria-hidden />
            <SmartInput
              className={cn(inputClass)}
              type="password"
              placeholder="Mật khẩu"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <PastelButton
              variant="secondary"
              loading={loading}
              className="w-full py-3 text-base font-bold shadow-soft-hover"
              type="submit"
              size="lg"
            >
              Tạo tài khoản
            </PastelButton>
          </motion.div>
        </motion.form>

        <p className="mt-8 text-center text-sm text-slate-600">
          Đã có tài khoản?{' '}
          <Link
            className="font-bold text-sky-dark underline-offset-2 transition hover:underline"
            to="/auth/login"
          >
            Đăng nhập
          </Link>
        </p>
      </motion.div>
    </AuthSplitLayout>
  )
}
