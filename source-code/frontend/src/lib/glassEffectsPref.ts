const STORAGE_KEY = 'ai-nocode-glass-effects'

export function getGlassEffectsEnabled(): boolean {
  if (typeof window === 'undefined') return true
  return localStorage.getItem(STORAGE_KEY) !== 'false'
}

export function setGlassEffectsEnabled(enabled: boolean): void {
  localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false')
  syncGlassEffectsToDocument()
}

export function syncGlassEffectsToDocument(): void {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.glassEffects = getGlassEffectsEnabled() ? 'on' : 'off'
}
