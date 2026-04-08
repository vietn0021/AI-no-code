import type { PropsWithChildren } from "react";
import { DashboardHeader } from "./DashboardHeader";
import { DashboardSidebar } from "./DashboardSidebar";

type DashboardShellProps = PropsWithChildren<{
  searchQuery: string;
  onSearchChange: (value: string) => void;
}>;

export function DashboardShell({
  children,
  searchQuery,
  onSearchChange,
}: DashboardShellProps) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-bg-alice-blue font-sans">
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.55]"
        aria-hidden
        style={{
          backgroundImage: `
            radial-gradient(ellipse 90% 70% at 10% -10%, rgba(189, 224, 254, 0.55), transparent 55%),
            radial-gradient(ellipse 60% 50% at 100% 20%, rgba(135, 206, 235, 0.28), transparent 50%),
            radial-gradient(ellipse 50% 40% at 80% 100%, rgba(189, 224, 254, 0.35), transparent 45%)
          `,
        }}
      />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(180deg,rgba(255,255,255,0.4)_0%,transparent_35%,transparent_65%,rgba(240,248,255,0.9)_100%)]" />

      <DashboardHeader
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
      />

      <div className="mx-auto flex max-w-[1400px]">
        <DashboardSidebar />

        <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
