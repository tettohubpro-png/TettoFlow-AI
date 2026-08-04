import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { AlertChannel, AlertType, ClientAlert } from '@/types/database'
import { logProjectActivity } from '@/utils/activityLog'

export const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  monthly_report: 'Relatório mensal',
  schedule: 'Cronograma de postagem',
  themes: 'Temas para posts e vídeos',
}

export function buildAlertTemplate(
  type: AlertType,
  clientName: string,
): { subject: string; body: string } {
  if (type === 'monthly_report') {
    return {
      subject: `Relatório mensal — ${clientName}`,
      body: `Olá, ${clientName}!\n\nSegue o relatório mensal da TettoHub com o resumo das entregas, resultados e próximos passos.\n\nQualquer dúvida, estamos à disposição.\n\nEquipe TettoHub`,
    }
  }
  if (type === 'schedule') {
    return {
      subject: `Cronograma de postagem — ${clientName}`,
      body: `Olá, ${clientName}!\n\nSegue o cronograma de postagens do período. Confirme datas e horários para alinharmos a produção.\n\nEquipe TettoHub`,
    }
  }
  return {
    subject: `Temas de posts e vídeos — ${clientName}`,
    body: `Olá, ${clientName}!\n\nSeguem os temas sugeridos para posts e vídeos deste ciclo. Assim que aprovar, partimos para produção.\n\nEquipe TettoHub`,
  }
}

export function useClientAlerts() {
  const { workspace, user } = useAuth()
  const [alerts, setAlerts] = useState<ClientAlert[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAlerts = useCallback(async () => {
    if (!workspace?.id) {
      setAlerts([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from('client_alerts')
      .select('*, clients(name)')
      .eq('workspace_id', workspace.id)
      .order('created_at', { ascending: false })
      .limit(50)
    setAlerts((data ?? []) as ClientAlert[])
    setLoading(false)
  }, [workspace?.id])

  useEffect(() => {
    fetchAlerts()
  }, [fetchAlerts])

  const createAlert = async (payload: {
    client_id: string
    channel: AlertChannel
    alert_type: AlertType
    subject: string
    body: string
  }) => {
    if (!workspace?.id) return { error: 'Workspace não carregado' }

    const { data, error } = await supabase
      .from('client_alerts')
      .insert({
        workspace_id: workspace.id,
        client_id: payload.client_id,
        channel: payload.channel,
        alert_type: payload.alert_type,
        subject: payload.subject,
        body: payload.body,
        status: 'queued',
        created_by: user?.id ?? null,
      })
      .select('*, clients(name)')
      .single()

    if (error) return { data: null, error: error.message }

    await logProjectActivity(workspace.id, user?.id ?? null, 'client_alert', data.id, 'create', {
      channel: payload.channel,
      alert_type: payload.alert_type,
    })
    await fetchAlerts()
    return { data: data as ClientAlert, error: null }
  }

  const markSent = async (alertId: string) => {
    const { error } = await supabase
      .from('client_alerts')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', alertId)
    if (!error) await fetchAlerts()
    return { error: error?.message ?? null }
  }

  return { alerts, loading, createAlert, markSent, refresh: fetchAlerts }
}
