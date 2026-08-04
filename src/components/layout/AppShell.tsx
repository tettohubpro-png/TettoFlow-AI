import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { ROLE_LABELS } from '@/utils/permissions'

const nav = [
  { to: '/', label: 'Dashboard', short: 'Home', end: true },
  { to: '/crm', label: 'CRM', short: 'CRM' },
  { to: '/projetos', label: 'Operações', short: 'Ops' },
  { to: '/departamentos', label: 'Departamentos', short: 'Depts' },
  { to: '/aprovacoes', label: 'Aprovações', short: 'Aprov' },
  { to: '/alertas', label: 'Alertas', short: 'Alert' },
  { to: '/relatorios', label: 'Relatórios', short: 'Rel' },
  { to: '/ia', label: 'IA', short: 'IA' },
  { to: '/whatsapp', label: 'WhatsApp IA', short: 'Zap' },
]

const bottomNav = [
  { to: '/', label: 'Home', end: true },
  { to: '/projetos', label: 'Ops' },
  { to: '/departamentos', label: 'Depts' },
  { to: '/relatorios', label: 'Rel' },
  { to: '/alertas', label: 'Alert' },
]

export function AppShell({ children }: { children?: ReactNode }) {
  const { appUser, workspace, role, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex min-h-11 items-center rounded-lg px-3 py-2.5 text-sm transition ${
      isActive
        ? 'bg-emerald-500/20 font-medium text-emerald-300'
        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
    }`

  return (
    <div className="flex min-h-dvh bg-slate-950 text-slate-100">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-800 bg-slate-900/80 p-4 md:flex">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
            TettoHub
          </p>
          <h1 className="text-lg font-bold">TettoFlow AI OS</h1>
          {workspace && (
            <p className="mt-1 truncate text-xs text-slate-500">{workspace.name}</p>
          )}
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <UserFooter appUser={appUser} role={role} onSignOut={signOut} />
      </aside>

      {/* Mobile drawer overlay */}
      {menuOpen && (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(18rem,85vw)] flex-col border-r border-slate-800 bg-slate-900 p-4 transition-transform duration-200 md:hidden ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-6 flex items-start justify-between gap-2 safe-pt">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
              TettoHub
            </p>
            <h1 className="text-lg font-bold">TettoFlow</h1>
            {workspace && (
              <p className="mt-1 truncate text-xs text-slate-500">{workspace.name}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-700 text-slate-300"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <UserFooter appUser={appUser} role={role} onSignOut={signOut} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-800 bg-slate-950/95 px-3 py-2 backdrop-blur safe-pt md:hidden">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-700 text-slate-200"
            aria-label="Abrir menu"
          >
            ☰
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">TettoFlow</p>
            <p className="truncate text-xs text-slate-500">
              {workspace?.name ?? 'Agência'}
            </p>
          </div>
        </header>

        <main className="flex-1 overflow-auto px-3 py-4 pb-24 sm:px-4 sm:py-5 md:p-6 md:pb-6">
          {children ?? <Outlet />}
        </main>

        {/* Mobile bottom nav */}
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-800 bg-slate-950/95 backdrop-blur safe-pb md:hidden">
          <ul className="mx-auto flex max-w-lg items-stretch justify-between px-1 pt-1">
            {bottomNav.map((item) => (
              <li key={item.to} className="flex-1">
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[11px] font-medium ${
                      isActive ? 'text-emerald-300' : 'text-slate-500'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  )
}

function UserFooter({
  appUser,
  role,
  onSignOut,
}: {
  appUser: { name: string } | null
  role: string | null
  onSignOut: () => void
}) {
  return (
    <div className="mt-auto border-t border-slate-800 pt-4">
      <p className="truncate text-sm font-medium">{appUser?.name ?? '—'}</p>
      <p className="text-xs text-slate-500">
        {role ? ROLE_LABELS[role as keyof typeof ROLE_LABELS] : 'Sem permissão'}
      </p>
      <button
        type="button"
        onClick={() => onSignOut()}
        className="mt-2 min-h-11 text-left text-sm text-slate-500 hover:text-red-400"
      >
        Sair
      </button>
    </div>
  )
}
