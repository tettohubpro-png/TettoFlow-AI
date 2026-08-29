import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Client, ClientLostReason, ClientPipelineStage } from '@/types/database'

/**
 * Funil de prospecção: reaproveita a própria tabela `clients` (via
 * `pipeline_stage`) — quando um prospect converte (`WON`), vira cliente
 * ACTIVE de verdade sem duplicar cadastro. Só mostra quem ainda está em
 * andamento no funil (`pipeline_stage <> 'WON'`); convertidos saem daqui e
 * aparecem no CRM normal.
 */
export function useProspects() {
  const { workspace, user } = useAuth()
  const [prospects, setProspects] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProspects = useCallback(async () => {
    if (!workspace?.id) {
      setProspects([])
      setLoading(false)
      return
    }

    setLoading(true)
    const { data, error: err } = await supabase
      .from('clients')
      .select('*')
      .eq('workspace_id', workspace.id)
      .neq('pipeline_stage', 'WON')
      .is('archived_at', null)
      .order('next_follow_up_date', { ascending: true, nullsFirst: false })
      .order('name')

    if (err) setError(err.message)
    else {
      setProspects((data ?? []) as Client[])
      setError(null)
    }
    setLoading(false)
  }, [workspace?.id])

  useEffect(() => {
    fetchProspects()
  }, [fetchProspects])

  useEffect(() => {
    if (!workspace?.id) return

    const channel = supabase
      .channel(`prospects-realtime-${workspace.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clients', filter: `workspace_id=eq.${workspace.id}` },
        () => fetchProspects(),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [workspace?.id, fetchProspects])

  const createProspect = async (payload: {
    name: string
    segment?: string
    city?: string
    state?: string
    origin?: string
    notes?: string
  }) => {
    if (!workspace?.id) return { data: null, error: 'Workspace não carregado' }

    const { data, error: err } = await supabase
      .from('clients')
      .insert({
        name: payload.name,
        workspace_id: workspace.id,
        status: 'INACTIVE',
        pipeline_stage: 'PROSPECT',
        segment: payload.segment || null,
        city: payload.city || null,
        state: payload.state || null,
        origin: payload.origin || null,
        notes: payload.notes || null,
        prospected_by: user?.id ?? null,
      })
      .select()
      .single()

    if (!err) await fetchProspects()
    return { data, error: err?.message ?? null }
  }

  const moveStage = async (id: string, stage: ClientPipelineStage) => {
    const payload: Partial<Client> = { pipeline_stage: stage }
    // Converteu: vira cliente de verdade (mesmo registro, sem duplicar).
    if (stage === 'WON') payload.status = 'ACTIVE'
    // Voltou de "Perdido" pra ativo no funil: limpa o motivo antigo.
    if (stage !== 'LOST') payload.lost_reason = null

    const { error: err } = await supabase.from('clients').update(payload).eq('id', id)
    if (!err) await fetchProspects()
    return { error: err?.message ?? null }
  }

  const markLost = async (id: string, reason: ClientLostReason) => {
    const { error: err } = await supabase
      .from('clients')
      .update({ pipeline_stage: 'LOST', lost_reason: reason })
      .eq('id', id)
    if (!err) await fetchProspects()
    return { error: err?.message ?? null }
  }

  const setFollowUp = async (id: string, date: string | null) => {
    const { error: err } = await supabase
      .from('clients')
      .update({ next_follow_up_date: date })
      .eq('id', id)
    if (!err) await fetchProspects()
    return { error: err?.message ?? null }
  }

  return {
    prospects,
    loading,
    error,
    fetchProspects,
    createProspect,
    moveStage,
    markLost,
    setFollowUp,
  }
}
