import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { DashboardStats } from '@/types/database'

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats>({
    activeClients: 0,
    pendingTasks: 0,
    pendingApprovals: 0,
    todayAgenda: 0,
  })
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    setLoading(true)

    const [clientsRes, projectsRes, approvalsRes, todayRes] = await Promise.all([
      supabase.from('clients').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .not('status', 'eq', 'completed'),
      supabase
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'approval'),
      supabase
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .eq('due_date', new Date().toISOString().slice(0, 10)),
    ])

    setStats({
      activeClients: clientsRes.count ?? 0,
      pendingTasks: projectsRes.count ?? 0,
      pendingApprovals: approvalsRes.count ?? 0,
      todayAgenda: todayRes.count ?? 0,
    })
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return { stats, loading, refresh: fetchStats }
}
