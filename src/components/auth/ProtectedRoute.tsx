import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { AppShell } from '@/components/layout/AppShell'

export function ProtectedRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        Carregando...
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}
