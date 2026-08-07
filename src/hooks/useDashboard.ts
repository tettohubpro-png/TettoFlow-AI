import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { DashboardStats } from '@/types/database'

export function useDashboardStats() {
  const { workspace } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    activeClients: 0,
    pendingOperations: 0,
    pendingApprovals: 0,
    todayAgenda: 0,
    newLeadsWeek: 0,
    messagesWeek: 0,
  })
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    if (!workspace?.id) {
      setLoading(false)
      return
    }

    setLoading(true)
    const today = new Date().toISOString().slice(0, 10)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const [clientsRes, opsRes, reviewRes, todayRes, leadsRes, messagesRes] = await Promise.all([
      supabase
        .from('clients')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspace.id)
        .eq('status', 'ACTIVE'),
      supabase
        .from('operations')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspace.id)
        .not('status', 'eq', 'DONE')
        .is('archived_at', null),
      supabase
        .from('operations')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspace.id)
        .eq('status', 'REVIEW'),
      supabase
        .from('operations')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspace.id)
        .gte('deadline', `${today}T00:00:00`)
        .lte('deadline', `${today}T23:59:59`),
      // Leads novos: clientes criados pelo agente de WhatsApp (INACTIVE) nos últimos 7 dias.
      supabase
        .from('clients')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspace.id)
        .eq('status', 'INACTIVE')
        .gte('created_at', weekAgo),
      // Mensagens recebidas de clientes (inbound) nos últimos 7 dias.
      supabase
        .from('conversation_messages')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspace.id)
        .eq('direction', 'inbound')
        .gte('created_at', weekAgo),
    ])

    setStats({
      activeClients: clientsRes.count ?? 0,
      pendingOperations: opsRes.count ?? 0,
      pendingApprovals: reviewRes.count ?? 0,
      todayAgenda: todayRes.count ?? 0,
      newLeadsWeek: leadsRes.count ?? 0,
      messagesWeek: messagesRes.count ?? 0,
    })
    setLoading(false)
  }, [workspace?.id])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return { stats, loading, refresh: fetchStats }
}
