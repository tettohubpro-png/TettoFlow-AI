import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation, Link } from 'react-router-dom'
import {
  Home,
  Users,
  CalendarDays,
  CheckSquare,
  Wallet,
  Target,
  Calendar,
  UsersRound,
  Building2,
  ClipboardCheck,
  BellRing,
  BarChart3,
  Sparkles,
  MessageCircle,
  Inbox,
  Gift,
  Newspaper,
  LifeBuoy,
  Crown,
  Settings,
  Sun,
  Moon,
  Bell,
  LogOut,
  Menu,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { ROLE_LABELS, filterNavByRole, canAccessPath } from '@/utils/permissions'
import type { ThemeId } from '@/theme/tokens'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

const primaryNav: NavItem[] = [
  { to: '/', label: 'Início', icon: Home, end: true },
  { to: '/crm', label: 'Clientes', icon: Users },
  { to: '/conteudo', label: 'Conteúdo', icon: CalendarDays },
  { to: '/tarefas', label: 'Tarefas', icon: CheckSquare },
  { to: '/financeiro', label: 'Financeiro', icon: Wallet },
  { to: '/comercial', label: 'CRM', icon: Target },
  { to: '/agenda', label: 'Agenda', icon: Calendar },
  { to: '/equipe', label: 'Equipe', icon: UsersRound },
]

const tettoNav: NavItem[] = [
  { to: '/departamentos', label: 'Departamentos', icon: Building2 },
  { to: '/aprovacoes', label: 'Aprovações', icon: ClipboardCheck },
  { to: '/alertas', label: 'Alertas', icon: BellRing },
  { to: '/relatorios', label: 'Relatórios', icon: BarChart3 },
  { to: '/ia', label: 'IA', icon: Sparkles },
  { to: '/whatsapp', label: 'WhatsApp IA', icon: MessageCircle },
  { to: '/mensagens', label: 'Mensagens', icon: Inbox },
]

const accountNav: NavItem[] = [
  { to: '/indique', label: 'Indique', icon: Gift },
  { to: '/novidades', label: 'Novidades', icon: Newspaper },
  { to: '/suporte', label: 'Suporte', icon: LifeBuoy },
  { to: '/assinatura', label: 'Assinatura', icon: Crown },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
]

const bottomNav: { to: string; label: string; end?: boolean; more?: boolean }[] = [
  { to: '/', label: 'Início', end: true },
  { to: '/crm', label: 'Clientes' },
  { to: '/conteudo', label: 'Conteúdo' },
  { to: '/tarefas', label: 'Tarefas' },
  { to: '#mais', label: 'Mais', more: true },
]

function initials(name: string | undefined | null) {
  if (!name?.trim()) return '?'
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('')
}

function NavGroup({ title, items }: { title: string; items: NavItem[] }) {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `tf-nav-link gap-2.5 ${isActive ? 'tf-nav-link-active' : ''}`

  return (
    <div className="mb-4">
      <p className="tf-nav-group-label">{title}</p>
      <div className="flex flex-col gap-0.5">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
              <Icon size={16} strokeWidth={2} className="shrink-0 opacity-80" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          )
        })}
      </div>
    </div>
  )
}

