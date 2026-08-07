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
    contentThisMonth: 0,
    tasksPending: 0,
    revenueMonth: 0,
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
    const monthStart = `${today.slice(0, 7)}-01`

    const [
      clientsRes,
      opsRes,
      reviewRes,
      todayRes,
      leadsRes,
      messagesRes,
      contentMonthRes,
      tasksRes,
      revenueRes,
    ] = await Promise.all([
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
      // Conteúdos criados neste mês.
      supabase
        .from('operations')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspace.id)
        .is('archived_at', null)
        .gte('created_at', `${monthStart}T00:00:00`),
      // Tarefas ainda não concluídas.
      supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspace.id)
        .not('status', 'eq', 'done'),
      // Receita prevista do mês (só retorna algo pra OWNER/ADMIN/MANAGER — RLS).
      supabase
        .from('financial_entries')
        .select('amount')
        .eq('workspace_id', workspace.id)
        .eq('type', 'income')
        .neq('status', 'cancelled')
        .gte('due_date', monthStart)
        .lt('due_date', nextMonthStart(monthStart)),
    ])

    const revenueMonth = (revenueRes.data ?? []).reduce(
      (sum, row) => sum + Number(row.amount ?? 0),
      0,
    )

    setStats({
      activeClients: clientsRes.count ?? 0,
      pendingOperations: opsRes.count ?? 0,
      pendingApprovals: reviewRes.count ?? 0,
      todayAgenda: todayRes.count ?? 0,
      newLeadsWeek: leadsRes.count ?? 0,
      messagesWeek: messagesRes.count ?? 0,
      contentThisMonth: contentMonthRes.count ?? 0,
      tasksPending: tasksRes.count ?? 0,
      revenueMonth,
    })
    setLoading(false)
  }, [workspace?.id])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return { stats, loading, refresh: fetchStats }
}

function nextMonthStart(monthStartISODate: string): string {
  const [year, month] = monthStartISODate.split('-').map(Number)
  const next = new Date(year, month, 1) // month já é 1-based aqui (vira o mês seguinte)
  return next.toISOString().slice(0, 10)
}
