import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { AppShell } from '@/components/layout/AppShell'
import { ForceChangePasswordModal } from '@/components/auth/ForceChangePasswordModal'
import { AutoPunchClock } from '@/hooks/useWorkSessions'
import { canAccessPath } from '@/utils/permissions'

export function ProtectedRoute() {
  const { user, loading, role, mustChangePassword } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        Carregando...
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (role && !canAccessPath(role, location.pathname)) {
    return <Navigate to="/" replace />
  }

  return (
    <AppShell>
      <AutoPunchClock />
      {mustChangePassword && <ForceChangePasswordModal />}
      <Outlet />
    </AppShell>
  )
}
