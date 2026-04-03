import { Sparkles, User } from 'lucide-react'
import {
  GlassCard,
  IconWrapper,
  LoadingState,
  PastelButton,
  SmartInput,
} from '../components/shared'

export function DesignSystemPage() {
  return (
    <main className="min-h-screen bg-bg-alice-blue p-6 md:p-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-sky-dark">
            AI No-code Studio — Design System
          </h1>
          <p className="text-sm text-slate-600">
            Glassmorphism + Pastel preview (Sky Blue / White)
          </p>
        </header>

        <GlassCard interactive>
          <h2 className="mb-4 text-lg font-semibold text-sky-dark">Buttons</h2>
          <div className="flex flex-wrap items-center gap-3">
            <PastelButton variant="primary">Primary</PastelButton>
            <PastelButton variant="secondary">Secondary</PastelButton>
            <PastelButton variant="ghost">Ghost</PastelButton>
            <PastelButton loading>Loading</PastelButton>
          </div>
        </GlassCard>

        <GlassCard>
          <h2 className="mb-4 text-lg font-semibold text-sky-dark">Inputs</h2>
          <div className="max-w-md space-y-3">
            <SmartInput placeholder="Enter your prompt..." />
            <SmartInput placeholder="Email" type="email" />
            <SmartInput placeholder="Invalid field" error="This field is required" />
          </div>
        </GlassCard>

        <GlassCard>
          <h2 className="mb-4 text-lg font-semibold text-sky-dark">Loading & Icons</h2>
          <div className="flex flex-wrap items-center gap-4">
            <LoadingState label="Generating game config..." />
            <IconWrapper size="sm">
              <User className="h-4 w-4" />
            </IconWrapper>
            <IconWrapper size="md" className="bg-sky-dark/40 text-slate-700">
              <Sparkles className="h-4 w-4" />
            </IconWrapper>
            <IconWrapper size="lg">
              <Sparkles className="h-5 w-5" />
            </IconWrapper>
          </div>
        </GlassCard>
      </div>
    </main>
  )
}
