import type { PropsWithChildren } from 'react'
import { AuthBrandingPanel } from './AuthBrandingPanel'

export function AuthSplitLayout({ children }: PropsWithChildren) {
  return (
    <div className="flex min-h-screen flex-col bg-bg-alice-blue lg:flex-row">
      <div className="relative lg:flex lg:w-[40%] lg:shrink-0 lg:min-h-0">
        <AuthBrandingPanel />
      </div>
      <div className="relative flex flex-1 flex-col justify-center px-4 py-10 sm:px-8 lg:w-[60%] lg:py-12">
        <div
          className="pointer-events-none absolute inset-0 lg:block"
          aria-hidden
          style={{
            background:
              'radial-gradient(ellipse 80% 50% at 80% 30%, rgba(189,224,254,0.35), transparent 55%)',
          }}
        />
        <div className="relative z-10 mx-auto w-full max-w-md">{children}</div>
      </div>
    </div>
  )
}
