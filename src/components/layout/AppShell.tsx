import type { ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

const nav = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/crm', label: 'CRM' },
  { to: '/projetos', label: 'Projetos' },
  { to: '/whatsapp', label: 'WhatsApp IA' },
]

export function AppShell({ children }: { children?: ReactNode }) {
  const { profile, signOut } = useAuth()

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <aside className="flex w-60 flex-col border-r border-slate-800 bg-slate-900/80 p-4">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
            TettoHub
          </p>
          <h1 className="text-lg font-bold">TettoFlow AI OS</h1>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm transition ${
                  isActive
                    ? 'bg-emerald-500/20 font-medium text-emerald-300'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto border-t border-slate-800 pt-4">
          <p className="truncate text-sm font-medium">{profile?.full_name}</p>
          <p className="text-xs capitalize text-slate-500">{profile?.role}</p>
          <button
            type="button"
            onClick={() => signOut()}
            className="mt-2 text-xs text-slate-500 hover:text-red-400"
          >
            Sair
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6">{children ?? <Outlet />}</main>
    </div>
  )
}
