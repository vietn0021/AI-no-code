import { NavLink } from 'react-router-dom'
import { FolderKanban, LayoutGrid, Settings } from 'lucide-react'
import { cn } from '../../../lib/utils'

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm font-semibold transition-all duration-200 md:px-3',
    isActive
      ? 'bg-white/55 text-sky-dark shadow-soft ring-1 ring-sky-dark/15'
      : 'text-slate-600 hover:bg-white/30 hover:text-sky-dark',
  )

export function DashboardSidebar() {
  return (
    <aside className="dashboard-backdrop-blur flex w-14 shrink-0 flex-col gap-2 border-r border-white/35 bg-sky-light/15 py-5 pl-2 pr-2 backdrop-blur-md md:w-56 md:pl-4 md:pr-3">
      <p className="mb-1 hidden px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 md:block">
        Menu
      </p>
      <nav className="flex flex-col gap-1">
        <NavLink
          to="/dashboard"
          className={navClass}
          end
          title="Dự án của tôi"
        >
          <FolderKanban className="mx-auto h-4 w-4 shrink-0 md:mx-0" strokeWidth={2} />
          <span className="hidden md:inline">Dự án của tôi</span>
        </NavLink>
        <NavLink to="/templates" className={navClass} title="Thư viện mẫu">
          <LayoutGrid className="mx-auto h-4 w-4 shrink-0 md:mx-0" strokeWidth={2} />
          <span className="hidden md:inline">Thư viện mẫu</span>
        </NavLink>
        <NavLink to="/settings" className={navClass} title="Cài đặt">
          <Settings className="mx-auto h-4 w-4 shrink-0 md:mx-0" strokeWidth={2} />
          <span className="hidden md:inline">Cài đặt</span>
        </NavLink>
      </nav>
    </aside>
  )
}