export function AppShell({ children }: { children?: ReactNode }) {
  const { appUser, workspace, role, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  const visiblePrimary = filterNavByRole(primaryNav, role)
  const visibleTetto = filterNavByRole(tettoNav, role)
  const visibleAccount = filterNavByRole(accountNav, role)
  const visibleBottom = bottomNav.filter(
    (item) => item.more || canAccessPath(role, item.to),
  )

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  const sidebarBody = (
    <>
      <div className="mb-6 shrink-0">
        <p className="tf-eyebrow">TettoHub</p>
        <h1 className="mt-1 text-lg font-bold" style={{ letterSpacing: '-0.02em' }}>
          TettoFlow AI OS
        </h1>
        {workspace && (
          <p className="mt-1 truncate text-xs" style={{ color: 'var(--color-text3)' }}>
            {workspace.name}
          </p>
        )}
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto pr-1">
        {visiblePrimary.length > 0 && <NavGroup title="Principal" items={visiblePrimary} />}
        {visibleTetto.length > 0 && <NavGroup title="Operação Tetto" items={visibleTetto} />}
        {visibleAccount.length > 0 && <NavGroup title="Conta" items={visibleAccount} />}
      </nav>

      {role && (role === 'OWNER' || role === 'ADMIN') && <PlanCard />}
      <UserFooter appUser={appUser} role={role} onSignOut={signOut} />
    </>
  )

  return (
    <div className="tf-app flex min-h-dvh">
      <aside className="tf-sidebar hidden shrink-0 flex-col p-4 md:flex">{sidebarBody}</aside>

      {menuOpen && (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(18rem,85vw)] flex-col p-4 transition-transform duration-200 md:hidden ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          background: 'var(--color-bg2)',
          borderRight: '1px solid var(--color-border)',
        }}
      >
        <div className="mb-2 flex items-start justify-between gap-2 safe-pt">
          <div className="min-w-0">
            <p className="tf-eyebrow">TettoHub</p>
            <h1 className="text-lg font-bold">TettoFlow</h1>
          </div>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            className="tf-btn tf-btn-ghost"
            style={{ minHeight: '44px', width: '44px', padding: 0 }}
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>
        <nav className="min-h-0 flex-1 overflow-y-auto pr-1">
          {visiblePrimary.length > 0 && <NavGroup title="Principal" items={visiblePrimary} />}
          {visibleTetto.length > 0 && <NavGroup title="Operação Tetto" items={visibleTetto} />}
          {visibleAccount.length > 0 && <NavGroup title="Conta" items={visibleAccount} />}
        </nav>
        {role && (role === 'OWNER' || role === 'ADMIN') && <PlanCard />}
        <UserFooter appUser={appUser} role={role} onSignOut={signOut} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="sticky top-0 z-30 flex items-center gap-3 px-3 py-2 backdrop-blur safe-pt md:hidden"
          style={{
            borderBottom: '1px solid var(--color-border)',
            background: 'color-mix(in srgb, var(--color-bg) 95%, transparent)',
          }}
        >
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="tf-btn tf-btn-ghost"
            style={{ minHeight: '44px', width: '44px', padding: 0 }}
            aria-label="Abrir menu"
          >
            <Menu size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">TettoFlow</p>
            <p className="truncate text-xs" style={{ color: 'var(--color-text3)' }}>
              {workspace?.name ?? 'Agência'}
            </p>
          </div>
        </header>

        <main className="tf-fade-in flex-1 overflow-auto px-3 py-4 pb-24 sm:px-4 sm:py-5 md:p-6 md:pb-6">
          {children ?? <Outlet />}
        </main>

        <nav
          className="fixed inset-x-0 bottom-0 z-30 backdrop-blur safe-pb md:hidden"
          style={{
            borderTop: '1px solid var(--color-border)',
            background: 'color-mix(in srgb, var(--color-bg) 95%, transparent)',
          }}
        >
          <ul className="mx-auto flex max-w-lg items-stretch justify-between px-1 pt-1">
            {visibleBottom.map((item) => (
              <li key={item.label} className="flex-1">
                {item.more ? (
                  <button
                    type="button"
                    onClick={() => setMenuOpen(true)}
                    className="flex min-h-12 w-full flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[11px] font-medium"
                    style={{ color: 'var(--color-text3)' }}
                  >
                    <Menu size={16} />
                    {item.label}
                  </button>
                ) : (
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[11px] font-medium ${
                        isActive ? 'tf-nav-link-active' : ''
                      }`
                    }
                    style={{ color: 'var(--color-text3)' }}
                  >
                    {item.label}
                  </NavLink>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  )
}

function PlanCard() {
  return (
    <Link
      to="/assinatura"
      className="tf-plan-card mb-3 block shrink-0 no-underline"
      style={{ color: 'inherit' }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-accent)' }}>
        Plano Max
      </p>
      <p className="mt-0.5 text-sm font-semibold">Assinatura ativa</p>
      <p className="mt-1 text-xs" style={{ color: 'var(--color-text3)' }}>
        27 dias restantes · ver benefícios
      </p>
    </Link>
  )
}

function UserFooter({
  appUser,
  role,
  onSignOut,
}: {
  appUser: { name: string; email?: string } | null
  role: string | null
  onSignOut: () => void
}) {
  const { themeId, setThemeId } = useTheme()
  const isLight = themeId === 'light'

  const cycleTheme = () => {
    const next: ThemeId = isLight ? 'tettohub' : 'light'
    setThemeId(next)
  }

  return (
    <div className="tf-sidebar-footer shrink-0 pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
      <div className="mb-3 flex items-center gap-1.5">
        <button
          type="button"
          onClick={cycleTheme}
          className="tf-icon-btn"
          aria-label={isLight ? 'Tema escuro' : 'Tema claro'}
          title={isLight ? 'Tema escuro' : 'Tema claro'}
        >
          {isLight ? <Moon size={16} /> : <Sun size={16} />}
        </button>
        <button type="button" className="tf-icon-btn relative" aria-label="Notificações" title="Notificações">
          <Bell size={16} />
          <span className="tf-notif-dot" />
        </button>
        <button
          type="button"
          onClick={() => onSignOut()}
          className="tf-icon-btn"
          aria-label="Sair"
          title="Sair"
        >
          <LogOut size={16} />
        </button>
      </div>

      <div className="flex items-center gap-2.5">
        <div className="tf-avatar shrink-0" aria-hidden>
          {initials(appUser?.name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{appUser?.name ?? '—'}</p>
          <p className="truncate text-xs" style={{ color: 'var(--color-text3)' }}>
            {role ? ROLE_LABELS[role as keyof typeof ROLE_LABELS] : 'Sem permissão'}
          </p>
        </div>
      </div>
    </div>
  )
}
